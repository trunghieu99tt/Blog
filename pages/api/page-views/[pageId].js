const redis = require('../../../lib/redis');
const {
    sendMethodNotAllowed,
    sendInternalError,
    applyRateLimit
} = require('../../../lib/api-utils');

const DEFAULT_PAYLOAD = { views: 0 };

// Limits per IP: 30 reads/min, 5 view recordings/min
// (a real user only loads a page once; 5 gives headroom for SPA navigations)
const RATE_LIMIT = { GET: [30, 60], POST: [5, 60] };

/**
 * GET  /api/page-views/[pageId] - Return current approximate unique view count
 * POST /api/page-views/[pageId] - Record a view for the given sessionId (HyperLogLog)
 *
 * Each page load generates a fresh sessionId on the client. The POST is only
 * fired after the user has been on the page for 8 seconds, so quick bounces
 * are not counted. Because the sessionId is random per visit, the same person
 * is counted again on subsequent visits.
 */
export default async (req, res) => {
    const { pageId } = req.query;

    if (!pageId || typeof pageId !== 'string') {
        return res
            .status(400)
            .json({ error: 'Page ID is required', ...DEFAULT_PAYLOAD });
    }

    const key = `views:${pageId}`;

    try {
        const [maxReq, windowSec] = RATE_LIMIT[req.method] ?? [10, 60];
        const blocked = await applyRateLimit(
            redis,
            req,
            res,
            'page-views',
            maxReq,
            windowSec,
            DEFAULT_PAYLOAD
        );
        if (blocked) return;
        if (req.method === 'POST') {
            const { sessionId } = req.body ?? {};
            if (!sessionId || typeof sessionId !== 'string') {
                return res.status(400).json({
                    error: 'sessionId is required',
                    ...DEFAULT_PAYLOAD
                });
            }

            await redis.pfAdd(key, sessionId);
            const views = await redis.pfCount(key);
            return res.json({ views, success: true });
        } else if (req.method === 'GET') {
            const views = await redis.pfCount(key);
            return res.json({ views });
        } else {
            return sendMethodNotAllowed(res, ['GET', 'POST'], DEFAULT_PAYLOAD);
        }
    } catch (error) {
        return sendInternalError(
            res,
            error,
            'process page view',
            DEFAULT_PAYLOAD
        );
    }
};
