const { createClient } = require('redis');

let redisClient = null;

const initRedis = async () => {
  if (redisClient) return redisClient;

  // Uses REDIS_URL from .env
  // Format: redis[s]://[[username][:password]@][host][:port][/db-number]
  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }

  return redisClient;
};

const getRedisClient = async () => {
  if (!redisClient) {
    await initRedis();
  }
  return redisClient;
};

module.exports = {
  initRedis,
  getRedisClient
};
