#!/usr/bin/env python3
"""Generate the three original demo tracks shipped with the Winamp recreation.

Everything here is synthesized from scratch with numpy: no samples, no
copyrighted material.  The result is a set of 44.1 kHz stereo MP3s with ID3
tags so the player has something to show off on first launch.

Usage:
    python scripts/generate_demos.py
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import numpy as np
from lameenc import Encoder
from mutagen.id3 import ID3, TALB, TCON, TIT2, TPE1, TRCK, TYER

SR = 44_100
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "demo"
rng = np.random.default_rng(2000)

# --------------------------------------------------------------------------- #
# Tiny synthesis toolkit
# --------------------------------------------------------------------------- #


def secs(beats: float, bpm: float) -> float:
    return beats * 60.0 / bpm


def midi_to_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def t_axis(n: int) -> np.ndarray:
    return np.arange(n, dtype=np.float64) / SR


def fade_edges(buf: np.ndarray, seconds: float = 0.4) -> None:
    n = min(int(seconds * SR), len(buf) // 2)
    if n <= 0:
        return
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float64)
    buf[:n] *= ramp[:, None]
    buf[-n:] *= ramp[::-1, None]


def add(buf: np.ndarray, start_s: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
    """Mix a mono signal into a stereo buffer with equal-power panning."""
    start = int(round(start_s * SR))
    if start >= len(buf) or start < 0:
        return
    end = min(len(buf), start + len(sig))
    if end <= start:
        return
    sig = sig[: end - start]
    # constant-power pan: -1 hard left, 1 hard right
    angle = (pan + 1.0) * math.pi / 4.0
    buf[start:end, 0] += sig * math.cos(angle) * gain
    buf[start:end, 1] += sig * math.sin(angle) * gain


def adsr(n: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    """Simple ADSR envelope over n samples. attack/decay/release in seconds."""
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    if a + d + r > n:
        a = max(1, n // 8)
        d = max(1, n // 8)
        r = max(1, n // 4)
    env = np.ones(n, dtype=np.float64)
    env[:a] = np.linspace(0.0, 1.0, a)
    env[a : a + d] = np.linspace(1.0, sustain, d)
    env[a + d :] = sustain
    env[-r:] *= np.linspace(1.0, 0.0, r)
    return env


def pluck_env(n: int, decay: float = 7.0, attack: float = 0.004) -> np.ndarray:
    t = t_axis(n)
    env = np.exp(-t * decay)
    a = max(1, int(attack * SR))
    env[:a] *= np.linspace(0.0, 1.0, a)
    return env


def harmonics(freq: float, n: int, count: int, odd_only: bool = False) -> np.ndarray:
    """Band-limited additive tone. count = number of partials to keep."""
    t = t_axis(n)
    out = np.zeros(n, dtype=np.float64)
    k = 1
    used = 0
    while used < count and freq * k < SR * 0.45:
        if not odd_only or k % 2 == 1:
            out += np.sin(2.0 * math.pi * freq * k * t) / k
            used += 1
        k += 1
    return out * (4.0 / math.pi if odd_only else 2.0 / math.pi)


def saw(freq: float, n: int, partials: int = 12, detune: float = 0.0) -> np.ndarray:
    f = freq * (1.0 + detune)
    return harmonics(f, n, partials)


def square(freq: float, n: int, partials: int = 8, detune: float = 0.0) -> np.ndarray:
    f = freq * (1.0 + detune)
    return harmonics(f, n, partials, odd_only=True)


def triangle(freq: float, n: int, detune: float = 0.0) -> np.ndarray:
    f = freq * (1.0 + detune)
    t = t_axis(n)
    out = np.zeros(n)
    for k in range(1, 7):
        out += ((-1) ** ((k - 1) // 2)) * np.sin(2 * math.pi * f * k * t) / (k * k)
    return out * (8 / math.pi**2)


def noise(n: int) -> np.ndarray:
    return rng.uniform(-1.0, 1.0, n)


def lowpass_fft(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    if len(x) < 8:
        return x
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    resp = 1.0 / np.sqrt(1.0 + (freqs / max(cutoff, 20.0)) ** (2 * order))
    return np.fft.irfft(spec * resp, len(x))


def highpass_fft(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    if len(x) < 8:
        return x
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    resp = 1.0 / np.sqrt(1.0 + (max(cutoff, 20.0) / np.maximum(freqs, 1e-6)) ** (2 * order))
    return np.fft.irfft(spec * resp, len(x))


def delay(x: np.ndarray, time_s: float, feedback: float = 0.3, mix: float = 0.25, taps: int = 4) -> np.ndarray:
    y = x.copy()
    d = int(time_s * SR)
    if d <= 0:
        return y
    for i in range(1, taps + 1):
        off = d * i
        if off >= len(x):
            break
        y[off:] += x[:-off] * (feedback ** i) * mix
    return y


def stereo_spread(x: np.ndarray, width: int = 280) -> tuple[np.ndarray, np.ndarray]:
    """Cheap Haas widening: delay the right channel by a few milliseconds."""
    right = np.concatenate([np.zeros(width), x[:-width]]) if width < len(x) else x.copy()
    return x, right


# --------------------------------------------------------------------------- #
# Drum kit
# --------------------------------------------------------------------------- #


def kick(dur: float = 0.45, punch: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = t_axis(n)
    freq = 46.0 + 115.0 * np.exp(-t * 26.0)
    phase = 2.0 * math.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 7.0)
    click = noise(int(0.012 * SR)) * np.exp(-np.linspace(0, 1, int(0.012 * SR)) * 9) * 0.25
    out = body * punch
    out[: len(click)] += click
    return np.tanh(out * 1.6) * 0.9


def snare(dur: float = 0.28) -> np.ndarray:
    n = int(dur * SR)
    t = t_axis(n)
    body = np.sin(2 * math.pi * 185 * t) * np.exp(-t * 26) * 0.5
    rattle = highpass_fft(noise(n), 1500) * np.exp(-t * 17) * 0.8
    return np.tanh((body + rattle) * 1.4) * 0.75


def hat(dur: float = 0.08, open_hat: bool = False) -> np.ndarray:
    n = int(max(dur, 0.25 if open_hat else dur) * SR)
    t = t_axis(n)
    decay = 14.0 if open_hat else 65.0
    out = highpass_fft(noise(n), 6500) * np.exp(-t * decay)
    return out * 0.35


def clap() -> np.ndarray:
    n = int(0.3 * SR)
    t = t_axis(n)
    out = np.zeros(n)
    for offset in (0.0, 0.011, 0.022):
        i = int(offset * SR)
        burst = highpass_fft(noise(n - i), 900) * np.exp(-t[: n - i] * 22)
        out[i:] += burst
    return out * 0.5


# --------------------------------------------------------------------------- #
# Song helper
# --------------------------------------------------------------------------- #


class Song:
    def __init__(self, bpm: float, bars: int):
        self.bpm = bpm
        self.bars = bars
        self.beat = 60.0 / bpm
        self.bar = 4 * self.beat
        self.length = int(math.ceil(bars * self.bar * SR)) + SR
        self.buf = np.zeros((self.length, 2), dtype=np.float64)

    def at(self, bar: float, beat_in_bar: float = 0.0) -> float:
        return bar * self.bar + beat_in_bar * self.beat

    def add(self, bar: float, beat: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
        add(self.buf, self.at(bar, beat), sig, gain, pan)

    def finish(self, fade: float = 1.2, peak: float = 0.9) -> np.ndarray:
        buf = self.buf[: int(math.ceil(self.bars * self.bar * SR))]
        fade_edges(buf, fade)
        # gentle bus glue
        buf = np.tanh(buf * 1.05)
        peak_now = float(np.max(np.abs(buf))) or 1.0
        buf *= peak / peak_now
        return buf


def sidechain(song: Song, amount: float = 0.35, release: float = 0.22) -> np.ndarray:
    """Build a per-sample gain envelope that ducks on every beat."""
    n = song.length
    gain = np.ones(n, dtype=np.float64)
    rel = int(release * SR)
    t = np.linspace(0.0, 1.0, rel)
    dip = 1.0 - amount * (1.0 - t) ** 2
    for bar in range(song.bars):
        for beat in range(4):
            start = int(song.at(bar, beat) * SR)
            end = min(n, start + rel)
            if start < n:
                gain[start:end] = np.minimum(gain[start:end], dip[: end - start])
    return gain


# --------------------------------------------------------------------------- #
# Track 1 — Neon Skyline (synthwave, 84 BPM, A minor)
# --------------------------------------------------------------------------- #


def track_neon_skyline() -> np.ndarray:
    bpm = 84
    bars = 32
    song = Song(bpm, bars)
    duck = sidechain(song, 0.38, 0.3)

    chords = [
        ("Am", 45, [57, 60, 64], [69, 72, 76, 72]),
        ("F", 41, [53, 57, 60], [65, 69, 72, 69]),
        ("C", 48, [55, 60, 64], [67, 72, 76, 72]),
        ("G", 43, [55, 59, 62], [67, 71, 74, 71]),
    ]

    pad_bus = np.zeros_like(song.buf)
    arp_bus = np.zeros_like(song.buf)
    lead_bus = np.zeros_like(song.buf)
    bass_bus = np.zeros_like(song.buf)

    for bar in range(bars):
        name, root, triad, arp_notes = chords[(bar // 2) % 4]
        chord_len = song.bar * 2 if bar % 2 == 0 else 0
        # ---- pad: two bars per chord, add once on even bars
        if bar % 2 == 0:
            n = int(song.bar * 2 * SR)
            env = adsr(n, 0.55, 0.4, 0.75, 1.4)
            sig = np.zeros(n)
            for note in triad:
                f = midi_to_hz(note)
                sig += saw(f, n, partials=7, detune=-0.0035) * 0.35
                sig += saw(f, n, partials=7, detune=0.0035) * 0.35
                sig += np.sin(2 * math.pi * f * 0.5 * t_axis(n)) * 0.18
            sig = lowpass_fft(sig * env, 1500 + 300 * math.sin(bar), 2)
            start = int(song.at(bar, 0) * SR)
            pan_angle = math.pi / 4
            pad_bus[start : start + n, 0] += sig * 0.13 * math.cos(pan_angle)
            pad_bus[start : start + n, 1] += sig * 0.13 * math.sin(pan_angle)

        # ---- arpeggio: 16th notes, two bars per chord
        pattern = [arp_notes[0], arp_notes[1], arp_notes[2], arp_notes[3], arp_notes[2], arp_notes[1], arp_notes[0] - 12, arp_notes[1]]
        steps = 32
        for step in range(steps):
            note = pattern[step % len(pattern)]
            if step % 8 == 7:
                note += 12
            dur = 0.22
            n = int(dur * SR)
            f = midi_to_hz(note)
            env = pluck_env(n, 10.0, 0.003)
            sig = (square(f, n, partials=5) * 0.55 + triangle(f, n) * 0.45) * env
            add(arp_bus, song.at(bar, step * 0.25), lowpass_fft(sig, 4800), 0.1, pan=0.25 * math.sin(step * 0.8))

        # ---- bass: driving 8ths with octave lift
        if bar >= 3:
            for step in range(8):
                note = root if step % 2 == 0 else root + 12
                if step == 7 and bar % 4 == 3:
                    note = root + 7
                dur = 0.4
                n = int(dur * SR)
                f = midi_to_hz(note)
                sig = np.sin(2 * math.pi * f * t_axis(n)) * 0.8 + saw(f, n, partials=4) * 0.35
                env = pluck_env(n, 5.0, 0.004)
                add(bass_bus, song.at(bar, step * 0.5), sig * env, 0.24)

        # ---- lead melody: bars 16 - 27, then a short outro phrase
        if 16 <= bar < 28:
            phrases = [
                [(0, 76, 1.5), (1.5, 74, 0.5), (2, 72, 1.0), (3, 69, 1.0)],
                [(0, 72, 1.0), (1, 76, 1.0), (2, 79, 1.5), (3.5, 76, 0.5)],
                [(0, 74, 1.5), (1.5, 72, 0.5), (2, 69, 1.0), (3, 67, 1.0)],
                [(0, 69, 1.0), (1, 72, 1.0), (2, 74, 1.5), (3.5, 72, 0.5)],
            ]
            phrase = phrases[(bar - 16) % 4]
            for beat, note, dur_beats in phrase:
                n = int(secs(dur_beats, bpm) * SR)
                if n <= 0:
                    continue
                f = midi_to_hz(note)
                t = t_axis(n)
                vib = 1.0 + 0.004 * np.sin(2 * math.pi * 5.2 * t)
                phase = 2 * math.pi * np.cumsum(np.full(n, f) * vib) / SR
                sig = np.sin(phase) * 0.55 + np.sin(phase * 2) * 0.18 + np.sin(phase * 3) * 0.08
                env = adsr(n, 0.02, 0.12, 0.68, 0.22)
                add(lead_bus, song.at(bar, beat), sig * env, 0.16, pan=0.1)

    # ---- drums
    for bar in range(bars):
        if bar < 4:
            continue
        full = 16 <= bar < 24 or bar >= 28
        for step in range(16):
            pos = bar + step / 16.0
            if step in (0, 8) or (full and step in (6, 14) and bar % 2 == 1):
                song.add(pos, 0, kick(), 0.9)
            if full and step in (4, 12):
                song.add(pos, 0, snare(), 0.55)
            if step % 2 == 0:
                song.add(pos, 0, hat(), 0.22 if step % 4 == 0 else 0.13, pan=0.15)
            if full and step == 15 and bar % 4 == 3:
                song.add(pos, 0, hat(open_hat=True), 0.2, pan=-0.2)
            if step == 0 and bar in (4, 16, 28):
                crash = highpass_fft(noise(int(2.4 * SR)), 5000) * np.exp(-t_axis(int(2.4 * SR)) * 2.2)
                song.add(pos, 0, crash, 0.16, pan=-0.3)

    # ---- mix buses
    song.buf += pad_bus * duck[:, None]
    song.buf += bass_bus * (0.55 + 0.45 * duck[:, None])
    song.buf += arp_bus
    song.buf += delay(lead_bus[:, 0], secs(0.75, bpm), 0.35, 0.4, 5)[:, None] * np.array([0.5, 0.9])
    song.buf += lead_bus

    # gentle tape-ish top end
    for ch in range(2):
        song.buf[:, ch] = highpass_fft(song.buf[:, ch], 28)
    return song.finish(fade=2.0)


# --------------------------------------------------------------------------- #
# Track 2 — Llama Whippin' (chiptune funk, 112 BPM, E minor)
# --------------------------------------------------------------------------- #


def track_llama_whippin() -> np.ndarray:
    bpm = 112
    bars = 32
    song = Song(bpm, bars)

    progression = [
        ("Em7", 40, [52, 55, 59, 62]),
        ("C", 36, [48, 52, 55, 59]),
        ("G", 43, [50, 55, 59, 62]),
        ("D", 38, [50, 54, 57, 62]),
    ]

    riff = [
        (0, 76, 0.5), (0.5, 79, 0.5), (1, 76, 0.5), (1.5, 74, 0.5),
        (2, 71, 0.5), (2.5, 74, 0.5), (3, 76, 1.0),
    ]
    riff_b = [
        (0, 74, 0.5), (0.5, 76, 0.5), (1, 79, 0.5), (1.5, 76, 0.5),
        (2, 74, 1.0), (3, 71, 0.5), (3.5, 72, 0.5),
    ]

    bass_pattern = [0, 0, 12, 0, 7, 0, 10, 12]
    for bar in range(bars):
        name, root, stab = progression[(bar // 2) % 4]

        # bass line, 16th-note funk
        for step in range(16):
            if step % 2 == 1 and step not in (5, 13):
                continue
            note = root + bass_pattern[(step // 2) % len(bass_pattern)]
            n = int(0.18 * SR)
            f = midi_to_hz(note)
            sig = square(f, n, partials=5) * 0.35 + np.sin(2 * math.pi * f * t_axis(n)) * 0.55
            env = pluck_env(n, 12.0 if step % 4 else 7.0, 0.003)
            song.add(bar, step * 0.25, lowpass_fft(sig * env, 900), 0.32)

        # chord stabs on the off-beats
        if bar >= 2:
            for step in (2, 6, 10, 14):
                n = int(0.14 * SR)
                env = pluck_env(n, 16.0, 0.003)
                sig = np.zeros(n)
                for note in stab:
                    sig += square(midi_to_hz(note), n, partials=4) * 0.3
                add(song.buf, song.at(bar, step * 0.25), lowpass_fft(sig, 2800) * env, 0.11, pan=-0.2)

        # lead riff
        if 8 <= bar < 28:
            phrase = riff if (bar // 2) % 2 == 0 else riff_b
            for beat, note, dur_beats in phrase:
                n = int(secs(dur_beats, bpm) * SR)
                f = midi_to_hz(note)
                sig = square(f, n, partials=7) * 0.6 + triangle(f, n) * 0.3
                env = pluck_env(n, 5.0 if dur_beats <= 0.5 else 3.2, 0.004)
                add(song.buf, song.at(bar, beat), sig * env, 0.13, pan=0.15)

        # drums
        if bar >= 2:
            for step in range(16):
                pos = bar + step / 16.0
                if step in (0, 3, 8, 11):
                    song.add(pos, 0, kick(0.32), 0.75)
                if step in (4, 12):
                    song.add(pos, 0, snare(), 0.5)
                if step % 2 == 0:
                    song.add(pos, 0, hat(0.05), 0.16 if step % 4 == 0 else 0.09, pan=0.2)
                if step == 14 and bar % 2 == 1:
                    song.add(pos, 0, hat(open_hat=True), 0.14, pan=-0.2)
                if step in (7, 15) and bar % 8 == 7:
                    song.add(pos, 0, clap(), 0.22)
            if bar in (8, 16, 24):
                crash = highpass_fft(noise(int(1.8 * SR)), 6000) * np.exp(-t_axis(int(1.8 * SR)) * 2.5)
                song.add(bar, 0, crash, 0.12)

    # a cheeky whip-crack fill at the top of the outro
    song.add(28, 0, clap(), 0.5)
    return song.finish(fade=1.0)


# --------------------------------------------------------------------------- #
# Track 3 — Pixel Rain (ambient, 70 BPM, B minor)
# --------------------------------------------------------------------------- #


def track_pixel_rain() -> np.ndarray:
    bpm = 70
    bars = 24
    song = Song(bpm, bars)

    chords = [
        ("Bm", 35, [59, 62, 66, 69]),
        ("G", 31, [55, 59, 62, 66]),
        ("D", 38, [57, 62, 66, 69]),
        ("A", 33, [57, 61, 64, 69]),
    ]

    bell_notes = [78, 81, 83, 86, 83, 81, 78, 74]

    for bar in range(bars):
        name, root, chord = chords[(bar // 2) % 4]

        # warm pad
        if bar % 2 == 0:
            n = int(song.bar * 2 * SR)
            t = t_axis(n)
            env = adsr(n, 1.2, 1.0, 0.7, 2.2)
            sig = np.zeros(n)
            for note in chord:
                f = midi_to_hz(note)
                sig += np.sin(2 * math.pi * f * t) * 0.28
                sig += np.sin(2 * math.pi * f * 2.003 * t) * 0.09
                sig += np.sin(2 * math.pi * f * 0.5 * t) * 0.12
            sig = lowpass_fft(sig * env, 1800)
            add(song.buf, song.at(bar, 0), sig, 0.16, pan=-0.1)

        # sub bass
        if bar % 2 == 0:
            n = int(song.bar * 2 * SR)
            f = midi_to_hz(root)
            env = adsr(n, 0.6, 0.5, 0.65, 1.5)
            add(song.buf, song.at(bar, 0), np.sin(2 * math.pi * f * t_axis(n)) * env, 0.18)

        # music-box arpeggio
        for step in range(8):
            note = bell_notes[step] + (12 if bar % 4 == 3 and step % 3 == 0 else 0)
            n = int(1.1 * SR)
            f = midi_to_hz(note)
            env = pluck_env(n, 3.0, 0.002)
            sig = np.sin(2 * math.pi * f * t_axis(n)) * 0.6 + np.sin(2 * math.pi * f * 2.01 * t_axis(n)) * 0.2
            add(song.buf, song.at(bar, step * 0.5), sig * env, 0.075, pan=0.35 * math.sin(step))

        # airy rain texture
        n = int(song.bar * SR)
        rain = highpass_fft(noise(n), 2200) * 0.008
        song.add(bar, 0, rain, 1.0, pan=0.0)

    # subtle heartbeat kick and brushed hats
    for bar in range(4, bars):
        song.add(bar, 0, kick(0.3, 0.6), 0.22)
        song.add(bar, 2, kick(0.25, 0.4), 0.12)
        for step in range(8):
            if step % 2 == 0:
                song.add(bar, step * 0.5, hat(0.05), 0.05, pan=0.25)

    # echo bells
    wet = delay(song.buf[:, 0], secs(0.75, bpm), 0.45, 0.3, 6)
    song.buf[:, 1] += wet * 0.2
    for ch in range(2):
        song.buf[:, ch] = highpass_fft(song.buf[:, ch], 30)
    return song.finish(fade=2.4)


# --------------------------------------------------------------------------- #
# Llama easter-egg sound
# --------------------------------------------------------------------------- #


def llama_whip() -> np.ndarray:
    dur = 2.6
    n = int(dur * SR)
    buf = np.zeros((n, 2))

    # whip crack: sharp noise transient
    crack_n = int(0.35 * SR)
    t = t_axis(crack_n)
    crack = highpass_fft(noise(crack_n), 1800) * np.exp(-t * 30)
    add(buf, 0.0, crack, 0.7, pan=-0.2)

    # comedic goat bleat: saw-ish tone with fast vibrato
    bleat_n = int(1.6 * SR)
    t = t_axis(bleat_n)
    f0 = 320.0 * (1.0 + 0.35 * np.exp(-t * 1.2))
    vib = 1.0 + 0.045 * np.sin(2 * math.pi * 7.5 * t)
    phase = 2 * math.pi * np.cumsum(f0 * vib) / SR
    base = np.sin(phase) + 0.5 * np.sin(phase * 2) + 0.25 * np.sin(phase * 3)
    formant = lowpass_fft(base, 1400, 2) * adsr(bleat_n, 0.05, 0.2, 0.8, 0.5)
    add(buf, 0.45, np.tanh(formant * 1.8), 0.28, pan=0.15)

    fade_edges(buf, 0.05)
    buf *= 0.85 / max(float(np.max(np.abs(buf))), 1e-9)
    return buf


# --------------------------------------------------------------------------- #
# Encoding / ID3
# --------------------------------------------------------------------------- #


def write_mp3(path: Path, stereo: np.ndarray, title: str, track: int, bpm: int) -> None:
    pcm = np.clip(stereo, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    enc = Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

    tags = ID3()
    tags.add(TIT2(encoding=3, text=[title]))
    tags.add(TPE1(encoding=3, text=["Nullsoft Replica"]))
    tags.add(TALB(encoding=3, text=["Winamp 2.91 · Demo Sessions"]))
    tags.add(TYER(encoding=3, text=["2000"]))
    tags.add(TRCK(encoding=3, text=[str(track)]))
    tags.add(TCON(encoding=3, text=["Synthwave"]))
    tags.save(path, v2_version=3)
    print(f"  {path.name}: {len(data) / 1024:.0f} KiB")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Synthesizing demo tracks…")
    tracks = [
        ("neon-skyline.mp3", "Neon Skyline", 1, 84, track_neon_skyline),
        ("llama-whippin.mp3", "Llama Whippin' (Demo)", 2, 112, track_llama_whippin),
        ("pixel-rain.mp3", "Pixel Rain", 3, 70, track_pixel_rain),
    ]
    for filename, title, num, bpm, fn in tracks:
        print(f"* {title}")
        stereo = fn()
        write_mp3(OUT_DIR / filename, stereo, title, num, bpm)

    print("* llama whip sting")
    whip = llama_whip()
    write_mp3(OUT_DIR / "llama-whip.mp3", whip, "Llama Whip", 4, 0)
    print("done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"generation failed: {exc}", file=sys.stderr)
        raise
