"""
SafeGuard Senior - Python AI Analysis Sidecar
=============================================
FastAPI service chứa các model AI thật để phân tích deepfake.
Chạy song song với Node.js backend.

Endpoints:
  POST /detect/image  - Phân tích ảnh deepfake/AI-generated
  POST /detect/video  - Phân tích video deepfake (frame-by-frame + temporal)
  POST /detect/audio  - Phân tích giọng nói AI/voice cloning
  GET  /health        - Health check + thông tin models đang tải
"""

import os
import sys
import time
import logging
import codecs

# Fix Windows console encoding for emojis/Vietnamese
if sys.platform == 'win32':
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)
    except Exception:
        pass

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("safeguard")

# ─── Import analysers (lazy - chỉ import khi đã cài requirements) ───────────
from analyzers.image_analyzer import ImageAnalyzer
from analyzers.video_analyzer import VideoAnalyzer
from analyzers.audio_analyzer import AudioAnalyzer

# ─── Global model instances ─────────────────────────────────────────────────
image_analyzer: ImageAnalyzer = None
video_analyzer: VideoAnalyzer = None
audio_analyzer: AudioAnalyzer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    global image_analyzer, video_analyzer, audio_analyzer

    logger.info("🚀 SafeGuard Python Sidecar đang khởi động...")
    logger.info("📦 Đang tải các AI models (lần đầu có thể mất vài phút)...")

    try:
        image_analyzer = ImageAnalyzer()
        logger.info("✅ Image Analyzer đã sẵn sàng")
    except Exception as e:
        logger.error(f"❌ Lỗi tải Image Analyzer: {e}")

    try:
        video_analyzer = VideoAnalyzer(image_analyzer=image_analyzer)
        logger.info("✅ Video Analyzer đã sẵn sàng")
    except Exception as e:
        logger.error(f"❌ Lỗi tải Video Analyzer: {e}")

    try:
        audio_analyzer = AudioAnalyzer()
        logger.info("✅ Audio Analyzer đã sẵn sàng")
    except Exception as e:
        logger.error(f"❌ Lỗi tải Audio Analyzer: {e}")

    logger.info("🎯 SafeGuard Python Sidecar khởi động hoàn tất tại port 8001")
    yield

    logger.info("🛑 Sidecar đang tắt...")


# ─── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="SafeGuard Senior - AI Analysis Engine",
    description="Python sidecar chứa các model AI thật cho deepfake detection",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Response schema ─────────────────────────────────────────────────────────
class DetectionResponse(BaseModel):
    success: bool
    riskLevel: str           # 'high' | 'medium' | 'low'
    confidence: int          # 0-100
    detail: str
    explanations: list
    metrics: dict
    processingTime: float    # giây


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "models": {
            "image": image_analyzer is not None and image_analyzer.is_ready(),
            "video": video_analyzer is not None and video_analyzer.is_ready(),
            "audio": audio_analyzer is not None and audio_analyzer.is_ready(),
        },
        "device": str(image_analyzer.device) if image_analyzer else "unknown"
    }


@app.post("/detect/image", response_model=DetectionResponse)
async def detect_image(file: UploadFile = File(...)):
    """
    Phân tích ảnh để phát hiện deepfake hoặc ảnh do AI tạo ra.

    Sử dụng:
    - EXIF/metadata analysis (Stable Diffusion signatures, missing camera info)
    - Error Level Analysis (ELA) - phát hiện vùng ảnh bị chỉnh sửa
    - CNN deepfake classifier (EfficientNet-B4 pre-trained)
    - GAN frequency artifact detection (FFT analysis)
    """
    if image_analyzer is None:
        raise HTTPException(status_code=503, detail="Image analyzer chưa sẵn sàng")

    t0 = time.time()
    try:
        image_bytes = await file.read()
        result = image_analyzer.analyze(image_bytes, filename=file.filename)
        result["processingTime"] = round(time.time() - t0, 2)
        result["success"] = True
        return result
    except Exception as e:
        logger.error(f"Lỗi phân tích ảnh '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/video", response_model=DetectionResponse)
async def detect_video(file: UploadFile = File(...)):
    """
    Phân tích video để phát hiện deepfake.

    Sử dụng:
    - Frame extraction toàn bộ (chính xác tuyệt đối)
    - Face detection trên từng frame (MTCNN / MediaPipe)
    - CNN deepfake classifier trên từng frame có mặt
    - Temporal consistency analysis (phát hiện flickering giữa frames)
    - Blink rate detection
    - Lip-sync quality estimation
    """
    if video_analyzer is None:
        raise HTTPException(status_code=503, detail="Video analyzer chưa sẵn sàng")

    t0 = time.time()

    # Lưu file tạm vì OpenCV cần đường dẫn file
    import tempfile, shutil
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = video_analyzer.analyze(tmp_path, filename=file.filename)
        result["processingTime"] = round(time.time() - t0, 2)
        result["success"] = True
        return result
    except Exception as e:
        logger.error(f"Lỗi phân tích video '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)


@app.post("/detect/audio", response_model=DetectionResponse)
async def detect_audio(file: UploadFile = File(...)):
    """
    Phân tích âm thanh để phát hiện giọng nói AI (voice cloning / TTS).

    Sử dụng:
    - Mel-spectrogram + LFCC features extraction
    - Pitch (F0) analysis - phát hiện pitch fluctuation bất thường
    - Formant analysis - so sánh với đặc điểm sinh lý tự nhiên
    - Spectral gap detection (dấu hiệu vocoder)
    - Breathing pattern analysis
    - Lightweight anti-spoofing classifier
    """
    if audio_analyzer is None:
        raise HTTPException(status_code=503, detail="Audio analyzer chưa sẵn sàng")

    t0 = time.time()
    try:
        audio_bytes = await file.read()
        result = audio_analyzer.analyze(audio_bytes, filename=file.filename)
        result["processingTime"] = round(time.time() - t0, 2)
        result["success"] = True
        return result
    except Exception as e:
        logger.error(f"Lỗi phân tích audio '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=False,          # Không dùng reload vì models nặng
        workers=1,             # 1 worker vì GPU không share được dễ dàng
        log_level="info"
    )
