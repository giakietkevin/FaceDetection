# SafeGuard Senior - AI Integration Complete ✅

## Tổng Quan

Hệ thống SafeGuard Senior hiện tại đã được tích hợp **AI thật** để phân tích deepfake/ảnh AI-generated thay vì sử dụng giả lập.

### Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (HTML/JS)                       │
│              home.html, detectResult.html, etc.             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (FormData)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Node.js Express Backend (Port 3000)            │
│  - API routes: /api/detect/video, /audio, /link            │
│  - Database: SQLite (data/safeguard.db)                     │
│  - File upload: /uploads                                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (FormData)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         Python FastAPI Sidecar (Port 8001)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Image Analyzer                                       │   │
│  │ - EXIF/Metadata extraction                          │   │
│  │ - Error Level Analysis (ELA)                        │   │
│  │ - EfficientNet-B4 CNN classifier                    │   │
│  │ - Frequency domain analysis (FFT)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Video Analyzer (Chế độ chính xác tuyệt đối)         │   │
│  │ - Frame-by-frame extraction (3 frames/sec)          │   │
│  │ - Face detection (Haar Cascade)                     │   │
│  │ - CNN deepfake classification per frame             │   │
│  │ - Temporal consistency analysis                     │   │
│  │ - Blink rate detection                              │   │
│  │ - Face boundary quality assessment                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Audio Analyzer                                       │   │
│  │ - Pitch (F0) analysis                               │   │
│  │ - Spectral analysis (Mel-spectrogram)               │   │
│  │ - Breathing pattern detection                       │   │
│  │ - Background noise analysis                         │   │
│  │ - LFCC-based anti-spoofing classifier               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Cài Đặt & Chạy

### 1. Cài đặt Node.js Backend

```bash
cd D:\FaceDetection
npm install
```

### 2. Cài đặt Python Sidecar

```bash
cd D:\FaceDetection\python-analyzer

# Tạo môi trường ảo
python -m venv venv

# Kích hoạt venv
venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt
```

**Lưu ý:** Lần đầu cài đặt có thể mất 5-10 phút vì phải download các model pre-trained.

### 3. Chạy hệ thống

**Terminal 1 - Python Sidecar:**
```bash
cd D:\FaceDetection\python-analyzer
venv\Scripts\activate
python app.py
```

Bạn sẽ thấy:
```
🚀 SafeGuard Python Sidecar đang khởi động...
📦 Đang tải các AI models...
✅ Image Analyzer đã sẵn sàng
✅ Video Analyzer đã sẵn sàng
✅ Audio Analyzer đã sẵn sàng
🎯 SafeGuard Python Sidecar khởi động hoàn tất tại port 8001
```

**Terminal 2 - Node.js Backend:**
```bash
cd D:\FaceDetection
npm run dev
# hoặc
node server/index.js
```

**Terminal 3 - Frontend (tùy chọn, nếu dùng live-server):**
```bash
cd D:\FaceDetection
npx live-server
```

Sau đó mở trình duyệt: `http://localhost:8080` (hoặc port khác nếu live-server chỉ định)

---

## Cách Sử Dụng

### Upload Ảnh/Video

1. Mở `home.html`
2. Nhấn nút "📸 Tải lên ảnh/video"
3. Chọn file (ảnh hoặc video)
4. Chờ phân tích (5-60 giây tùy kích thước)
5. Xem kết quả trên `detectResult.html`

### Upload Âm Thanh

1. Mở `home.html`
2. Nhấn nút "🎤 Tải lên âm thanh"
3. Chọn file âm thanh
4. Chờ phân tích (2-5 giây)
5. Xem kết quả

### Kiểm Tra Đường Dẫn

1. Mở `home.html`
2. Dán URL vào ô "Kiểm tra đường dẫn"
3. Nhấn "Kiểm tra"
4. Xem kết quả ngay lập tức

---

## Kết Quả Phân Tích

### Cấu Trúc Kết Quả

```json
{
  "riskLevel": "high",           // high | medium | low
  "confidence": 88,              // 0-100
  "detail": "Đã phát hiện...",
  "explanations": [
    {
      "id": 1,
      "title": "Phát hiện công cụ AI",
      "description": "Metadata chứa chữ ký của Stable Diffusion...",
      "severity": "high",
      "icon": "warning"
    }
  ],
  "metrics": {
    "ai_score": {
      "label": "Điểm AI",
      "value": "88%",
      "status": "abnormal"
    }
  }
}
```

### Giải Thích Risk Level

- **🔴 HIGH (Cao)**: Rất có khả năng là deepfake/ảnh AI. Không nên tin tưởng.
- **🟡 MEDIUM (Trung bình)**: Có dấu hiệu bất thường. Cần thận trọng.
- **🟢 LOW (Thấp)**: Có vẻ xác thực. Nhưng vẫn nên kiểm chứng từ nguồn khác.

---

## Các Tín Hiệu Phát Hiện

### Ảnh

| Tín Hiệu | Ý Nghĩa |
|---------|--------|
| **AI Tool Detected** | Metadata chứa chữ ký Stable Diffusion, DALL-E, v.v. |
| **ELA High Error** | Error Level Analysis phát hiện vùng chỉnh sửa |
| **GAN Artifacts** | Phổ tần số có dấu hiệu của mạng GAN |
| **Missing Camera Info** | Không có thông tin máy ảnh (EXIF) |
| **CNN High Fake Score** | Mạng neural phát hiện deepfake |

### Video

| Tín Hiệu | Ý Nghĩa |
|---------|--------|
| **Temporal Flickering** | Nhấp nháy bất thường giữa các frame |
| **Face Boundary Artifacts** | Biên khuôn mặt có dấu hiệu blend/ghép |
| **Blink Rate Abnormal** | Tần suất chớp mắt không tự nhiên |
| **CNN Inconsistency** | Điểm AI không nhất quán giữa các frame |

### Âm Thanh

| Tín Hiệu | Ý Nghĩa |
|---------|--------|
| **Pitch Too Stable** | Tần số pitch quá ổn định (đặc trưng AI) |
| **Spectral Gap** | Khoảng trống phổ tần (vocoder artifact) |
| **Missing Breathing** | Không có nhịp thở tự nhiên |
| **Unnaturally Clean** | Âm thanh "sạch" bất thường (không có nhiễu) |
| **Mechanical Pauses** | Khoảng dừng quá đều (máy móc) |

---

## Performance

### Tốc độ Phân Tích

| Loại | CPU | GPU |
|------|-----|-----|
| **Ảnh** | 5-10s | 1-3s |
| **Video (1 phút)** | 30-60s | 10-20s |
| **Audio (1 phút)** | 3-5s | 2-3s |

*Lưu ý: Lần đầu chạy có thể chậm hơn vì phải load model.*

### Yêu Cầu Hệ Thống

- **RAM**: 4GB tối thiểu, 8GB khuyến nghị
- **Disk**: 2GB cho models + 1GB cho uploads
- **GPU**: Tùy chọn (NVIDIA CUDA khuyến nghị)

---

## Troubleshooting

### Python Server không khởi động

**Lỗi:** `ModuleNotFoundError: No module named 'torch'`

**Giải pháp:**
```bash
cd python-analyzer
venv\Scripts\activate
pip install -r requirements.txt
```

### Node.js không kết nối được Python

**Lỗi:** `Error: connect ECONNREFUSED 127.0.0.1:8001`

**Giải pháp:**
1. Kiểm tra Python server đang chạy: `curl http://localhost:8001/health`
2. Nếu không chạy, khởi động lại Python server
3. Kiểm tra `.env` có `PYTHON_API_URL=http://localhost:8001`

### Phân tích video quá chậm

**Giải pháp:**
1. Nếu có GPU, cài đặt PyTorch với CUDA support
2. Giảm kích thước video (compress trước khi upload)
3. Chạy trên máy mạnh hơn

### Lỗi "CUDA out of memory"

**Giải pháp:**
1. Đóng các ứng dụng khác đang dùng GPU
2. Giảm kích thước input
3. Chuyển sang CPU (chậm hơn nhưng vẫn hoạt động)

---

## Cấu Hình Nâng Cao

### Thay đổi Port Python

Sửa `python-analyzer/app.py`:
```python
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,  # ← Thay đổi port ở đây
        ...
    )
```

Sau đó cập nhật `.env`:
```
PYTHON_API_URL=http://localhost:8001  # ← Port mới
```

### Tăng Timeout cho Video Dài

Sửa `server/services/analysis.js`:
```javascript
const response = await axios.post(..., {
  timeout: 600000  // ← Tăng từ 300000 (5 min) lên 600000 (10 min)
});
```

---

## Các File Quan Trọng

```
D:\FaceDetection\
├── server/
│   ├── services/analysis.js          ← Kết nối Python
│   ├── routes/detect.js              ← API endpoints
│   └── index.js                      ← Express server
├── python-analyzer/
│   ├── app.py                        ← FastAPI main
│   ├── analyzers/
│   │   ├── image_analyzer.py
│   │   ├── video_analyzer.py
│   │   └── audio_analyzer.py
│   └── requirements.txt
├── app.js                            ← Frontend logic
├── home.html                         ← Upload page
├── detectResult.html                 ← Result page
└── .env                              ← Configuration
```

---

## Tiếp Theo

### Cải Tiến Có Thể Làm

1. **Fine-tune Models**: Train trên dataset deepfake tiếng Việt
2. **Real-time Streaming**: Phân tích video stream trực tiếp
3. **Dashboard**: Thống kê phân tích theo thời gian
4. **Mobile App**: React Native hoặc Flutter
5. **Blockchain**: Xác thực media authenticity
6. **Integration**: Kết nối với cơ quan chức năng

---

## Hỗ Trợ

- 📧 Email: support@safeguard-senior.vn
- 📱 Hotline: 1900-xxxx
- 🐛 Report bugs: GitHub Issues

---

**Cập nhật lần cuối**: 2026-04-14
**Phiên bản**: 2.0 (AI Integration Complete)
