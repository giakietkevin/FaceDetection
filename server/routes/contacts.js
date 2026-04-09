// ============================================
// FAMILY CONTACT ROUTES
// GET    /api/contacts
// POST   /api/contacts
// PUT    /api/contacts/:id
// DELETE /api/contacts/:id
// ============================================
const express = require('express');
const router = express.Router();
const FamilyContact = require('../models/FamilyContact');
const { extractUserId } = require('../middleware/auth');
const { validateContactData } = require('../middleware/validator');

// GET /api/contacts
router.get('/', extractUserId, (req, res) => {
  try {
    const contacts = FamilyContact.findByUser(req.userId);
    res.json({ success: true, contacts });
  } catch (err) {
    console.error('[GET /contacts]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách liên hệ' });
  }
});

// POST /api/contacts
router.post('/', extractUserId, express.json(), validateContactData, (req, res) => {
  try {
    const { name, phone, platform = 'Zalo', autoNotify = true } = req.body;

    // Check for duplicate phone
    const existing = FamilyContact.findByUser(req.userId);
    if (existing.some(c => c.phone === phone)) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại này đã được thêm'
      });
    }

    // Limit max contacts per user
    if (existing.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Tối đa 10 người thân. Vui lòng xóa liên hệ cũ trước.'
      });
    }

    const contact = FamilyContact.create({
      userId: req.userId,
      name,
      phone,
      platform,
      autoNotify
    });

    res.json({ success: true, contact, message: 'Thêm người thân thành công' });
  } catch (err) {
    console.error('[POST /contacts]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu liên hệ' });
  }
});

// PUT /api/contacts/:id - Update a contact
router.put('/:id', extractUserId, express.json(), (req, res) => {
  try {
    const { name, phone, platform, autoNotify } = req.body;

    const contact = FamilyContact.findById(req.params.id, req.userId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy liên hệ hoặc không có quyền chỉnh sửa'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (platform !== undefined) updates.platform = platform;
    if (autoNotify !== undefined) updates.autoNotify = autoNotify ? 1 : 0;

    const updated = FamilyContact.update(req.params.id, req.userId, updates);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Không có gì để cập nhật'
      });
    }

    const updatedContact = FamilyContact.findById(req.params.id, req.userId);
    res.json({ success: true, contact: updatedContact, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error('[PUT /contacts/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật liên hệ' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', extractUserId, (req, res) => {
  try {
    const deleted = FamilyContact.delete(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy liên hệ hoặc không có quyền xóa'
      });
    }

    res.json({ success: true, message: 'Xóa liên hệ thành công' });
  } catch (err) {
    console.error('[DELETE /contacts/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa liên hệ' });
  }
});

module.exports = router;
