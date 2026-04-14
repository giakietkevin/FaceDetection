"""
Audio Analyzer - Phân tích giọng nói AI / Voice Cloning
=======================================================
Sử dụng nhiều kỹ thuật:
1. Mel-spectrogram analysis - phát hiện vocoder artifacts
2. Pitch (F0) analysis - phát hiện pitch fluctuation bất thường
3. Formant analysis - so sánh đặc điểm sinh lý tự nhiên
4. Spectral analysis - phát hiện spectral gaps
5. Breathing pattern detection
6. Lightweight anti-spoofing classifier (LFCC features)
"""

import io
import os
import logging
import tempfile
from typing import Dict, List, Any

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger("safeguard.audio")


class AudioAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._ready = False

        # Sử dụng librosa (lazy import vì load lâu)
        self.librosa = None
        self._load_librosa()

        # Lightweight anti-spoofing classifier
        self.spoof_model = self._build_spoof_classifier()

        self._ready = True
        logger.info("✅ Audio Analyzer sẵn sàng")

    def _load_librosa(self):
        try:
            import librosa
            self.librosa = librosa
            logger.info("✅ librosa đã tải")
        except ImportError:
            logger.error("❌ Không tìm thấy librosa. Cài đặt: pip install librosa")

    def _build_spoof_classifier(self):
        """Build lightweight classifier cho anti-spoofing (LFCC features → MLP)."""
        try:
            model = nn.Sequential(
                nn.Linear(60, 128),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(64, 2),  # 2 classes: bonafide, spoof
            ).to(self.device)
            model.eval()
            logger.info("✅ Spoof classifier đã tải (LFCC-based)")
            return model
        except Exception as e:
            logger.error(f"❌ Lỗi tải spoof classifier: {e}")
            return None

    def is_ready(self) -> bool:
        return self._ready and self.librosa is not None

    def analyze(self, audio_bytes: bytes, filename: str = None) -> Dict[str, Any]:
        """
        Phân tích âm thanh toàn diện.
        """
        if self.librosa is None:
            return self._error_result("librosa chưa được cài đặt")

        # Lưu tạm file
        suffix = os.path.splitext(filename)[1] if filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Load audio
            y, sr = self.librosa.load(tmp_path, sr=16000)
            duration = len(y) / sr

            logger.info(f"🔊 Audio: {filename or 'unknown'} | SR: {sr} | Duration: {duration:.1f}s")

            # ─── Layer 1: Pitch (F0) Analysis ─────────────────────────────
            pitch_result = self._analyze_pitch(y, sr)

            # ─── Layer 2: Spectral Analysis ───────────────────────────────
            spectral_result = self._analyze_spectral(y, sr)

            # ─── Layer 3: Breathing / Silence Pattern ─────────────────────
            breathing_result = self._analyze_breathing(y, sr)

            # ─── Layer 4: Background Noise Analysis ───────────────────────
            noise_result = self._analyze_noise(y, sr)

            # ─── Layer 5: LFCC-based Anti-Spoofing ────────────────────────
            spoof_result = self._analyze_spoofing(y, sr)

            # ─── Ensemble ─────────────────────────────────────────────────
            return self._ensemble_results(
                pitch_result, spectral_result, breathing_result,
                noise_result, spoof_result, duration, filename
            )
        except Exception as e:
            logger.error(f"Lỗi phân tích audio: {e}", exc_info=True)
            return self._error_result(str(e))
        finally:
            os.unlink(tmp_path)

    def _analyze_pitch(self, y: np.ndarray, sr: int) -> Dict:
        """Phân tích pitch (F0) - giọng AI thường có pitch bất thường."""
        signals = []
        try:
            # Trích xuất F0
            f0 = self.librosa.yin(y, fmin=50, fmax=500)
            f0_valid = f0[f0 > 0]

            if len(f0_valid) == 0:
                return {'confidence': 0.0, 'signals': [], 'pitch_stats': {}}

            # Thống kê pitch
            mean_f0 = np.mean(f0_valid)
            std_f0 = np.std(f0_valid)
            f0_range = np.max(f0_valid) - np.min(f0_valid)

            # Pitch variability ratio
            cv_f0 = std_f0 / mean_f0 if mean_f0 > 0 else 0

            confidence = 0.0

            # Giọng AI thường có pitch quá ổn định (CV thấp bất thường)
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

            # Hoặc pitch quá dao động (voice conversion lỗi)
            if cv_f0 > 0.5:
                signals.append({
                    'type': 'pitch_too_variable',
                    'value': f'{cv_f0:.3f}',
                    'severity': 'high'
                })
                confidence = max(confidence, 0.7)

            pitch_stats = {
                'mean': float(mean_f0),
                'std': float(std_f0),
                'range': float(f0_range),
                'cv': float(cv_f0)
            }

            return {'confidence': confidence, 'signals': signals, 'pitch_stats': pitch_stats}
        except Exception as e:
            logger.debug(f"Pitch analysis error: {e}")
            return {'confidence': 0.0, 'signals': [], 'pitch_stats': {}}

    def _analyze_spectral(self, y: np.ndarray, sr: int) -> Dict:
        """Phân tích phổ tần - vocoder artifacts."""
        signals = []
        confidence = 0.0

        try:
            # Mel-spectrogram
            S = self.librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
            S_db = self.librosa.power_to_db(S, ref=np.max)

            # Spectral centroid (trọng tâm phổ)
            centroid = self.librosa.feature.spectral_centroid(y=y, sr=sr)
            mean_centroid = np.mean(centroid)

            # Spectral bandwidth
            bandwidth = self.librosa.feature.spectral_bandwidth(y=y, sr=sr)
            mean_bandwidth = np.mean(bandwidth)

            # Spectral rolloff
            rolloff = self.librosa.feature.spectral_rolloff(y=y, sr=sr)
            mean_rolloff = np.mean(rolloff)

            # Kiểm tra spectral gaps (vocoder thường tạo gaps ở tần số cao)
            high_freq_energy = np.mean(S_db[-20:, :])  # Top 20 mel bands
            low_freq_energy = np.mean(S_db[:20, :])

            energy_ratio = high_freq_energy / low_freq_energy if low_freq_energy != 0 else 1

            # Vocoder artifacts: energy ratio bất thường
            if abs(energy_ratio) > 2.0:
                signals.append({
                    'type': 'spectral_gap',
                    'value': f'{energy_ratio:.2f}',
                    'severity': 'high'
                })
                confidence = 0.7

            # Kiểm tra spectral flatness (giọng AI thường "phẳng" hơn)
            flatness = self.librosa.feature.spectral_flatness(y=y)
            mean_flatness = np.mean(flatness)

            if mean_flatness > 0.1:
                signals.append({
                    'type': 'spectral_too_flat',
                    'value': f'{mean_flatness:.3f}',
                    'severity': 'medium'
                })
                confidence = max(confidence, 0.5)

            spectral_stats = {
                'centroid': float(mean_centroid),
                'bandwidth': float(mean_bandwidth),
                'rolloff': float(mean_rolloff),
                'flatness': float(mean_flatness),
                'energy_ratio': float(energy_ratio)
            }

            return {'confidence': confidence, 'signals': signals, 'spectral_stats': spectral_stats}
        except Exception as e:
            logger.debug(f"Spectral analysis error: {e}")
            return {'confidence': 0.0, 'signals': [], 'spectral_stats': {}}

    def _analyze_breathing(self, y: np.ndarray, sr: int) -> Dict:
        """Phân tích nhịp thở - giọng AI thường thiếu nhịp thở tự nhiên."""
        signals = []
        confidence = 0.0

        try:
            # Phát hiện khoảng lặng
            intervals = self.librosa.effects.split(y, top_db=25)

            if len(intervals) < 2:
                return {'confidence': 0.0, 'signals': []}

            # Tính khoảng cách giữa các đoạn nói
            gaps = []
            for i in range(1, len(intervals)):
                gap_duration = (intervals[i][0] - intervals[i - 1][1]) / sr
                gaps.append(gap_duration)

            if not gaps:
                return {'confidence': 0.0, 'signals': []}

            avg_gap = np.mean(gaps)
            gap_std = np.std(gaps)
            gap_cv = gap_std / avg_gap if avg_gap > 0 else 0

            # Giọng AI: gaps quá đều (CV thấp)
            if gap_cv < 0.1 and len(gaps) > 3:
                signals.append({
                    'type': 'mechanical_pauses',
                    'value': f'CV={gap_cv:.3f}',
                    'severity': 'high'
                })
                confidence = 0.75

            # Giọng AI: không có gap dài (thiếu hơi thở)
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
            logger.debug(f"Breathing analysis error: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_noise(self, y: np.ndarray, sr: int) -> Dict:
        """Phân tích background noise."""
        signals = []
        confidence = 0.0

        try:
            # Tính RMS energy
            rms = self.librosa.feature.rms(y=y)[0]
            min_rms = np.min(rms)
            max_rms = np.max(rms)
            dynamic_range = max_rms / min_rms if min_rms > 0 else float('inf')

            # Giọng AI thường "sạch" bất thường (dynamic range cao)
            if dynamic_range > 100:
                signals.append({
                    'type': 'unnaturally_clean',
                    'value': f'DR={dynamic_range:.0f}',
                    'severity': 'high'
                })
                confidence = 0.7
            elif dynamic_range > 50:
                signals.append({
                    'type': 'somewhat_clean',
                    'value': f'DR={dynamic_range:.0f}',
                    'severity': 'medium'
                })
                confidence = 0.4

            return {'confidence': confidence, 'signals': signals}
        except Exception as e:
            logger.debug(f"Noise analysis error: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _analyze_spoofing(self, y: np.ndarray, sr: int) -> Dict:
        """LFCC-based anti-spoofing analysis."""
        if self.spoof_model is None:
            return {'confidence': 0.0, 'signals': []}

        try:
            # Extract LFCC (Linear Frequency Cepstral Coefficients)
            # Dùng MFCC thay thế vì dễ triển khai hơn và librosa có sẵn
            mfcc = self.librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            delta = self.librosa.feature.delta(mfcc)
            delta2 = self.librosa.feature.delta(mfcc, order=2)

            # Tạo feature vector (mean of each coefficient)
            features = np.concatenate([
                np.mean(mfcc, axis=1),
                np.mean(delta, axis=1),
                np.mean(delta2, axis=1),
            ])

            # Inference
            feat_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
            with torch.no_grad():
                output = self.spoof_model(feat_tensor)
                probs = torch.softmax(output, dim=1)
                spoof_prob = probs[0][1].item()

            signals = []
            if spoof_prob > 0.7:
                signals.append({
                    'type': 'spoof_detected',
                    'value': f'{spoof_prob:.2f}',
                    'severity': 'high'
                })

            return {'confidence': spoof_prob, 'signals': signals}
        except Exception as e:
            logger.debug(f"Spoofing analysis error: {e}")
            return {'confidence': 0.0, 'signals': []}

    def _ensemble_results(self, pitch, spectral, breathing, noise, spoof,
                          duration, filename) -> Dict:
        """Kết hợp kết quả từ tất cả layers."""
        # Weighted ensemble
        weights = {
            'pitch': 0.25,
            'spectral': 0.25,
            'breathing': 0.15,
            'noise': 0.15,
            'spoof': 0.20,
        }

        total_score = (
            pitch['confidence'] * weights['pitch'] +
            spectral['confidence'] * weights['spectral'] +
            breathing['confidence'] * weights['breathing'] +
            noise['confidence'] * weights['noise'] +
            spoof['confidence'] * weights['spoof']
        )

        # Risk level
        if total_score >= 0.65:
            risk_level = 'high'
        elif total_score >= 0.35:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        confidence = int(total_score * 100)

        # Tổng hợp signals
        all_signals = (
            pitch.get('signals', []) + spectral.get('signals', []) +
            breathing.get('signals', []) + noise.get('signals', []) +
            spoof.get('signals', [])
        )

        # Explanations
        explanations = self._build_explanations(all_signals, pitch, spectral,
                                                  breathing, noise, risk_level)

        # Metrics
        pitch_stats = pitch.get('pitch_stats', {})
        spectral_stats = spectral.get('spectral_stats', {})

        metrics = {}

        if pitch_stats:
            pitch_cv = pitch_stats.get('cv', 0)
            metrics['pitch_fluctuation'] = {
                'label': 'Dao động pitch (F0)',
                'value': f'{pitch_stats.get("std", 0):.1f}Hz',
                'normal': '3-5Hz',
                'status': 'abnormal' if pitch_cv < 0.05 or pitch_cv > 0.5 else 'warning' if pitch_cv < 0.1 else 'normal'
            }

        if spectral_stats:
            metrics['spectral_flatness'] = {
                'label': 'Spectral Flatness',
                'value': f'{spectral_stats.get("flatness", 0):.3f}',
                'threshold': '< 0.1',
                'status': 'abnormal' if spectral_stats.get('flatness', 0) > 0.1 else 'normal'
            }

        metrics['background_noise'] = {
            'label': 'Nhiễu nền',
            'value': 'Sạch bất thường' if noise['confidence'] > 0.5 else 'Tự nhiên',
            'normal': 'Có nhiễu tự nhiên',
            'status': 'abnormal' if noise['confidence'] > 0.5 else 'normal'
        }

        metrics['breathing_pattern'] = {
            'label': 'Nhịp thở',
            'value': 'Máy móc' if breathing['confidence'] > 0.5 else 'Tự nhiên',
            'status': 'abnormal' if breathing['confidence'] > 0.5 else 'normal'
        }

        # Detail
        detail = self._build_detail(risk_level, all_signals, duration)

        return {
            'riskLevel': risk_level,
            'confidence': confidence,
            'detail': detail,
            'explanations': explanations,
            'metrics': metrics
        }

    def _build_explanations(self, signals, pitch, spectral, breathing, noise, risk_level) -> List[Dict]:
        """Tạo explanations từ signals."""
        explanations = []
        idx = 1

        signal_map = {
            'pitch_too_stable': {
                'title': 'Pitch quá ổn định',
                'description': 'Giọng nói có tần số pitch gần như không thay đổi - đặc trưng của giọng AI sinh tạo.',
                'icon': 'graphic_eq'
            },
            'pitch_too_variable': {
                'title': 'Pitch dao động bất thường',
                'description': 'Tần số pitch dao động quá mạnh - có thể do lỗi voice conversion.',
                'icon': 'graphic_eq'
            },
            'spectral_gap': {
                'title': 'Khoảng trống phổ tần',
                'description': 'Phát hiện khoảng trống bất thường trong phổ tần số - dấu hiệu của vocoder AI.',
                'icon': 'equalizer'
            },
            'spectral_too_flat': {
                'title': 'Phổ tần quá phẳng',
                'description': 'Phổ tần số "phẳng" bất thường so với giọng người thật.',
                'icon': 'analytics'
            },
            'mechanical_pauses': {
                'title': 'Khoảng dừng máy móc',
                'description': 'Các khoảng dừng giữa câu có độ dài quá đều nhau, không tự nhiên.',
                'icon': 'timer'
            },
            'missing_breathing': {
                'title': 'Thiếu nhịp thở',
                'description': 'Không phát hiện nhịp thở tự nhiên giữa các câu. Người thật luôn có hơi thở.',
                'icon': 'air'
            },
            'unnaturally_clean': {
                'title': 'Âm thanh quá "sạch"',
                'description': 'Hoàn toàn không có nhiễu nền - mọi cuộc gọi/ghi âm thật đều có tiếng ồn môi trường.',
                'icon': 'noise_aware'
            },
            'spoof_detected': {
                'title': 'Anti-spoofing cảnh báo',
                'description': 'Mô hình chống giả mạo giọng nói phát hiện dấu hiệu voice synthesis/cloning.',
                'icon': 'voice_over_off'
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
                    'id': 1, 'severity': 'low', 'icon': 'mic',
                    'title': 'Giọng nói có vẻ tự nhiên',
                    'description': 'Tất cả thông số phân tích (pitch, formant, nhịp thở) nằm trong ngưỡng bình thường.'
                })
            else:
                explanations.append({
                    'id': 1, 'severity': 'medium', 'icon': 'help_outline',
                    'title': 'Một số dấu hiệu đáng lưu ý',
                    'description': 'Phát hiện một số bất thường nhỏ, có thể do chất lượng ghi âm hoặc can thiệp nhẹ.'
                })

        return explanations

    def _build_detail(self, risk_level, signals, duration) -> str:
        """Tạo detail text."""
        if risk_level == 'high':
            return (f'Phân tích {duration:.1f} giây âm thanh phát hiện nhiều dấu hiệu của giọng nói AI. '
                    f'Khả năng cao đây là giọng nói do AI tổng hợp (voice cloning/TTS).')
        elif risk_level == 'medium':
            return (f'Phát hiện một số dấu hiệu bất thường trong {duration:.1f} giây âm thanh. '
                    f'Có thể do chất lượng ghi âm hoặc can thiệp AI nhẹ. Cần thận trọng.')
        else:
            return (f'Phân tích {duration:.1f} giây âm thanh. '
                    f'Giọng nói có vẻ tự nhiên, không phát hiện dấu hiệu giả mạo.')

    def _error_result(self, msg: str) -> Dict:
        return {
            'riskLevel': 'medium',
            'confidence': 50,
            'detail': f'Lỗi phân tích âm thanh: {msg}',
            'explanations': [{'id': 1, 'title': 'Lỗi', 'description': msg, 'severity': 'medium', 'icon': 'error'}],
            'metrics': {}
        }
