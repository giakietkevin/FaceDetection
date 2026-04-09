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

// Import middleware
const { extractUserId, rateLimit } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SafeGuard Senior API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes (with authentication)
app.use('/api/detect', require('./routes/detect'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));

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
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

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
