// ============================================
// NOTIFICATION ROUTES
// POST /api/notifications/send
// POST /api/notifications/test
// ============================================
const express = require('express');
const router = express.Router();
const { extractUserId } = require('../middleware/auth');
const notificationService = require('../services/notification');
const Detection = require('../models/Detection');

// POST /api/notifications/send - Send notification about a detection
router.post('/send', extractUserId, async (req, res) => {
  try {
    const { detectionId } = req.body;

    if (!detectionId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID của kết quả phân tích'
      });
    }

    const detection = Detection.findById(detectionId);
    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả phân tích'
      });
    }

    const result = await notificationService.notifyFamily(req.userId, detection);

    res.json({
      success: true,
      ...result,
      message: result.sent > 0
        ? `Đã gửi thông báo cho ${result.sent}/${result.total} người thân`
        : 'Không có người thân nào để gửi thông báo'
    });
  } catch (err) {
    console.error('[POST /notifications/send]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi gửi thông báo' });
  }
});

// POST /api/notifications/test - Send test notification to a specific contact
router.post('/test', extractUserId, async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID liên hệ'
      });
    }

    const result = await notificationService.sendTestNotification(req.userId, contactId);

    res.json(result);
  } catch (err) {
    console.error('[POST /notifications/test]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi gửi tin nhắn thử nghiệm' });
  }
});

module.exports = router;
