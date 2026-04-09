// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================

// Validate phone number (Vietnamese format)
function validatePhone(phone) {
  const cleaned = phone.replace(/\s/g, '');
  return /^(0|\+84)[0-9]{9,10}$/.test(cleaned);
}

// Validate URL
function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate contact data
function validateContactData(req, res, next) {
  const { name, phone } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tên người thân không hợp lệ'
    });
  }

  if (!phone || typeof phone !== 'string' || !validatePhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)'
    });
  }

  req.body.name = name.trim();
  req.body.phone = phone.trim();
  next();
}

// Validate link check data
function validateLinkData(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đường dẫn'
    });
  }

  if (!validateURL(url)) {
    return res.status(400).json({
      success: false,
      message: 'Đường dẫn không hợp lệ'
    });
  }

  req.body.url = url.trim();
  next();
}

// Validate pagination params
function validatePagination(req, res, next) {
  let limit = parseInt(req.query.limit) || 20;
  let offset = parseInt(req.query.offset) || 0;

  // Enforce limits
  if (limit < 1 || limit > 100) limit = 20;
  if (offset < 0) offset = 0;

  req.query.limit = limit;
  req.query.offset = offset;
  next();
}

module.exports = {
  validatePhone,
  validateURL,
  validateContactData,
  validateLinkData,
  validatePagination
};
