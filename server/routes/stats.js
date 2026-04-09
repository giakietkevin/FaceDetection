// ============================================
// STATISTICS & DASHBOARD ROUTES
// GET /api/stats
// GET /api/stats/summary
// ============================================
const express = require('express');
const router = express.Router();
const Detection = require('../models/Detection');
const FamilyContact = require('../models/FamilyContact');
const { extractUserId } = require('../middleware/auth');

// GET /api/stats - Full statistics for dashboard
router.get('/', extractUserId, (req, res) => {
  try {
    const userId = req.userId;

    const detectionStats = Detection.getStats(userId);
    const contacts = FamilyContact.findByUser(userId);

    res.json({
      success: true,
      stats: {
        detections: detectionStats,
        familyContacts: {
          total: contacts.length,
          withAutoNotify: contacts.filter(c => c.autoNotify === 1).length
        }
      }
    });
  } catch (err) {
    console.error('[GET /stats]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê' });
  }
});

// GET /api/stats/summary - Quick summary for home page
router.get('/summary', extractUserId, (req, res) => {
  try {
    const userId = req.userId;
    const stats = Detection.getStats(userId);

    res.json({
      success: true,
      summary: {
        totalScans: stats.total,
        highRiskCount: stats.byRisk.high || 0,
        lastScanDate: stats.recentActivity[0]?.date || null
      }
    });
  } catch (err) {
    console.error('[GET /stats/summary]', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
