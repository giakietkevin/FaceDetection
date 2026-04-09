// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// Centralized error handler
function errorHandler(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId || 'anonymous'
  });

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File quá lớn. Tối đa 100MB.'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Chỉ được tải lên một file'
    });
  }

  if (err.message && err.message.includes('Định dạng file không được hỗ trợ')) {
    return res.status(400).json({
      success: false,
      message: 'Định dạng file không được hỗ trợ'
    });
  }

  // Database errors
  if (err.message && err.message.includes('SQLITE')) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cơ sở dữ liệu'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server không xác định'
  });
}

// 404 handler
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
