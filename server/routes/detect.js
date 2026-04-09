// ============================================
// DETECTION ROUTES
// POST /api/detect/video
// POST /api/detect/audio
// POST /api/detect/link
// GET  /api/detect/history
// GET  /api/detect/:id
// DELETE /api/detect/:id
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Detection = require('../models/Detection');
const analysisService = require('../services/analysis');
const notificationService = require('../services/notification');
const { extractUserId, rateLimit } = require('../middleware/auth');
const { validateLinkData, validatePagination } = require('../middleware/validator');

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = /video\/|audio\/|image\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không được hỗ trợ'));
    }
  }
});

// POST /api/detect/video - Analyze video/image for deepfake
router.post('/video', extractUserId, rateLimit(30, 60000), upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file video hoặc ảnh' });
    }

    // Run analysis
    const analysis = analysisService.analyzeVideo(file.originalname);

    // Save to database
    const detection = Detection.create({
      userId: req.userId,
      type: 'video',
      fileName: file.originalname,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      explanations: analysis.explanations,
      analysisMetrics: analysis.metrics
    });

    // Auto-notify family if high/medium risk
    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'medium') {
      notificationService.notifyFamily(req.userId, detection).catch(err => {
        console.error('[Notify] Background notification failed:', err);
      });
    }

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/video]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi phân tích video' });
  }
});

// POST /api/detect/audio - Analyze audio for voice cloning
router.post('/audio', extractUserId, rateLimit(30, 60000), upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file âm thanh' });
    }

    // Run analysis
    const analysis = analysisService.analyzeAudio(file.originalname);

    // Save to database
    const detection = Detection.create({
      userId: req.userId,
      type: 'audio',
      fileName: file.originalname,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      explanations: analysis.explanations,
      analysisMetrics: analysis.metrics
    });

    // Auto-notify family if high/medium risk
    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'medium') {
      notificationService.notifyFamily(req.userId, detection).catch(err => {
        console.error('[Notify] Background notification failed:', err);
      });
    }

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/audio]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi phân tích giọng nói' });
  }
});

// POST /api/detect/link - Analyze URL for phishing/scam
router.post('/link', extractUserId, rateLimit(60, 60000), express.json(), validateLinkData, async (req, res) => {
  try {
    const { url } = req.body;

    // Run analysis
    const analysis = analysisService.analyzeLink(url);

    // Save to database
    const detection = Detection.create({
      userId: req.userId,
      type: 'link',
      url,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      explanations: analysis.explanations,
      analysisMetrics: analysis.metrics
    });

    // Auto-notify family if high risk
    if (analysis.riskLevel === 'high') {
      notificationService.notifyFamily(req.userId, detection).catch(err => {
        console.error('[Notify] Background notification failed:', err);
      });
    }

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/link]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra đường dẫn' });
  }
});

// GET /api/detect/history?limit=20&offset=0
router.get('/history', extractUserId, validatePagination, (req, res) => {
  try {
    const { limit, offset } = req.query;
    const { detections, total } = Detection.findByUser(req.userId, limit, offset);

    res.json({ success: true, detections, total, limit, offset });
  } catch (err) {
    console.error('[GET /detect/history]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử' });
  }
});

// GET /api/detect/:id
router.get('/:id', (req, res) => {
  try {
    const detection = Detection.findById(req.params.id);
    if (!detection) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả phân tích' });
    }
    res.json({ success: true, detection });
  } catch (err) {
    console.error('[GET /detect/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// DELETE /api/detect/:id
router.delete('/:id', extractUserId, (req, res) => {
  try {
    const deleted = Detection.delete(req.params.id, req.userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả hoặc không có quyền xóa'
      });
    }

    res.json({ success: true, message: 'Đã xóa kết quả phân tích' });
  } catch (err) {
    console.error('[DELETE /detect/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa kết quả' });
  }
});

module.exports = router;
