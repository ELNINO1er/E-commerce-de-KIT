"""Original impact / air-sweep sound, no external music dependency."""
from pathlib import Path
import math
import random
import struct
import wave

random.seed(14)
rate = 44100
out = Path(__file__).parent / 'public' / 'impact-envol.wav'
with wave.open(str(out), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(rate)
    samples = bytearray()
    low = 0.0
    for i in range(int(rate * 2.4)):
        t = i / rate
        noise = random.uniform(-1, 1)
        low = 0.88 * low + 0.12 * noise
        thump = 0.72 * math.sin(2 * math.pi * (75*t - 13*t*t)) * math.exp(-8*t)
        crack = noise * 0.24 * math.exp(-40*t)
        air = low * 0.8 * math.exp(-((t-0.22)/0.22)**2)
        bell = 0.055 * (math.sin(2*math.pi*880*t) + 0.4*math.sin(2*math.pi*1320*t)) * math.exp(-2.5*t)
        sample = max(-0.95, min(0.95, thump + crack + air + bell))
        samples.extend(struct.pack('<h', int(sample*32767)))
    audio.writeframes(samples)
