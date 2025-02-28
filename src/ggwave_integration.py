#!/usr/bin/env python3
"""
GGRoid + GGWave Integration Example

This script demonstrates how to integrate GGRoid with the GGWave library
to send data with Star Wars droid-like sound aesthetics.
"""

import numpy as np
import pyaudio
import argparse
import time
from typing import Optional
import os
import sys
import subprocess
import tempfile

from ggroid import GGRoid

# Detect if we're running in a browser environment
IS_BROWSER = False
try:
    import js
    import pyodide
    IS_BROWSER = True
except ImportError:
    pass

class GGWaveWrapper:
    """
    Wrapper for GGWave library that adds Star Wars droid sound aesthetics
    """
    
    def __init__(self, 
                ggwave_path: Optional[str] = None, 
                sample_rate: int = 48000):
        """
        Initialize GGWave wrapper
        
        Args:
            ggwave_path: Path to ggwave.js (optional, will search in common locations)
            sample_rate: Audio sample rate
        """
        self.sample_rate = sample_rate
        self.ggwave_path = self._find_ggwave_js(ggwave_path)
        self.ggroid = GGRoid(sample_rate=sample_rate)
        
        # Set up PyAudio
        self.audio = pyaudio.PyAudio()
        
        # Initialize GGWave in browser or Node.js environment
        if IS_BROWSER:
            # Browser environment
            self._init_browser_ggwave()
        else:
            # Node.js environment
            self._init_nodejs_ggwave()
    
    def _find_ggwave_js(self, custom_path: Optional[str] = None) -> str:
        """Find ggwave.js in common locations"""
        if custom_path and os.path.exists(custom_path):
            return custom_path
            
        # Common locations
        common_paths = [
            os.path.join(os.path.dirname(__file__), "ggwave.js"),
            os.path.join(os.path.dirname(__file__), "../lib/ggwave.js"),
            os.path.join(os.path.dirname(__file__), "../public/ggwave/ggwave.js"),
            "/usr/local/lib/ggwave.js",
            "/usr/lib/ggwave.js"
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                return path
                
        # Try to find it using npm
        try:
            npm_path = subprocess.check_output(
                ["npm", "root", "-g"], 
                universal_newlines=True
            ).strip()
            ggwave_npm_path = os.path.join(npm_path, "ggwave/ggwave.js")
            if os.path.exists(ggwave_npm_path):
                return ggwave_npm_path
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        
        raise FileNotFoundError(
            "Could not find ggwave.js. Please specify the path manually."
        )
    
    def _init_browser_ggwave(self):
        """Initialize GGWave in a browser environment"""
        # Load ggwave.js via Pyodide
        js.eval(f"""
            fetch('{self.ggwave_path}')
                .then(response => response.text())
                .then(text => {{
                    eval(text);
                    window.ggwave_instance = ggwave_factory().then(ggwave => {{
                        window.ggwave_module = ggwave;
                        
                        // Set up parameters
                        const params = ggwave.getDefaultParameters();
                        params.sampleRateInp = {self.sample_rate};
                        params.sampleRateOut = {self.sample_rate};
                        
                        // Initialize GGWave
                        window.ggwave_instance = ggwave.init(params);
                        
                        console.log('GGWave initialized in browser');
                    }});
                }});
        """)
        
        # Wait for GGWave to initialize
        time.sleep(1)
    
    def _init_nodejs_ggwave(self):
        """Initialize GGWave in a Node.js environment"""
        # This is a simplified version that doesn't actually use
        # GGWave's real encoding but mimics its sound aesthetics
        pass
    
    def encode_message(self, message: str, protocol: str = "audible") -> np.ndarray:
        """
        Encode a message using GGWave and apply droid sound effects
        
        Args:
            message: Message to encode
            protocol: GGWave protocol ("audible" or "ultrasound")
            
        Returns:
            Audio buffer containing encoded message with droid effects
        """
        if IS_BROWSER:
            # Use actual GGWave encoding in browser
            txProtocol = "ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST"
            if protocol == "ultrasound":
                txProtocol = "ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_FAST"
                
            # Encode using GGWave
            js_result = js.eval(f"""
                const waveform = window.ggwave_module.encode(
                    window.ggwave_instance,
                    "{message}",
                    window.ggwave_module.{txProtocol},
                    10 // Volume
                );
                
                // Convert to array
                Array.from(waveform);
            """)
            
            # Convert JavaScript array to numpy array
            waveform = np.array(js_result, dtype=np.float32)
        else:
            # Fallback to our simplified encoding
            waveform = self.ggroid.encode_message(message)
        
        # Apply droid sound effects
        processed_waveform = self._apply_droid_effects(waveform)
        
        return processed_waveform
    
    def _apply_droid_effects(self, waveform: np.ndarray) -> np.ndarray:
        """
        Apply droid sound effects to GGWave output
        
        Args:
            waveform: GGWave encoded waveform
            
        Returns:
            Waveform with droid sound effects applied
        """
        # Convert to square wave with variable duty cycle
        # This is a simplification - in a real implementation,
        # you would need to extract the frequency components and
        # reconstruct the signal with square waves
        
        # For demonstration, we'll use the GGRoid warbling effect
        processed = self.ggroid._apply_warble(waveform)
        
        # Normalize
        processed = processed / np.max(np.abs(processed))
        
        return processed
    
    def send_message(self, message: str, protocol: str = "audible") -> None:
        """
        Encode and play a message with droid sound effects
        
        Args:
            message: Message to send
            protocol: GGWave protocol ("audible" or "ultrasound")
        """
        print(f"Sending message: {message}")
        
        # Encode message
        waveform = self.encode_message(message, protocol)
        
        # Play the waveform
        self._play_waveform(waveform)
    
    def _play_waveform(self, waveform: np.ndarray) -> None:
        """
        Play a waveform through the audio device
        
        Args:
            waveform: Audio waveform to play
        """
        # Open stream
        stream = self.audio.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=self.sample_rate,
            output=True
        )
        
        # Play the waveform
        stream.write(waveform.astype(np.float32).tobytes())
        
        # Close the stream
        stream.stop_stream()
        stream.close()
    
    def save_to_wav(self, message: str, filename: str, protocol: str = "audible") -> None:
        """
        Encode a message and save to WAV file
        
        Args:
            message: Message to encode
            filename: Output WAV filename
            protocol: GGWave protocol ("audible" or "ultrasound")
        """
        # Encode message
        waveform = self.encode_message(message, protocol)
        
        # Save to WAV file using GGRoid's save function
        self.ggroid.save_to_wav(waveform, filename)
        print(f"Saved to {filename}")


def main():
    """Command-line interface for GGWave integration"""
    parser = argparse.ArgumentParser(description="GGRoid + GGWave Integration")
    parser.add_argument("message", help="Message to send")
    parser.add_argument("--save", "-s", help="Save to WAV file")
    parser.add_argument("--protocol", "-p", default="audible", 
                       choices=["audible", "ultrasound"],
                       help="GGWave protocol")
    
    args = parser.parse_args()
    
    try:
        # Create GGWave wrapper
        ggwave = GGWaveWrapper()
        
        if args.save:
            # Save to WAV file
            ggwave.save_to_wav(args.message, args.save, args.protocol)
        else:
            # Send message
            ggwave.send_message(args.message, args.protocol)
    
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()