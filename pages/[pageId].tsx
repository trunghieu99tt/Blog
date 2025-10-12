import React from 'react';
import { isDev, domain } from 'lib/config';
import { getSiteMaps } from 'lib/get-site-maps';
import { resolveNotionPage } from 'lib/resolve-notion-page';
import { NotionPage } from 'components';
import { getAllPages } from 'lib/notion';
import { Block } from 'lib/types';
import { parsePageId } from 'notion-utils';

export const getStaticProps = async (context) => {
    const rawPageId = context.params.pageId as string;

    try {
        if (rawPageId === 'sitemap.xml' || rawPageId === 'robots.txt') {
            return {
                redirect: {
                    destination: `/api/${rawPageId}`
                }
            };
        }

        const allPosts = await getAllPages();
        const post =
            allPosts.find((post: Block) => {
                return post?.id === parsePageId(rawPageId);
            }) || null;
        const props = await resolveNotionPage(domain, rawPageId);

        return {
            props: {
                ...props,
                post
            },
            revalidate: 10
        };
    } catch (err) {
        console.error('page error', domain, rawPageId, err);
        throw err;
    }
};

export async function getStaticPaths() {
    if (isDev) {
        return {
            paths: [],
            fallback: 'blocking'
        };
    }

    const siteMaps = await getSiteMaps();

    const ret = {
        paths: siteMaps.flatMap((siteMap) =>
            Object.keys(siteMap.canonicalPageMap).map((pageId) => ({
                params: {
                    pageId
                }
            }))
        ),
        // paths: [],
        fallback: true
    };

    // console.log(ret.paths);
    return ret;
}

export default function NotionDomainDynamicPage(props) {
    return <NotionPage {...props} />;
}
