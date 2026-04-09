// ============================================
// USER MODEL - Database queries
// ============================================
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const User = {
  /**
   * Get or create a user
   */
  getOrCreate(userId) {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      user = {
        id: userId,
        name: null,
        phone: null,
        createdAt: new Date().toISOString()
      };
      db.prepare(`
        INSERT INTO users (id, name, phone, createdAt)
        VALUES (@id, @name, @phone, @createdAt)
      `).run(user);
    }

    return user;
  },

  /**
   * Update user profile
   */
  update(userId, updates) {
    const allowed = ['name', 'phone'];
    const fields = Object.keys(updates).filter(k => allowed.includes(k));

    if (fields.length === 0) return false;

    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    const params = { ...Object.fromEntries(fields.map(f => [f, updates[f]])), id: userId };

    const result = db.prepare(
      `UPDATE users SET ${setClause} WHERE id = @id`
    ).run(params);

    return result.changes > 0;
  },

  /**
   * Get user profile
   */
  findById(userId) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }
};

module.exports = User;
