// ============================================
// SAFEGUARD SENIOR - MAIN APPLICATION LOGIC
// The Guardian's Hearth Design System
// ============================================

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
    if (path.includes('home.html') || path === '/' || path === '/index.html') return 'home';
    if (path.includes('detectResult.html')) return 'detect';
    if (path.includes('education.html')) return 'education';
    if (path.includes('familyContact.html')) return 'family';
    return 'home';
  }

  initNavigation() {
    // Update active nav state
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(this.currentPage)) {
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

    if (pages[page]) {
      window.location.href = pages[page];
    }
  }
}

// ============================================
// FILE UPLOAD & DETECTION
// ============================================
class DetectionHandler {
  constructor() {
    this.supportedFormats = {
      video: ['mp4', 'avi', 'mov', 'webm'],
      image: ['jpg', 'jpeg', 'png', 'webp'],
      audio: ['mp3', 'wav', 'ogg', 'm4a']
    };
  }

  handleVideoUpload(file) {
    if (!this.validateFile(file, 'video')) {
      this.showError('Định dạng video không được hỗ trợ. Vui lòng chọn file MP4, AVI, MOV hoặc WEBM.');
      return;
    }

    this.showLoading('Đang phân tích video...');

    // Simulate detection process
    setTimeout(() => {
      this.saveDetectionResult({
        type: 'video',
        fileName: file.name,
        timestamp: new Date().toISOString(),
        riskLevel: 'high', // 'low', 'medium', 'high'
        confidence: 85
      });

      window.location.href = 'detectResult.html';
    }, 2000);
  }

  handleAudioUpload(file) {
    if (!this.validateFile(file, 'audio')) {
      this.showError('Định dạng âm thanh không được hỗ trợ. Vui lòng chọn file MP3, WAV hoặc OGG.');
      return;
    }

    this.showLoading('Đang phân tích giọng nói...');

    setTimeout(() => {
      this.saveDetectionResult({
        type: 'audio',
        fileName: file.name,
        timestamp: new Date().toISOString(),
        riskLevel: 'medium',
        confidence: 72
      });

      window.location.href = 'detectResult.html';
    }, 2000);
  }

  handleLinkCheck(url) {
    if (!this.validateURL(url)) {
      this.showError('Đường dẫn không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://youtube.com/...)');
      return;
    }

    this.showLoading('Đang kiểm tra đường dẫn...');

    setTimeout(() => {
      this.saveDetectionResult({
        type: 'link',
        url: url,
        timestamp: new Date().toISOString(),
        riskLevel: 'low',
        confidence: 45
      });

      window.location.href = 'detectResult.html';
    }, 1500);
  }

  validateFile(file, type) {
    const extension = file.name.split('.').pop().toLowerCase();
    return this.supportedFormats[type].includes(extension);
  }

  validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  saveDetectionResult(result) {
    localStorage.setItem('latestDetection', JSON.stringify(result));

    // Add to history
    const history = this.getDetectionHistory();
    history.unshift(result);
    localStorage.setItem('detectionHistory', JSON.stringify(history.slice(0, 20))); // Keep last 20
  }

  getLatestDetection() {
    const data = localStorage.getItem('latestDetection');
    return data ? JSON.parse(data) : null;
  }

  getDetectionHistory() {
    const data = localStorage.getItem('detectionHistory');
    return data ? JSON.parse(data) : [];
  }

  showLoading(message) {
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
    overlay.innerHTML = `
      <div class="card-lowest card-base text-center max-w-md">
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
  constructor() {
    this.contacts = this.loadContacts();
  }

  loadContacts() {
    const data = localStorage.getItem('familyContacts');
    return data ? JSON.parse(data) : [];
  }

  saveContacts() {
    localStorage.setItem('familyContacts', JSON.stringify(this.contacts));
  }

  addContact(name, phone) {
    if (!name || !phone) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
    }

    if (!this.validatePhone(phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ' };
    }

    const contact = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString()
    };

    this.contacts.push(contact);
    this.saveContacts();

    return { success: true, message: 'Đã lưu thông tin liên hệ', contact };
  }

  removeContact(id) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this.saveContacts();
  }

  validatePhone(phone) {
    // Vietnamese phone number validation
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

    // Simulate sending notifications
    console.log('Sending notifications to:', this.contacts);
    console.log('Detection result:', detectionResult);

    // In production, this would call an API to send Zalo/Telegram messages
    this.showNotificationSent();
  }

  showNotificationSent() {
    const toast = document.createElement('div');
    toast.className = 'fixed top-32 right-6 z-50 alert-success max-w-md';
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
  }

  speak(text) {
    if (!this.isSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.85; // Slower for seniors
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.synthesis.speak(utterance);
  }

  stop() {
    if (this.isSupported) {
      this.synthesis.cancel();
    }
  }

  readDetectionResult(result) {
    let message = '';

    if (result.riskLevel === 'high') {
      message = `Cảnh báo! Chúng tôi phát hiện dấu hiệu lừa đảo nghiêm trọng.
                 Độ tin cậy ${result.confidence} phần trăm.
                 Vui lòng không thực hiện bất kỳ giao dịch nào và liên hệ con cháu ngay lập tức.`;
    } else if (result.riskLevel === 'medium') {
      message = `Cảnh báo! Có dấu hiệu nghi ngờ.
                 Độ tin cậy ${result.confidence} phần trăm.
                 Hãy cẩn thận và kiểm tra kỹ trước khi tiếp tục.`;
    } else {
      message = `Kết quả kiểm tra: Mức độ rủi ro thấp.
                 Độ tin cậy ${result.confidence} phần trăm.
                 Tuy nhiên, vẫn nên thận trọng với mọi giao dịch trực tuyến.`;
    }

    this.speak(message);
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
      fire: '114',
      family: null // Will be set from contacts
    };
  }

  showEmergencyDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'emergency-dialog';
    dialog.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6';
    dialog.innerHTML = `
      <div class="card-error card-base max-w-lg w-full">
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

          <button onclick="app.emergency.closeDialog()" class="btn-outline w-full">
            Hủy
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  closeDialog() {
    const dialog = document.getElementById('emergency-dialog');
    if (dialog) dialog.remove();
  }

  call(type) {
    const number = this.emergencyNumbers[type];

    if (type === 'family') {
      const contacts = app.familyContact.contacts;
      if (contacts.length === 0) {
        alert('Chưa có số điện thoại người thân. Vui lòng thêm trong mục "Kết Nối Với Người Thân".');
        return;
      }
      // Call first contact
      window.location.href = `tel:${contacts[0].phone}`;
    } else {
      window.location.href = `tel:${number}`;
    }

    this.closeDialog();
  }
}

// ============================================
// GLOBAL APP INSTANCE
// ============================================
const app = {
  router: null,
  detection: null,
  familyContact: null,
  voice: null,
  emergency: null,

  init() {
    this.router = new Router();
    this.detection = new DetectionHandler();
    this.familyContact = new FamilyContactManager();
    this.voice = new VoiceAssistant();
    this.emergency = new EmergencyHandler();

    this.initEventListeners();
    this.initPageSpecific();
  },

  initEventListeners() {
    // Emergency button (on all pages)
    const emergencyBtn = document.querySelector('button.btn-error');
    if (emergencyBtn && emergencyBtn.textContent.includes('Emergency')) {
      emergencyBtn.addEventListener('click', () => this.emergency.showEmergencyDialog());
    }
  },

  initPageSpecific() {
    const page = this.router.currentPage;

    if (page === 'home') {
      this.initHomePage();
    } else if (page === 'detect') {
      this.initDetectResultPage();
    } else if (page === 'family') {
      this.initFamilyContactPage();
    }
  },

  initHomePage() {
    // Video/Image upload button
    const videoBtn = document.querySelector('.hero-action-btn.signature-gradient');
    if (videoBtn) {
      videoBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            if (file.type.startsWith('video/')) {
              this.detection.handleVideoUpload(file);
            } else {
              this.detection.handleVideoUpload(file); // Same handler for now
            }
          }
        };
        input.click();
      });
    }

    // Audio upload button
    const audioBtn = document.querySelector('.hero-action-btn.card-secondary');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) this.detection.handleAudioUpload(file);
        };
        input.click();
      });
    }

    // Link check
    const linkInput = document.querySelector('input[placeholder*="Dán link"]');
    const linkBtn = document.querySelector('button.btn-primary');
    if (linkInput && linkBtn) {
      linkBtn.addEventListener('click', () => {
        const url = linkInput.value.trim();
        if (url) this.detection.handleLinkCheck(url);
      });

      linkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const url = linkInput.value.trim();
          if (url) this.detection.handleLinkCheck(url);
        }
      });
    }
  },

  initDetectResultPage() {
    const result = this.detection.getLatestDetection();
    if (!result) {
      window.location.href = 'home.html';
      return;
    }

    // Update gauge position based on risk level
    this.updateGauge(result.riskLevel);

    // Voice assistant button
    const voiceBtn = document.querySelector('button.bg-primary');
    if (voiceBtn && voiceBtn.textContent.includes('giọng nói')) {
      voiceBtn.addEventListener('click', () => {
        this.voice.readDetectionResult(result);
      });
    }

    // Share buttons
    const shareButtons = document.querySelectorAll('button[class*="card-medium"]');
    shareButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.shareResult(result);
      });
    });

    // Auto-notify family if enabled
    if (result.riskLevel === 'high' || result.riskLevel === 'medium') {
      this.familyContact.notifyContacts(result);
    }
  },

  initFamilyContactPage() {
    // Contact form
    const nameInput = document.querySelector('input[placeholder*="tên người thân"]');
    const phoneInput = document.querySelector('input[placeholder*="090"]');
    const saveBtn = document.querySelector('button.btn-primary');

    if (saveBtn && nameInput && phoneInput) {
      saveBtn.addEventListener('click', () => {
        const result = this.familyContact.addContact(
          nameInput.value,
          phoneInput.value
        );

        if (result.success) {
          nameInput.value = '';
          phoneInput.value = '';
          this.showSuccess(result.message);
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
      });
    }
  },

  updateGauge(riskLevel) {
    const indicator = document.querySelector('.gauge-indicator-wrapper');
    if (!indicator) return;

    const positions = {
      low: '15%',
      medium: '50%',
      high: '85%'
    };

    indicator.style.left = positions[riskLevel] || '50%';
  },

  shareResult(result) {
    const message = `SafeGuard Senior - Kết quả phân tích:\nMức độ rủi ro: ${result.riskLevel}\nĐộ tin cậy: ${result.confidence}%`;

    if (navigator.share) {
      navigator.share({
        title: 'SafeGuard Senior - Cảnh báo',
        text: message
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(message);
      this.showSuccess('Đã sao chép kết quả');
    }
  },

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-32 right-6 z-50 alert-success max-w-md';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-secondary text-2xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <p class="text-on-secondary-container text-base">${message}</p>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for global access
window.app = app;
