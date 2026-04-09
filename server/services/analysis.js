// ============================================
// ANALYSIS SERVICE
// Simulates AI/ML analysis for deepfake detection
// with Explainable AI (XAI) — structured explanations & metrics
// Replace with real model integration later
// ============================================

class AnalysisService {
  constructor() {
    // ── Explanation templates (structured, per type & risk) ──
    this.explanationTemplates = {
      video: {
        high: [
          { title: 'Nhịp chớp mắt bất thường', description: 'Phát hiện tần suất chớp mắt 2.3 lần/phút, thấp hơn nhiều so với mức bình thường (15-20 lần/phút). Đây là dấu hiệu phổ biến của video deepfake.', severity: 'high', icon: 'visibility_off' },
          { title: 'Biên giới khuôn mặt không tự nhiên', description: 'Phát hiện artifact nén không đồng đều quanh vùng mặt, cho thấy khuôn mặt có thể được ghép từ nguồn khác.', severity: 'high', icon: 'face_retouching_off' },
          { title: 'Khẩu hình miệng không khớp âm thanh', description: 'Chuyển động miệng lệch so với âm thanh khoảng 120ms. Người nói thật sẽ có độ đồng bộ dưới 30ms.', severity: 'high', icon: 'voice_over_off' },
          { title: 'Ánh sáng mặt không nhất quán', description: 'Hướng ánh sáng trên khuôn mặt khác với ánh sáng môi trường xung quanh, cho thấy mặt được chèn từ nguồn khác.', severity: 'medium', icon: 'light_mode' },
          { title: 'Phổ tần số bất thường (GAN Artifacts)', description: 'Phân tích phổ tần số phát hiện dấu hiệu đặc trưng của mạng GAN — công nghệ thường dùng để tạo deepfake.', severity: 'high', icon: 'analytics' },
          { title: 'Kết cấu da không tự nhiên', description: 'Vùng trán và cằm có kết cấu da quá mượt, thiếu các chi tiết tự nhiên như nếp nhăn và lỗ chân lông.', severity: 'medium', icon: 'dermatology' }
        ],
        medium: [
          { title: 'Kết cấu da thiếu chi tiết', description: 'Một số vùng da mặt (trán, cằm) có kết cấu mượt bất thường, có thể do chỉnh sửa hoặc nén video quá mức.', severity: 'medium', icon: 'dermatology' },
          { title: 'Tỷ lệ khung hình không đều', description: 'Phát hiện một số frame có sự nhấp nháy nhẹ ở vùng biên mặt. Có thể do chỉnh sửa hoặc lỗi nén.', severity: 'medium', icon: 'slow_motion_video' },
          { title: 'Độ nét không đồng đều', description: 'Vùng khuôn mặt có độ nét khác so với phần còn lại của video, có thể do nén hoặc chỉnh sửa.', severity: 'low', icon: 'blur_on' },
          { title: 'Chuyển động đầu cứng nhắc', description: 'Góc quay đầu thay đổi nhưng các chi tiết nhỏ trên mặt không phản hồi tự nhiên.', severity: 'medium', icon: 'accessibility_new' }
        ],
        low: [
          { title: 'Chuyển động tự nhiên', description: 'Phân tích các chuyển động cơ mặt (AU - Action Units) cho thấy biểu cảm hoàn toàn tự nhiên.', severity: 'low', icon: 'sentiment_satisfied' },
          { title: 'Ánh sáng và bóng đổ nhất quán', description: 'Hướng ánh sáng và bóng đổ trên khuôn mặt phù hợp hoàn toàn với môi trường.', severity: 'low', icon: 'check_circle' },
          { title: 'Không phát hiện GAN Artifacts', description: 'Phổ tần số của video không có dấu hiệu đặc trưng của AI tổng hợp.', severity: 'low', icon: 'verified' }
        ]
      },
      audio: {
        high: [
          { title: 'Tần số pitch dao động bất thường', description: 'Phát hiện pitch fluctuation 12Hz, cao hơn nhiều so với mức bình thường (3-5Hz). Đây là dấu hiệu rõ ràng của voice cloning.', severity: 'high', icon: 'graphic_eq' },
          { title: 'Thiếu nhiễu môi trường', description: 'Âm thanh hoàn toàn "sạch" — thiếu tiếng ồn nền tự nhiên mà bất kỳ cuộc gọi thực nào cũng có.', severity: 'high', icon: 'noise_aware' },
          { title: 'Formant không tự nhiên', description: 'Tần số cộng hưởng (formant) của giọng nói không phù hợp với đặc điểm sinh lý tự nhiên.', severity: 'high', icon: 'voice_over_off' },
          { title: 'Pattern lặp lại đặc trưng AI', description: 'Phát hiện mẫu phổ tần lặp lại — đặc trưng của công nghệ AI voice synthesis.', severity: 'medium', icon: 'pattern' },
          { title: 'Hơi thở không tự nhiên', description: 'Thiếu nhịp thở giữa các câu, hoặc nhịp thở có mẫu máy móc, không phải người thật.', severity: 'medium', icon: 'air' }
        ],
        medium: [
          { title: 'Chất lượng âm thanh không đồng đều', description: 'Một số đoạn có chất lượng khác biệt rõ rệt, có thể do ghép nối hoặc xử lý.', severity: 'medium', icon: 'equalizer' },
          { title: 'Tần số dao động nhẹ', description: 'Phát hiện dao động nhỏ trong tần số giọng nói. Có thể do chất lượng micro hoặc can thiệp nhẹ.', severity: 'low', icon: 'graphic_eq' },
          { title: 'Ngữ điệu cứng nhắc', description: 'Giọng nói thiếu sự biến đổi ngữ điệu tự nhiên ở một số đoạn.', severity: 'medium', icon: 'record_voice_over' }
        ],
        low: [
          { title: 'Giọng nói tự nhiên', description: 'Tất cả thông số phân tích (pitch, formant, jitter, shimmer) nằm trong ngưỡng bình thường.', severity: 'low', icon: 'mic' },
          { title: 'Nhiễu nền tự nhiên', description: 'Phát hiện tiếng ồn môi trường tự nhiên, phù hợp với cuộc gọi/ghi âm thực.', severity: 'low', icon: 'check_circle' },
          { title: 'Nhịp thở tự nhiên', description: 'Phát hiện nhịp thở giữa các câu, phù hợp với người nói thật.', severity: 'low', icon: 'verified' }
        ]
      },
      link: {
        high: [
          { title: 'Domain đăng ký mới', description: 'Tên miền được đăng ký dưới 30 ngày. Các trang web lừa đảo thường sử dụng domain mới để tránh bị phát hiện.', severity: 'high', icon: 'domain_disabled' },
          { title: 'Chứng chỉ SSL không hợp lệ', description: 'Trang web sử dụng chứng chỉ SSL tự ký hoặc hết hạn. Ngân hàng và tổ chức uy tín luôn có SSL hợp lệ.', severity: 'high', icon: 'no_encryption' },
          { title: 'Trang phishing (giả mạo)', description: 'Phát hiện form thu thập thông tin tài khoản ngân hàng. KHÔNG nhập bất kỳ thông tin nào!', severity: 'high', icon: 'phishing' },
          { title: 'Homoglyph attack', description: 'Tên miền sử dụng ký tự Unicode giống hệt tên ngân hàng/tổ chức thật nhưng thực tế là trang giả.', severity: 'high', icon: 'warning' },
          { title: 'Chứa mã độc', description: 'Phát hiện mã JavaScript đáng ngờ có thể đánh cắp thông tin khi bạn nhập liệu.', severity: 'high', icon: 'bug_report' }
        ],
        medium: [
          { title: 'Domain mới (< 90 ngày)', description: 'Tên miền đăng ký chưa đến 90 ngày. Cần thận trọng với các trang web mới.', severity: 'medium', icon: 'schedule' },
          { title: 'Thiếu thông tin doanh nghiệp', description: 'Không tìm thấy thông tin đăng ký kinh doanh hoặc địa chỉ công ty trên trang web.', severity: 'medium', icon: 'business_center' },
          { title: 'Nội dung sao chép', description: 'Nội dung trang web có dấu hiệu sao chép từ các trang web uy tín khác.', severity: 'low', icon: 'content_copy' }
        ],
        low: [
          { title: 'Chứng chỉ SSL hợp lệ', description: 'Trang web có chứng chỉ SSL hợp lệ, được cấp bởi tổ chức uy tín.', severity: 'low', icon: 'lock' },
          { title: 'Domain hoạt động lâu dài', description: 'Tên miền đã được đăng ký và hoạt động ổn định trong thời gian dài.', severity: 'low', icon: 'verified' },
          { title: 'Thuộc danh sách uy tín', description: 'Website nằm trong danh sách các trang web đáng tin cậy.', severity: 'low', icon: 'workspace_premium' }
        ]
      }
    };

    // ── Metrics templates (per type & risk) ──
    this.metricsTemplates = {
      video: {
        high: {
          blink_rate: { label: 'Tần suất chớp mắt', value: '2.3/phút', normal: '15-20/phút', status: 'abnormal' },
          face_boundary: { label: 'Nhất quán biên mặt', value: '62%', threshold: '95%', status: 'abnormal' },
          lip_sync_delay: { label: 'Độ trễ khẩu hình', value: '120ms', threshold: '< 30ms', status: 'abnormal' },
          gan_artifacts: { label: 'GAN Artifacts', value: 'Phát hiện', status: 'abnormal' },
          lighting_consistency: { label: 'Nhất quán ánh sáng', value: '58%', threshold: '90%', status: 'abnormal' }
        },
        medium: {
          blink_rate: { label: 'Tần suất chớp mắt', value: '12/phút', normal: '15-20/phút', status: 'warning' },
          face_boundary: { label: 'Nhất quán biên mặt', value: '88%', threshold: '95%', status: 'warning' },
          lip_sync_delay: { label: 'Độ trễ khẩu hình', value: '45ms', threshold: '< 30ms', status: 'warning' },
          gan_artifacts: { label: 'GAN Artifacts', value: 'Không rõ ràng', status: 'warning' },
          skin_texture: { label: 'Kết cấu da', value: 'Bất thường nhẹ', status: 'warning' }
        },
        low: {
          blink_rate: { label: 'Tần suất chớp mắt', value: '17/phút', normal: '15-20/phút', status: 'normal' },
          face_boundary: { label: 'Nhất quán biên mặt', value: '98%', threshold: '95%', status: 'normal' },
          lip_sync_delay: { label: 'Độ trễ khẩu hình', value: '8ms', threshold: '< 30ms', status: 'normal' },
          gan_artifacts: { label: 'GAN Artifacts', value: 'Không phát hiện', status: 'normal' },
          lighting_consistency: { label: 'Nhất quán ánh sáng', value: '96%', threshold: '90%', status: 'normal' }
        }
      },
      audio: {
        high: {
          pitch_fluctuation: { label: 'Dao động pitch', value: '12Hz', normal: '3-5Hz', status: 'abnormal' },
          formant_match: { label: 'Phù hợp formant', value: '45%', threshold: '85%', status: 'abnormal' },
          background_noise: { label: 'Nhiễu nền', value: 'Không có', normal: 'Có nhiễu tự nhiên', status: 'abnormal' },
          breathing_pattern: { label: 'Nhịp thở', value: 'Không phát hiện', normal: 'Có nhịp thở tự nhiên', status: 'abnormal' },
          jitter: { label: 'Jitter (biến thiên chu kỳ)', value: '0.8%', threshold: '< 1.04%', status: 'warning' }
        },
        medium: {
          pitch_fluctuation: { label: 'Dao động pitch', value: '7Hz', normal: '3-5Hz', status: 'warning' },
          formant_match: { label: 'Phù hợp formant', value: '72%', threshold: '85%', status: 'warning' },
          background_noise: { label: 'Nhiễu nền', value: 'Ít', normal: 'Có nhiễu tự nhiên', status: 'warning' },
          shimmer: { label: 'Shimmer (biến thiên biên độ)', value: '4.2%', threshold: '< 3.81%', status: 'warning' }
        },
        low: {
          pitch_fluctuation: { label: 'Dao động pitch', value: '4Hz', normal: '3-5Hz', status: 'normal' },
          formant_match: { label: 'Phù hợp formant', value: '94%', threshold: '85%', status: 'normal' },
          background_noise: { label: 'Nhiễu nền', value: 'Có nhiễu tự nhiên', status: 'normal' },
          breathing_pattern: { label: 'Nhịp thở', value: 'Tự nhiên', status: 'normal' }
        }
      },
      link: {
        high: {
          domain_age: { label: 'Tuổi tên miền', value: '12 ngày', threshold: '> 365 ngày', status: 'abnormal' },
          ssl_cert: { label: 'Chứng chỉ SSL', value: 'Tự ký / Không hợp lệ', status: 'abnormal' },
          phishing_score: { label: 'Điểm phishing', value: '87/100', threshold: '< 30/100', status: 'abnormal' },
          malware_detected: { label: 'Phát hiện mã độc', value: 'Có', status: 'abnormal' },
          blacklist_status: { label: 'Danh sách đen', value: 'Có trong 3 danh sách', status: 'abnormal' }
        },
        medium: {
          domain_age: { label: 'Tuổi tên miền', value: '67 ngày', threshold: '> 365 ngày', status: 'warning' },
          ssl_cert: { label: 'Chứng chỉ SSL', value: 'Hợp lệ (Let\'s Encrypt)', status: 'normal' },
          phishing_score: { label: 'Điểm phishing', value: '52/100', threshold: '< 30/100', status: 'warning' },
          business_info: { label: 'Thông tin doanh nghiệp', value: 'Không tìm thấy', status: 'warning' }
        },
        low: {
          domain_age: { label: 'Tuổi tên miền', value: '5+ năm', threshold: '> 365 ngày', status: 'normal' },
          ssl_cert: { label: 'Chứng chỉ SSL', value: 'Hợp lệ (EV Certificate)', status: 'normal' },
          phishing_score: { label: 'Điểm phishing', value: '8/100', threshold: '< 30/100', status: 'normal' },
          blacklist_status: { label: 'Danh sách đen', value: 'Không có', status: 'normal' }
        }
      }
    };

    // ── Legacy detail strings (kept for backward compatibility) ──
    this.analysisDetails = {
      video: {
        high: [
          'Vùng mắt chớp không tự nhiên (blink rate 2.3/phút, bình thường 15-20/phút). Phát hiện artifact nén không đồng đều quanh vùng mặt. Khả năng cao là video Deepfake.',
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
        // Regenerate explanations for high risk
        analysis.explanations = this.generateExplanations('link', 'high');
        analysis.metrics = this.generateMetrics('link', 'high');
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
        analysis.explanations = this.generateExplanations('link', 'high');
        analysis.metrics = this.generateMetrics('link', 'high');
      }

      // Known safe domains
      const safeDomains = ['google.com', 'youtube.com', 'facebook.com', 'zalo.me', 'gov.vn'];
      if (safeDomains.some(d => urlObj.hostname.includes(d))) {
        analysis.riskLevel = 'low';
        analysis.confidence = Math.max(analysis.confidence, 85);
        analysis.detail = this.getRandomDetail('link', 'low');
        analysis.explanations = this.generateExplanations('link', 'low');
        analysis.metrics = this.generateMetrics('link', 'low');
      }
    } catch {
      // Invalid URL, already handled by validator
    }

    return analysis;
  }

  /**
   * Generate simulated analysis result with structured explanations & metrics
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
    const explanations = this.generateExplanations(type, riskLevel);
    const metrics = this.generateMetrics(type, riskLevel);

    return { riskLevel, confidence, detail, explanations, metrics };
  }

  /**
   * Generate structured explanations for a given type and risk level
   * Returns 2-4 explanation items depending on risk severity
   */
  generateExplanations(type, riskLevel) {
    const templates = this.explanationTemplates[type]?.[riskLevel] || [];
    if (templates.length === 0) return [];

    // Pick 2-4 explanations based on risk level
    const count = riskLevel === 'high' ? Math.min(4, templates.length)
               : riskLevel === 'medium' ? Math.min(3, templates.length)
               : Math.min(2, templates.length);

    // Shuffle and pick
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((item, idx) => ({
      id: idx + 1,
      ...item
    }));
  }

  /**
   * Generate metrics for a given type and risk level
   */
  generateMetrics(type, riskLevel) {
    return this.metricsTemplates[type]?.[riskLevel] || {};
  }

  /**
   * Get a random detail message (legacy support)
   */
  getRandomDetail(type, riskLevel) {
    const details = this.analysisDetails[type]?.[riskLevel] || [];
    return details[Math.floor(Math.random() * details.length)] || '';
  }
}

module.exports = new AnalysisService();
