/**
 * Extract the caller's IP address from a Next.js API request.
 */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    let ip;

    if (typeof forwarded === 'string') {
        ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
        ip = forwarded[0];
    } else {
        ip = req.socket?.remoteAddress || 'unknown';
    }

    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }

    return ip.replace(/^::ffff:/, '');
}

/**
 * Derive a stable client identifier from IP address + User-Agent.
 * Used for per-client business limits (likes/shares per post).
 */
function getClientId(req) {
    const ip = getClientIp(req);

    const userAgent = req.headers['user-agent'] || 'unknown';
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
        const char = userAgent.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }

    const cleanIp = ip.replace(/[^a-zA-Z0-9.]/g, '_');
    return `${cleanIp}_${Math.abs(hash).toString(36)}`;
}

/**
 * Sliding-window rate limiter backed by a Redis sorted set.
 *
 * Each request adds one entry (scored by timestamp). Entries older than
 * `windowSeconds` are pruned before counting, giving a true sliding window
 * rather than a fixed-bucket approximation.
 *
 * @param {object} redis      - Connected node-redis client
 * @param {string} key        - Redis key for this limiter bucket (e.g. `rl:ip:POST:/api/page-views`)
 * @param {number} maxRequests - Maximum allowed requests inside the window
 * @param {number} windowSeconds - Window size in seconds
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
async function checkRateLimit(redis, key, maxRequests, windowSeconds) {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const fullKey = `rl:${key}`;

    // Atomic pipeline: prune stale entries, count, add current request
    const [, count] = await redis
        .multi()
        .zRemRangeByScore(fullKey, 0, windowStart)
        .zCard(fullKey)
        .exec();

    if (count >= maxRequests) {
        // Tell the client when the oldest entry expires so it knows when to retry
        const oldest = await redis.zRange(fullKey, 0, 0, { BY: 'SCORE' });
        const oldestScore = oldest.length
            ? await redis.zScore(fullKey, oldest[0])
            : now;
        const retryAfter = Math.ceil(
            (oldestScore + windowSeconds * 1000 - now) / 1000
        );

        return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.max(retryAfter, 1)
        };
    }

    // Record this request with a unique member so concurrent hits don't collide
    await redis
        .multi()
        .zAdd(fullKey, {
            score: now,
            value: `${now}-${Math.random().toString(36).slice(2)}`
        })
        .expire(fullKey, windowSeconds)
        .exec();

    return { allowed: true, remaining: maxRequests - count - 1, retryAfter: 0 };
}

/**
 * Apply rate limiting and send a 429 response if the limit is exceeded.
 * Returns true if the request was blocked (caller should return immediately).
 *
 * @param {object} redis
 * @param {object} req
 * @param {object} res
 * @param {string} route         - Short route label used as part of the Redis key
 * @param {number} maxRequests
 * @param {number} windowSeconds
 * @param {object} defaultPayload - Extra fields to include in the 429 body
 */
async function applyRateLimit(
    redis,
    req,
    res,
    route,
    maxRequests,
    windowSeconds,
    defaultPayload = {}
) {
    const ip = getClientIp(req).replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `${ip}:${req.method}:${route}`;

    const { allowed, remaining, retryAfter } = await checkRateLimit(
        redis,
        key,
        maxRequests,
        windowSeconds
    );

    if (!allowed) {
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.status(429).json({
            error: 'Too many requests',
            retryAfter,
            ...defaultPayload
        });
        return true;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    return false;
}

/**
 * Parse a Redis string value as an integer, treating null/undefined as 0.
 */
function parseRedisInt(value) {
    return parseInt(String(value || '0'));
}

/**
 * Send a 405 Method Not Allowed response.
 */
function sendMethodNotAllowed(res, allowed, defaultPayload = {}) {
    res.setHeader('Allow', allowed);
    return res
        .status(405)
        .json({ error: 'Method not allowed', ...defaultPayload });
}

/**
 * Send a 500 Internal Server Error response, including error details in dev.
 */
function sendInternalError(res, error, context, defaultPayload = {}) {
    console.error(`Redis error [${context}]:`, error);
    const details =
        process.env.NODE_ENV === 'development'
            ? error instanceof Error
                ? error.message
                : String(error)
            : undefined;
    return res
        .status(500)
        .json({ error: `Failed to ${context}`, details, ...defaultPayload });
}

module.exports = {
    getClientIp,
    getClientId,
    parseRedisInt,
    sendMethodNotAllowed,
    sendInternalError,
    checkRateLimit,
    applyRateLimit
};
