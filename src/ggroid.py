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
    
    # Sound effect types
    SOUND_EFFECTS = {
        "normal": 0,     # Regular droid sounds
        "blatt": 1,      # Short "blatt" sounds (fart-like)
        "trill": 2,      # Excited trills (rapid up/down)
        "whistle": 3,    # High-pitched whistle
        "scream": 4,     # Alarmed scream
        "happy": 5,      # Happy chirp sequence
        "sad": 6,        # Sad descending tone
        "question": 7,   # Questioning up-trill
        "random": 8      # Random mixture of effects
    }
    
    # Default parameters
    DEFAULT_SAMPLE_RATE = 48000
    DEFAULT_PROTOCOL = "audible"  # audible, ultrasound
    DEFAULT_VOLUME = 0.5  # 0.0 - 1.0
    DEFAULT_LFO_RATE = 12  # 5 - 20 Hz for warbling effect
    DEFAULT_DUTY_CYCLE = 0.5  # 0.3 - 0.7 for variable square waves
    DEFAULT_EXAGGERATION = 0.6  # 0.0 - 1.0, how exaggerated the effects are
    
    def __init__(
        self,
        sample_rate: int = DEFAULT_SAMPLE_RATE,
        protocol: str = DEFAULT_PROTOCOL,
        volume: float = DEFAULT_VOLUME,
        lfo_rate: int = DEFAULT_LFO_RATE,
        duty_cycle: float = DEFAULT_DUTY_CYCLE,
        exaggeration: float = DEFAULT_EXAGGERATION,
        default_effect: str = "normal"
    ):
        """
        Initialize GGRoid with custom parameters
        
        Args:
            sample_rate: Audio sample rate in Hz
            protocol: "audible" or "ultrasound"
            volume: Output volume (0.0 - 1.0)
            lfo_rate: Low-frequency oscillator rate in Hz for warbling effect
            duty_cycle: Duty cycle for square waves (0.3 - 0.7)
            exaggeration: How exaggerated the effects are (0.0 - 1.0)
            default_effect: Default sound effect type ("normal", "blatt", "trill", etc.)
        """
        self.sample_rate = sample_rate
        self.protocol = protocol
        self.volume = max(0.0, min(1.0, volume))  # Clamp to 0.0 - 1.0
        self.lfo_rate = lfo_rate
        self.duty_cycle = max(0.3, min(0.7, duty_cycle))  # Clamp to 0.3 - 0.7
        self.exaggeration = max(0.0, min(1.0, exaggeration))  # Clamp to 0.0 - 1.0
        
        # Set default effect
        if default_effect in self.SOUND_EFFECTS:
            self.default_effect = default_effect
        else:
            self.default_effect = "normal"
            print(f"Warning: Unknown effect '{default_effect}', using 'normal' instead")
            
        # Random number generator for effect variation
        self.rng = np.random.RandomState()
        
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
    
    def _generate_lfo_envelope(self, num_samples: int, rate: Optional[float] = None) -> np.ndarray:
        """
        Generate a low-frequency oscillator envelope for warbling effect
        
        Args:
            num_samples: Number of samples to generate
            rate: LFO rate in Hz, if None uses instance lfo_rate
        
        Returns:
            Numpy array containing LFO envelope
        """
        # Generate time array
        t = np.linspace(0, num_samples / self.sample_rate, num_samples)
        
        # Use provided rate or default
        lfo_rate = rate if rate is not None else self.lfo_rate
        
        # Exaggerate effect based on exaggeration parameter
        depth = 0.2 + (0.6 * self.exaggeration)
        offset = 1.0 - depth
        
        # Create LFO envelope
        lfo = offset + depth * (0.5 + 0.5 * np.sin(2 * np.pi * lfo_rate * t))
        
        return lfo
    
    def _generate_frequency_modulation(self, num_samples: int, center_freq: float, 
                                     modulation_depth: float, modulation_rate: float) -> np.ndarray:
        """
        Generate frequency modulation curve
        
        Args:
            num_samples: Number of samples to generate
            center_freq: Center frequency in Hz
            modulation_depth: Depth of modulation in Hz
            modulation_rate: Rate of modulation in Hz
            
        Returns:
            Numpy array of frequency values over time
        """
        t = np.linspace(0, num_samples / self.sample_rate, num_samples)
        
        # Generate modulated frequency curve
        freqs = center_freq + modulation_depth * np.sin(2 * np.pi * modulation_rate * t)
        
        return freqs
    
    def _generate_square_wave(self, frequency: float, duration: float, 
                             variable_duty: bool = True, effect: Optional[str] = None) -> np.ndarray:
        """
        Generate a square wave with optional variable duty cycle and effects
        
        Args:
            frequency: Frequency in Hz (or base frequency for effects)
            duration: Duration in seconds
            variable_duty: If True, vary the duty cycle slightly over time
            effect: Sound effect type (see SOUND_EFFECTS)
            
        Returns:
            Numpy array containing square wave samples
        """
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, False)
        
        # Use specified effect or default
        effect_type = effect if effect in self.SOUND_EFFECTS else self.default_effect
        
        # If random effect requested, choose one (excluding "random" itself)
        if effect_type == "random":
            effect_options = list(self.SOUND_EFFECTS.keys())
            effect_options.remove("random")
            effect_type = self.rng.choice(effect_options)
        
        # Generate waveform based on effect type
        if effect_type == "normal":
            # Standard variable duty cycle square wave
            if variable_duty:
                # Create a slowly varying duty cycle
                duty_var = 0.1 * np.sin(2 * np.pi * 0.5 * t)  # ±0.1 variation at 0.5 Hz
                duty = self.duty_cycle + duty_var
            else:
                duty = self.duty_cycle
                
            # Generate square wave with variable duty cycle
            wave = signal.square(2 * np.pi * frequency * t, duty=duty)
            
        elif effect_type == "blatt":
            # "Blatt" effect: Rapidly changing duty cycle + short duration
            blatt_rate = 20.0 + (40.0 * self.exaggeration)
            duty_var = 0.3 * np.sin(2 * np.pi * blatt_rate * t)
            duty = self.duty_cycle + duty_var
            
            # Add some frequency variation
            freq_mod = 100 * self.exaggeration * np.sin(2 * np.pi * 15 * t)
            
            # Generate square wave with variable duty and frequency
            wave = signal.square(2 * np.pi * (frequency + freq_mod) * t, duty=duty)
            
            # Emphasize attack
            attack_env = np.ones_like(wave)
            attack_len = int(0.01 * self.sample_rate)
            attack_env[:attack_len] = np.linspace(0.5, 1.5, attack_len)
            wave = wave * attack_env
            
        elif effect_type == "trill":
            # "Trill" effect: Rapid frequency modulation
            trill_rate = 12.0 + (25.0 * self.exaggeration)
            trill_depth = 200.0 + (500.0 * self.exaggeration)
            
            # Generate frequency modulation curve
            freqs = self._generate_frequency_modulation(
                num_samples, frequency, trill_depth, trill_rate
            )
            
            # Generate instantaneous phase by integrating frequency
            phase = 2 * np.pi * np.cumsum(freqs) / self.sample_rate
            
            # Generate square wave with modulated frequency
            wave = signal.square(phase, duty=self.duty_cycle)
            
        elif effect_type == "whistle":
            # "Whistle" effect: High-pitched sine wave with vibrato
            # Shift to a higher frequency
            whistle_freq = frequency * (2.0 + self.exaggeration)
            
            # Add vibrato
            vibrato_rate = 8.0 + (7.0 * self.exaggeration)
            vibrato_depth = 30.0 + (70.0 * self.exaggeration)
            
            # Generate frequency modulation curve for vibrato
            freqs = self._generate_frequency_modulation(
                num_samples, whistle_freq, vibrato_depth, vibrato_rate
            )
            
            # Generate instantaneous phase by integrating frequency
            phase = 2 * np.pi * np.cumsum(freqs) / self.sample_rate
            
            # Use sine wave for whistle (smoother)
            wave = np.sin(phase)
            
        elif effect_type == "scream":
            # "Scream" effect: Rising frequency with noise
            # Start with a base frequency that rises rapidly
            freq_factor = 1.0 + 4.0 * np.linspace(0, 1, num_samples)**2
            
            # Generate instantaneous frequency
            inst_freq = frequency * freq_factor
            
            # Generate instantaneous phase by integrating frequency
            phase = 2 * np.pi * np.cumsum(inst_freq) / self.sample_rate
            
            # Generate wave with unstable duty cycle
            duty = 0.5 + 0.3 * np.random.randn(num_samples)
            wave = signal.square(phase, duty=np.clip(duty, 0.1, 0.9))
            
            # Mix in some noise for distortion
            noise = 0.3 * self.exaggeration * np.random.randn(num_samples)
            wave = 0.7 * wave + noise
            
        elif effect_type == "happy":
            # "Happy" effect: Rising sequence of beeps
            beeps = []
            
            # Number of beeps in the sequence
            num_beeps = 3 + int(4 * self.exaggeration)
            beep_duration = duration / num_beeps
            
            # Create sequence of rising beeps
            for i in range(num_beeps):
                # Calculate beep frequency (rising scale)
                beep_freq = frequency * (1.0 + 0.15 * i)
                
                # Generate a short wave for this beep
                beep_samples = int(beep_duration * self.sample_rate)
                beep_t = np.linspace(0, beep_duration, beep_samples, False)
                
                # Create the beep with slight arpeggiation
                beep = signal.square(2 * np.pi * beep_freq * beep_t, duty=self.duty_cycle)
                
                # Apply short envelope
                beep_env = np.ones_like(beep)
                fade = int(0.15 * beep_samples)
                beep_env[:fade] = np.linspace(0, 1, fade)
                beep_env[-fade:] = np.linspace(1, 0, fade)
                beep = beep * beep_env
                
                beeps.append(beep)
            
            # Concatenate beeps into a sequence
            wave = np.concatenate(beeps)
            
            # If the sequence is too short, pad it
            if len(wave) < num_samples:
                wave = np.pad(wave, (0, num_samples - len(wave)))
            # If too long, trim it
            elif len(wave) > num_samples:
                wave = wave[:num_samples]
                
        elif effect_type == "sad":
            # "Sad" effect: Descending tone with low LFO
            # Start with a base frequency that falls gradually
            freq_factor = 1.0 - 0.5 * self.exaggeration * np.linspace(0, 1, num_samples)
            
            # Generate instantaneous frequency
            inst_freq = frequency * freq_factor
            
            # Generate instantaneous phase by integrating frequency
            phase = 2 * np.pi * np.cumsum(inst_freq) / self.sample_rate
            
            # Generate square wave with the falling frequency
            wave = signal.square(phase, duty=self.duty_cycle)
            
            # Apply slow LFO
            slow_lfo = self._generate_lfo_envelope(num_samples, rate=3.0)
            wave = wave * slow_lfo
            
        elif effect_type == "question":
            # "Question" effect: Rising trill at the end
            # First 70% is steady tone
            steady_len = int(num_samples * 0.7)
            trill_len = num_samples - steady_len
            
            # Generate steady part
            steady_t = np.linspace(0, 0.7 * duration, steady_len, False)
            steady_wave = signal.square(2 * np.pi * frequency * steady_t, duty=self.duty_cycle)
            
            # Generate rising trill part
            trill_t = np.linspace(0, 0.3 * duration, trill_len, False)
            
            # Rising frequency for the trill
            trill_freq = frequency * (1.0 + self.exaggeration * np.linspace(0, 1, trill_len)**2)
            
            # Add trill modulation
            trill_mod = 100 * self.exaggeration * np.sin(2 * np.pi * 15 * trill_t)
            trill_wave = signal.square(2 * np.pi * (trill_freq + trill_mod) * trill_t, duty=self.duty_cycle)
            
            # Combine steady and trill parts
            wave = np.concatenate([steady_wave, trill_wave])
            
        else:
            # Fallback to normal square wave
            wave = signal.square(2 * np.pi * frequency * t, duty=self.duty_cycle)
        
        # Apply envelope to avoid clicks (common for all effects)
        envelope = np.ones_like(wave)
        fade_len = int(0.01 * self.sample_rate)  # 10ms fade
        envelope[:fade_len] = np.linspace(0, 1, fade_len)
        envelope[-fade_len:] = np.linspace(1, 0, fade_len)
        
        return wave * envelope
    
    def _apply_warble(self, wave: np.ndarray, effect: Optional[str] = None) -> np.ndarray:
        """
        Apply warbling effect to the audio signal
        
        Args:
            wave: Input audio signal
            effect: Sound effect type to influence warbling
            
        Returns:
            Warbled audio signal
        """
        # Use specified effect or default
        effect_type = effect if effect in self.SOUND_EFFECTS else self.default_effect
        
        # If random effect, choose one
        if effect_type == "random":
            effect_options = list(self.SOUND_EFFECTS.keys())
            effect_options.remove("random")
            effect_type = self.rng.choice(effect_options)
        
        # Generate basic LFO envelope
        lfo = self._generate_lfo_envelope(len(wave))
        
        # Apply effect-specific additional modulation
        if effect_type == "blatt":
            # Sharper, faster warble for blatt sounds
            blatt_lfo = 0.8 + 0.5 * self.exaggeration * signal.square(
                2 * np.pi * 30 * np.linspace(0, len(wave) / self.sample_rate, len(wave)),
                duty=0.3
            )
            lfo = lfo * blatt_lfo
            
        elif effect_type == "trill":
            # Rapid, high-depth warble for trills
            t = np.linspace(0, len(wave) / self.sample_rate, len(wave))
            trill_lfo = 1.0 + 0.5 * self.exaggeration * np.sin(2 * np.pi * 20 * t)
            lfo = lfo * trill_lfo
            
        elif effect_type == "scream":
            # Chaotic warble for scream
            t = np.linspace(0, len(wave) / self.sample_rate, len(wave))
            # Multiple overlapping LFOs at different rates for chaos
            chaos_lfo = 1.0
            chaos_lfo *= 0.8 + 0.2 * np.sin(2 * np.pi * 13 * t)
            chaos_lfo *= 0.9 + 0.1 * np.sin(2 * np.pi * 27 * t)
            chaos_lfo *= 0.95 + 0.05 * np.sin(2 * np.pi * 41 * t)
            
            # Scale based on exaggeration
            chaos_lfo = 1.0 + (chaos_lfo - 1.0) * self.exaggeration
            
            lfo = lfo * chaos_lfo
        
        # Apply LFO modulation
        return wave * lfo
    
    def encode_message(self, message: str, duration: float = 0.1, 
                     effect_mapping: Optional[Dict[str, str]] = None,
                     add_droid_personality: bool = True) -> np.ndarray:
        """
        Encode a text message into R2-D2 style audio
        
        This is a simplified encoding that doesn't actually use GGWave's encoding
        but mimics its sound aesthetics. For real data transmission, you would
        need to integrate with GGWave's actual encoding.
        
        Args:
            message: Text message to encode
            duration: Duration per character in seconds
            effect_mapping: Dictionary mapping character types to sound effects
            add_droid_personality: Whether to add extra personality sounds
            
        Returns:
            Audio buffer containing encoded message
        """
        # Convert message to ASCII codes
        ascii_codes = [ord(c) for c in message]
        
        # Default effect mapping if none provided
        if effect_mapping is None:
            effect_mapping = {
                'uppercase': 'trill',   # Uppercase letters get trills
                'lowercase': 'normal',  # Lowercase get normal sounds
                'number': 'blatt',      # Numbers get blatt sounds
                'punctuation': 'whistle', # Punctuation gets whistles
                'whitespace': 'sad',    # Spaces get sad tones
                'special': 'scream'     # Special chars get screams
            }
        
        # Buffer to store audio
        output_buffer = np.array([], dtype=np.float32)
        
        # Add excited trill intro if personality enabled
        if add_droid_personality and len(message) > 3:
            intro_freq = self.carrier_frequencies[0] * 1.2  # Slightly higher frequency for intro
            intro_duration = duration * 2.5  # Longer duration for intro
            
            # Generate intro trill
            intro_wave = self._generate_square_wave(
                intro_freq, intro_duration, variable_duty=True, effect="trill"
            )
            intro_wave = self._apply_warble(intro_wave, effect="trill")
            
            # Add to buffer
            output_buffer = np.append(output_buffer, intro_wave)
            
            # Add pause after intro
            pause_samples = int(self.sample_rate * duration * 0.3)
            output_buffer = np.append(output_buffer, np.zeros(pause_samples))
        
        # Generate a tone for each character
        for i, code in enumerate(ascii_codes):
            # Map ASCII code to a droid-like frequency pattern
            # This creates a unique pattern for each character
            freq_idx = code % len(self.carrier_frequencies)
            base_freq = self.carrier_frequencies[freq_idx]
            
            # Vary frequency slightly based on character
            freq_var = (code % 10) * 20  # 0-180 Hz variation
            freq = base_freq + freq_var
            
            # Determine character type for effect selection
            if 65 <= code <= 90:  # Uppercase letters
                char_type = 'uppercase'
            elif 97 <= code <= 122:  # Lowercase letters
                char_type = 'lowercase'
            elif 48 <= code <= 57:  # Numbers
                char_type = 'number'
            elif code == 32:  # Space
                char_type = 'whitespace'
            elif 33 <= code <= 47 or 58 <= code <= 64 or 91 <= code <= 96 or 123 <= code <= 126:
                # Punctuation and symbols
                char_type = 'punctuation'
            else:  # Special characters
                char_type = 'special'
            
            # Get sound effect for this character type
            effect = effect_mapping.get(char_type, 'normal')
            
            # Add special effects for common patterns
            if i < len(ascii_codes) - 1:
                # Question mark gets question effect
                if code == 63:  # '?'
                    effect = 'question'
                # Exclamation mark gets scream effect
                elif code == 33:  # '!'
                    effect = 'scream'
                # Period gets sad effect
                elif code == 46:  # '.'
                    effect = 'sad'
            
            # Generate square wave with appropriate effect
            char_duration = duration
            if effect == 'blatt':
                # Shorter duration for blatts
                char_duration *= 0.7
            elif effect == 'trill':
                # Longer duration for trills
                char_duration *= 1.3
            
            # Generate and apply effect
            sq_wave = self._generate_square_wave(freq, char_duration, variable_duty=True, effect=effect)
            warbled_wave = self._apply_warble(sq_wave, effect=effect)
            
            # Add to output buffer
            output_buffer = np.append(output_buffer, warbled_wave)
            
            # Add a short pause between characters (except the last one)
            if i < len(ascii_codes) - 1:
                pause_duration = duration * 0.2  # 20% of character duration
                pause_samples = int(self.sample_rate * pause_duration)
                output_buffer = np.append(output_buffer, np.zeros(pause_samples))
        
        # Add happy chirp outro if personality enabled and message is long enough
        if add_droid_personality and len(message) > 5:
            # Add a slightly longer pause before outro
            pause_samples = int(self.sample_rate * duration * 0.4)
            output_buffer = np.append(output_buffer, np.zeros(pause_samples))
            
            # Generate outro sound
            outro_freq = self.carrier_frequencies[2] * 1.1
            outro_duration = duration * 2.0
            
            # Use happy effect for end of message
            outro_wave = self._generate_square_wave(
                outro_freq, outro_duration, variable_duty=True, effect="happy"
            )
            outro_wave = self._apply_warble(outro_wave, effect="happy")
            
            # Add to buffer
            output_buffer = np.append(output_buffer, outro_wave)
        
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
    
    def say(self, message: str, save_to_file: Optional[str] = None, 
            effect_mapping: Optional[Dict[str, str]] = None,
            add_personality: bool = True,
            effect: Optional[str] = None):
        """
        Convert text to R2-D2 speech and play it
        
        Args:
            message: Text message to convert
            save_to_file: If provided, save audio to this WAV file
            effect_mapping: Mapping of character types to sound effects
            add_personality: Whether to add droid personality sounds
            effect: Override effect for the entire message
        """
        print(f"R2-D2 says: {message}")
        
        # If specific effect requested, apply it to all characters
        if effect in self.SOUND_EFFECTS:
            if effect_mapping is None:
                effect_mapping = {}
            # Map all character types to the requested effect
            for char_type in ['uppercase', 'lowercase', 'number', 'punctuation', 'whitespace', 'special']:
                effect_mapping[char_type] = effect
        
        # Encode the message
        audio_buffer = self.encode_message(
            message, 
            effect_mapping=effect_mapping,
            add_droid_personality=add_personality
        )
        
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
    parser.add_argument("--exaggeration", "-e", type=float, default=0.6, 
                       help="Exaggeration level (0.0-1.0)")
    parser.add_argument("--effect", "-f", choices=["normal", "blatt", "trill", "whistle", 
                                                "scream", "happy", "sad", "question", "random"],
                       help="Override sound effect for entire message")
    parser.add_argument("--no-personality", action="store_true", 
                      help="Disable droid personality sounds")
    
    args = parser.parse_args()
    
    # Create GGRoid instance
    ggroid = GGRoid(
        volume=args.volume,
        duty_cycle=args.duty,
        lfo_rate=args.lfo,
        exaggeration=args.exaggeration
    )
    
    # Process the message
    ggroid.say(
        message=args.message, 
        save_to_file=args.save,
        effect=args.effect,
        add_personality=not args.no_personality
    )


if __name__ == "__main__":
    main()