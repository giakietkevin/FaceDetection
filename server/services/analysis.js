// ============================================
// AI ANALYSIS ORCHESTRATOR
// Connects to Python FastAPI sidecar for real deepfake detection
// ============================================

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// The simulated service (fallback if Python sidecar is down)
const fallbackService = {
  // We keep a minimal version of the old simulator just in case
  analyzeLink(url) {
    const urlObj = new URL(url);
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.buzz'];
    let riskLevel = 'low';
    let confidence = 85;

    if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
      riskLevel = 'high';
      confidence = 95;
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)) {
      riskLevel = 'high';
      confidence = 90;
    }

    return {
      riskLevel,
      confidence,
      detail: riskLevel === 'high' ? 'Phát hiện đường dẫn đáng ngờ, có dấu hiệu lừa đảo.' : 'Đường dẫn có vẻ an toàn.',
      explanations: [{
        id: 1, title: riskLevel === 'high' ? 'Cảnh báo lừa đảo' : 'Đường dẫn an toàn',
        description: riskLevel === 'high' ? 'URL có dấu hiệu của một trang web phishing.' : 'Không phát hiện mã độc hoặc dấu hiệu lừa đảo.',
        severity: riskLevel, icon: riskLevel === 'high' ? 'phishing' : 'verified'
      }],
      metrics: {
        safety_score: { label: 'Độ an toàn', value: `${100-confidence}/100`, status: riskLevel === 'high' ? 'abnormal' : 'normal' }
      }
    };
  },

  errorResult(type, errorMsg) {
    return {
      riskLevel: 'medium',
      confidence: 50,
      detail: `Lỗi kết nối đến máy chủ AI: ${errorMsg}. Đang sử dụng chế độ dự phòng.`,
      explanations: [{
        id: 1, title: 'Lỗi máy chủ AI',
        description: 'Hệ thống AI phân tích sâu đang bận hoặc không phản hồi.',
        severity: 'medium', icon: 'cloud_off'
      }],
      metrics: {}
    };
  }
};

class AnalysisService {
  constructor() {
    this.PYTHON_API_URL = (process.env.PYTHON_API_URL || 'http://localhost:8001').trim();
  }

  /**
   * Analyze image/video via Python Sidecar
   */
  async analyzeMedia(filePath, originalName, type) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), { filename: originalName });

      let endpoint = type === 'video' ? '/detect/video' : '/detect/audio';
      // Mimetype heuristics - if it's an image, send to /detect/image
      if (type === 'video' && /\.(jpe?g|png|webp|bmp)$/i.test(originalName)) {
        endpoint = '/detect/image';
      }

      console.log(`[AI] Sending ${originalName} to Python Sidecar (${endpoint})...`);

      const response = await axios.post(`${this.PYTHON_API_URL}${endpoint}`, form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: 300000 // 5 minutes timeout for heavy video processing
      });

      console.log(`[AI] Received result from Python: Risk=${response.data.riskLevel}, Conf=${response.data.confidence}%`);
      return response.data;

    } catch (error) {
      console.error('[AI Analysis Error]', error.message);
      if (error.response) {
        console.error('Python API Error Data:', error.response.data);
      }
      return fallbackService.errorResult(type, error.message);
    }
  }

  /**
   * Analyze URL for phishing/scam detection
   * (Keeping this in Node.js since it doesn't need heavy ML)
   */
  analyzeLink(url) {
    return fallbackService.analyzeLink(url);
  }
}

module.exports = new AnalysisService();