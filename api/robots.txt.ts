import { NextApiRequest, NextApiResponse } from 'next';

import { host } from '../lib/config';

export default async (
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> => {
    if (req.method !== 'GET') {
        return res.status(405).send({ error: 'method not allowed' });
    }

    // cache robots.txt for up to 60 seconds
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
    );
    res.setHeader('Content-Type', 'text/plain');
    res.write(`User-agent: *
Allow: /

# Explicitly allow Facebook's external hit crawler
User-agent: facebookexternalhit/1.1
Allow: /

User-agent: facebookexternalhit
Allow: /

# Allow other social media crawlers
User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

# Allow Facebook's other crawlers
User-agent: FacebookBot
Allow: /

User-agent: facebookcatalog
Allow: /

Sitemap: ${host}/api/sitemap.xml
`);
    res.end();
};
