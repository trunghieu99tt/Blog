import pMemoize from 'p-memoize';
import { getAllPagesInSpace } from 'notion-utils';
import type { ExtendedRecordMap } from 'notion-types';

import * as types from './types';
import { includeNotionIdInUrls } from './config';
import { getPage } from './notion';
import { getCanonicalPageId } from './get-canonical-page-id';

const uuid = !!includeNotionIdInUrls;

/** Extract collection page IDs from root page's collection_query (notion-client stores reducerResults, not blockIds) */
function getCollectionBlockIdsFromRecordMap(
    recordMap: ExtendedRecordMap
): string[] {
    const ids = new Set<string>();
    const cq = (recordMap as any).collection_query || {};
    for (const collectionId of Object.keys(cq)) {
        const viewData = cq[collectionId];
        if (!viewData || typeof viewData !== 'object') continue;
        for (const viewId of Object.keys(viewData)) {
            const v = viewData[viewId];
            const blockIds =
                v?.blockIds ||
                v?.collection_group_results?.blockIds ||
                v?.['results:relation:uncategorized']?.blockIds;
            if (Array.isArray(blockIds)) {
                blockIds.forEach((id: string) => ids.add(id));
            } else if (v && typeof v === 'object') {
                extractBlockIdsFromReducer(v, ids);
            }
        }
    }
    return Array.from(ids);
}

function extractBlockIdsFromReducer(obj: any, out: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.blockIds)) {
        obj.blockIds.forEach((id: string) => out.add(id));
        return;
    }
    for (const val of Object.values(obj)) {
        if (val && typeof val === 'object') {
            extractBlockIdsFromReducer(val, out);
        }
    }
}

export const getAllPages = pMemoize(getAllPagesImpl, { maxAge: 60000 * 5 });

export async function getAllPagesImpl(
    rootNotionPageId: string,
    rootNotionSpaceId: string
): Promise<Partial<types.SiteMap>> {
    const pageMap = await getAllPagesInSpace(
        rootNotionPageId,
        rootNotionSpaceId,
        getPage
    );

    // notion-client stores collection_query as reducerResults; getAllPagesInSpace expects blockIds
    // and may miss collection pages. Fetch root page and add any collection blocks to pageMap.
    const rootRecordMap = await getPage(rootNotionPageId);
    const collectionBlockIds =
        getCollectionBlockIdsFromRecordMap(rootRecordMap);
    for (const blockId of collectionBlockIds) {
        if (!pageMap[blockId]) {
            try {
                pageMap[blockId] = await getPage(blockId);
            } catch (err) {
                console.warn('Failed to load collection page', blockId, err);
            }
        }
    }

    const canonicalPageMap = Object.keys(pageMap).reduce(
        (map, pageId: string) => {
            const recordMap = pageMap[pageId];
            if (!recordMap) {
                throw new Error(`Error loading page "${pageId}"`);
            }

            const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
                uuid
            });

            if (canonicalPageId != null && map[canonicalPageId]) {
                console.error(
                    'error duplicate canonical page id',
                    canonicalPageId,
                    pageId,
                    map[canonicalPageId]
                );

                return map;
            } else {
                return {
                    ...map,
                    [canonicalPageId]: pageId
                };
            }
        },
        {}
    );

    return {
        pageMap,
        canonicalPageMap
    };
}
