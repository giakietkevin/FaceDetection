// ============================================
// DETECTION ROUTES
// POST /api/detect/video
// POST /api/detect/audio
// POST /api/detect/link
// GET  /api/detect/history
// GET  /api/detect/:id
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
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

// Helper: simulate AI analysis (replace with real model later)
function simulateAnalysis(type) {
  const risks = ['low', 'medium', 'high'];
  const riskLevel = risks[Math.floor(Math.random() * risks.length)];
  const confidence = Math.floor(Math.random() * 40) + 60; // 60–100%

  const details = {
    video: {
      high: 'Vùng mắt chớp không tự nhiên (blink rate 2.3/s, bình thường 14-17/s). Phát hiện artifact nén không đồng đều quanh vùng mặt. Khả năng cao là video Deepfake.',
      medium: 'Phát hiện một số dấu hiệu bất thường ở vùng da mặt. Cần kiểm tra thêm để xác định.',
      low: 'Không phát hiện dấu hiệu bất thường đáng kể. Video có vẻ xác thực.'
    },
    audio: {
      high: 'Phát hiện tần số không tự nhiên (pitch fluctuation 12Hz, bình thường 3-5Hz). Có dấu hiệu sử dụng voice cloning.',
      medium: 'Một số đặc điểm giọng nói có thể không khớp. Cần xác minh thêm.',
      low: 'Giọng nói có vẻ tự nhiên, không phát hiện dấu hiệu giả mạo.'
    },
    link: {
      high: 'URL dẫn đến trang web có lịch sử lừa đảo. Domain đăng ký < 30 ngày. Cảnh báo ngay lập tức.',
      medium: 'Trang web chưa được xác minh. Có một số dấu hiệu đáng ngờ.',
      low: 'Đường dẫn an toàn. Không phát hiện mối đe dọa.'
    }
  };

  return { riskLevel, confidence, detail: details[type]?.[riskLevel] || '' };
}

// POST /api/detect/video
router.post('/video', upload.single('file'), (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file video' });
    }

    const analysis = simulateAnalysis('video');
    const detection = {
      id: uuidv4(),
      userId,
      type: 'video',
      fileName: file.originalname,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      createdAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO detections (id, userId, type, fileName, riskLevel, confidence, details, createdAt)
      VALUES (@id, @userId, @type, @fileName, @riskLevel, @confidence, @details, @createdAt)
    `);
    stmt.run(detection);

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/video]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi phân tích video' });
  }
});

// POST /api/detect/audio
router.post('/audio', upload.single('file'), (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file âm thanh' });
    }

    const analysis = simulateAnalysis('audio');
    const detection = {
      id: uuidv4(),
      userId,
      type: 'audio',
      fileName: file.originalname,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      createdAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO detections (id, userId, type, fileName, riskLevel, confidence, details, createdAt)
      VALUES (@id, @userId, @type, @fileName, @riskLevel, @confidence, @details, @createdAt)
    `);
    stmt.run(detection);

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/audio]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi phân tích giọng nói' });
  }
});

// POST /api/detect/link
router.post('/link', express.json(), (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đường dẫn' });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return res.status(400).json({ success: false, message: 'Đường dẫn không hợp lệ' });
    }

    const analysis = simulateAnalysis('link');
    const detection = {
      id: uuidv4(),
      userId,
      type: 'link',
      url,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      details: analysis.detail,
      createdAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO detections (id, userId, type, url, riskLevel, confidence, details, createdAt)
      VALUES (@id, @userId, @type, @url, @riskLevel, @confidence, @details, @createdAt)
    `);
    stmt.run(detection);

    res.json({ success: true, detection });
  } catch (err) {
    console.error('[POST /detect/link]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra đường dẫn' });
  }
});

// GET /api/detect/history?limit=20&offset=0
router.get('/history', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const rows = db.prepare(`
      SELECT * FROM detections
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM detections WHERE userId = ?
    `).get(userId).count;

    res.json({ success: true, detections: rows, total, limit, offset });
  } catch (err) {
    console.error('[GET /detect/history]', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử' });
  }
});

// GET /api/detect/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM detections WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả phân tích' });
    }
    res.json({ success: true, detection: row });
  } catch (err) {
    console.error('[GET /detect/:id]', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
