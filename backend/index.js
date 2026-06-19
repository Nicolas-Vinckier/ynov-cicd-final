// Note: Ce fichier de bootstrap lance le serveur HTTP et effectue la connexion DB.
// Il est exclu de la couverture Jest (collectCoverageFrom) car il est difficile à tester unitairement sans effets de bord.
const app = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    let retries = 5;
    while (retries) {
      try {
        await initDb();
        console.log('Database initialized successfully.');
        break;
      } catch (err) {
        console.log(`Failed to connect to database. Retrying in 3 seconds... (${retries} retries left)`);
        retries -= 1;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 3000));
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
