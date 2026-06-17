const app = require('./app');
const { initDb } = require('./db');

const PORT = Number(process.env.PORT || 5000);
const MAX_DB_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 10);
const DB_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 3000);

const sleep = (delayInMs) => new Promise((resolve) => setTimeout(resolve, delayInMs));

const start = async () => {
  try {
    let remainingRetries = MAX_DB_RETRIES;

    while (remainingRetries > 0) {
      try {
        await initDb();
        console.log('Database initialized successfully.');
        break;
      } catch (err) {
        remainingRetries -= 1;

        if (remainingRetries === 0) {
          throw err;
        }

        console.log(`Database unavailable. Retrying in ${DB_RETRY_DELAY_MS} ms... (${remainingRetries} retries left)`);
        await sleep(DB_RETRY_DELAY_MS);
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
