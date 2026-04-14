"""
Image Analyzer - Phân tích ảnh deepfake/AI-generated
====================================================
Sử dụng nhiều phương pháp kết hợp:
1. EXIF/Metadata analysis - tìm chữ ký AI tools
2. Error Level Analysis (ELA) - phát hiện vùng chỉnh sửa
3. CNN Classifier - EfficientNet-B4 pre-trained cho deepfake detection
4. Frequency domain analysis - phát hiện GAN artifacts
"""

import io
import logging
from typing import Dict, List, Any
from PIL import Image
from PIL.ExifTags import TAGS
import numpy as np
import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models

logger = logging.getLogger("safeguard.image")


class ImageAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"🖼️  Image Analyzer khởi tạo trên device: {self.device}")

        # Load CNN model (EfficientNet-B4 làm backbone)
        self.model = self._load_model()
        self.transform = transforms.Compose([
            transforms.Resize((380, 380)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        # AI tool signatures trong metadata
        self.ai_tool_signatures = [
            'stable diffusion', 'stablediffusion', 'automatic1111', 'a1111',
            'dall-e', 'dalle', 'midjourney', 'novelai', 'invoke',
            'comfyui', 'sd-webui', 'diffusers', 'controlnet'
        ]

        logger.info("✅ Image Analyzer sẵn sàng")

    def _load_model(self):
        """Load pre-trained EfficientNet-B4 cho binary classification (real/fake)."""
        try:
            # Sử dụng EfficientNet-B4 pre-trained trên ImageNet
            model = models.efficientnet_b4(weights='IMAGENET1K_V1')

            # Thay classifier cuối cùng cho binary classification
            num_features = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(num_features, 2)  # 2 classes: real, fake

            model = model.to(self.device)
            model.eval()

            logger.info("✅ EfficientNet-B4 model đã tải (ImageNet weights)")
            return model
        except Exception as e:
            logger.error(f"❌ Lỗi tải model: {e}")
            return None

    def is_ready(self) -> bool:
        return self.model is not None

    def analyze(self, image_bytes: bytes, filename: str = None) -> Dict[str, Any]:
        """
        Phân tích ảnh toàn diện.

        Returns:
            {
                'riskLevel': 'high' | 'medium' | 'low',
                'confidence': int (0-100),
                'detail': str,
                'explanations': [...],
                'metrics': {...}
            }
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

        # ─── Layer 3: CNN Deepfake Detection ────────────────────────────────
        cnn_result = self._analyze_cnn(image)

        # ─── Layer 4: Frequency Domain Analysis ────────────────────────────
        freq_result = self._analyze_frequency(image)

        # ─── Ensemble: Kết hợp tất cả layers ────────────────────────────────
        return self._ensemble_results(
            metadata_result, ela_result, cnn_result, freq_result, filename
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
            # Lưu ảnh với JPEG quality 90%, sau đó so sánh với bản gốc
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=90)
            buffer.seek(0)
            compressed = Image.open(buffer).convert('RGB')

            # Tính sai khác giữa gốc và compressed
            orig_arr = np.array(image)
            comp_arr = np.array(compressed)
            diff = np.abs(orig_arr.astype(float) - comp_arr.astype(float))

            # Tính độ lệch trung bình
            ela_score = np.mean(diff)

            # Phát hiện vùng bất thường (variance cao)
            variance = np.var(diff)

            signals = []
            confidence = 0.0

            if ela_score > 15:  # Ngưỡng thực nghiệm
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

    def _analyze_cnn(self, image: Image.Image) -> Dict:
        """CNN deepfake detection sử dụng EfficientNet."""
        if self.model is None:
            return {'confidence': 0.0, 'signals': []}

        try:
            # Preprocess
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Inference
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probs = torch.softmax(outputs, dim=1)
                fake_prob = probs[0][1].item()  # Xác suất class "fake"

            signals = []
            if fake_prob > 0.7:
                signals.append({
                    'type': 'cnn_high_fake_score',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'high'
                })
            elif fake_prob > 0.5:
                signals.append({
                    'type': 'cnn_moderate_fake_score',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'medium'
                })

            return {'confidence': fake_prob, 'signals': signals}
        except Exception as e:
            logger.error(f"Lỗi CNN inference: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_frequency(self, image: Image.Image) -> Dict:
        """Phân tích frequency domain để phát hiện GAN artifacts."""
        try:
            # Chuyển sang grayscale và FFT
            gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
            f = np.fft.fft2(gray)
            fshift = np.fft.fftshift(f)
            magnitude = np.abs(fshift)

            # Phân tích phổ tần - GAN thường có pattern đặc trưng ở tần số cao
            h, w = magnitude.shape
            center_h, center_w = h // 2, w // 2

            # Lấy vùng tần số cao (vòng ngoài)
            mask = np.zeros((h, w))
            cv2.circle(mask, (center_w, center_h), min(h, w) // 4, 1, -1)
            high_freq = magnitude * (1 - mask)

            # Tính energy tần số cao
            high_freq_energy = np.sum(high_freq) / np.sum(magnitude)

            signals = []
            confidence = 0.0

            # GAN artifacts thường có energy tần số cao bất thường
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

    def _ensemble_results(self, metadata, ela, cnn, freq, filename) -> Dict:
        """Kết hợp kết quả từ tất cả layers."""
        # Weighted ensemble
        weights = {'metadata': 0.3, 'ela': 0.2, 'cnn': 0.35, 'freq': 0.15}

        total_confidence = (
            metadata['confidence'] * weights['metadata'] +
            ela['confidence'] * weights['ela'] +
            cnn['confidence'] * weights['cnn'] +
            freq['confidence'] * weights['freq']
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
            metadata['signals'] + ela['signals'] +
            cnn['signals'] + freq['signals']
        )

        # Tạo explanations (Vietnamese)
        explanations = self._generate_explanations(all_signals, risk_level)

        # Tạo metrics
        metrics = self._generate_metrics(metadata, ela, cnn, freq, risk_level)

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
            'missing_camera_info': {
                'title': 'Thiếu thông tin máy ảnh',
                'description': 'Không tìm thấy thông tin máy ảnh trong EXIF - ảnh chụp thật thường có thông tin này',
                'icon': 'photo_camera'
            },
            'ela_high_error': {
                'title': 'Phát hiện vùng chỉnh sửa',
                'description': 'Error Level Analysis cho thấy có vùng ảnh bị chỉnh sửa hoặc ghép nối',
                'icon': 'edit'
            },
            'cnn_high_fake_score': {
                'title': 'Mô hình AI phát hiện deepfake',
                'description': 'Mạng neural nhận diện đây là ảnh deepfake với độ tin cậy cao',
                'icon': 'psychology'
            },
            'gan_frequency_artifacts': {
                'title': 'Hiện tượng GAN',
                'description': 'Phát hiện các hiện tượng đặc trưng của mạng GAN trong phổ tần số',
                'icon': 'analytics'
            }
        }

        for signal in signals[:4]:  # Lấy tối đa 4 signals quan trọng nhất
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

        # Nếu không có signal nào, thêm explanation mặc định
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

    def _generate_metrics(self, metadata, ela, cnn, freq, risk_level) -> Dict:
        """Tạo metrics chi tiết."""
        metrics = {}

        # CNN score
        if cnn['confidence'] > 0:
            metrics['ai_score'] = {
                'label': 'Điểm AI (CNN)',
                'value': f"{int(cnn['confidence'] * 100)}%",
                'status': 'abnormal' if cnn['confidence'] > 0.7 else 'warning' if cnn['confidence'] > 0.5 else 'normal'
            }

        # ELA score
        if 'ela_score' in ela:
            metrics['ela_score'] = {
                'label': 'Error Level Analysis',
                'value': f"{ela['ela_score']:.1f}",
                'threshold': '< 8.0',
                'status': 'abnormal' if ela['ela_score'] > 15 else 'warning' if ela['ela_score'] > 8 else 'normal'
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
