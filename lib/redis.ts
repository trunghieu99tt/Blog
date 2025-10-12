import { createClient, RedisClientType } from 'redis';

const redis: RedisClientType = createClient({
    url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
    socket: {
        reconnectStrategy: (retries: number) => {
            if (retries > 10) {
                console.error('Too many Redis reconnection attempts');
                return new Error('Too many retries');
            }
            return retries * 100;
        }
    }
});

redis.on('error', (err: Error) => {
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
redis.connect().catch((err: Error) => {
    console.error('Failed to connect to Redis:', err);
});

export default redis;
