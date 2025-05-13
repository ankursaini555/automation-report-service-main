import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

/**
 * Connects to Redis only if not already connected.
 */
export const connectRedis = async (): Promise<RedisClientType> => {
  if (!client) {
    client = createClient({
      url: "redis://127.0.0.1:6379", // redis rurl
    });

    client.on("error", (err: Error) => {
      console.error("Redis error:", err);
    });

    await client.connect();
    console.log("✅ Connected to Redis");
  }

  return client;
};

/**
 * Checks if Redis is connected and responding to ping.
 */
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const redis = await connectRedis(); // ensures connection
    const pong = await redis.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("❌ Redis health check failed:", error);
    return false;
  }
};

/**
 * Manually closes the Redis connection.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (client && client.isOpen) {
    await client.quit();
    console.log("❎ Disconnected from Redis");
    client = null;
  }
};


export const JsonResponseToText = (json: any) => {
  let text = "";

  // Add the main service name and status
  text += `${json.name
    .replace(/\s+/g, "_")
    .toUpperCase()}=${json.status.toUpperCase()}\n`;

  // Process dependency services
  if (Array.isArray(json.dependencyServices)) {
    json.dependencyServices.forEach((service: any) => {
      text += `${service.name
        .replace(/\s+/g, "_")
        .toUpperCase()}=${service.status.toUpperCase()}\n`;
    });
  }

  // Add the timestamp
  text += `TIME=${json.timestamp}`;

  return text.trim();
};
