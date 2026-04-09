# SafeGuard Senior - Bảo vệ niềm tin, giữ gìn hạnh phúc

> Giải pháp an toàn giúp người cao tuổi nhận diện lừa đảo công nghệ cao một cách dễ dàng nhất.

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Cài đặt](#cài-đặt)
- [Chạy dự án](#chạy-dự-án)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Hướng dẫn phát triển](#hướng-dẫn-phát-triển)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

## 🎯 Giới thiệu

SafeGuard Senior là một ứng dụng web được thiết kế đặc biệt cho người cao tuổi để phát hiện và cảnh báo các cuộc lừa đảo trực tuyến. Ứng dụng sử dụng công nghệ AI/ML để phân tích video, âm thanh, và đường dẫn web, giúp người dùng nhận biết các mối đe dọa tiềm ẩn.

**Design System**: The Guardian's Hearth - Một hệ thống thiết kế ấm áp, dễ sử dụng, tập trung vào trải nghiệm người cao tuổi.

## ✨ Tính năng

### Hiện tại
- ✅ Phân tích video/ảnh để phát hiện deepfake
- ✅ Phân tích giọng nói để phát hiện giả mạo
- ✅ Kiểm tra đường dẫn web nghi ngờ
- ✅ Trợ lý ảo đọc cảnh báo bằng giọng nói
- ✅ Kết nối với người thân (Zalo/Telegram)
- ✅ Cuộc gọi khẩn cấp nhanh chóng
- ✅ Cẩm nang giáo dục về các kịch bản lừa đảo
- ✅ Lưu trữ cục bộ (Local Storage)
- ✅ Backend API với database (SQLite)
- ✅ Lịch sử phân tích chi tiết

### Sắp tới
- 🔄 Tích hợp AI model thực tế
- 🔄 Dashboard thống kê
- 🔄 Dark mode
- 🔄 PWA & Offline support
- 🔄 Push notifications

## 🚀 Cài đặt

### Yêu cầu
- Node.js 16+ 
- npm hoặc yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Bước 1: Clone repository
```bash
git clone https://github.com/yourusername/safeguard-senior.git
cd safeguard-senior
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Build CSS
```bash
npm run build
```

## 🏃 Chạy dự án

### Development mode (watch CSS changes)
```bash
npm run dev
```

Sau đó mở `home.html` trong trình duyệt hoặc dùng live server:
```bash
npx live-server
```

### Production build
```bash
npm run build
```

File CSS minified sẽ được tạo tại `styles/output.css`

## 📁 Cấu trúc thư mục

```
safeguard-senior/
├── home.html                 # Trang chủ - Upload video/audio/link
├── detectResult.html         # Trang kết quả phân tích
├── education.html            # Cẩm nang giáo dục
├── familyContact.html        # Kết nối với người thân
├── app.js                    # Logic ứng dụng chính (client-side)
├── server/
│   ├── index.js             # Express server entry point
│   ├── db.js                # SQLite database setup
│   ├── middleware/
│   │   ├── auth.js          # User authentication & rate limiting
│   │   ├── validator.js     # Input validation
│   │   └── errorHandler.js  # Centralized error handling
│   ├── models/
│   │   ├── Detection.js     # Detection database queries
│   │   ├── FamilyContact.js # Family contact queries
│   │   └── User.js          # User model
│   ├── routes/
│   │   ├── detect.js        # Detection API routes
│   │   ├── contacts.js      # Family contact API routes
│   │   ├── stats.js         # Statistics API routes
│   │   └── notifications.js # Notification API routes
│   └── services/
│       ├── analysis.js      # AI analysis service (simulated)
│       └── notification.js  # Notification service
├── data/
│   └── safeguard.db         # SQLite database
├── uploads/                  # Uploaded files storage
├── styles/
│   ├── input.css            # Tailwind + design system
│   └── output.css           # CSS build (minified)
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── package.json              # Dependencies
├── API_DOCUMENTATION.md      # Full API documentation
├── DESIGN.md                 # Design system specification
└── README.md                 # This file
```

## 🛠️ Hướng dẫn phát triển

### Thêm tính năng mới

1. **Thêm HTML element** vào file `.html` tương ứng
2. **Thêm CSS** vào `styles/input.css` (sử dụng Tailwind classes)
3. **Thêm JavaScript** vào `app.js` hoặc tạo file mới
4. **Build CSS**: `npm run build`
5. **Test** trên trình duyệt

### Quy ước code

- **HTML**: Semantic HTML5, accessibility-first
- **CSS**: Tailwind utilities + custom components trong `@layer`
- **JavaScript**: ES6+, modular classes, comments tiếng Anh
- **Naming**: camelCase cho JS, kebab-case cho CSS classes

### Design System

Sử dụng các class có sẵn từ Guardian's Hearth:

```html
<!-- Typography -->
<h1 class="display-lg">Tiêu đề lớn</h1>
<h2 class="title-lg">Tiêu đề</h2>
<p class="body-lg">Nội dung chính</p>

<!-- Buttons -->
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>
<button class="btn-outline">Outline Button</button>
<button class="btn-error">Danger Action</button>

<!-- Cards -->
<div class="card-base card-lowest">Content</div>
<div class="card-base card-high">Content</div>

<!-- Spacing -->
<section class="breathing-space-lg">Content</section>

<!-- Touch targets (min 64px) -->
<button class="touch-target">Tap me</button>
```

## 📡 API Documentation

### Backend API (Available Now)

```
POST   /api/detect/video       - Upload video/image for analysis
POST   /api/detect/audio       - Upload audio for voice cloning detection
POST   /api/detect/link        - Check URL for phishing/scam
GET    /api/detect/history     - Get detection history
GET    /api/detect/:id         - Get single detection
DELETE /api/detect/:id         - Delete detection

GET    /api/contacts           - Get all family contacts
POST   /api/contacts           - Add family contact
PUT    /api/contacts/:id       - Update family contact
DELETE /api/contacts/:id       - Delete family contact

GET    /api/stats              - Get full statistics
GET    /api/stats/summary      - Get quick summary

POST   /api/notifications/send - Send notification about detection
POST   /api/notifications/test - Send test notification

GET    /api/health             - Health check
```

**Full API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Client-Side API (JavaScript)

```javascript
// Detection results
app.detection.getLatestDetection()
app.detection.getDetectionHistory()

// Family contacts
app.familyContact.addContact(name, phone)
app.familyContact.getContacts()

// Voice assistant
app.voice.speak(text)
app.voice.readDetectionResult(result)

// Emergency
app.emergency.call('police') // or 'family'
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=.
```

### GitHub Pages
```bash
npm run build
# Push to gh-pages branch
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔒 Privacy & Security

- Tất cả dữ liệu được lưu cục bộ (Local Storage)
- Không có tracking hoặc analytics
- Không gửi dữ liệu cá nhân lên server (hiện tại)
- HTTPS required khi deploy

## 📞 Support

- Email: support@safeguard-senior.vn
- Phone: 1900-xxxx
- Website: https://safeguard-senior.vn

## 📄 License

MIT License - xem file LICENSE

## 👥 Contributors

- Vo Pham Gia Kiet - Lead Developer

## 🙏 Acknowledgments

- Design System: The Guardian's Hearth
- Typography: Lexend Font
- Icons: Material Symbols
- CSS Framework: Tailwind CSS
- Color Palette: Material Design 3

---

**Cập nhật lần cuối**: 2026-04-09