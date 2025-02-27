#!/usr/bin/env python3
# GGRoid: Star Wars Droid Sound Modulation for GGWave
# Enhancing GGWave's sound characteristics to mimic Star Wars droids

import numpy as np
from scipy import signal
import pyaudio
import wave
import struct
import time
import argparse
from typing import List, Optional, Tuple, Dict, Any

class GGRoid:
    """
    GGRoid - Star Wars Droid Sound Modulation for GGWave
    
    Enhances GGWave's sound output to mimic the sounds of Star Wars droids
    while maintaining data transmission capabilities.
    """
    
    # R2-D2 frequency range: 300Hz - 3kHz
    DROID_FREQUENCIES = [300, 800, 1500, 2200, 3000]
    
    # Default parameters
    DEFAULT_SAMPLE_RATE = 48000
    DEFAULT_PROTOCOL = "audible"  # audible, ultrasound
    DEFAULT_VOLUME = 0.5  # 0.0 - 1.0
    DEFAULT_LFO_RATE = 12  # 5 - 20 Hz for warbling effect
    DEFAULT_DUTY_CYCLE = 0.5  # 0.3 - 0.7 for variable square waves
    
    def __init__(
        self,
        sample_rate: int = DEFAULT_SAMPLE_RATE,
        protocol: str = DEFAULT_PROTOCOL,
        volume: float = DEFAULT_VOLUME,
        lfo_rate: int = DEFAULT_LFO_RATE,
        duty_cycle: float = DEFAULT_DUTY_CYCLE,
    ):
        """
        Initialize GGRoid with custom parameters
        
        Args:
            sample_rate: Audio sample rate in Hz
            protocol: "audible" or "ultrasound"
            volume: Output volume (0.0 - 1.0)
            lfo_rate: Low-frequency oscillator rate in Hz for warbling effect
            duty_cycle: Duty cycle for square waves (0.3 - 0.7)
        """
        self.sample_rate = sample_rate
        self.protocol = protocol
        self.volume = max(0.0, min(1.0, volume))  # Clamp to 0.0 - 1.0
        self.lfo_rate = lfo_rate
        self.duty_cycle = max(0.3, min(0.7, duty_cycle))  # Clamp to 0.3 - 0.7
        
        # Audio device
        self.audio = pyaudio.PyAudio()
        
        # Set up frequencies based on protocol
        if protocol == "ultrasound":
            # For ultrasound, we'll use higher frequencies but maintain the droid-like character
            self.carrier_frequencies = [17500, 18000, 18500, 19000, 19500]
        else:
            # Use droid frequencies for audible protocol
            self.carrier_frequencies = self.DROID_FREQUENCIES
    
    def __del__(self):
        """Clean up audio resources"""
        if hasattr(self, 'audio'):
            self.audio.terminate()
    
    def _generate_lfo_envelope(self, num_samples: int) -> np.ndarray:
        """
        Generate a low-frequency oscillator envelope for warbling effect
        
        Args:
            num_samples: Number of samples to generate
        
        Returns:
            Numpy array containing LFO envelope
        """
        # Generate time array
        t = np.linspace(0, num_samples / self.sample_rate, num_samples)
        
        # Create LFO envelope (0.8 - 1.0 range for subtle effect)
        lfo = 0.8 + 0.2 * (0.5 + 0.5 * np.sin(2 * np.pi * self.lfo_rate * t))
        
        return lfo
    
    def _generate_square_wave(self, frequency: float, duration: float, 
                             variable_duty: bool = True) -> np.ndarray:
        """
        Generate a square wave with optional variable duty cycle
        
        Args:
            frequency: Frequency in Hz
            duration: Duration in seconds
            variable_duty: If True, vary the duty cycle slightly over time
        
        Returns:
            Numpy array containing square wave samples
        """
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, False)
        
        if variable_duty:
            # Create a slowly varying duty cycle
            duty_var = 0.1 * np.sin(2 * np.pi * 0.5 * t)  # ±0.1 variation at 0.5 Hz
            duty = self.duty_cycle + duty_var
        else:
            duty = self.duty_cycle
            
        # Generate square wave with variable duty cycle
        wave = signal.square(2 * np.pi * frequency * t, duty=duty)
        
        # Apply envelope to avoid clicks
        envelope = np.ones_like(wave)
        fade_len = int(0.01 * self.sample_rate)  # 10ms fade
        envelope[:fade_len] = np.linspace(0, 1, fade_len)
        envelope[-fade_len:] = np.linspace(1, 0, fade_len)
        
        return wave * envelope
    
    def _apply_warble(self, wave: np.ndarray) -> np.ndarray:
        """
        Apply warbling effect to the audio signal
        
        Args:
            wave: Input audio signal
        
        Returns:
            Warbled audio signal
        """
        # Generate LFO envelope
        lfo = self._generate_lfo_envelope(len(wave))
        
        # Apply LFO modulation
        return wave * lfo
    
    def encode_message(self, message: str, duration: float = 0.1) -> np.ndarray:
        """
        Encode a text message into R2-D2 style audio
        
        This is a simplified encoding that doesn't actually use GGWave's encoding
        but mimics its sound aesthetics. For real data transmission, you would
        need to integrate with GGWave's actual encoding.
        
        Args:
            message: Text message to encode
            duration: Duration per character in seconds
            
        Returns:
            Audio buffer containing encoded message
        """
        # Convert message to ASCII codes
        ascii_codes = [ord(c) for c in message]
        
        # Buffer to store audio
        output_buffer = np.array([], dtype=np.float32)
        
        # Generate a tone for each character
        for i, code in enumerate(ascii_codes):
            # Map ASCII code to a droid-like frequency pattern
            # This creates a unique pattern for each character
            freq_idx = code % len(self.carrier_frequencies)
            base_freq = self.carrier_frequencies[freq_idx]
            
            # Vary frequency slightly based on character
            freq_var = (code % 10) * 20  # 0-180 Hz variation
            freq = base_freq + freq_var
            
            # Generate square wave
            sq_wave = self._generate_square_wave(freq, duration, variable_duty=True)
            
            # Apply warbling effect
            warbled_wave = self._apply_warble(sq_wave)
            
            # Add to output buffer
            output_buffer = np.append(output_buffer, warbled_wave)
            
            # Add a short pause between characters (except the last one)
            if i < len(ascii_codes) - 1:
                pause_duration = duration * 0.2  # 20% of character duration
                pause_samples = int(self.sample_rate * pause_duration)
                output_buffer = np.append(output_buffer, np.zeros(pause_samples))
        
        # Normalize and apply volume
        output_buffer = output_buffer / np.max(np.abs(output_buffer))
        output_buffer = output_buffer * self.volume
        
        return output_buffer
    
    def play_buffer(self, buffer: np.ndarray):
        """
        Play audio buffer through the sound device
        
        Args:
            buffer: Audio buffer to play
        """
        # Open output stream
        stream = self.audio.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=self.sample_rate,
            output=True
        )
        
        # Play the buffer
        stream.write(buffer.astype(np.float32).tobytes())
        
        # Close the stream
        stream.stop_stream()
        stream.close()
    
    def save_to_wav(self, buffer: np.ndarray, filename: str):
        """
        Save audio buffer to WAV file
        
        Args:
            buffer: Audio buffer to save
            filename: Output WAV filename
        """
        # Convert to 16-bit integers
        int_buffer = (buffer * 32767).astype(np.int16)
        
        # Open WAV file
        with wave.open(filename, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 2 bytes = 16 bits
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(int_buffer.tobytes())
    
    def say(self, message: str, save_to_file: Optional[str] = None):
        """
        Convert text to R2-D2 speech and play it
        
        Args:
            message: Text message to convert
            save_to_file: If provided, save audio to this WAV file
        """
        print(f"R2-D2 says: {message}")
        
        # Encode the message
        audio_buffer = self.encode_message(message)
        
        # Save to file if requested
        if save_to_file:
            self.save_to_wav(audio_buffer, save_to_file)
            print(f"Saved to {save_to_file}")
        
        # Play the message
        self.play_buffer(audio_buffer)


def main():
    """Command-line interface for GGRoid"""
    parser = argparse.ArgumentParser(description="GGRoid - Star Wars Droid Sound Generator")
    parser.add_argument("message", help="Message to convert to droid speech")
    parser.add_argument("--save", "-s", help="Save to WAV file")
    parser.add_argument("--volume", "-v", type=float, default=0.5, help="Volume (0.0-1.0)")
    parser.add_argument("--duty", "-d", type=float, default=0.5, help="Duty cycle (0.3-0.7)")
    parser.add_argument("--lfo", "-l", type=float, default=12, help="LFO rate in Hz (5-20)")
    
    args = parser.parse_args()
    
    # Create GGRoid instance
    ggroid = GGRoid(
        volume=args.volume,
        duty_cycle=args.duty,
        lfo_rate=args.lfo
    )
    
    # Process the message
    ggroid.say(args.message, args.save)


if __name__ == "__main__":
    main()