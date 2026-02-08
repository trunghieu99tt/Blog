import { ExtendedRecordMap } from 'notion-types';
import { parsePageId, getPageProperty } from 'notion-utils';
import * as types from './types';
import * as config from './config';

const normalizeId = (id: string) => parsePageId(id, { uuid: false }) || id;

/** Notion tag colors - deterministic assignment when schema is unavailable */
const NOTION_TAG_COLORS = [
    'gray',
    'brown',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'red',
    'teal'
] as const;

function getColorForTag(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
    }
    return NOTION_TAG_COLORS[Math.abs(hash) % NOTION_TAG_COLORS.length];
}

export interface BlogTag {
    name: string;
    color: string;
}

export interface BlogPost {
    id: string;
    title: string;
    description?: string;
    tags: BlogTag[];
    date?: string;
    slug?: string;
    coverImage?: string;
    published: boolean;
    url: string;
}

/**
 * Recursively extract blockIds from notion's reducer results (handles nested/grouped structures)
 */
function extractBlockIdsFromReducerResults(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];

    if (Array.isArray(obj.blockIds)) {
        return obj.blockIds;
    }

    const ids: string[] = [];
    for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
            ids.push(...value);
        } else if (value && typeof value === 'object') {
            ids.push(...extractBlockIdsFromReducerResults(value));
        }
    }
    return ids;
}

/**
 * Extract blog posts from Notion's recordMap (same data structure that react-notion-x uses)
 */
export function extractPostsFromRecordMap(
    recordMap: ExtendedRecordMap,
    _site: types.Site
): BlogPost[] {
    const posts: BlogPost[] = [];

    // Get collection IDs from both collection and collection_query (they may differ)
    let collectionIds = [
        ...new Set([
            ...Object.keys(recordMap.collection || {}),
            ...Object.keys(recordMap.collection_query || {})
        ])
    ];

    // Fallback: discover from blocks if neither source has data
    if (collectionIds.length === 0 && recordMap.block) {
        const discoveredIds = new Set<string>();
        for (const blockEntry of Object.values(recordMap.block)) {
            const block = (blockEntry as any)?.value;
            if (block) {
                const cid =
                    block.collection_id || block.format?.collection_pointer?.id;
                if (cid) {
                    discoveredIds.add(cid);
                }
            }
        }
        collectionIds = Array.from(discoveredIds);
    }

    for (const collectionId of collectionIds) {
        // collection_query structure: { [collectionId]: { [collectionViewId]: reducerResults } }
        // notion-client stores collectionData.result?.reducerResults (nested structure)
        const collectionQueryData = recordMap.collection_query?.[collectionId];
        let blockIds: string[] = [];

        if (collectionQueryData) {
            for (const viewId of Object.keys(collectionQueryData)) {
                const viewData = collectionQueryData[viewId];
                const ids =
                    viewData?.blockIds ||
                    viewData?.collection_group_results?.blockIds ||
                    viewData?.['results:relation:uncategorized']?.blockIds ||
                    extractBlockIdsFromReducerResults(viewData);
                blockIds = [...new Set([...blockIds, ...ids])];
            }
        }

        if (blockIds.length === 0) {
            // Fallback: find blocks by parent_id when collection_query is empty
            const allBlockIds = Object.keys(recordMap.block || {});

            for (const blockId of allBlockIds) {
                const raw = (recordMap.block as any)[blockId];
                const block = raw?.value?.value ?? raw?.value;

                if (
                    block &&
                    block.type === 'page' &&
                    block.parent_table === 'collection' &&
                    normalizeId(block.parent_id) === normalizeId(collectionId)
                ) {
                    const post = extractPostFromBlock(
                        block,
                        recordMap,
                        collectionId
                    );

                    if (post) {
                        posts.push(post);
                    }
                }
            }
        } else {
            for (const blockId of blockIds) {
                const raw = (recordMap.block as any)[blockId];
                const block = raw?.value?.value ?? raw?.value;
                if (
                    block &&
                    block.type === 'page' &&
                    block.parent_table === 'collection'
                ) {
                    const post = extractPostFromBlock(
                        block,
                        recordMap,
                        collectionId
                    );

                    if (post) {
                        posts.push(post);
                    }
                }
            }
        }
    }

    return posts.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

function getPagePropertyAny(
    block: any,
    recordMap: ExtendedRecordMap,
    collectionId: string,
    names: string[]
): any {
    // getPageProperty looks up collection by block.parent_id - try multiple ID formats
    const tryLookup = (parentId: string) => {
        if (!parentId) return null;
        const blockForLookup = { ...block, parent_id: parentId };
        for (const name of names) {
            try {
                const val = getPageProperty(name, blockForLookup, recordMap);
                if (val != null && val !== '') {
                    if (Array.isArray(val) && val.length === 0) continue;
                    return val;
                }
            } catch {
                /* ignore */
            }
        }
        return null;
    };
    const idsToTry = [
        block.parent_id,
        collectionId,
        normalizeId(collectionId),
        normalizeId(block.parent_id)
    ].filter(Boolean);
    for (const id of [...new Set(idsToTry)]) {
        const result = tryLookup(id);
        if (result != null) return result;
    }
    return null;
}

function getTextFromProp(prop: any): string {
    if (!prop) return '';
    if (Array.isArray(prop)) {
        return prop.reduce(
            (p: string, c: any) =>
                p + (c?.[0] !== '⁍' && c?.[0] !== '‣' ? c?.[0] || '' : ''),
            ''
        );
    }
    return String(prop);
}

/** Infer property values when schema is not available (notion-client often omits it) */
function inferPropertiesFromBlock(properties: Record<string, any>): {
    description: string | null;
    tags: BlogTag[];
    date: string;
} {
    let description: string | null = null;
    const tags: BlogTag[] = [];
    let date = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (key === 'title' || !prop) continue;

        const firstRow = Array.isArray(prop) ? prop[0] : null;
        if (!firstRow) continue;

        // Date: prop[0][1][0][1] has start_date (e.g. THTS)
        const dateObj = firstRow?.[1]?.[0]?.[1];
        if (dateObj && typeof dateObj === 'object' && dateObj.start_date) {
            date = dateObj.start_date;
            continue;
        }

        // Simple text: prop[0][0] is string
        const textVal =
            typeof firstRow[0] === 'string'
                ? firstRow[0]
                : getTextFromProp(prop);
        if (!textVal) continue;

        // Multi-select tags: comma-separated, each part is short (e.g. "Paper Notes,Distributed System,Backend")
        const parts = textVal.split(',').map((s: string) => s.trim());
        const looksLikeTags =
            parts.length > 1 &&
            parts.every((p) => p.length > 0 && p.length < 50);

        if (looksLikeTags && tags.length === 0) {
            tags.push(
                ...parts.map((name) => ({
                    name,
                    color: getColorForTag(name)
                }))
            );
        } else if (textVal.length > 20 && !description) {
            // Description: longer text, take first non-tag-like text we find
            description = textVal;
        }
    }

    return { description, tags, date };
}

function extractPostFromBlock(
    block: any,
    recordMap: ExtendedRecordMap,
    collectionId: string
): BlogPost | null {
    const properties = block.properties || {};
    const schema =
        (recordMap.collection as any)?.[collectionId]?.value?.value?.schema ||
        (recordMap.collection as any)?.[collectionId]?.value?.schema ||
        {};

    const getTextContent = (text: any): string => getTextFromProp(text);

    const title = getTextContent(properties?.title);
    if (!title) return null;

    // Try getPageProperty first (requires schema), then infer from structure
    let description = getPagePropertyAny(block, recordMap, collectionId, [
        'Preview',
        'Description',
        'Summary',
        'Excerpt'
    ]);
    let tags: BlogTag[] = [];
    let dateValue = getPagePropertyAny(block, recordMap, collectionId, [
        'Date',
        'Published',
        'Created',
        'Publish Date'
    ]);

    if (schema && Object.keys(schema).length > 0) {
        // Schema available: use schema-based fallback
        const getPropertyBySchema = (name: string) => {
            const entry = Object.entries(schema).find(
                ([, v]: any) =>
                    String(v?.name || '').toLowerCase() === name.toLowerCase()
            );
            return entry ? properties[entry[0]] : null;
        };
        if (description == null)
            description =
                ['Preview', 'Description', 'Summary', 'Excerpt']
                    .map((n) => getTextFromProp(getPropertyBySchema(n)))
                    .find((s) => s) || null;
        if (tags.length === 0) {
            const tagPropNames = ['Tag', 'Tags', 'Category', 'Categories'];
            let tagSchema: {
                options?: Array<{ value: string; color?: string }>;
            } | null = null;
            for (const n of tagPropNames) {
                const entry = Object.entries(schema).find(
                    ([, v]: any) =>
                        String(v?.name || '').toLowerCase() === n.toLowerCase()
                );
                if (entry && (entry[1] as any)?.type === 'multi_select') {
                    tagSchema = entry[1] as any;
                    break;
                }
            }
            const ts = tagPropNames
                .map((n) => getTextFromProp(getPropertyBySchema(n)))
                .find((s) => s);
            if (ts) {
                const parts = ts
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                tags = parts.map((name) => {
                    const option = tagSchema?.options?.find(
                        (o: any) =>
                            String(o?.value || '').toLowerCase() ===
                            name.toLowerCase()
                    );
                    return {
                        name,
                        color: option?.color || getColorForTag(name)
                    };
                });
            }
        }
        if (dateValue == null) {
            for (const n of ['Date', 'Published', 'Created', 'Publish Date']) {
                const prop = getPropertyBySchema(n);
                const dv = prop?.[0]?.[1]?.[0]?.[1];
                if (dv?.start_date) {
                    dateValue = dv.start_date;
                    break;
                }
            }
        }
    }

    // When schema is empty (notion-client): infer from property structure
    if (description == null || tags.length === 0 || dateValue == null) {
        const inferred = inferPropertiesFromBlock(properties);
        if (description == null) description = inferred.description;
        if (tags.length === 0) tags = inferred.tags;
        if (dateValue == null && inferred.date) dateValue = inferred.date;
    }

    const descriptionStr = typeof description === 'string' ? description : null;
    const date =
        dateValue != null
            ? typeof dateValue === 'number'
                ? new Date(dateValue).toISOString().split('T')[0]
                : typeof dateValue === 'string'
                ? dateValue
                : Array.isArray(dateValue)
                ? new Date(dateValue[0]).toISOString().split('T')[0]
                : ''
            : '';

    const published =
        getPagePropertyAny(block, recordMap, collectionId, [
            'Published',
            'Public',
            'Live'
        ]) ?? true;

    // Generate slug from title (no separate slug property)
    const generateSlug = (title: string): string => {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
    };

    const slug = generateSlug(title);

    // Get cover image
    const coverImage =
        block.format?.page_cover ||
        (block.format as any)?.social_media_image_preview_url;

    // Generate URL with PRD/Local pattern
    // PRD: wormhole-reliable-pub-sub-to-support-geo-replicated-internet-services
    // Local: wormhole-reliable-pub-sub-to-support-geo-replicated-internet-services-[pageId]
    let url: string;

    if (config.isDev) {
        // Local development: append pageId for uniqueness
        url = `/${slug}-${block.id}`;
    } else {
        // Production: use clean slug generated from title
        url = `/${slug}`;
    }

    return {
        id: block.id,
        title,
        description: descriptionStr ?? undefined,
        tags,
        date: date || undefined,
        slug,
        coverImage,
        published: !!published,
        url
    };
}

/**
 * Extract month groups from posts for filtering
 */
export function getMonthGroups(posts: BlogPost[]) {
    const groups = new Map<
        string,
        { month: string; year: string; count: number; key: string }
    >();

    posts.forEach((post) => {
        if (!post.date) return;

        const date = new Date(post.date);
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear().toString();
        const key = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (groups.has(key)) {
            const group = groups.get(key)!;
            group.count += 1;
        } else {
            groups.set(key, { month, year, count: 1, key });
        }
    });

    return Array.from(groups.values()).sort((a, b) =>
        b.key.localeCompare(a.key)
    );
}

/**
 * Extract unique tags from posts
 */
export function getAllTags(posts: BlogPost[]): string[] {
    const tagSet = new Set<string>();
    posts.forEach((post) => {
        post.tags.forEach((tag) => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
}

/**
 * Extract unique tags with colors from posts
 */
export function getAllTagsWithColors(posts: BlogPost[]): BlogTag[] {
    const tagMap = new Map<string, BlogTag>();
    posts.forEach((post) => {
        post.tags.forEach((tag) => {
            if (!tagMap.has(tag.name)) {
                tagMap.set(tag.name, tag);
            }
        });
    });
    return Array.from(tagMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
}
