const app = require('./app');
const { initRedis } = require('./utils/redisClient');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (process.env.REDIS_URL) {
    await initRedis();
  } else {
    console.warn('⚠️ No REDIS_URL found in .env, Redis will not be connected.');
  }

  app.listen(PORT, () => {
    console.log(`
  🚀 EffortX Analyzer Server is running!
  📡 Port: ${PORT}
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
};

startServer();
