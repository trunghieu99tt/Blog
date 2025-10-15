import { ExtendedRecordMap } from 'notion-types';
import * as types from './types';
import * as config from './config';

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
 * Extract blog posts from Notion's recordMap (same data structure that react-notion-x uses)
 */
export function extractPostsFromRecordMap(
    recordMap: ExtendedRecordMap,
    _site: types.Site
): BlogPost[] {
    const posts: BlogPost[] = [];

    // Get all collections from recordMap
    const collectionIds = Object.keys(recordMap.collection || {});

    for (const collectionId of collectionIds) {
        const collection = recordMap.collection[collectionId]?.value;

        // Get collection views (this is what determines the order and filtering)
        const collectionViewIds = Object.keys(
            recordMap.collection_query || {}
        ).filter((id) => id.includes(collectionId));

        for (const viewId of collectionViewIds) {
            const collectionView = recordMap.collection_query[viewId];

            const blockIds = collectionView?.[collectionId]?.blockIds || [];

            // If no blockIds from collection_query, try to find blocks directly
            if (blockIds.length === 0) {
                // Search through all blocks to find pages that belong to this collection
                const allBlockIds = Object.keys(recordMap.block || {});

                for (const blockId of allBlockIds) {
                    const block = recordMap.block[blockId]?.value;

                    if (
                        block &&
                        block.type === 'page' &&
                        block.parent_table === 'collection' &&
                        block.parent_id === collectionId
                    ) {
                        const properties = block.properties || {};
                        const schema = collection?.schema || {};

                        // Extract post data using the same logic as react-notion-x
                        const post = extractPostFromBlock(
                            block,
                            properties,
                            schema
                        );

                        if (post) {
                            posts.push(post);
                        }
                    }
                }
            } else {
                // Use the blockIds from collection_query
                for (const blockId of blockIds) {
                    const block = recordMap.block[blockId]?.value;

                    if (
                        block &&
                        block.type === 'page' &&
                        block.parent_table === 'collection'
                    ) {
                        const properties = block.properties || {};
                        const schema = collection?.schema || {};

                        // Extract post data using the same logic as react-notion-x
                        const post = extractPostFromBlock(
                            block,
                            properties,
                            schema
                        );

                        if (post) {
                            posts.push(post);
                        }
                    }
                }
            }
        }
    }

    // Sort by date (newest first)
    return posts.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

function extractPostFromBlock(
    block: any,
    properties: any,
    schema: any
): BlogPost | null {
    // Helper functions to extract properties (same as in your API)
    const getName = (props: any) => {
        return props?.title?.[0]?.[0] || '';
    };

    const getProperty = (propertyName: string) => {
        const schemaEntry = Object.entries(schema).find(
            ([, value]: any) => value.name === propertyName
        );
        if (!schemaEntry) return null;
        const propertyId = schemaEntry[0];
        return properties[propertyId];
    };

    const getTextProperty = (propertyName: string) => {
        const prop = getProperty(propertyName);
        return prop?.[0]?.[0] || '';
    };

    const getMultiSelectPropertyWithColors = (propertyName: string) => {
        const prop = getProperty(propertyName);
        if (!prop || !Array.isArray(prop)) return [];

        return prop
            .map((item: any) => {
                if (Array.isArray(item)) {
                    const name = item[0];
                    let color = 'default';

                    if (item.length > 1) {
                        if (item[1] && Array.isArray(item[1])) {
                            color = item[1][0]?.[1] || item[1][1] || 'default';
                        } else if (typeof item[1] === 'string') {
                            color = item[1];
                        }
                    }

                    return { name, color };
                } else if (typeof item === 'string') {
                    return { name: item, color: 'default' };
                }

                return null;
            })
            .filter(Boolean);
    };

    const getDateProperty = (propertyName: string) => {
        const prop = getProperty(propertyName);
        const dateValue = prop?.[0]?.[1]?.[0]?.[1];
        return dateValue?.start_date || '';
    };

    const getCheckboxProperty = (propertyName: string) => {
        const prop = getProperty(propertyName);
        return prop?.[0]?.[0] === 'Yes';
    };

    // Extract data
    const title = getName(properties);
    if (!title) return null;

    // Try different property names for description
    const description =
        getTextProperty('Preview') ||
        getTextProperty('Description') ||
        getTextProperty('Summary') ||
        getTextProperty('Excerpt');

    // Try different property names for tags with colors
    let tags: BlogTag[] = [];

    // Find the actual tag property by looking at schema
    let tagPropertyId = null;
    let tagSchema = null;

    // Look through schema to find multi-select properties
    for (const [propId, propSchema] of Object.entries(schema)) {
        const schemaValue = propSchema as any;
        if (schemaValue?.type === 'multi_select') {
            tagPropertyId = propId;
            tagSchema = schemaValue;
            break;
        }
    }

    // Extract tags using the schema information
    let multiSelectTags: BlogTag[] = [];

    if (tagPropertyId && tagSchema) {
        // Get the property value (array of selected tag IDs)
        const selectedTagIds = properties[tagPropertyId]?.[0]?.[0]?.split(',');

        if (selectedTagIds && Array.isArray(selectedTagIds)) {
            // Map selected tag IDs to tag objects using schema options
            multiSelectTags = selectedTagIds
                .map((tagId: string) => {
                    // Find the tag in schema options
                    const tagOption = tagSchema.options?.find(
                        (option: any) => option?.value === tagId
                    );
                    if (tagOption) {
                        return {
                            name: tagOption.value,
                            color: tagOption.color
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        }
    } else {
        // Fallback to common names
        multiSelectTags =
            getMultiSelectPropertyWithColors('Tag') ||
            getMultiSelectPropertyWithColors('Tags') ||
            getMultiSelectPropertyWithColors('Category') ||
            getMultiSelectPropertyWithColors('Categories');
    }

    if (multiSelectTags.length > 0) {
        tags = multiSelectTags;
    } else {
        // Fallback to text properties (without colors)
        const tagsString =
            getTextProperty('Tag') ||
            getTextProperty('Tags') ||
            getTextProperty('Category') ||
            getTextProperty('Categories');
        if (tagsString) {
            tags = tagsString
                .split(',')
                .map((t) => ({
                    name: t.trim(),
                    color: 'default'
                }))
                .filter((t) => t.name);
        }
    }

    // Try different property names for date
    const date =
        getDateProperty('Date') ||
        getDateProperty('Published') ||
        getDateProperty('Created') ||
        getDateProperty('Publish Date');

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

    // Try different property names for published status
    const published =
        getCheckboxProperty('Published') ||
        getCheckboxProperty('Public') ||
        getCheckboxProperty('Live') ||
        true; // Default to true if no published property found

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
        description,
        tags,
        date,
        slug,
        coverImage,
        published,
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
