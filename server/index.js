// ============================================
// SAFEGUARD SENIOR - EXPRESS SERVER
// ============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure required directories exist
const dirs = ['./data', './uploads'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/detect', require('./routes/detect'));
app.use('/api/contacts', require('./routes/contacts'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SafeGuard Senior API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/detect', (req, res) => {
  res.sendFile(path.join(__dirname, '../detectResult.html'));
});

app.get('/education', (req, res) => {
  res.sendFile(path.join(__dirname, '../education.html'));
});

app.get('/family', (req, res) => {
  res.sendFile(path.join(__dirname, '../familyContact.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi server không xác định'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   SafeGuard Senior - The Guardian's Hearth           ║
║                                                       ║
║   Server running on: http://localhost:${PORT}        ║
║   API endpoint:      http://localhost:${PORT}/api    ║
║                                                       ║
║   Press Ctrl+C to stop                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
