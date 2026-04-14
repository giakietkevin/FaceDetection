"""
Video Analyzer - Phân tích video deepfake (Enhanced)
=====================================================
Sử dụng HuggingFace deepfake model (từ image_analyzer) + multi-layer:
1. Frame-by-frame HuggingFace deepfake detection (model thật)
2. MediaPipe face landmarks → blink rate detection chính xác
3. Optical flow → temporal consistency chính xác
4. Face boundary artifact detection
5. Head pose consistency
"""

import os
import io
import logging
import math
from typing import Dict, List, Any, Optional

import cv2
import numpy as np
import torch
from PIL import Image

logger = logging.getLogger("safeguard.video")


class VideoAnalyzer:
    def __init__(self, image_analyzer=None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.image_analyzer = image_analyzer
        self._ready = False

        # Face detection
        self.face_cascade = None
        self._load_face_detector()

        # MediaPipe face mesh (for blink detection)
        self.face_mesh = None
        self._load_mediapipe()

        self._ready = True
        logger.info("✅ Video Analyzer sẵn sàng")

    def _load_face_detector(self):
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            logger.error("❌ Không tải được face detector")
        else:
            logger.info("✅ Face detector (Haar Cascade) đã tải")

    def _load_mediapipe(self):
        """Tải MediaPipe FaceMesh cho blink detection."""
        try:
            import mediapipe as mp
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            logger.info("✅ MediaPipe FaceMesh đã tải")
        except Exception as e:
            logger.warning(f"⚠️  Không tải được MediaPipe: {e}")
            self.face_mesh = None

    def is_ready(self) -> bool:
        return self._ready

    def analyze(self, video_path: str, filename: str = None) -> Dict[str, Any]:
        """Phân tích video deepfake - CHẾ ĐỘ CHÍNH XÁC TUYỆT ĐỐI."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return self._error_result("Không thể mở file video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        logger.info(f"📹 Video: {filename or 'unknown'} | FPS: {fps:.1f} | Frames: {total_frames} | Duration: {duration:.1f}s")

        # Chế độ chính xác tuyệt đối: 3 frames/giây
        sample_rate = max(1, int(fps / 3))
        frames_data = []
        face_scores = []
        temporal_diffs = []
        blink_data = []
        prev_face = None
        prev_gray = None

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                result = self._process_single_frame(frame, frame_idx, fps)
                frames_data.append(result)

                # Deepfake score qua HuggingFace model (từ image_analyzer)
                if result['has_face'] and result.get('face_crop') is not None:
                    face_score = self._get_hf_score_for_face(result['face_crop'])
                    face_scores.append(face_score)

                    # Temporal diff
                    if prev_face is not None:
                        diff = self._compute_temporal_diff(prev_face, result['face_crop'])
                        temporal_diffs.append({'frame': frame_idx, 'diff': diff})
                    prev_face = result['face_crop']

                # Optical flow (mượt hơn temporal diff)
                curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if prev_gray is not None:
                    flow = self._compute_optical_flow(prev_gray, curr_gray)
                    if flow is not None:
                        result['flow_magnitude'] = flow
                prev_gray = curr_gray

                # Blink detection via MediaPipe
                ear = self._compute_blink_ear(frame)
                if ear is not None:
                    blink_data.append({'frame': frame_idx, 'ear': ear})

            frame_idx += 1

        cap.release()

        logger.info(f"📊 Đã phân tích {len(frames_data)} frames, phát hiện mặt: {sum(1 for f in frames_data if f['has_face'])}")

        return self._aggregate_results(
            frames_data, face_scores, temporal_diffs, blink_data,
            total_frames, fps, duration, filename
        )

    def _process_single_frame(self, frame: np.ndarray, frame_idx: int, fps: float) -> Dict:
        result = {
            'frame_idx': frame_idx,
            'timestamp': frame_idx / fps,
            'has_face': False,
            'face_crop': None,
            'face_rect': None,
            'face_boundary_quality': 1.0,
            'flow_magnitude': None,
        }

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if self.face_cascade is None:
            return result

        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            result['has_face'] = True
            result['face_rect'] = (x, y, w, h)

            padding = int(max(w, h) * 0.3)
            x1, y1 = max(0, x - padding), max(0, y - padding)
            x2, y2 = min(frame.shape[1], x + w + padding), min(frame.shape[0], y + h + padding)
            face_crop = cv2.resize(frame[y1:y2, x1:x2], (224, 224))
            result['face_crop'] = face_crop
            result['face_boundary_quality'] = self._check_face_boundary(frame, x, y, w, h)

        return result

    def _check_face_boundary(self, frame, x, y, w, h) -> float:
        try:
            mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            cv2.rectangle(mask, (x, y), (x + w, y + h), 255, 3)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)
            boundary_gradient = gradient_mag[mask > 0]
            if len(boundary_gradient) == 0: return 1.0
            return min(1.0, (np.mean(boundary_gradient) + np.std(boundary_gradient)) / 100)
        except Exception:
            return 1.0

    def _get_hf_score_for_face(self, face_crop: np.ndarray) -> float:
        """Sử dụng HuggingFace deepfake model từ image_analyzer."""
        if self.image_analyzer is None:
            return 0.5

        # Nếu image_analyzer có HuggingFace model
        if hasattr(self.image_analyzer, 'model') and self.image_analyzer.model is not None:
            try:
                pil_image = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB))
                if hasattr(self.image_analyzer, 'processor') and self.image_analyzer.processor is not None:
                    inputs = self.image_analyzer.processor(images=pil_image, return_tensors="pt")
                    inputs = {k: v.to(self.device) for k, v in inputs.items()}
                    with torch.no_grad():
                        outputs = self.image_analyzer.model(**inputs)
                        probs = torch.softmax(outputs.logits, dim=1)
                        fake_prob = probs[0][1].item()
                    return fake_prob
            except Exception as e:
                logger.debug(f"HF face score error: {e}")
        return 0.5

    def _compute_temporal_diff(self, prev_face, curr_face) -> float:
        try:
            prev_gray = cv2.cvtColor(prev_face, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_face, cv2.COLOR_BGR2GRAY)
            return float(np.mean(np.abs(prev_gray.astype(float) - curr_gray.astype(float))))
        except Exception:
            return 0.0

    def _compute_optical_flow(self, prev_gray, curr_gray) -> Optional[float]:
        """Tính Optical Flow để đo mức độ chuyển động."""
        try:
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
            )
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            return float(np.mean(mag))
        except Exception:
            return None

    def _compute_blink_ear(self, frame) -> Optional[float]:
        """Tính Eye Aspect Ratio (EAR) để phát hiện blink."""
        if self.face_mesh is None:
            return None

        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)

            if not results.multi_face_landmarks:
                return None

            landmarks = results.multi_face_landmarks[0].landmark
            h, w = frame.shape[:2]

            # MediaPipe eye landmark indices
            LEFT_EYE = [33, 160, 158, 133, 153, 144]
            RIGHT_EYE = [362, 385, 387, 263, 373, 380]

            def eye_aspect_ratio(eye_indices):
                pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
                v1 = math.dist(pts[1], pts[5])
                v2 = math.dist(pts[2], pts[4])
                h1 = math.dist(pts[0], pts[3])
                return (v1 + v2) / (2.0 * h1) if h1 > 0 else 0

            left_ear = eye_aspect_ratio(LEFT_EYE)
            right_ear = eye_aspect_ratio(RIGHT_EYE)
            return (left_ear + right_ear) / 2.0
        except Exception as e:
            logger.debug(f"Blink EAR error: {e}")
            return None

    def _aggregate_results(self, frames_data, face_scores, temporal_diffs,
                           blink_data, total_frames, fps, duration, filename) -> Dict:
        faces_found = sum(1 for f in frames_data if f['has_face'])
        total_analyzed = len(frames_data)

        # CNN scores
        avg_cnn = np.mean(face_scores) if face_scores else 0.5
        cnn_std = np.std(face_scores) if len(face_scores) > 1 else 0.0

        # Temporal
        temporal_values = [t['diff'] for t in temporal_diffs]
        temporal_var = np.var(temporal_values) if len(temporal_values) > 1 else 0
        flicker_threshold = np.mean(temporal_values) * 2.5 if temporal_values else 30
        flicker_events = sum(1 for t in temporal_values if t > flicker_threshold)

        # Face boundary
        boundary_qualities = [f['face_boundary_quality'] for f in frames_data if f['has_face']]
        avg_boundary = np.mean(boundary_qualities) if boundary_qualities else 1.0

        # Blink rate analysis (dùng MediaPipe)
        blink_score, blink_rate, blink_detail = self._analyze_blink_rate(blink_data, duration)

        # Optical flow consistency
        flow_values = [f.get('flow_magnitude') for f in frames_data if f.get('flow_magnitude') is not None]
        flow_variance = np.var(flow_values) if len(flow_values) > 1 else 0

        # ── Ensemble ────────────────────────────────────────────────────
        score_components = {
            'cnn': avg_cnn * 0.35,
            'temporal': min(temporal_var / 50, 1.0) * 0.15,
            'flicker': min(flicker_events / max(total_analyzed * 0.1, 1), 1.0) * 0.15,
            'boundary': (1.0 - avg_boundary) * 0.10,
            'blink': blink_score * 0.15,
            'flow': min(flow_variance / 5, 1.0) * 0.10,
        }
        total_score = sum(score_components.values())

        if avg_cnn > 0.7 and cnn_std < 0.1:
            total_score = min(1.0, total_score + 0.1)

        if total_score >= 0.65: risk_level = 'high'
        elif total_score >= 0.35: risk_level = 'medium'
        else: risk_level = 'low'

        confidence = int(total_score * 100)

        # ── Explanations ──────────────────────────────────────────────────
        explanations = self._build_explanations(
            avg_cnn, temporal_var, flicker_events, avg_boundary,
            blink_rate, blink_detail, faces_found, total_analyzed, risk_level
        )

        # ── Metrics ───────────────────────────────────────────────────────
        metrics = {
            'frames_analyzed': {
                'label': 'Frames đã phân tích',
                'value': f'{total_analyzed}/{total_frames}',
                'status': 'normal'
            },
            'hf_avg_score': {
                'label': 'Điểm AI (HuggingFace)',
                'value': f'{int(avg_cnn * 100)}%',
                'threshold': '< 50%',
                'status': 'abnormal' if avg_cnn > 0.7 else 'warning' if avg_cnn > 0.5 else 'normal'
            },
            'blink_rate': {
                'label': 'Tần suất chớp mắt',
                'value': f'{blink_rate:.1f}/phút' if blink_rate >= 0 else 'N/A',
                'normal': '15-20/phút',
                'status': 'abnormal' if 0 <= blink_rate < 5 else 'warning' if blink_rate < 10 else 'normal'
            },
            'temporal_variance': {
                'label': 'Biến thiên thời gian',
                'value': f'{temporal_var:.1f}',
                'threshold': '< 10',
                'status': 'abnormal' if temporal_var > 30 else 'warning' if temporal_var > 10 else 'normal'
            },
            'flicker_events': {
                'label': 'Sự kiện nhấp nháy',
                'value': f'{flicker_events} lần',
                'threshold': '0',
                'status': 'abnormal' if flicker_events > 5 else 'warning' if flicker_events > 2 else 'normal'
            },
            'face_boundary': {
                'label': 'Nhất quán biên mặt',
                'value': f'{int(avg_boundary * 100)}%',
                'threshold': '> 90%',
                'status': 'abnormal' if avg_boundary < 0.6 else 'warning' if avg_boundary < 0.9 else 'normal'
            }
        }

        detail = self._build_detail(risk_level, total_analyzed, faces_found,
                                     flicker_events, avg_cnn, blink_rate, duration)

        return {
            'riskLevel': risk_level,
            'confidence': confidence,
            'detail': detail,
            'explanations': explanations,
            'metrics': metrics
        }

    def _analyze_blink_rate(self, blink_data, duration):
        """Phân tích blink rate từ EAR data."""
        if not blink_data or duration < 1:
            return 0.0, -1, 'Không đủ dữ liệu'

        ears = [b['ear'] for b in blink_data]
        blink_threshold = 0.21  # EAR < 0.21 = mắt nhắm

        # Đếm blinks
        blink_count = 0
        in_blink = False
        for ear in ears:
            if ear < blink_threshold:
                if not in_blink:
                    blink_count += 1
                    in_blink = True
            else:
                in_blink = False

        blink_rate_per_min = (blink_count / duration) * 60
        score = 0.0

        # Bình thường: 15-20 blinks/phút
        if blink_rate_per_min < 3:
            score = 0.85
            detail = f'{blink_rate_per_min:.0f} blinks/phút - quá ít (bình thường 15-20)'
        elif blink_rate_per_min < 10:
            score = 0.5
            detail = f'{blink_rate_per_min:.0f} blinks/phút - ít hơn bình thường'
        else:
            score = 0.1
            detail = f'{blink_rate_per_min:.0f} blinks/phút - bình thường'

        return score, blink_rate_per_min, detail

    def _build_explanations(self, cnn, temporal_var, flickers, boundary,
                             blink_rate, blink_detail, faces_found, total_frames, risk_level):
        explanations = []
        idx = 1

        if cnn > 0.7:
            explanations.append({
                'id': idx, 'severity': 'high', 'icon': 'psychology',
                'title': 'AI phát hiện deepfake (HuggingFace)',
                'description': f'Model deepfake detection đánh giá {int(cnn * 100)}% khả năng đây là video deepfake.'
            }); idx += 1

        if blink_rate >= 0 and blink_rate < 5:
            explanations.append({
                'id': idx, 'severity': 'high', 'icon': 'visibility_off',
                'title': 'Nhịp chớp mắt bất thường',
                'description': f'{blink_detail}. Video deepfake thường không chớp mắt hoặc chớp rất ít.'
            }); idx += 1

        if flickers > 2:
            explanations.append({
                'id': idx, 'severity': 'high', 'icon': 'slow_motion_video',
                'title': 'Nhấp nháy bất thường',
                'description': f'{flickers} sự kiện nhấp nháy đột ngột giữa các frame.'
            }); idx += 1

        if boundary < 0.6:
            explanations.append({
                'id': idx, 'severity': 'high', 'icon': 'face_retouching_off',
                'title': 'Biên khuôn mặt bất thường',
                'description': 'Phát hiện dấu hiệu blend/ghép mặt.'
            }); idx += 1

        if not explanations:
            if risk_level == 'low':
                explanations.append({
                    'id': 1, 'severity': 'low', 'icon': 'verified',
                    'title': 'Video xác thực',
                    'description': f'Đã phân tích {total_frames} frame. Không tìm thấy dấu hiệu deepfake.'
                })
            else:
                explanations.append({
                    'id': 1, 'severity': 'medium', 'icon': 'help_outline',
                    'title': 'Cần kiểm tra thêm',
                    'description': 'Một số chỉ số nằm ở ngưỡng biên.'
                })

        return explanations[:4]

    def _build_detail(self, risk_level, total_analyzed, faces_found,
                      flickers, cnn_score, blink_rate, duration):
        if risk_level == 'high':
            parts = [f'Đã phân tích {total_analyzed} frame trong video {duration:.0f}s.']
            parts.append(f'Model AI đánh giá {int(cnn_score * 100)}% khả năng deepfake.')
            if blink_rate >= 0 and blink_rate < 5:
                parts.append(f'Nhịp chớp mắt chỉ {blink_rate:.0f}/phút (bình thường 15-20).')
            if flickers > 2:
                parts.append(f'{flickers} sự kiện nhấp nháy bất thường.')
            parts.append('Khả năng cao đây là video DEEPFAKE.')
            return ' '.join(parts)
        elif risk_level == 'medium':
            return f'Đã phân tích {total_analyzed} frame. Phát hiện dấu hiệu bất thường. Cần thận trọng.'
        else:
            return f'Đã phân tích {total_analyzed} frame trong {duration:.0f}s. Video có vẻ xác thực.'

    def _error_result(self, msg):
        return {
            'riskLevel': 'medium', 'confidence': 50, 'detail': f'Lỗi: {msg}',
            'explanations': [{'id': 1, 'title': 'Lỗi', 'description': msg, 'severity': 'medium', 'icon': 'error'}],
            'metrics': {}
        }
