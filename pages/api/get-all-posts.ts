import { NextApiRequest, NextApiResponse } from 'next';
import { getPage } from '../../lib/notion';
import { rootNotionPageId } from '../../lib/config';
import * as types from '../../lib/types';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
        return res.status(405).send({ error: 'method not allowed' });
    }

    try {
        const recordMap = await getPage(rootNotionPageId);

        // Extract all posts from the collection
        // collection_query structure: { [collectionId]: { [collectionViewId]: { blockIds, ... } } }
        const posts: types.iPost[] = [];
        const collectionIds = Object.keys(recordMap.collection || {});

        for (const collectionId of collectionIds) {
            const collection = recordMap.collection[collectionId]?.value;
            const collectionQueryData =
                recordMap.collection_query?.[collectionId];
            let blockIds: string[] = [];

            if (collectionQueryData) {
                for (const viewId of Object.keys(collectionQueryData)) {
                    const viewData = collectionQueryData[viewId];
                    const ids =
                        viewData?.blockIds ||
                        viewData?.collection_group_results?.blockIds ||
                        [];
                    blockIds = [...new Set([...blockIds, ...ids])];
                }
            }

            for (const blockId of blockIds) {
                const raw = (recordMap.block as any)[blockId];
                const block = raw?.value?.value ?? raw?.value;

                if (block && block.type === 'page') {
                    const properties = block.properties || {};
                    const schema = collection?.schema || {};

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

                    const getMultiSelectProperty = (propertyName: string) => {
                        const prop = getProperty(propertyName);
                        return prop?.[0]?.[0] || '';
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

                    const post: types.iPost = {
                        id: blockId,
                        name: getName(properties),
                        tag:
                            getMultiSelectProperty('Tag') ||
                            getTextProperty('Tag'),
                        published: getCheckboxProperty('Published'),
                        date:
                            getDateProperty('Date') ||
                            getDateProperty('Published'),
                        slug: getTextProperty('Slug'),
                        Author: [],
                        preview: getTextProperty('Preview'),
                        views: 0
                    };

                    if (post.published && post.name) {
                        posts.push(post);
                    }
                }
            }
        }

        // Sort by date (newest first)
        posts.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        res.setHeader(
            'Cache-Control',
            'public, s-maxage=300, max-age=300, stale-while-revalidate=600'
        );
        res.status(200).json({ posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};
