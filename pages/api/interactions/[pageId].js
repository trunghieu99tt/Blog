const redis = require('../../../lib/redis');

/**
 * Get client identifier based on IP address and User-Agent
 * This creates a unique identifier for rate limiting
 */
function getClientId(req) {
    // Get IP address
    const forwarded = req.headers['x-forwarded-for'];
    let ip;

    if (typeof forwarded === 'string') {
        ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
        ip = forwarded[0];
    } else {
        ip = req.socket?.remoteAddress || 'unknown';
    }

    // Normalize IPv6 localhost to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }

    // Clean up IPv6 notation
    ip = ip.replace(/^::ffff:/, '');

    // Get user agent and create a simple hash
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create a simple hash of the user agent (to keep key short)
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
        const char = userAgent.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Create clean identifier
    const cleanIp = ip.replace(/[^a-zA-Z0-9.]/g, '_');
    return `${cleanIp}_${Math.abs(hash).toString(36)}`;
}

/**
 * API handler for post interactions (likes and shares)
 *
 * GET /api/interactions/[postId] - Get interaction counts
 * POST /api/interactions/[postId] - Increment like or share
 */
export default async (req, res) => {
    const { pageId: postId } = req.query;

    // Validate postId
    if (!postId || typeof postId !== 'string') {
        return res.status(400).json({
            error: 'Post ID is required',
            likes: 0,
            shares: 0
        });
    }

    try {
        if (req.method === 'POST') {
            const { type, count } = req.body;
            const clientId = getClientId(req);

            if (type === 'like') {
                // Check how many likes this user has already given to this post
                const userLikesKey = `user_likes:${postId}:${clientId}`;
                const userLikesCount = await redis.get(userLikesKey);
                const currentUserLikes = parseInt(
                    String(userLikesCount || '0')
                );

                // Enforce max 5 likes per user per post
                const requestedCount = Math.max(1, Math.min(count || 1, 5));
                const allowedCount = Math.max(
                    0,
                    Math.min(requestedCount, 5 - currentUserLikes)
                );

                if (allowedCount === 0) {
                    const likes = await redis.get(`likes:${postId}`);
                    const shares = await redis.get(`shares:${postId}`);

                    return res.status(429).json({
                        error: 'Maximum likes reached',
                        likes: parseInt(String(likes || '0')),
                        shares: parseInt(String(shares || '0')),
                        remaining: 0
                    });
                }

                // Update user's like count with 24 hour expiry
                await redis.incrBy(userLikesKey, allowedCount);
                await redis.expire(userLikesKey, 86400); // 24 hours

                // Increment global like count
                const newLikes = await redis.incrBy(
                    `likes:${postId}`,
                    allowedCount
                );
                const shares = await redis.get(`shares:${postId}`);

                return res.json({
                    likes: parseInt(String(newLikes)),
                    shares: parseInt(String(shares || '0')),
                    success: true,
                    remaining: 5 - (currentUserLikes + allowedCount)
                });
            } else if (type === 'share') {
                // Rate limiting for shares (max 10 per user per post per 24h)
                const userSharesKey = `user_shares:${postId}:${clientId}`;
                const userSharesCount = await redis.get(userSharesKey);
                const currentUserShares = parseInt(
                    String(userSharesCount || '0')
                );

                if (currentUserShares >= 10) {
                    const likes = await redis.get(`likes:${postId}`);
                    const shares = await redis.get(`shares:${postId}`);

                    return res.status(429).json({
                        error: 'Maximum shares reached',
                        likes: parseInt(String(likes || '0')),
                        shares: parseInt(String(shares || '0'))
                    });
                }

                // Update user's share count with 24 hour expiry
                await redis.incr(userSharesKey);
                await redis.expire(userSharesKey, 86400);

                // Increment global share count
                const newShares = await redis.incr(`shares:${postId}`);
                const likes = await redis.get(`likes:${postId}`);

                return res.json({
                    likes: parseInt(String(likes || '0')),
                    shares: parseInt(String(newShares)),
                    success: true
                });
            } else {
                return res.status(400).json({
                    error: 'Invalid interaction type',
                    likes: 0,
                    shares: 0
                });
            }
        } else if (req.method === 'GET') {
            const clientId = getClientId(req);

            // Fetch global counts
            const likes = await redis.get(`likes:${postId}`);
            const shares = await redis.get(`shares:${postId}`);

            // Fetch user's remaining likes
            const userLikesKey = `user_likes:${postId}:${clientId}`;
            const userLikesCount = await redis.get(userLikesKey);
            const remaining = Math.max(
                0,
                5 - parseInt(String(userLikesCount || '0'))
            );

            return res.json({
                likes: parseInt(String(likes || '0')),
                shares: parseInt(String(shares || '0')),
                remaining
            });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({
                error: 'Method not allowed',
                likes: 0,
                shares: 0
            });
        }
    } catch (error) {
        console.error('Redis error:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

        return res.status(500).json({
            error: 'Failed to update interactions',
            likes: 0,
            shares: 0,
            details:
                process.env.NODE_ENV === 'development'
                    ? errorMessage
                    : undefined
        });
    }
};
