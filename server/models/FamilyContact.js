// ============================================
// FAMILY CONTACT MODEL - Database queries
// ============================================
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const FamilyContact = {
  /**
   * Get all contacts for a user
   */
  findByUser(userId) {
    return db.prepare(
      'SELECT * FROM family_contacts WHERE userId = ? ORDER BY createdAt DESC'
    ).all(userId);
  },

  /**
   * Find a contact by ID (owner check)
   */
  findById(id, userId) {
    return db.prepare(
      'SELECT * FROM family_contacts WHERE id = ? AND userId = ?'
    ).get(id, userId);
  },

  /**
   * Create a new family contact
   */
  create({ userId, name, phone, platform = 'Zalo', autoNotify = 1 }) {
    const contact = {
      id: uuidv4(),
      userId,
      name,
      phone,
      platform,
      autoNotify: autoNotify ? 1 : 0,
      createdAt: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO family_contacts (id, userId, name, phone, platform, autoNotify, createdAt)
      VALUES (@id, @userId, @name, @phone, @platform, @autoNotify, @createdAt)
    `).run(contact);

    return contact;
  },

  /**
   * Update a family contact
   */
  update(id, userId, updates) {
    const allowed = ['name', 'phone', 'platform', 'autoNotify'];
    const fields = Object.keys(updates).filter(k => allowed.includes(k));

    if (fields.length === 0) return false;

    const setClause = fields.map(f => `${f} = @${f}`).join(', ');
    const params = { ...Object.fromEntries(fields.map(f => [f, updates[f]])), id, userId };

    const result = db.prepare(
      `UPDATE family_contacts SET ${setClause} WHERE id = @id AND userId = @userId`
    ).run(params);

    return result.changes > 0;
  },

  /**
   * Delete a contact
   */
  delete(id, userId) {
    const result = db.prepare(
      'DELETE FROM family_contacts WHERE id = ? AND userId = ?'
    ).run(id, userId);
    return result.changes > 0;
  },

  /**
   * Get contacts with autoNotify enabled for a user
   */
  getNotifiableContacts(userId) {
    return db.prepare(
      'SELECT * FROM family_contacts WHERE userId = ? AND autoNotify = 1 ORDER BY createdAt'
    ).all(userId);
  }
};

module.exports = FamilyContact;
