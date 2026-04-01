import React from 'react';
import { domain } from 'lib/config';
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
    // Never pre-render pages at build time — build on first visit and cache via ISR.
    // This avoids hammering the Notion API in parallel during deployment (429s)
    // and keeps build times fast regardless of how many posts exist.
    return {
        paths: [],
        fallback: 'blocking'
    };
}

export default function NotionDomainDynamicPage(props) {
    return <NotionPage {...props} />;
}
