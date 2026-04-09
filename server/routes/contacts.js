// ============================================
// FAMILY CONTACT ROUTES
// GET    /api/contacts
// POST   /api/contacts
// DELETE /api/contacts/:id
// ============================================
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// GET /api/contacts
router.get('/', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const contacts = db.prepare('SELECT * FROM family_contacts WHERE userId = ? ORDER BY createdAt DESC').all(userId);

    res.json({ success: true, contacts });
  } catch (err) {
    console.error('[GET /contacts]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách liên hệ' });
  }
});

// POST /api/contacts
router.post('/', express.json(), (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { name, phone, platform = 'Zalo', autoNotify = 1 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên và số điện thoại' });
    }

    const contact = {
      id: uuidv4(),
      userId,
      name,
      phone,
      platform,
      autoNotify: autoNotify ? 1 : 0,
      createdAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO family_contacts (id, userId, name, phone, platform, autoNotify, createdAt)
      VALUES (@id, @userId, @name, @phone, @platform, @autoNotify, @createdAt)
    `);
    stmt.run(contact);

    res.json({ success: true, contact, message: 'Thêm người thân thành công' });
  } catch (err) {
    console.error('[POST /contacts]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu liên hệ' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const result = db.prepare('DELETE FROM family_contacts WHERE id = ? AND userId = ?').run(req.params.id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ hoặc không có quyền xóa' });
    }

    res.json({ success: true, message: 'Xóa liên hệ thành công' });
  } catch (err) {
    console.error('[DELETE /contacts/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa liên hệ' });
  }
});

module.exports = router;
