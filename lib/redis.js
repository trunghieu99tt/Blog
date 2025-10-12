const { createClient } = require('redis');

let redis = null;

function getRedisClient() {
    if (!redis) {
        redis = createClient({
            url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Too many Redis reconnection attempts');
                        return new Error('Too many retries');
                    }
                    return retries * 100;
                }
            }
        });

        redis.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redis.on('connect', () => {
            console.log('Connected to Redis');
        });

        redis.on('reconnecting', () => {
            console.log('Reconnecting to Redis...');
        });

        redis.on('ready', () => {
            console.log('Redis client ready');
        });

        // Connect to Redis
        redis.connect().catch((err) => {
            console.error('Failed to connect to Redis:', err);
        });
    }
    return redis;
}

module.exports = getRedisClient();
