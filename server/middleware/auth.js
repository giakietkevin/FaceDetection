// ============================================
// AUTHENTICATION & USER MIDDLEWARE
// ============================================

// Extract and validate user ID from headers
function extractUserId(req, res, next) {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'Missing x-user-id header'
    });
  }

  // Validate format: should be alphanumeric with underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  req.userId = userId;
  next();
}

// Rate limiting middleware (simple in-memory implementation)
const rateLimitStore = new Map();

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const userId = req.userId || 'anonymous';
    const key = `${userId}:${req.path}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
      });
    }

    recentRequests.push(now);
    rateLimitStore.set(key, recentRequests);
    next();
  };
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of rateLimitStore.entries()) {
    const active = requests.filter(time => now - time < 120000);
    if (active.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, active);
    }
  }
}, 60000);

module.exports = {
  extractUserId,
  rateLimit
};
