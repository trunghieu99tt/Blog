const redis = require('../../../lib/redis');
const {
    getClientId,
    parseRedisInt,
    sendMethodNotAllowed,
    sendInternalError,
    applyRateLimit
} = require('../../../lib/api-utils');

const DEFAULT_PAYLOAD = { likes: 0, shares: 0 };

// Limits per IP: 60 requests/min for reads, 20 requests/min for writes
const RATE_LIMIT = { GET: [60, 60], POST: [20, 60] };

/**
 * GET  /api/interactions/[pageId] - Return like/share counts + remaining likes for caller
 * POST /api/interactions/[pageId] - Increment like or share count (rate-limited per client)
 */
export default async (req, res) => {
    const { pageId: postId } = req.query;

    if (!postId || typeof postId !== 'string') {
        return res
            .status(400)
            .json({ error: 'Post ID is required', ...DEFAULT_PAYLOAD });
    }

    try {
        const [maxReq, windowSec] = RATE_LIMIT[req.method] ?? [30, 60];
        const blocked = await applyRateLimit(
            redis,
            req,
            res,
            'interactions',
            maxReq,
            windowSec,
            DEFAULT_PAYLOAD
        );
        if (blocked) return;
        if (req.method === 'POST') {
            const { type, count } = req.body;
            const clientId = getClientId(req);

            if (type === 'like') {
                const userLikesKey = `user_likes:${postId}:${clientId}`;
                const currentUserLikes = parseRedisInt(
                    await redis.get(userLikesKey)
                );

                const requestedCount = Math.max(1, Math.min(count || 1, 5));
                const allowedCount = Math.max(
                    0,
                    Math.min(requestedCount, 5 - currentUserLikes)
                );

                if (allowedCount === 0) {
                    return res.status(429).json({
                        error: 'Maximum likes reached',
                        likes: parseRedisInt(
                            await redis.get(`likes:${postId}`)
                        ),
                        shares: parseRedisInt(
                            await redis.get(`shares:${postId}`)
                        ),
                        remaining: 0
                    });
                }

                await redis.incrBy(userLikesKey, allowedCount);
                await redis.expire(userLikesKey, 86400); // 24 hours

                const newLikes = await redis.incrBy(
                    `likes:${postId}`,
                    allowedCount
                );
                const shares = parseRedisInt(
                    await redis.get(`shares:${postId}`)
                );

                return res.json({
                    likes: parseRedisInt(newLikes),
                    shares,
                    success: true,
                    remaining: 5 - (currentUserLikes + allowedCount)
                });
            } else if (type === 'share') {
                const userSharesKey = `user_shares:${postId}:${clientId}`;
                const currentUserShares = parseRedisInt(
                    await redis.get(userSharesKey)
                );

                if (currentUserShares >= 10) {
                    return res.status(429).json({
                        error: 'Maximum shares reached',
                        likes: parseRedisInt(
                            await redis.get(`likes:${postId}`)
                        ),
                        shares: parseRedisInt(
                            await redis.get(`shares:${postId}`)
                        )
                    });
                }

                await redis.incr(userSharesKey);
                await redis.expire(userSharesKey, 86400); // 24 hours

                const newShares = await redis.incr(`shares:${postId}`);
                const likes = parseRedisInt(await redis.get(`likes:${postId}`));

                return res.json({
                    likes,
                    shares: parseRedisInt(newShares),
                    success: true
                });
            } else {
                return res.status(400).json({
                    error: 'Invalid interaction type',
                    ...DEFAULT_PAYLOAD
                });
            }
        } else if (req.method === 'GET') {
            const clientId = getClientId(req);
            const userLikesKey = `user_likes:${postId}:${clientId}`;

            const [likes, shares, userLikesCount] = await Promise.all([
                redis.get(`likes:${postId}`),
                redis.get(`shares:${postId}`),
                redis.get(userLikesKey)
            ]);

            return res.json({
                likes: parseRedisInt(likes),
                shares: parseRedisInt(shares),
                remaining: Math.max(0, 5 - parseRedisInt(userLikesCount))
            });
        } else {
            return sendMethodNotAllowed(res, ['GET', 'POST'], DEFAULT_PAYLOAD);
        }
    } catch (error) {
        return sendInternalError(
            res,
            error,
            'update interactions',
            DEFAULT_PAYLOAD
        );
    }
};
