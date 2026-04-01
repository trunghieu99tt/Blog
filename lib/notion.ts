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

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
    let pages = await mySiteNotion.getPage(pageId);

    // If collection_query is empty, the API likely returned double-wrapped blocks
    // that notion-client couldn't parse. Normalize and re-fetch collection data.
    if (Object.keys(pages.collection_query || {}).length === 0) {
        normalizeBlockMap(pages.block as any);
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
                        const result = await mySiteNotion.getCollectionData(
                            collectionId,
                            viewId,
                            collectionView,
                            { limit: 9999 }
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
                                    (pages.collection_query as any)[
                                        collectionId
                                    ] = {};
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
