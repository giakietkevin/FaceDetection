// ============================================
// ANALYSIS SERVICE
// Simulates AI/ML analysis for deepfake detection
// Replace with real model integration later
// ============================================

class AnalysisService {
  constructor() {
    // Analysis details mapped by type and risk level
    this.analysisDetails = {
      video: {
        high: [
          'Vùng mắt chớp không tự nhiên (blink rate 2.3/s, bình thường 14-17/s). Phát hiện artifact nén không đồng đều quanh vùng mặt. Khả năng cao là video Deepfake.',
          'Phát hiện biên giới không tự nhiên giữa vùng mặt và nền. Phổ tần số cho thấy dấu hiệu tổng hợp bằng AI (GAN artifacts rõ ràng).',
          'Chuyển động miệng không đồng bộ với âm thanh. Ánh sáng trên mặt không nhất quán với môi trường. Xác suất deepfake rất cao.'
        ],
        medium: [
          'Phát hiện một số dấu hiệu bất thường ở vùng da mặt. Kết cấu da thiếu tự nhiên ở vùng trán và cằm. Cần kiểm tra thêm.',
          'Tỷ lệ khung hình không đồng đều. Một số frame cho thấy sự nhấp nháy nhẹ ở vùng biên mặt. Đề nghị xác minh thêm.',
          'Độ nét vùng mặt không khớp với phần còn lại. Có thể là do nén video hoặc chỉnh sửa. Cần thận trọng.'
        ],
        low: [
          'Không phát hiện dấu hiệu bất thường đáng kể. Video có vẻ xác thực.',
          'Tất cả chỉ số phân tích trong ngưỡng bình thường. Không có dấu hiệu deepfake.',
          'Chất lượng video đạt chuẩn. Chuyển động tự nhiên. Không phát hiện artifact bất thường.'
        ]
      },
      audio: {
        high: [
          'Phát hiện tần số không tự nhiên (pitch fluctuation 12Hz, bình thường 3-5Hz). Có dấu hiệu sử dụng voice cloning.',
          'Phổ tần số cho thấy dấu hiệu tổng hợp giọng nói bằng AI. Thiếu nhiễu môi trường tự nhiên. Rất có thể là giọng nói giả.',
          'Formant frequencies không phù hợp với giọng nói tự nhiên. Phát hiện pattern lặp lại đặc trưng của AI voice synthesis.'
        ],
        medium: [
          'Một số đặc điểm giọng nói có thể không khớp. Tần số dao động nhẹ. Cần xác minh thêm.',
          'Chất lượng âm thanh không đồng đều. Có vài đoạn nghe không tự nhiên. Đề nghị kiểm tra nguồn.',
          'Phát hiện một số bất thường nhỏ trong phổ tần. Có thể do chất lượng thu âm hoặc xử lý.'
        ],
        low: [
          'Giọng nói có vẻ tự nhiên, không phát hiện dấu hiệu giả mạo.',
          'Tất cả thông số phân tích trong ngưỡng an toàn. Giọng nói xác thực.',
          'Phổ tần số tự nhiên. Không phát hiện dấu hiệu voice cloning hoặc AI synthesis.'
        ]
      },
      link: {
        high: [
          'URL dẫn đến trang web có lịch sử lừa đảo. Domain đăng ký < 30 ngày. Cảnh báo ngay lập tức.',
          'Trang web sử dụng chứng chỉ SSL tự ký. Domain tương tự ngân hàng nhưng là trang giả mạo (homoglyph attack).',
          'Phát hiện trang phishing. Form thu thập thông tin cá nhân/tài khoản ngân hàng. KHÔNG nhập bất kỳ thông tin nào.'
        ],
        medium: [
          'Trang web chưa được xác minh. Có một số dấu hiệu đáng ngờ.',
          'Domain mới đăng ký (< 90 ngày). Nội dung trang web có vẻ sao chép. Cần thận trọng.',
          'Không tìm thấy thông tin doanh nghiệp chính thức. Trang web thiếu các yếu tố tin cậy. Đề nghị kiểm tra thêm.'
        ],
        low: [
          'Đường dẫn an toàn. Không phát hiện mối đe dọa.',
          'Trang web có chứng chỉ SSL hợp lệ. Domain đã hoạt động lâu dài. An toàn để truy cập.',
          'Website thuộc danh sách uy tín. Không phát hiện dấu hiệu bất thường.'
        ]
      }
    };
  }

  /**
   * Analyze video/image for deepfake detection
   */
  analyzeVideo(fileName) {
    const analysis = this.generateAnalysis('video');

    // Apply heuristic scoring adjustments based on file characteristics
    if (fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      // Low quality/uncommon formats are more suspicious
      if (['avi', 'wmv'].includes(ext)) {
        analysis.confidence = Math.min(analysis.confidence + 5, 100);
      }
    }

    return analysis;
  }

  /**
   * Analyze audio for voice cloning detection
   */
  analyzeAudio(fileName) {
    return this.generateAnalysis('audio');
  }

  /**
   * Analyze URL for phishing/scam detection
   */
  analyzeLink(url) {
    const analysis = this.generateAnalysis('link');

    // Apply heuristic scoring based on URL characteristics
    try {
      const urlObj = new URL(url);

      // Suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.buzz'];
      if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
        analysis.riskLevel = 'high';
        analysis.confidence = Math.min(analysis.confidence + 15, 100);
        analysis.detail = 'Domain sử dụng tên miền cấp cao đáng ngờ (' + urlObj.hostname.split('.').pop() + '). ' + analysis.detail;
      }

      // Very long URLs are suspicious
      if (url.length > 200) {
        analysis.confidence = Math.min(analysis.confidence + 5, 100);
      }

      // URLs with IP addresses
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)) {
        analysis.riskLevel = 'high';
        analysis.confidence = Math.min(analysis.confidence + 10, 100);
        analysis.detail = 'URL sử dụng địa chỉ IP thay vì tên miền. Rất đáng ngờ. ' + analysis.detail;
      }

      // Known safe domains
      const safeDomains = ['google.com', 'youtube.com', 'facebook.com', 'zalo.me', 'gov.vn'];
      if (safeDomains.some(d => urlObj.hostname.includes(d))) {
        analysis.riskLevel = 'low';
        analysis.confidence = Math.max(analysis.confidence, 85);
        analysis.detail = this.getRandomDetail('link', 'low');
      }
    } catch {
      // Invalid URL, already handled by validator
    }

    return analysis;
  }

  /**
   * Generate simulated analysis result
   */
  generateAnalysis(type) {
    // Weighted random: more realistic distribution
    const rand = Math.random();
    let riskLevel;
    if (rand < 0.25) {
      riskLevel = 'high';
    } else if (rand < 0.55) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Confidence ranges by risk level
    const confidenceRanges = {
      high: { min: 75, max: 98 },
      medium: { min: 55, max: 80 },
      low: { min: 70, max: 95 }
    };
    const range = confidenceRanges[riskLevel];
    const confidence = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

    const detail = this.getRandomDetail(type, riskLevel);

    return { riskLevel, confidence, detail };
  }

  /**
   * Get a random detail message
   */
  getRandomDetail(type, riskLevel) {
    const details = this.analysisDetails[type]?.[riskLevel] || [];
    return details[Math.floor(Math.random() * details.length)] || '';
  }
}

module.exports = new AnalysisService();
