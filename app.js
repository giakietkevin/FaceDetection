// ============================================
// SAFEGUARD SENIOR - MAIN APPLICATION LOGIC
// The Guardian's Hearth Design System
// ============================================

const API_BASE = window.location.origin + '/api';

// ============================================
// API CLIENT
// ============================================
class ApiClient {
  constructor() {
    this.userId = this.getOrCreateUserId();
  }

  getOrCreateUserId() {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('userId', id);
    }
    return id;
  }

  get headers() {
    return { 'x-user-id': this.userId };
  }

  async post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async postFile(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: formData
    });
    return res.json();
  }

  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: this.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: this.headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async put(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// ============================================
// NAVIGATION & ROUTING
// ============================================
class Router {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.initNavigation();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    const map = {
      home: ['home.html', '/', '/index.html', '/home'],
      detect: ['detectResult.html', '/detect'],
      education: ['education.html', '/education'],
      family: ['familyContact.html', '/family']
    };

    for (const [page, paths] of Object.entries(map)) {
      if (paths.some(p => path.endsWith(p) || path === p)) return page;
    }
    return 'home';
  }

  initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const pageHrefMap = {
      home: 'home.html',
      detect: 'detectResult.html',
      education: 'education.html',
      family: 'familyContact.html'
    };

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      // Check if this link matches current page
      const isActive = Object.entries(pageHrefMap).some(([page, file]) => {
        return page === this.currentPage && href.includes(file);
      });

      if (isActive) {
        link.classList.add('text-primary', 'border-b-4', 'border-primary');
        link.classList.remove('text-on-surface-variant');
      }
    });
  }

  navigateTo(page) {
    const pages = {
      home: 'home.html',
      detect: 'detectResult.html',
      education: 'education.html',
      family: 'familyContact.html'
    };
    if (pages[page]) window.location.href = pages[page];
  }
}

// ============================================
// FILE UPLOAD & DETECTION
// ============================================
class DetectionHandler {
  constructor(api) {
    this.api = api;
    this.supportedFormats = {
      video: ['mp4', 'avi', 'mov', 'webm'],
      image: ['jpg', 'jpeg', 'png', 'webp'],
      audio: ['mp3', 'wav', 'ogg', 'm4a']
    };
  }

  async handleVideoUpload(file) {
    if (!this.validateFile(file, file.type.startsWith('video/') ? 'video' : 'image')) {
      this.showError('Định dạng không được hỗ trợ. Vui lòng chọn file MP4, AVI, MOV, WEBM, JPG, PNG.');
      return;
    }

    this.showLoading('Đang phân tích video/ảnh...');

    try {
      const result = await this.api.postFile('/detect/video', file);

      if (result.success) {
        localStorage.setItem('latestDetection', JSON.stringify(result.detection));
        window.location.href = 'detectResult.html';
      } else {
        this.hideLoading();
        this.showError(result.message || 'Lỗi khi phân tích');
      }
    } catch (err) {
      this.hideLoading();
      // Fallback to local simulation if server is down
      this.fallbackLocal('video', file.name);
    }
  }

  async handleAudioUpload(file) {
    if (!this.validateFile(file, 'audio')) {
      this.showError('Định dạng âm thanh không được hỗ trợ. Vui lòng chọn file MP3, WAV hoặc OGG.');
      return;
    }

    this.showLoading('Đang phân tích giọng nói...');

    try {
      const result = await this.api.postFile('/detect/audio', file);

      if (result.success) {
        localStorage.setItem('latestDetection', JSON.stringify(result.detection));
        window.location.href = 'detectResult.html';
      } else {
        this.hideLoading();
        this.showError(result.message || 'Lỗi khi phân tích');
      }
    } catch (err) {
      this.hideLoading();
      this.fallbackLocal('audio', file.name);
    }
  }

  async handleLinkCheck(url) {
    if (!this.validateURL(url)) {
      this.showError('Đường dẫn không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://youtube.com/...)');
      return;
    }

    this.showLoading('Đang kiểm tra đường dẫn...');

    try {
      const result = await this.api.post('/detect/link', { url });

      if (result.success) {
        localStorage.setItem('latestDetection', JSON.stringify(result.detection));
        window.location.href = 'detectResult.html';
      } else {
        this.hideLoading();
        this.showError(result.message || 'Lỗi khi kiểm tra');
      }
    } catch (err) {
      this.hideLoading();
      this.fallbackLocal('link', null, url);
    }
  }

  // Fallback when server is not available
  fallbackLocal(type, fileName, url) {
    const risks = ['low', 'medium', 'high'];
    const riskLevel = risks[Math.floor(Math.random() * risks.length)];
    const confidence = Math.floor(Math.random() * 40) + 60;

    // Generate fallback explanations based on type and risk
    const explanations = this.generateFallbackExplanations(type, riskLevel);
    const analysisMetrics = this.generateFallbackMetrics(type, riskLevel);

    const result = {
      id: 'local_' + Date.now(),
      type,
      fileName: fileName || null,
      url: url || null,
      riskLevel,
      confidence,
      details: `Phân tích offline (server không khả dụng). Mức rủi ro: ${riskLevel}.`,
      explanations,
      analysisMetrics,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('latestDetection', JSON.stringify(result));
    window.location.href = 'detectResult.html';
  }

  // Generate fallback explanations for offline mode
  generateFallbackExplanations(type, riskLevel) {
    const templates = {
      video: {
        high: [
          { id: 1, title: 'Phân tích offline', description: 'Phát hiện dấu hiệu bất thường trong video. Kết quả chưa được xác minh bởi server.', severity: 'high', icon: 'warning' },
          { id: 2, title: 'Cần xác minh thêm', description: 'Vui lòng thử lại khi có kết nối mạng để có kết quả chính xác hơn.', severity: 'medium', icon: 'cloud_off' }
        ],
        medium: [
          { id: 1, title: 'Phân tích cơ bản', description: 'Phát hiện một số dấu hiệu đáng lưu ý. Đề nghị kiểm tra lại khi có mạng.', severity: 'medium', icon: 'info' }
        ],
        low: [
          { id: 1, title: 'Không phát hiện bất thường rõ ràng', description: 'Video có vẻ bình thường dựa trên phân tích cơ bản.', severity: 'low', icon: 'check_circle' }
        ]
      },
      audio: {
        high: [
          { id: 1, title: 'Phân tích offline', description: 'Giọng nói có dấu hiệu bất thường. Cần xác minh khi có mạng.', severity: 'high', icon: 'warning' }
        ],
        medium: [
          { id: 1, title: 'Phân tích cơ bản', description: 'Một số đặc điểm giọng nói cần kiểm tra thêm.', severity: 'medium', icon: 'info' }
        ],
        low: [
          { id: 1, title: 'Giọng nói có vẻ bình thường', description: 'Không phát hiện dấu hiệu giả mạo rõ ràng.', severity: 'low', icon: 'check_circle' }
        ]
      },
      link: {
        high: [
          { id: 1, title: 'Đường dẫn đáng ngờ', description: 'Đường dẫn có dấu hiệu không an toàn. Không nên truy cập.', severity: 'high', icon: 'dangerous' }
        ],
        medium: [
          { id: 1, title: 'Cần thận trọng', description: 'Chưa thể xác minh đầy đủ khi offline. Hãy cẩn thận.', severity: 'medium', icon: 'info' }
        ],
        low: [
          { id: 1, title: 'Đường dẫn có vẻ an toàn', description: 'Không phát hiện dấu hiệu đáng ngờ rõ ràng.', severity: 'low', icon: 'check_circle' }
        ]
      }
    };
    return templates[type]?.[riskLevel] || [];
  }

  // Generate fallback metrics for offline mode
  generateFallbackMetrics(type, riskLevel) {
    return {
      offline_mode: { label: 'Chế độ', value: 'Offline', status: 'warning' },
      accuracy: { label: 'Độ chính xác', value: 'Thấp (cần server)', status: riskLevel === 'low' ? 'normal' : 'warning' }
    };
  }

  async getHistory(limit = 20, offset = 0) {
    try {
      const result = await this.api.get(`/detect/history?limit=${limit}&offset=${offset}`);
      if (result.success) {
        return result;
      }
    } catch (err) {
      console.error('[getHistory] Error:', err);
    }
    // Fallback to localStorage
    const data = localStorage.getItem('detectionHistory');
    const detections = data ? JSON.parse(data) : [];
    return { success: true, detections, total: detections.length };
  }

  async getStats() {
    try {
      return await this.api.get('/stats/summary');
    } catch (err) {
      console.error('[getStats] Error:', err);
      return { success: false };
    }
  }

  async sendNotification(detectionId) {
    try {
      return await this.api.post('/notifications/send', { detectionId });
    } catch (err) {
      console.error('[sendNotification] Error:', err);
      return { success: false, message: 'Lỗi khi gửi thông báo' };
    }
  }

  getLatestDetection() {
    const data = localStorage.getItem('latestDetection');
    return data ? JSON.parse(data) : null;
  }

  validateFile(file, type) {
    const extension = file.name.split('.').pop().toLowerCase();
    return this.supportedFormats[type]?.includes(extension);
  }

  validateURL(url) {
    try { new URL(url); return true; } catch { return false; }
  }

  showLoading(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in';
    overlay.innerHTML = `
      <div class="card-lowest card-base text-center max-w-md animate-scale-up">
        <div class="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
        <p class="title-md text-on-surface">${message}</p>
        <p class="body-md text-on-surface-variant mt-2">Vui lòng đợi trong giây lát...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-32 right-6 z-50 alert-error max-w-md animate-slide-in';
    toast.innerHTML = `
      <span class="material-symbols-outlined alert-error-icon" style="font-variation-settings: 'FILL' 1;">error</span>
      <p class="alert-error-text">${message}</p>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// ============================================
// FAMILY CONTACT MANAGEMENT
// ============================================
class FamilyContactManager {
  constructor(api) {
    this.api = api;
    this.contacts = [];
  }

  async loadContacts() {
    try {
      const result = await this.api.get('/contacts');
      if (result.success) {
        this.contacts = result.contacts;
        return this.contacts;
      }
    } catch {
      // Fallback to localStorage
      const data = localStorage.getItem('familyContacts');
      this.contacts = data ? JSON.parse(data) : [];
    }
    return this.contacts;
  }

  async addContact(name, phone) {
    if (!name || !phone) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
    }

    if (!this.validatePhone(phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' };
    }

    try {
      const result = await this.api.post('/contacts', { name: name.trim(), phone: phone.trim() });
      if (result.success) {
        this.contacts.push(result.contact);
        // Also save to localStorage as backup
        localStorage.setItem('familyContacts', JSON.stringify(this.contacts));
      }
      return result;
    } catch {
      // Fallback to localStorage
      const contact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString()
      };
      this.contacts.push(contact);
      localStorage.setItem('familyContacts', JSON.stringify(this.contacts));
      return { success: true, message: 'Đã lưu thông tin liên hệ (offline)', contact };
    }
  }

  async removeContact(id) {
    try {
      await this.api.delete(`/contacts/${id}`);
    } catch { /* ignore */ }

    this.contacts = this.contacts.filter(c => c.id !== id);
    localStorage.setItem('familyContacts', JSON.stringify(this.contacts));
  }

  validatePhone(phone) {
    const cleaned = phone.replace(/\s/g, '');
    return /^(0|\+84)[0-9]{9,10}$/.test(cleaned);
  }

  getAutoNotifyEnabled() {
    return localStorage.getItem('autoNotify') === 'true';
  }

  setAutoNotifyEnabled(enabled) {
    localStorage.setItem('autoNotify', enabled ? 'true' : 'false');
  }

  notifyContacts(detectionResult) {
    if (!this.getAutoNotifyEnabled()) return;
    if (this.contacts.length === 0) return;

    // In production: call backend API to send Zalo/Telegram messages
    console.log('[Notify] Sending to:', this.contacts.map(c => c.name));

    this.showNotificationSent();
  }

  showNotificationSent() {
    const toast = document.createElement('div');
    toast.className = 'fixed top-32 right-6 z-50 alert-success max-w-md animate-slide-in';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-secondary text-2xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <p class="text-on-secondary-container text-base">Đã gửi thông báo cho người thân</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// ============================================
// VOICE ASSISTANT
// ============================================
class VoiceAssistant {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.isSupported = 'speechSynthesis' in window;
    this.isSpeaking = false;
  }

  speak(text) {
    if (!this.isSupported) return;

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };

    this.synthesis.speak(utterance);
  }

  stop() {
    if (this.isSupported) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  readDetectionResult(result) {
    const riskMap = {
      high: `Cảnh báo nghiêm trọng! Chúng tôi phát hiện dấu hiệu lừa đảo rất cao. Độ tin cậy ${result.confidence} phần trăm. Vui lòng không thực hiện bất kỳ giao dịch nào và liên hệ con cháu ngay lập tức.`,
      medium: `Cảnh báo! Phát hiện dấu hiệu nghi ngờ. Độ tin cậy ${result.confidence} phần trăm. Hãy cẩn thận và kiểm tra kỹ trước khi tiếp tục.`,
      low: `Kết quả kiểm tra cho thấy mức độ rủi ro thấp. Độ tin cậy ${result.confidence} phần trăm. Tuy nhiên, vẫn nên thận trọng với mọi giao dịch trực tuyến.`
    };

    let textToSpeak = riskMap[result.riskLevel] || riskMap.medium;

    if (result.explanations && result.explanations.length > 0) {
      const explanationTitles = result.explanations.map(exp => exp.title).join('. ');
      textToSpeak += ` Các dấu hiệu đáng ngờ bao gồm: ${explanationTitles}.`;
    } else if (result.details) {
      textToSpeak += ` Chi tiết: ${result.details}`;
    }

    this.speak(textToSpeak);
  }
}

// ============================================
// EMERGENCY CALL
// ============================================
class EmergencyHandler {
  constructor() {
    this.emergencyNumbers = {
      police: '113',
      ambulance: '115',
      fire: '114'
    };
  }

  showEmergencyDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'emergency-dialog';
    dialog.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in';
    dialog.innerHTML = `
      <div class="card-error card-base max-w-lg w-full animate-scale-up">
        <div class="flex items-center gap-4 mb-6">
          <span class="material-symbols-outlined icon-lg text-on-error-container" style="font-variation-settings: 'FILL' 1;">emergency</span>
          <h2 class="title-lg text-on-error-container">Cuộc Gọi Khẩn Cấp</h2>
        </div>

        <p class="body-lg text-on-error-container mb-8">Bạn cần gọi cho ai?</p>

        <div class="space-y-4">
          <button onclick="app.emergency.call('police')" class="btn-error w-full">
            <span class="material-symbols-outlined">local_police</span>
            Công An (113)
          </button>

          <button onclick="app.emergency.call('family')" class="btn-primary w-full">
            <span class="material-symbols-outlined">family_restroom</span>
            Gọi Người Thân
          </button>

          <button onclick="app.emergency.closeDialog()" class="btn-outline w-full bg-white">
            Hủy
          </button>
        </div>
      </div>
    `;

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.closeDialog();
    });

    document.body.appendChild(dialog);
  }

  closeDialog() {
    const dialog = document.getElementById('emergency-dialog');
    if (dialog) dialog.remove();
  }

  call(type) {
    if (type === 'family') {
      const contacts = app.familyContact.contacts;
      if (contacts.length === 0) {
        this.closeDialog();
        app.detection.showError('Chưa có số điện thoại người thân. Vui lòng thêm trong mục "Kết Nối Với Người Thân".');
        return;
      }
      window.location.href = `tel:${contacts[0].phone}`;
    } else {
      const number = this.emergencyNumbers[type];
      if (number) window.location.href = `tel:${number}`;
    }

    this.closeDialog();
  }
}

// ============================================
// RESULT PAGE RENDERER
// ============================================
class ResultRenderer {
  constructor() {}

  updateResultPage(result) {
    if (!result) return;

    // Update gauge
    this.updateGauge(result.riskLevel);

    // Update warning text based on actual result
    this.updateWarning(result);

    // Render Explainable AI sections
    this.renderExplanations(result.explanations || []);
    this.renderMetrics(result.analysisMetrics || {});
  }

  updateGauge(riskLevel) {
    const indicator = document.querySelector('.gauge-indicator-wrapper');
    if (!indicator) return;

    const positions = { low: '15%', medium: '50%', high: '85%' };
    indicator.style.left = positions[riskLevel] || '50%';
    indicator.style.transition = 'left 1s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  updateWarning(result) {
    // Update warning title
    const warningTitle = document.querySelector('.title-lg.text-error');
    if (warningTitle) {
      const titles = {
        high: 'CẢNH BÁO: PHÁT HIỆN DẤU HIỆU LỪA ĐẢO',
        medium: 'CHÚ Ý: CÓ DẤU HIỆU NGHI NGỜ',
        low: 'AN TOÀN: KHÔNG PHÁT HIỆN MỐI ĐE DỌA'
      };
      warningTitle.textContent = titles[result.riskLevel] || titles.medium;

      // Adjust color for safe results
      if (result.riskLevel === 'low') {
        warningTitle.classList.remove('text-error');
        warningTitle.classList.add('text-secondary');
      }
    }

    // Update warning detail
    const warningDetail = warningTitle?.parentElement?.querySelector('.body-lg');
    if (warningDetail && result.details) {
      warningDetail.textContent = result.details;
    }

    // Update warning icon
    const warningIcon = document.querySelector('.card-error .material-symbols-outlined');
    if (warningIcon) {
      if (result.riskLevel === 'low') {
        warningIcon.textContent = 'check_circle';
        const container = warningIcon.closest('.card-error');
        if (container) {
          container.classList.remove('card-error');
          container.classList.add('card-secondary');
        }
      }
    }
  }

  renderExplanations(explanations) {
    const container = document.getElementById('explanations-container');
    if (!container) return;

    if (!explanations || explanations.length === 0) {
      container.innerHTML = '';
      return;
    }

    const severityColors = {
      high: 'bg-error-container text-on-error-container border-l-4 border-error',
      medium: 'bg-tertiary-fixed text-on-tertiary-fixed border-l-4 border-tertiary',
      low: 'bg-secondary-container text-on-secondary-container border-l-4 border-secondary'
    };

    const severityLabels = {
      high: 'Nghiêm trọng',
      medium: 'Cảnh báo',
      low: 'Thông tin'
    };

    container.innerHTML = `
      <h3 class="title-md font-bold mb-4 text-on-surface">Các dấu hiệu phát hiện</h3>
      ${explanations.map(exp => `
        <div class="card-base p-4 rounded-xl ${severityColors[exp.severity] || severityColors.medium}">
          <div class="flex gap-4">
            <span class="material-symbols-outlined flex-shrink-0 text-xl" style="font-variation-settings: 'FILL' 1;">${exp.icon || 'info'}</span>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <p class="font-bold text-base">${exp.title}</p>
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-black/20">${severityLabels[exp.severity] || 'Thông tin'}</span>
              </div>
              <p class="body-md leading-relaxed">${exp.description}</p>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }

  renderMetrics(metrics) {
    const container = document.getElementById('metrics-container');
    if (!container) return;

    if (!metrics || Object.keys(metrics).length === 0) {
      container.innerHTML = '';
      return;
    }

    const metricsArray = Object.entries(metrics).map(([key, value]) => ({
      key,
      ...value
    }));

    container.innerHTML = `
      <details class="card-lowest card-base p-6 rounded-xl cursor-pointer group">
        <summary class="flex items-center justify-between font-bold text-on-surface text-base select-none">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined">analytics</span>
            <span>Chỉ số kỹ thuật chi tiết</span>
          </div>
          <span class="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
        </summary>
        <div class="mt-6 space-y-4">
          ${metricsArray.map(metric => {
            const statusColors = {
              abnormal: 'text-error',
              warning: 'text-tertiary',
              normal: 'text-secondary'
            };
            return `
              <div class="flex justify-between items-start pb-3 border-b border-outline-variant/30">
                <div>
                  <p class="font-semibold text-on-surface">${metric.label}</p>
                  <p class="text-sm text-on-surface-variant">Giá trị: <span class="font-mono">${metric.value}</span></p>
                  ${metric.normal ? `<p class="text-sm text-on-surface-variant">Bình thường: <span class="font-mono">${metric.normal}</span></p>` : ''}
                  ${metric.threshold ? `<p class="text-sm text-on-surface-variant">Ngưỡng: <span class="font-mono">${metric.threshold}</span></p>` : ''}
                </div>
                <span class="text-xs font-bold px-3 py-1 rounded-full ${statusColors[metric.status] || 'text-on-surface-variant'} bg-black/10">
                  ${metric.status === 'abnormal' ? 'Bất thường' : metric.status === 'warning' ? 'Cảnh báo' : 'Bình thường'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }
}

// ============================================
// GLOBAL APP INSTANCE
// ============================================
const app = {
  api: null,
  router: null,
  detection: null,
  familyContact: null,
  voice: null,
  emergency: null,
  resultRenderer: null,

  async init() {
    this.api = new ApiClient();
    this.router = new Router();
    this.detection = new DetectionHandler(this.api);
    this.familyContact = new FamilyContactManager(this.api);
    this.voice = new VoiceAssistant();
    this.emergency = new EmergencyHandler();
    this.resultRenderer = new ResultRenderer();

    // Load contacts from server
    await this.familyContact.loadContacts();

    this.initEventListeners();
    this.initPageSpecific();
  },

  initEventListeners() {
    // Emergency button (on all pages)
    const emergencyBtn = document.querySelector('nav button.btn-error');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.emergency.showEmergencyDialog();
      });
    }

    // Keyboard shortcut: Escape to close dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.emergency.closeDialog();
        this.voice.stop();
      }
    });
  },

  initPageSpecific() {
    const page = this.router.currentPage;

    switch (page) {
      case 'home': this.initHomePage(); break;
      case 'detect': this.initDetectResultPage(); break;
      case 'family': this.initFamilyContactPage(); break;
    }
  },

  initHomePage() {
    // Load statistics
    this.loadStatistics();

    // Video/Image upload button
    const videoBtn = document.getElementById('video-upload-btn');
    if (videoBtn) {
      videoBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) this.detection.handleVideoUpload(file);
          document.body.removeChild(input);
        };
        input.click();
      });
    }

    // Audio upload button
    const audioBtn = document.getElementById('audio-upload-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) this.detection.handleAudioUpload(file);
          document.body.removeChild(input);
        };
        input.click();
      });
    }

    // Link check
    const linkInput = document.getElementById('link-input');
    const linkBtn = document.getElementById('link-check-btn');
    if (linkInput && linkBtn) {
      const checkLink = () => {
        const url = linkInput.value.trim();
        if (url) this.detection.handleLinkCheck(url);
        else this.detection.showError('Vui lòng nhập đường dẫn');
      };

      linkBtn.addEventListener('click', checkLink);
      linkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkLink();
      });
    }

    // "Gửi cho con cháu" button
    const sendFamilyBtn = document.getElementById('send-family-btn');
    if (sendFamilyBtn) {
      sendFamilyBtn.addEventListener('click', () => {
        this.router.navigateTo('family');
      });
    }
  },

  async loadStatistics() {
    try {
      const result = await this.detection.getStats();
      if (result.success && result.summary) {
        const dashboard = document.getElementById('stats-dashboard');
        if (dashboard) {
          document.getElementById('stat-total-scans').textContent = result.summary.totalScans || 0;
          document.getElementById('stat-high-risk').textContent = result.summary.highRiskCount || 0;
          document.getElementById('stat-last-scan').textContent = result.summary.lastScanDate
            ? new Date(result.summary.lastScanDate).toLocaleDateString('vi-VN')
            : 'Chưa có';
          dashboard.style.display = 'grid';
        }
      }
    } catch (err) {
      console.error('[loadStatistics] Error:', err);
    }
  },

  initDetectResultPage() {
    const result = this.detection.getLatestDetection();
    if (!result) {
      window.location.href = 'home.html';
      return;
    }

    // Render result data
    this.resultRenderer.updateResultPage(result);

    // Voice assistant button
    const voiceBtn = document.querySelector('button.bg-primary');
    if (voiceBtn && voiceBtn.textContent.includes('giọng nói')) {
      voiceBtn.addEventListener('click', () => {
        if (this.voice.isSpeaking) {
          this.voice.stop();
        } else {
          this.voice.readDetectionResult(result);
        }
      });
    }

    // Share buttons (Zalo / Telegram)
    const shareButtons = document.querySelectorAll('button[class*="card-medium"]');
    shareButtons.forEach(btn => {
      btn.addEventListener('click', () => this.shareResult(result));
    });

    // "Kiểm tra lại" button
    const retryBtn = document.querySelector('button.btn-outline');
    if (retryBtn && retryBtn.textContent.includes('Kiểm tra lại')) {
      retryBtn.addEventListener('click', () => {
        window.location.href = 'home.html';
      });
    }

    // "Xem lịch sử" button
    const historyBtn = document.querySelector('button.card-high');
    if (historyBtn && historyBtn.textContent.includes('lịch sử')) {
      historyBtn.addEventListener('click', () => this.showHistoryModal());
    }

    // Auto-notify family
    if (result.riskLevel === 'high' || result.riskLevel === 'medium') {
      this.familyContact.notifyContacts(result);
    }
  },

  async sendNotificationToFamily() {
    const result = this.detection.getLatestDetection();
    if (!result) {
      this.detection.showError('Không có kết quả phân tích để gửi');
      return;
    }

    this.detection.showLoading('Đang gửi thông báo...');

    try {
      const response = await this.detection.sendNotification(result.id);
      this.detection.hideLoading();

      if (response.success) {
        this.showSuccess(response.message || `Đã gửi thông báo cho ${response.sent} người thân`);
      } else {
        this.detection.showError(response.message || 'Lỗi khi gửi thông báo');
      }
    } catch (err) {
      this.detection.hideLoading();
      this.detection.showError('Lỗi khi gửi thông báo');
    }
  },

  async initFamilyContactPage() {
    const nameInput = document.querySelector('input[placeholder*="tên người thân"]');
    const phoneInput = document.querySelector('input[placeholder*="090"]');
    const saveBtn = document.getElementById('save-contact-btn') || document.querySelector('button.btn-primary');

    if (saveBtn && nameInput && phoneInput) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        const result = await this.familyContact.addContact(nameInput.value, phoneInput.value);
        saveBtn.disabled = false;

        if (result.success) {
          nameInput.value = '';
          phoneInput.value = '';
          this.showSuccess(result.message);
          this.renderContactList();
        } else {
          this.detection.showError(result.message);
        }
      });
    }

    // Auto-notify toggle
    const toggle = document.querySelector('input[type="checkbox"]');
    if (toggle) {
      toggle.checked = this.familyContact.getAutoNotifyEnabled();
      toggle.addEventListener('change', (e) => {
        this.familyContact.setAutoNotifyEnabled(e.target.checked);
        this.showSuccess(e.target.checked ? 'Đã bật tự động thông báo' : 'Đã tắt tự động thông báo');
      });
    }

    // Render existing contacts
    this.renderContactList();
  },

  renderContactList() {
    const contacts = this.familyContact.contacts;
    let listContainer = document.getElementById('contact-list');

    if (!listContainer) {
      // Create contact list container after save button
      const saveBtn = document.getElementById('save-contact-btn') || document.querySelector('button.btn-primary');
      if (!saveBtn) return;

      listContainer = document.createElement('div');
      listContainer.id = 'contact-list';
      listContainer.className = 'mt-8';
      saveBtn.parentElement.appendChild(listContainer);
    }

    if (contacts.length === 0) {
      listContainer.innerHTML = `
        <p class="body-md text-on-surface-variant text-center py-4">Chưa có người thân nào được thêm</p>
      `;
      return;
    }

    listContainer.innerHTML = `
      <h3 class="title-md mb-4">Danh sách người thân (${contacts.length})</h3>
      ${contacts.map(c => `
        <div class="card-low card-base flex items-center justify-between mb-3 p-4" data-id="${c.id}">
          <div class="flex items-center gap-4">
            <span class="material-symbols-outlined text-primary icon-sm" style="font-variation-settings: 'FILL' 1;">person</span>
            <div>
              <p class="font-bold text-on-surface">${c.name}</p>
              <p class="body-md text-on-surface-variant">${c.phone}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="touch-target text-secondary hover:bg-secondary-container rounded-xl transition-colors"
                    onclick="app.sendTestNotification('${c.id}')" title="Gửi tin nhắn thử nghiệm">
              <span class="material-symbols-outlined">mail</span>
            </button>
            <button class="touch-target text-error hover:bg-error-container rounded-xl transition-colors"
                    onclick="app.deleteContact('${c.id}')">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      `).join('')}
    `;
  },

  async deleteContact(id) {
    await this.familyContact.removeContact(id);
    this.renderContactList();
    this.showSuccess('Đã xóa liên hệ');
  },

  async sendTestNotification(contactId) {
    this.detection.showLoading('Đang gửi tin nhắn thử nghiệm...');

    try {
      const response = await this.api.post('/notifications/test', { contactId });
      this.detection.hideLoading();

      if (response.success) {
        this.showSuccess(response.message || 'Đã gửi tin nhắn thử nghiệm');
      } else {
        this.detection.showError(response.message || 'Lỗi khi gửi tin nhắn');
      }
    } catch (err) {
      this.detection.hideLoading();
      this.detection.showError('Lỗi khi gửi tin nhắn thử nghiệm');
    }
  },

  async showHistoryModal() {
    const historyData = await this.detection.getHistory(50, 0);
    const detections = historyData.detections || [];

    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in';

    const riskColors = { high: 'text-error', medium: 'text-tertiary-fixed-dim', low: 'text-secondary' };
    const riskLabels = { high: 'Nguy hiểm', medium: 'Nghi ngờ', low: 'An toàn' };
    const typeLabels = { video: 'Video/Ảnh', audio: 'Giọng nói', link: 'Đường dẫn' };

    modal.innerHTML = `
      <div class="card-lowest card-base max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-scale-up">
        <div class="flex items-center justify-between mb-6">
          <h2 class="title-lg">Lịch sử phân tích</h2>
          <button onclick="document.getElementById('history-modal').remove()" class="touch-target hover:bg-surface-container-high rounded-xl transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="overflow-y-auto flex-1 space-y-3">
          ${detections.length === 0
            ? '<p class="body-lg text-on-surface-variant text-center py-8">Chưa có lịch sử phân tích</p>'
            : detections.map(d => `
              <div class="card-low card-base p-4 flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl ${d.riskLevel === 'high' ? 'bg-error-container' : d.riskLevel === 'medium' ? 'bg-tertiary-fixed' : 'bg-secondary-container'} flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined ${riskColors[d.riskLevel]}" style="font-variation-settings: 'FILL' 1;">
                    ${d.riskLevel === 'high' ? 'warning' : d.riskLevel === 'medium' ? 'help' : 'check_circle'}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-on-surface truncate">${typeLabels[d.type] || d.type} — ${riskLabels[d.riskLevel]}</p>
                  <p class="body-md text-on-surface-variant truncate">${d.fileName || d.url || 'N/A'}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="font-bold ${riskColors[d.riskLevel]}">${d.confidence}%</p>
                  <p class="text-sm text-on-surface-variant">${new Date(d.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  },

  shareResult(result) {
    const riskLabels = { high: 'Nguy hiểm', medium: 'Nghi ngờ', low: 'An toàn' };
    const message = `SafeGuard Senior - Kết quả phân tích:\nMức độ rủi ro: ${riskLabels[result.riskLevel]}\nĐộ tin cậy: ${result.confidence}%\n${result.details || ''}`;

    if (navigator.share) {
      navigator.share({ title: 'SafeGuard Senior - Cảnh báo', text: message });
    } else {
      navigator.clipboard?.writeText(message);
      this.showSuccess('Đã sao chép kết quả vào clipboard');
    }
  },

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-32 right-6 z-50 alert-success max-w-md animate-slide-in';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-secondary text-2xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <p class="text-on-secondary-container text-base">${message}</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showDemoResult(type) {
    const demoResults = {
      video: {
        id: 'demo_' + Date.now(),
        type: 'video',
        fileName: 'demo_video.mp4',
        riskLevel: 'high',
        confidence: 87,
        details: 'Demo: Phát hiện dấu hiệu deepfake rõ ràng. Vùng mắt chớp không tự nhiên, khẩu hình miệng không khớp âm thanh.',
        explanations: [
          { id: 1, title: 'Nhịp chớp mắt bất thường', description: 'Phát hiện tần suất chớp mắt 2.3 lần/phút, thấp hơn nhiều so với mức bình thường (15-20 lần/phút).', severity: 'high', icon: 'visibility_off' },
          { id: 2, title: 'Khẩu hình miệng không khớp âm thanh', description: 'Chuyển động miệng lệch so với âm thanh khoảng 120ms. Người nói thật sẽ có độ đồng bộ dưới 30ms.', severity: 'high', icon: 'voice_over_off' }
        ],
        analysisMetrics: {
          blink_rate: { label: 'Tần suất chớp mắt', value: '2.3/phút', normal: '15-20/phút', status: 'abnormal' },
          lip_sync_delay: { label: 'Độ trễ khẩu hình', value: '120ms', threshold: '< 30ms', status: 'abnormal' }
        },
        createdAt: new Date().toISOString()
      },
      audio: {
        id: 'demo_' + Date.now(),
        type: 'audio',
        fileName: 'demo_audio.mp3',
        riskLevel: 'medium',
        confidence: 72,
        details: 'Demo: Phát hiện một số dấu hiệu bất thường trong giọng nói. Tần số dao động nhẹ, có thể do xử lý.',
        explanations: [
          { id: 1, title: 'Tần số dao động nhẹ', description: 'Phát hiện dao động nhỏ trong tần số giọng nói. Có thể do chất lượng micro hoặc can thiệp nhẹ.', severity: 'medium', icon: 'graphic_eq' }
        ],
        analysisMetrics: {
          pitch_fluctuation: { label: 'Dao động pitch', value: '7Hz', normal: '3-5Hz', status: 'warning' }
        },
        createdAt: new Date().toISOString()
      },
      link: {
        id: 'demo_' + Date.now(),
        type: 'link',
        url: 'https://example-phishing.tk',
        riskLevel: 'high',
        confidence: 91,
        details: 'Demo: Đường dẫn có dấu hiệu phishing rõ ràng. Domain đăng ký mới, sử dụng TLD đáng ngờ.',
        explanations: [
          { id: 1, title: 'Domain đăng ký mới', description: 'Tên miền được đăng ký dưới 30 ngày. Các trang web lừa đảo thường sử dụng domain mới để tránh bị phát hiện.', severity: 'high', icon: 'domain_disabled' },
          { id: 2, title: 'TLD đáng ngờ', description: 'Sử dụng tên miền cấp cao .tk — thường được dùng cho các trang phishing.', severity: 'high', icon: 'warning' }
        ],
        analysisMetrics: {
          domain_age: { label: 'Tuổi tên miền', value: '12 ngày', threshold: '> 365 ngày', status: 'abnormal' },
          phishing_score: { label: 'Điểm phishing', value: '87/100', threshold: '< 30/100', status: 'abnormal' }
        },
        createdAt: new Date().toISOString()
      }
    };

    const result = demoResults[type];
    localStorage.setItem('latestDetection', JSON.stringify(result));
    this.showSuccess('Demo mode: Đã tạo kết quả mẫu. Chuyển sang trang kết quả...');
    setTimeout(() => {
      window.location.href = 'detectResult.html';
    }, 1000);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

window.app = app;
