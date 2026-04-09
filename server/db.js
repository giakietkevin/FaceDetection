const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/safeguard.db');
const db = new Database(dbPath);

// Foreign keys off — no real auth yet; userId is a client-generated string
// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detections (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      fileName TEXT,
      url TEXT,
      riskLevel TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      details TEXT,
      explanations TEXT,
      analysisMetrics TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_contacts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      platform TEXT,
      autoNotify INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detection_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      detectionId TEXT NOT NULL,
      action TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_detections_userId ON detections(userId);
    CREATE INDEX IF NOT EXISTS idx_detections_createdAt ON detections(createdAt);
    CREATE INDEX IF NOT EXISTS idx_family_contacts_userId ON family_contacts(userId);
  `);
}

initializeDatabase();
runMigrations();

module.exports = db;

// Run lightweight migrations for existing databases
function runMigrations() {
  // Migration 1: Add explanations and analysisMetrics columns (Explainable AI - Q1)
  const cols = db.pragma('table_info(detections)').map(c => c.name);
  if (!cols.includes('explanations')) {
    db.exec('ALTER TABLE detections ADD COLUMN explanations TEXT;');
  }
  if (!cols.includes('analysisMetrics')) {
    db.exec('ALTER TABLE detections ADD COLUMN analysisMetrics TEXT;');
  }
}
