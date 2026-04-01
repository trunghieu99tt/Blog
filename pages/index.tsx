import React from 'react';
import { domain } from 'lib/config';
import { resolveNotionPage } from 'lib/resolve-notion-page';
import { NotionPage } from 'components';

// Build-time retry with generous delays — no function timeout at build time
// so we can afford to wait out Notion's rate-limit window.
async function resolveWithRetry(d: string) {
    const delays = [5000, 10000, 20000, 40000]; // 5s, 10s, 20s, 40s
    let lastErr: unknown;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
            return await resolveNotionPage(d);
        } catch (err: any) {
            lastErr = err;
            const status = err?.response?.status ?? err?.status;
            if (status === 429 && attempt < delays.length) {
                const delay = delays[attempt];
                console.warn(
                    `[index] 429 rate limit – retrying in ${
                        delay / 1000
                    }s (attempt ${attempt + 1}/${delays.length})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw err;
            }
        }
    }
    throw lastErr;
}

export const getStaticProps = async () => {
    try {
        const props = await resolveWithRetry(domain);
        return { props, revalidate: 10 };
    } catch (err) {
        console.error('page error', domain, err);
        throw err;
    }
};

export default function NotionDomainPage(props) {
    return <NotionPage {...props} />;
}
