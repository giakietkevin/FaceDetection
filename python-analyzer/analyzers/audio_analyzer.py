"""
Audio Analyzer - Phân tích giọng nói AI / Voice Cloning (Enhanced)
==================================================================
Sử dụng HuggingFace pre-trained model + multi-layer analysis:
1. HuggingFace ASVspoof Wav2Vec2 model (mo-thecreator/Deepfake-audio-detection)
2. Pitch (F0) analysis - phát hiện pitch fluctuation bất thường
3. Spectral analysis - phát hiện spectral gaps
4. Breathing pattern detection
5. Background noise analysis
"""

import io
import os
import logging
import tempfile
from typing import Dict, List, Any

import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForAudioClassification

logger = logging.getLogger("safeguard.audio")


class AudioAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._ready = False

        # Load librosa
        self.librosa = None
        self._load_librosa()

        # Load HuggingFace Wav2Vec2 ASVspoof model
        self.model, self.processor = self._load_hf_model()

        self._ready = True
        logger.info("✅ Audio Analyzer sẵn sàng")

    def _load_librosa(self):
        try:
            import librosa
            self.librosa = librosa
            logger.info("✅ librosa đã tải")
        except ImportError:
            logger.error("❌ Không tìm thấy librosa")

    def _load_hf_model(self):
        """Load pre-trained Wav2Vec2 model từ HuggingFace."""
        try:
            model_id = "mo-thecreator/Deepfake-audio-detection"
            logger.info(f"📥 Đang tải audio model từ HuggingFace: {model_id}")

            processor = AutoProcessor.from_pretrained(model_id)
            model = AutoModelForAudioClassification.from_pretrained(model_id)
            model = model.to(self.device)
            model.eval()

            logger.info(f"✅ HuggingFace audio model đã tải: {model_id}")
            return model, processor
        except Exception as e:
            logger.error(f"❌ Lỗi tải HuggingFace audio model: {e}")
            return None, None

    def is_ready(self) -> bool:
        return self._ready and self.librosa is not None

    def analyze(self, audio_bytes: bytes, filename: str = None) -> Dict[str, Any]:
        """Phân tích âm thanh toàn diện."""
        if self.librosa is None:
            return self._error_result("librosa chưa được cài đặt")

        suffix = os.path.splitext(filename)[1] if filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Load audio ở 16kHz cho Wav2Vec2
            y, sr = self.librosa.load(tmp_path, sr=16000)
            duration = len(y) / sr

            logger.info(f"🔊 Audio: {filename or 'unknown'} | SR: {sr} | Duration: {duration:.1f}s")

            # ─── Layer 1: HuggingFace Deepfake Detection ──────────────────────
            hf_result = self._analyze_hf_model(y)

            # ─── Layer 2: Pitch (F0) Analysis ─────────────────────────────
            pitch_result = self._analyze_pitch(y, sr)

            # ─── Layer 3: Spectral Analysis ───────────────────────────────
            spectral_result = self._analyze_spectral(y, sr)

            # ─── Layer 4: Breathing / Silence Pattern ─────────────────────
            breathing_result = self._analyze_breathing(y, sr)

            # ─── Layer 5: Background Noise Analysis ───────────────────────
            noise_result = self._analyze_noise(y, sr)

            # ─── Ensemble ─────────────────────────────────────────────────
            return self._ensemble_results(
                hf_result, pitch_result, spectral_result, breathing_result,
                noise_result, duration, filename
            )
        except Exception as e:
            logger.error(f"Lỗi phân tích audio: {e}", exc_info=True)
            return self._error_result(str(e))
        finally:
            os.unlink(tmp_path)

    def _analyze_hf_model(self, y: np.ndarray) -> Dict:
        """Sử dụng Wav2Vec2 từ HuggingFace."""
        if self.model is None or self.processor is None:
            return {'confidence': 0.0, 'signals': []}

        try:
            # Preprocess
            inputs = self.processor(y, sampling_rate=16000, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1)

            # Model mo-thecreator trả về: 0 = fake/spoof, 1 = real/bonafide
            # Lấy xác suất "fake"
            fake_prob = probs[0][0].item()

            signals = []
            if fake_prob > 0.7:
                signals.append({
                    'type': 'hf_spoof_detected',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'high'
                })
            elif fake_prob > 0.5:
                signals.append({
                    'type': 'hf_spoof_suspected',
                    'value': f'{fake_prob:.2f}',
                    'severity': 'medium'
                })

            return {'confidence': fake_prob, 'signals': signals}
        except Exception as e:
            logger.error(f"Lỗi HuggingFace audio inference: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_pitch(self, y: np.ndarray, sr: int) -> Dict:
        signals = []
        try:
            f0 = self.librosa.yin(y, fmin=50, fmax=500)
            f0_valid = f0[f0 > 0]

            if len(f0_valid) == 0:
                return {'confidence': 0.0, 'signals': [], 'pitch_stats': {}}

            mean_f0 = np.mean(f0_valid)
            std_f0 = np.std(f0_valid)
            f0_range = np.max(f0_valid) - np.min(f0_valid)
            cv_f0 = std_f0 / mean_f0 if mean_f0 > 0 else 0

            confidence = 0.0

            if cv_f0 < 0.05:
                signals.append({
                    'type': 'pitch_too_stable',
                    'value': f'{cv_f0:.3f}',
                    'severity': 'high'
                })
                confidence = 0.8
            elif cv_f0 < 0.10:
                signals.append({
                    'type': 'pitch_somewhat_stable',
                    'value': f'{cv_f0:.3f}',
                    'severity': 'medium'
                })
                confidence = 0.5

            pitch_stats = {'mean': float(mean_f0), 'std': float(std_f0), 'cv': float(cv_f0)}
            return {'confidence': confidence, 'signals': signals, 'pitch_stats': pitch_stats}
        except Exception as e:
            logger.debug(f"Pitch error: {e}")
            return {'confidence': 0.0, 'signals': [], 'pitch_stats': {}}

    def _analyze_spectral(self, y: np.ndarray, sr: int) -> Dict:
        signals = []
        confidence = 0.0

        try:
            S = self.librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
            S_db = self.librosa.power_to_db(S, ref=np.max)

            high_freq_energy = np.mean(S_db[-20:, :])
            low_freq_energy = np.mean(S_db[:20, :])
            energy_ratio = high_freq_energy / low_freq_energy if low_freq_energy != 0 else 1

            if abs(energy_ratio) > 2.0:
                signals.append({
                    'type': 'spectral_gap',
                    'value': f'{energy_ratio:.2f}',
                    'severity': 'high'
                })
                confidence = 0.7

            flatness = np.mean(self.librosa.feature.spectral_flatness(y=y))
            if flatness > 0.1:
                signals.append({
                    'type': 'spectral_too_flat',
                    'value': f'{flatness:.3f}',
                    'severity': 'medium'
                })
                confidence = max(confidence, 0.5)

            spectral_stats = {'flatness': float(flatness), 'energy_ratio': float(energy_ratio)}
            return {'confidence': confidence, 'signals': signals, 'spectral_stats': spectral_stats}
        except Exception as e:
            logger.debug(f"Spectral error: {e}")
            return {'confidence': 0.0, 'signals': [], 'spectral_stats': {}}

    def _analyze_breathing(self, y: np.ndarray, sr: int) -> Dict:
        signals = []
        confidence = 0.0

        try:
            intervals = self.librosa.effects.split(y, top_db=25)
            if len(intervals) < 2:
                return {'confidence': 0.0, 'signals': []}

            gaps = [(intervals[i][0] - intervals[i - 1][1]) / sr for i in range(1, len(intervals))]

            if gaps:
                avg_gap = np.mean(gaps)
                gap_cv = np.std(gaps) / avg_gap if avg_gap > 0 else 0

                if gap_cv < 0.1 and len(gaps) > 3:
                    signals.append({
                        'type': 'mechanical_pauses',
                        'value': f'CV={gap_cv:.3f}',
                        'severity': 'high'
                    })
                    confidence = 0.75

                has_breathing_gap = any(0.3 < g < 1.5 for g in gaps)
                if not has_breathing_gap and len(gaps) > 5:
                    signals.append({
                        'type': 'missing_breathing',
                        'value': f'max_gap={max(gaps):.2f}s',
                        'severity': 'medium'
                    })
                    confidence = max(confidence, 0.6)

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            return {'confidence': 0.0, 'signals': []}

    def _analyze_noise(self, y: np.ndarray, sr: int) -> Dict:
        signals = []
        confidence = 0.0

        try:
            rms = self.librosa.feature.rms(y=y)[0]
            dynamic_range = np.max(rms) / np.min(rms) if np.min(rms) > 0 else float('inf')

            if dynamic_range > 100:
                signals.append({
                    'type': 'unnaturally_clean',
                    'value': f'DR={dynamic_range:.0f}',
                    'severity': 'high'
                })
                confidence = 0.7

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            return {'confidence': 0.0, 'signals': []}

    def _ensemble_results(self, hf, pitch, spectral, breathing, noise,
                          duration, filename) -> Dict:
        # Weighted ensemble - HF model is primary
        weights = {
            'hf': 0.50,           # Wav2Vec2 ASVspoof
            'pitch': 0.15,
            'spectral': 0.15,
            'breathing': 0.10,
            'noise': 0.10,
        }

        total_score = (
            hf['confidence'] * weights['hf'] +
            pitch['confidence'] * weights['pitch'] +
            spectral['confidence'] * weights['spectral'] +
            breathing['confidence'] * weights['breathing'] +
            noise['confidence'] * weights['noise']
        )

        if total_score >= 0.65: risk_level = 'high'
        elif total_score >= 0.35: risk_level = 'medium'
        else: risk_level = 'low'

        all_signals = (
            hf['signals'] + pitch.get('signals', []) + spectral.get('signals', []) +
            breathing.get('signals', []) + noise.get('signals', [])
        )

        explanations = self._build_explanations(all_signals, risk_level)
        metrics = self._build_metrics(hf, pitch, spectral, breathing, noise)
        detail = self._build_detail(risk_level, duration)

        return {
            'riskLevel': risk_level,
            'confidence': int(total_score * 100),
            'detail': detail,
            'explanations': explanations,
            'metrics': metrics
        }

    def _build_explanations(self, signals, risk_level) -> List[Dict]:
        explanations = []
        idx = 1

        signal_map = {
            'hf_spoof_detected': {
                'title': 'Phát hiện giọng nói AI (Wav2Vec2)',
                'description': 'Mô hình Wav2Vec2 chuyên dụng phát hiện đây là giọng nói do AI tổng hợp (Voice cloning/TTS).',
                'icon': 'voice_over_off'
            },
            'pitch_too_stable': {
                'title': 'Pitch quá ổn định',
                'description': 'Tần số pitch gần như không đổi - đặc trưng của giọng AI.',
                'icon': 'graphic_eq'
            },
            'spectral_gap': {
                'title': 'Khoảng trống phổ tần',
                'description': 'Phát hiện lỗi vocoder AI ở tần số cao.',
                'icon': 'equalizer'
            },
            'missing_breathing': {
                'title': 'Thiếu nhịp thở',
                'description': 'Không có nhịp thở tự nhiên giữa các câu.',
                'icon': 'air'
            },
            'unnaturally_clean': {
                'title': 'Âm thanh "sạch" bất thường',
                'description': 'Không có tiếng ồn môi trường tự nhiên.',
                'icon': 'noise_aware'
            }
        }

        for signal in signals[:4]:
            sig_type = signal['type']
            if sig_type in signal_map:
                exp = signal_map[sig_type]
                explanations.append({
                    'id': idx, 'title': exp['title'],
                    'description': exp['description'], 'severity': signal['severity'], 'icon': exp['icon']
                })
                idx += 1

        if not explanations:
            explanations.append({
                'id': 1, 'severity': 'low', 'icon': 'mic',
                'title': 'Giọng nói xác thực',
                'description': 'Model Wav2Vec2 và các thông số phổ tần đánh giá là giọng nói thật.'
            })

        return explanations

    def _build_metrics(self, hf, pitch, spectral, breathing, noise) -> Dict:
        metrics = {}
        if hf['confidence'] > 0:
            metrics['hf_score'] = {
                'label': 'Điểm AI (Wav2Vec2)',
                'value': f"{int(hf['confidence']*100)}%",
                'status': 'abnormal' if hf['confidence'] > 0.7 else 'normal'
            }

        pitch_cv = pitch.get('pitch_stats', {}).get('cv', 0)
        metrics['pitch_cv'] = {
            'label': 'Độ ổn định Pitch',
            'value': 'Quá máy móc' if pitch_cv < 0.05 else 'Tự nhiên',
            'status': 'abnormal' if pitch_cv < 0.05 else 'normal'
        }

        return metrics

    def _build_detail(self, risk_level, duration) -> str:
        if risk_level == 'high':
            return f'Phân tích {duration:.1f}s âm thanh. Mạng neural Wav2Vec2 phát hiện dấu hiệu rõ ràng của voice cloning.'
        elif risk_level == 'medium':
            return f'Phát hiện dấu hiệu đáng ngờ trong {duration:.1f}s âm thanh.'
        else:
            return f'Giọng nói {duration:.1f}s có vẻ xác thực, không có dấu hiệu AI.'

    def _error_result(self, msg: str) -> Dict:
        return {
            'riskLevel': 'medium', 'confidence': 50,
            'detail': f'Lỗi: {msg}', 'explanations': [], 'metrics': {}
        }
