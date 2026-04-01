import { NotionAPI } from 'notion-client';
import {
    Block,
    ExtendedRecordMap,
    SearchParams,
    SearchResults
} from 'notion-types';
import { getPreviewImages } from './get-preview-images';
import { mapNotionImageUrl } from './map-image-url';

import * as config from 'lib/config';

export const mySiteNotion = new NotionAPI({
    apiBaseUrl: process.env.NOTION_API_BASE_URL,
    authToken: process.env.NOTION_TOKEN_V2,
    activeUser: process.env.NOTION_ACTIVE_USER,
    kyOptions: process.env.NOTION_SPACE_ID
        ? { headers: { 'x-notion-space-id': process.env.NOTION_SPACE_ID } }
        : undefined
});

export const baseNotion = new NotionAPI({});

// Uses the standard notion.so endpoint (not the workspace subdomain) so that
// syncRecordValues calls (used by getBlocks) are not rejected with 403.
const syncNotion = new NotionAPI({
    authToken: process.env.NOTION_TOKEN_V2,
    activeUser: process.env.NOTION_ACTIVE_USER,
    kyOptions: process.env.NOTION_SPACE_ID
        ? { headers: { 'x-notion-space-id': process.env.NOTION_SPACE_ID } }
        : undefined
});

export const getAllPages = async (): Promise<Block[]> => {
    try {
        const response = await mySiteNotion.getPage(config.rootNotionPageId);
        const blocks = response?.block;
        return Object.values(blocks).map((block) => block.value);
    } catch (error) {
        console.error(error);
        return [];
    }
};

/** Notion API now double-wraps block values: block[id].value = { value: {...}, role: "..." }
 *  notion-client 7.x expects: block[id].value = { id, type, ... }
 *  This function flattens the outer wrapper so notion-client internals work correctly. */
function normalizeBlockMap(blockMap: Record<string, any>): void {
    for (const entry of Object.values(blockMap)) {
        if (
            entry &&
            typeof entry.value === 'object' &&
            entry.value !== null &&
            'value' in entry.value &&
            'role' in entry.value
        ) {
            // Double-wrapped: { value: { value: {...}, role: "..." } }
            // Flatten to: { value: {...}, role: "..." }
            entry.role = entry.value.role;
            entry.value = entry.value.value;
        }
    }
}

/**
 * Retries an async function on 429 Too Many Requests with exponential backoff.
 * Notion's API rate-limits hard during parallel SSG builds.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 5,
    baseDelayMs = 2000
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const status = err?.response?.status ?? err?.status;
            if (status === 429) {
                const retryAfterSec =
                    err?.response?.headers?.get?.('Retry-After');
                const delay = retryAfterSec
                    ? parseInt(retryAfterSec) * 1000
                    : baseDelayMs * Math.pow(2, attempt);
                console.warn(
                    `[notion] 429 rate limit – retrying in ${Math.round(
                        delay / 1000
                    )}s (attempt ${attempt + 1}/${maxAttempts})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw err;
            }
        }
    }
    throw lastError;
}

/** Returns block IDs referenced in content arrays that are not yet in blockMap. */
function getMissingBlockIds(blockMap: Record<string, any>): string[] {
    const present = new Set(Object.keys(blockMap));
    const missing = new Set<string>();
    for (const entry of Object.values(blockMap)) {
        const block = (entry as any)?.value;
        if (Array.isArray(block?.content)) {
            for (const id of block.content) {
                if (!present.has(id)) missing.add(id);
            }
        }
    }
    return Array.from(missing);
}

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
    // Disable fetchMissingBlocks and fetchCollections because the Notion API
    // returns double-wrapped blocks ({ value: { value: {...}, role: "..." } })
    // that notion-client 7.x cannot parse. We handle both manually after
    // normalizing the block map below.
    let pages = await withRetry(() =>
        mySiteNotion.getPage(pageId, {
            fetchMissingBlocks: false,
            fetchCollections: false,
            chunkLimit: 500
        })
    );

    // Flatten double-wrapped blocks so the rest of the code can read them.
    normalizeBlockMap(pages.block as any);

    // Re-fetch collection data for any collection_view blocks on the page.
    for (const blockEntry of Object.values(pages.block || {})) {
        const block = (blockEntry as any)?.value;
        if (
            block &&
            (block.type === 'collection_view' ||
                block.type === 'collection_view_page')
        ) {
            const collectionId: string = block.collection_id;
            const viewIds: string[] = block.view_ids || [];
            for (const viewId of viewIds) {
                try {
                    const collectionView =
                        pages.collection_view?.[viewId]?.value ?? block;
                    const result = await withRetry(() =>
                        mySiteNotion.getCollectionData(
                            collectionId,
                            viewId,
                            collectionView,
                            { limit: 9999 }
                        )
                    );
                    const rm = (result as any)?.recordMap;
                    if (rm) {
                        if (rm.block) normalizeBlockMap(rm.block);
                        pages = {
                            ...pages,
                            block: { ...pages.block, ...(rm.block || {}) },
                            collection: {
                                ...pages.collection,
                                ...(rm.collection || {})
                            },
                            collection_query: {
                                ...pages.collection_query,
                                ...(rm.collection_query || {})
                            },
                            collection_view: {
                                ...pages.collection_view,
                                ...(rm.collection_view || {})
                            }
                        };
                        // Also store result.reducerResults under collection_query
                        if ((result as any)?.result?.reducerResults) {
                            if (!pages.collection_query[collectionId]) {
                                (pages.collection_query as any)[collectionId] =
                                    {};
                            }
                            (pages.collection_query as any)[collectionId][
                                viewId
                            ] = (result as any).result.reducerResults;
                        }
                    }
                } catch (err) {
                    console.error(
                        `[getPage] getCollectionData failed ${collectionId}/${viewId}:`,
                        err
                    );
                }
            }
        }
    }

    // Fetch blocks that are referenced in content arrays but not yet loaded.
    // We loop up to 3 times to handle pages with deeply nested structures.
    for (let pass = 0; pass < 3; pass++) {
        const missingIds = getMissingBlockIds(pages.block);
        if (missingIds.length === 0) break;

        try {
            const result: any = await withRetry(() =>
                (syncNotion as any).getBlocks(missingIds)
            );
            const newBlocks = result?.recordMap?.block;
            if (!newBlocks || Object.keys(newBlocks).length === 0) break;
            normalizeBlockMap(newBlocks);
            pages = { ...pages, block: { ...pages.block, ...newBlocks } };
        } catch (err) {
            console.error('[getPage] fetchMissingBlocks pass failed:', err);
            // Log the full error so it appears in Vercel's function logs
            if (err && typeof err === 'object' && 'response' in err) {
                console.error(
                    '[getPage] response status:',
                    (err as any).response?.status
                );
            }
            break;
        }
    }

    const blockIds = Object.keys(pages.block);

    const recordMap = { ...pages };

    const imageUrls: string[] = blockIds
        .map((blockId) => {
            const block = recordMap.block[blockId]?.value;

            if (block) {
                if (block.type === 'image') {
                    const source = block.properties?.source?.[0]?.[0];

                    if (source) {
                        return {
                            block,
                            url: source
                        };
                    }
                }

                if ((block.format as any)?.page_cover) {
                    const source = (block.format as any).page_cover;

                    return {
                        block,
                        url: source
                    };
                }
            }

            return null;
        })
        .filter(Boolean)
        .map(({ block, url }) => mapNotionImageUrl(url, block))
        .filter(Boolean);

    const urls = Array.from(new Set(imageUrls));
    const previewImageMap = await getPreviewImages(urls);
    (recordMap as any).preview_images = previewImageMap;

    // Ensure all blocks have an id (react-notion-x uuidToId crashes on undefined)
    for (const [blockId, entry] of Object.entries(recordMap.block || {})) {
        const block = (entry as any)?.value;
        if (block && block.id == null) {
            block.id = blockId;
        }
    }

    return recordMap;
}

export async function search(params: SearchParams): Promise<SearchResults> {
    return baseNotion.search(params);
}

export const removeDashes = (pageId: string) => {
    return pageId.replace(/-/g, '');
};
