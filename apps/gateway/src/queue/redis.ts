import Redis from "ioredis";

let redis: Redis;

export async function initRedis(): Promise<void> {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null,
        lazyConnect: false,
    });
    await redis.ping();
    console.log("✅ Redis connected");
}

export function getRedis(): Redis {
    if (!redis) throw new Error("Redis not initialised");
    return redis;
}
