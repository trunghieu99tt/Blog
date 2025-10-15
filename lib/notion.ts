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
    apiBaseUrl: process.env.NOTION_API_BASE_URL
});

export const baseNotion = new NotionAPI({});

export const getAllPages = async (): Promise<Block[]> => {
    try {
        const response = await baseNotion.getPage(config.rootNotionPageId);
        const blocks = response?.block;
        return Object.values(blocks).map((block) => block.value);
    } catch (error) {
        console.error(error);
        return [];
    }
};

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
    let pages = null;
    if (removeDashes(pageId) === config.rootNotionPageId) {
        pages = await baseNotion.getPage(pageId);
    } else {
        pages = await baseNotion.getPage(pageId);
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

    return recordMap;
}

export async function search(params: SearchParams): Promise<SearchResults> {
    return baseNotion.search(params);
}

export const removeDashes = (pageId: string) => {
    return pageId.replace(/-/g, '');
};
