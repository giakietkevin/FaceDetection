# SafeGuard Senior - Python AI Analyzer

Python FastAPI service chứa các model AI thật để phân tích deepfake.

## Yêu cầu

- Python 3.8+
- CUDA-capable GPU (khuyến nghị, nhưng có thể chạy trên CPU)
- 4GB+ RAM (8GB+ khuyến nghị cho video)

## Cài đặt

### 1. Tạo môi trường ảo

```bash
python -m venv venv
source venv/Scripts/activate  # Windows
# hoặc
source venv/bin/activate      # Linux/Mac
```

### 2. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

**Lưu ý:** Nếu bạn có GPU NVIDIA, cài đặt PyTorch với CUDA:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Chạy service

```bash
python app.py
```

Service sẽ chạy tại `http://localhost:8001`

## Endpoints

- `GET /health` - Health check
- `POST /detect/image` - Phân tích ảnh deepfake
- `POST /detect/video` - Phân tích video deepfake
- `POST /detect/audio` - Phân tích giọng nói AI

## Kiến trúc

```
analyzers/
├── image_analyzer.py   - EXIF + ELA + CNN + Frequency analysis
├── video_analyzer.py   - Frame-by-frame + Temporal consistency
└── audio_analyzer.py   - Pitch + Spectral + Breathing + Anti-spoofing
```

## Models

- **Image**: EfficientNet-B4 (ImageNet pre-trained)
- **Video**: Frame-by-frame CNN + Temporal analysis
- **Audio**: LFCC-based anti-spoofing classifier

## Performance

- **Image**: ~1-3s trên GPU, ~5-10s trên CPU
- **Video**: ~10-60s tùy độ dài (chế độ chính xác tuyệt đối)
- **Audio**: ~2-5s

## Troubleshooting

### Lỗi "CUDA out of memory"
- Giảm batch size hoặc chuyển sang CPU
- Đóng các ứng dụng khác đang dùng GPU

### Lỗi "librosa not found"
```bash
pip install librosa
```

### Service chạy chậm
- Kiểm tra xem có đang dùng GPU không: xem log khởi động
- Nếu dùng CPU, cân nhắc giảm số frame phân tích trong video_analyzer.py
