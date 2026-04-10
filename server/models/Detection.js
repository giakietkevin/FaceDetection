// ============================================
// DETECTION MODEL - Database queries
// ============================================
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const Detection = {
  /**
   * Create a new detection record
   */
  create({ userId, type, fileName, url, riskLevel, confidence, details, explanations, analysisMetrics, filePath }) {
    const detection = {
      id: uuidv4(),
      userId,
      type,
      fileName: fileName || null,
      url: url || null,
      riskLevel,
      confidence,
      details: details || null,
      explanations: explanations ? JSON.stringify(explanations) : null,
      analysisMetrics: analysisMetrics ? JSON.stringify(analysisMetrics) : null,
      filePath: filePath || null,
      createdAt: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO detections (id, userId, type, fileName, url, riskLevel, confidence, details, explanations, analysisMetrics, filePath, createdAt)
      VALUES (@id, @userId, @type, @fileName, @url, @riskLevel, @confidence, @details, @explanations, @analysisMetrics, @filePath, @createdAt)
    `).run(detection);

    // Return parsed version for API response
    return {
      ...detection,
      explanations: explanations || [],
      analysisMetrics: analysisMetrics || {}
    };
  },

  /**
   * Find a detection by ID
   */
  findById(id) {
    const row = db.prepare('SELECT * FROM detections WHERE id = ?').get(id);
    return row ? this._parseJsonFields(row) : null;
  },

  /**
   * Get detection history for a user
   */
  findByUser(userId, limit = 20, offset = 0) {
    const rows = db.prepare(`
      SELECT * FROM detections
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const { count: total } = db.prepare(
      'SELECT COUNT(*) as count FROM detections WHERE userId = ?'
    ).get(userId);

    return { detections: rows.map(r => this._parseJsonFields(r)), total };
  },

  /**
   * Get statistics for a user
   */
  getStats(userId) {
    const total = db.prepare(
      'SELECT COUNT(*) as count FROM detections WHERE userId = ?'
    ).get(userId).count;

    const riskCounts = db.prepare(`
      SELECT riskLevel, COUNT(*) as count
      FROM detections
      WHERE userId = ?
      GROUP BY riskLevel
    `).all(userId);

    const typeCounts = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM detections
      WHERE userId = ?
      GROUP BY type
    `).all(userId);

    const recentActivity = db.prepare(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM detections
      WHERE userId = ? AND createdAt >= datetime('now', '-7 days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `).all(userId);

    return {
      total,
      byRisk: riskCounts.reduce((acc, r) => {
        acc[r.riskLevel] = r.count;
        return acc;
      }, { high: 0, medium: 0, low: 0 }),
      byType: typeCounts.reduce((acc, r) => {
        acc[r.type] = r.count;
        return acc;
      }, { video: 0, audio: 0, link: 0 }),
      recentActivity
    };
  },

  /**
   * Delete a detection by ID (owner only)
   */
  delete(id, userId) {
    const result = db.prepare(
      'DELETE FROM detections WHERE id = ? AND userId = ?'
    ).run(id, userId);
    return result.changes > 0;
  },

  /**
   * Parse JSON fields from database row
   */
  _parseJsonFields(row) {
    return {
      ...row,
      explanations: row.explanations ? JSON.parse(row.explanations) : [],
      analysisMetrics: row.analysisMetrics ? JSON.parse(row.analysisMetrics) : {}
    };
  }
};

module.exports = Detection;
