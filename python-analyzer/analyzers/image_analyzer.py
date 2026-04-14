"""
Image Analyzer - Phân tích ảnh deepfake/AI-generated (Enhanced)
================================================================
Sử dụng HuggingFace pre-trained model + multi-layer analysis:
1. HuggingFace deepfake detection model (ViT-based, train trên dataset thật)
2. EXIF/Metadata analysis - tìm chữ ký AI tools
3. Error Level Analysis (ELA) - phát hiện vùng chỉnh sửa
4. Frequency domain analysis - phát hiện GAN artifacts
5. Skin texture analysis - phát hiện kết cấu da bất thường
6. Eye reflection analysis - phát hiện mắt giả
"""

import io
import logging
from typing import Dict, List, Any
from PIL import Image
from PIL.ExifTags import TAGS
import numpy as np
import cv2
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification

logger = logging.getLogger("safeguard.image")


class ImageAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"🖼️  Image Analyzer khởi tạo trên device: {self.device}")

        # Load HuggingFace deepfake detection model
        self.model, self.processor = self._load_hf_model()

        # AI tool signatures trong metadata
        self.ai_tool_signatures = [
            'stable diffusion', 'stablediffusion', 'automatic1111', 'a1111',
            'dall-e', 'dalle', 'midjourney', 'novelai', 'invoke',
            'comfyui', 'sd-webui', 'diffusers', 'controlnet'
        ]

        logger.info("✅ Image Analyzer sẵn sàng")

    def _load_hf_model(self):
        """Load pre-trained deepfake detection model từ HuggingFace."""
        try:
            model_id = "dima806/deepfake_vs_real_image_detection"
            logger.info(f"📥 Đang tải model từ HuggingFace: {model_id}")

            processor = AutoImageProcessor.from_pretrained(model_id)
            model = AutoModelForImageClassification.from_pretrained(model_id)
            model = model.to(self.device)
            model.eval()

            logger.info(f"✅ HuggingFace model đã tải: {model_id}")
            return model, processor
        except Exception as e:
            logger.error(f"❌ Lỗi tải HuggingFace model: {e}")
            logger.warning("⚠️  Sẽ sử dụng fallback mode (độ chính xác thấp hơn)")
            return None, None

    def is_ready(self) -> bool:
        return self.model is not None

    def analyze(self, image_bytes: bytes, filename: str = None) -> Dict[str, Any]:
        """
        Phân tích ảnh toàn diện với HuggingFace model.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        except Exception as e:
            logger.error(f"Không thể đọc ảnh: {e}")
            return self._error_result(f"Không thể đọc file ảnh: {e}")

        # ─── Layer 1: Metadata Analysis ─────────────────────────────────────
        metadata_result = self._analyze_metadata(image_bytes, image)

        # ─── Layer 2: Error Level Analysis (ELA) ────────────────────────────
        ela_result = self._analyze_ela(image)

        # ─── Layer 3: HuggingFace Deepfake Detection ────────────────────────
        hf_result = self._analyze_hf_model(image)

        # ─── Layer 4: Frequency Domain Analysis ────────────────────────────
        freq_result = self._analyze_frequency(image)

        # ─── Layer 5: Skin Texture Analysis ─────────────────────────────────
        texture_result = self._analyze_skin_texture(image)

        # ─── Layer 6: Eye Reflection Analysis ───────────────────────────────
        eye_result = self._analyze_eye_reflection(image)

        # ─── Ensemble: Kết hợp tất cả layers ────────────────────────────────
        return self._ensemble_results(
            metadata_result, ela_result, hf_result, freq_result,
            texture_result, eye_result, filename
        )

    def _analyze_metadata(self, image_bytes: bytes, image: Image.Image) -> Dict:
        """Phân tích EXIF/metadata để tìm dấu hiệu AI-generated."""
        signals = []
        confidence = 0.0

        try:
            exif_data = image._getexif()
            if exif_data:
                exif = {TAGS.get(k, k): v for k, v in exif_data.items()}

                # Kiểm tra Software field
                software = exif.get('Software', '').lower()
                if any(sig in software for sig in self.ai_tool_signatures):
                    signals.append({
                        'type': 'ai_tool_detected',
                        'value': exif.get('Software'),
                        'severity': 'high'
                    })
                    confidence = 0.95

                # Kiểm tra thiếu camera info
                if not exif.get('Make') and not exif.get('Model'):
                    signals.append({
                        'type': 'missing_camera_info',
                        'value': None,
                        'severity': 'medium'
                    })
                    confidence = max(confidence, 0.6)
            else:
                # Không có EXIF - đáng ngờ với ảnh chụp thật
                signals.append({
                    'type': 'no_exif',
                    'value': None,
                    'severity': 'medium'
                })
                confidence = max(confidence, 0.5)

        except Exception as e:
            logger.debug(f"Không đọc được EXIF: {e}")

        # Kiểm tra PNG metadata (Stable Diffusion thường embed parameters)
        if hasattr(image, 'info'):
            for key in ['parameters', 'prompt', 'negative_prompt', 'model']:
                if key in image.info:
                    signals.append({
                        'type': 'ai_generation_params',
                        'value': key,
                        'severity': 'high'
                    })
                    confidence = 0.98
                    break

        return {'confidence': confidence, 'signals': signals}

    def _analyze_ela(self, image: Image.Image) -> Dict:
        """Error Level Analysis - phát hiện vùng ảnh bị chỉnh sửa."""
        try:
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=90)
            buffer.seek(0)
            compressed = Image.open(buffer).convert('RGB')

            orig_arr = np.array(image)
            comp_arr = np.array(compressed)
            diff = np.abs(orig_arr.astype(float) - comp_arr.astype(float))

            ela_score = np.mean(diff)
            variance = np.var(diff)

            signals = []
            confidence = 0.0

            if ela_score > 15:
                signals.append({
                    'type': 'ela_high_error',
                    'value': f'{ela_score:.1f}',
                    'severity': 'high'
                })
                confidence = 0.75
            elif ela_score > 8:
                signals.append({
                    'type': 'ela_moderate_error',
                    'value': f'{ela_score:.1f}',
                    'severity': 'medium'
                })
                confidence = 0.5

            if variance > 100:
                signals.append({
                    'type': 'ela_high_variance',
                    'value': f'{variance:.1f}',
                    'severity': 'medium'
                })
                confidence = max(confidence, 0.6)

            return {'confidence': confidence, 'signals': signals, 'ela_score': ela_score}
        except Exception as e:
            logger.error(f"Lỗi ELA: {e}")
            return {'confidence': 0.0, 'signals': [], 'ela_score': 0}

    def _analyze_hf_model(self, image: Image.Image) -> Dict:
        """HuggingFace deepfake detection model (train trên dataset thật)."""
        if self.model is None or self.processor is None:
            return {'confidence': 0.0, 'signals': []}

        try:
            # Preprocess với HuggingFace processor
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=1)

            # Model có 2 classes: real (0) và fake (1)
            fake_prob = probs[0][1].item()

            signals = []
            if fake_prob > 0.75:
                signals.append({
                    'type': 'hf_high_fake_score',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'high'
                })
            elif fake_prob > 0.5:
                signals.append({
                    'type': 'hf_moderate_fake_score',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'medium'
                })

            return {'confidence': fake_prob, 'signals': signals}
        except Exception as e:
            logger.error(f"Lỗi HuggingFace inference: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_frequency(self, image: Image.Image) -> Dict:
        """Phân tích frequency domain để phát hiện GAN artifacts."""
        try:
            gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
            f = np.fft.fft2(gray)
            fshift = np.fft.fftshift(f)
            magnitude = np.abs(fshift)

            h, w = magnitude.shape
            center_h, center_w = h // 2, w // 2

            mask = np.zeros((h, w))
            cv2.circle(mask, (center_w, center_h), min(h, w) // 4, 1, -1)
            high_freq = magnitude * (1 - mask)

            high_freq_energy = np.sum(high_freq) / np.sum(magnitude)

            signals = []
            confidence = 0.0

            if high_freq_energy > 0.15:
                signals.append({
                    'type': 'gan_frequency_artifacts',
                    'value': f'{high_freq_energy:.3f}',
                    'severity': 'high'
                })
                confidence = 0.7
            elif high_freq_energy > 0.10:
                signals.append({
                    'type': 'frequency_anomaly',
                    'value': f'{high_freq_energy:.3f}',
                    'severity': 'medium'
                })
                confidence = 0.5

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            logger.error(f"Lỗi frequency analysis: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_skin_texture(self, image: Image.Image) -> Dict:
        """Phân tích kết cấu da - AI thường tạo da quá mượt."""
        try:
            img_arr = np.array(image)
            gray = cv2.cvtColor(img_arr, cv2.COLOR_RGB2GRAY)

            # Tính Laplacian (phát hiện edge/texture)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            texture_variance = np.var(laplacian)

            signals = []
            confidence = 0.0

            # AI-generated thường có texture quá mượt (variance thấp)
            if texture_variance < 50:
                signals.append({
                    'type': 'skin_too_smooth',
                    'value': f'{texture_variance:.1f}',
                    'severity': 'high'
                })
                confidence = 0.65
            elif texture_variance < 100:
                signals.append({
                    'type': 'skin_somewhat_smooth',
                    'value': f'{texture_variance:.1f}',
                    'severity': 'medium'
                })
                confidence = 0.4

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            logger.debug(f"Skin texture analysis error: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_eye_reflection(self, image: Image.Image) -> Dict:
        """Phân tích phản xạ mắt - deepfake thường có mắt giả."""
        try:
            img_arr = np.array(image)
            gray = cv2.cvtColor(img_arr, cv2.COLOR_RGB2GRAY)

            # Detect eyes using Haar Cascade
            eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
            eyes = eye_cascade.detectMultiScale(gray, 1.1, 4)

            signals = []
            confidence = 0.0

            if len(eyes) == 0:
                signals.append({
                    'type': 'no_eyes_detected',
                    'value': None,
                    'severity': 'medium'
                })
                confidence = 0.4
            elif len(eyes) >= 2:
                # Kiểm tra symmetry của mắt
                eye_centers = [(e[0] + e[2]//2, e[1] + e[3]//2) for e in eyes[:2]]
                if len(eye_centers) == 2:
                    y_diff = abs(eye_centers[0][1] - eye_centers[1][1])
                    if y_diff > 10:  # Mắt không cân xứng
                        signals.append({
                            'type': 'eye_asymmetry',
                            'value': f'{y_diff}px',
                            'severity': 'medium'
                        })
                        confidence = 0.5

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            logger.debug(f"Eye reflection analysis error: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _ensemble_results(self, metadata, ela, hf, freq, texture, eye, filename) -> Dict:
        """Kết hợp kết quả từ tất cả layers."""
        # Weighted ensemble - HuggingFace model được ưu tiên cao nhất
        weights = {
            'hf': 0.45,           # HuggingFace model (train trên dataset thật)
            'metadata': 0.15,
            'ela': 0.15,
            'freq': 0.10,
            'texture': 0.10,
            'eye': 0.05
        }

        total_confidence = (
            hf['confidence'] * weights['hf'] +
            metadata['confidence'] * weights['metadata'] +
            ela['confidence'] * weights['ela'] +
            freq['confidence'] * weights['freq'] +
            texture['confidence'] * weights['texture'] +
            eye['confidence'] * weights['eye']
        )

        # Map sang risk level
        if total_confidence >= 0.7:
            risk_level = 'high'
        elif total_confidence >= 0.4:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Tổng hợp signals
        all_signals = (
            hf['signals'] + metadata['signals'] + ela['signals'] +
            freq['signals'] + texture['signals'] + eye['signals']
        )

        # Tạo explanations
        explanations = self._generate_explanations(all_signals, risk_level)

        # Tạo metrics
        metrics = self._generate_metrics(metadata, ela, hf, freq, texture, eye, risk_level)

        # Tạo detail text
        detail = self._generate_detail(risk_level, all_signals)

        return {
            'riskLevel': risk_level,
            'confidence': int(total_confidence * 100),
            'detail': detail,
            'explanations': explanations,
            'metrics': metrics
        }

    def _generate_explanations(self, signals: List[Dict], risk_level: str) -> List[Dict]:
        """Tạo explanations từ signals."""
        explanations = []
        idx = 1

        signal_map = {
            'hf_high_fake_score': {
                'title': 'AI phát hiện deepfake (HuggingFace)',
                'description': 'Model deepfake detection được train trên dataset thật phát hiện ảnh này là deepfake/AI-generated.',
                'icon': 'psychology'
            },
            'ai_tool_detected': {
                'title': 'Phát hiện công cụ AI',
                'description': 'Metadata chứa chữ ký của công cụ tạo ảnh AI (Stable Diffusion, DALL-E, v.v.)',
                'icon': 'warning'
            },
            'ai_generation_params': {
                'title': 'Tham số sinh ảnh AI',
                'description': 'Ảnh chứa thông tin prompt và tham số sinh ảnh - đây là ảnh do AI tạo ra',
                'icon': 'code'
            },
            'skin_too_smooth': {
                'title': 'Da quá mượt (dấu hiệu AI)',
                'description': 'Kết cấu da bất thường mượt - đặc trưng của ảnh do AI tạo ra',
                'icon': 'dermatology'
            },
            'ela_high_error': {
                'title': 'Phát hiện vùng chỉnh sửa',
                'description': 'Error Level Analysis cho thấy có vùng ảnh bị chỉnh sửa hoặc ghép nối',
                'icon': 'edit'
            },
            'gan_frequency_artifacts': {
                'title': 'Hiện tượng GAN',
                'description': 'Phát hiện các hiện tượng đặc trưng của mạng GAN trong phổ tần số',
                'icon': 'analytics'
            },
            'eye_asymmetry': {
                'title': 'Mắt không cân xứng',
                'description': 'Hai mắt không cân xứng - dấu hiệu của deepfake face swap',
                'icon': 'visibility'
            }
        }

        for signal in signals[:4]:
            sig_type = signal['type']
            if sig_type in signal_map:
                exp = signal_map[sig_type]
                explanations.append({
                    'id': idx,
                    'title': exp['title'],
                    'description': exp['description'],
                    'severity': signal['severity'],
                    'icon': exp['icon']
                })
                idx += 1

        if not explanations:
            if risk_level == 'low':
                explanations.append({
                    'id': 1,
                    'title': 'Ảnh có vẻ xác thực',
                    'description': 'Không phát hiện dấu hiệu bất thường đáng kể. Ảnh có vẻ là ảnh thật.',
                    'severity': 'low',
                    'icon': 'verified'
                })

        return explanations

    def _generate_metrics(self, metadata, ela, hf, freq, texture, eye, risk_level) -> Dict:
        """Tạo metrics chi tiết."""
        metrics = {}

        # HuggingFace score (chính)
        if hf['confidence'] > 0:
            metrics['hf_score'] = {
                'label': 'Điểm AI (HuggingFace)',
                'value': f"{int(hf['confidence'] * 100)}%",
                'status': 'abnormal' if hf['confidence'] > 0.75 else 'warning' if hf['confidence'] > 0.5 else 'normal'
            }

        # ELA score
        if 'ela_score' in ela:
            metrics['ela_score'] = {
                'label': 'Error Level Analysis',
                'value': f"{ela['ela_score']:.1f}",
                'threshold': '< 8.0',
                'status': 'abnormal' if ela['ela_score'] > 15 else 'warning' if ela['ela_score'] > 8 else 'normal'
            }

        # Skin texture
        metrics['skin_quality'] = {
            'label': 'Chất lượng da',
            'value': 'Quá mượt' if texture['confidence'] > 0.5 else 'Tự nhiên',
            'status': 'abnormal' if texture['confidence'] > 0.5 else 'normal'
        }

        # Metadata
        has_ai_sig = any(s['type'] in ['ai_tool_detected', 'ai_generation_params'] for s in metadata['signals'])
        metrics['metadata'] = {
            'label': 'Dữ liệu EXIF',
            'value': 'Có dấu hiệu AI' if has_ai_sig else 'Sạch',
            'status': 'abnormal' if has_ai_sig else 'normal'
        }

        return metrics

    def _generate_detail(self, risk_level: str, signals: List[Dict]) -> str:
        """Tạo detail text tổng quan."""
        if risk_level == 'high':
            return 'Đã phát hiện dấu hiệu rõ ràng của ảnh deepfake hoặc ảnh do AI tạo ra. Khả năng cao đây KHÔNG phải ảnh thật.'
        elif risk_level == 'medium':
            return 'Phát hiện một số dấu hiệu bất thường. Ảnh có thể đã bị chỉnh sửa hoặc do AI tạo ra. Cần thận trọng.'
        else:
            return 'Không phát hiện dấu hiệu bất thường đáng kể. Ảnh có vẻ xác thực.'

    def _error_result(self, error_msg: str) -> Dict:
        """Trả về kết quả lỗi."""
        return {
            'riskLevel': 'medium',
            'confidence': 50,
            'detail': f'Không thể phân tích ảnh: {error_msg}',
            'explanations': [],
            'metrics': {}
        }
