const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/safeguard.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS detections (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      fileName TEXT,
      url TEXT,
      riskLevel TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_contacts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      platform TEXT,
      autoNotify INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS detection_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      detectionId TEXT NOT NULL,
      action TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (detectionId) REFERENCES detections(id)
    );

    CREATE INDEX IF NOT EXISTS idx_detections_userId ON detections(userId);
    CREATE INDEX IF NOT EXISTS idx_detections_createdAt ON detections(createdAt);
    CREATE INDEX IF NOT EXISTS idx_family_contacts_userId ON family_contacts(userId);
  `);
}

initializeDatabase();

module.exports = db;
