#!/usr/bin/env python3
"""
GGRoid Droid Messenger

This script demonstrates using GGRoid for actual messaging between devices
by integrating with GGWave's data encoding/decoding capabilities but with
Star Wars droid sound aesthetics.
"""

import os
import argparse
import threading
import time
import numpy as np
import pyaudio
from typing import Optional, List, Dict, Any
from src.ggroid import GGRoid

class DroidMessenger:
    """Messaging system using GGRoid for droid-like sound transmission"""
    
    def __init__(
        self, 
        sample_rate: int = 48000,
        volume: float = 0.7,
        exaggeration: float = 0.6,
        effect: Optional[str] = None,
        add_personality: bool = True
    ):
        """
        Initialize the DroidMessenger
        
        Args:
            sample_rate: Audio sample rate
            volume: Output volume (0.0-1.0)
            exaggeration: Level of droid sound exaggeration (0.0-1.0)
            effect: Override sound effect
            add_personality: Whether to add droid personality sounds
        """
        # Create GGRoid instance
        self.ggroid = GGRoid(
            sample_rate=sample_rate,
            volume=volume,
            exaggeration=exaggeration
        )
        
        # Store settings
        self.effect = effect
        self.add_personality = add_personality
        self.sample_rate = sample_rate
        
        # Set up audio input/output
        self.audio = pyaudio.PyAudio()
        self.input_stream = None
        self.is_listening = False
        self.listen_thread = None
        
        # Callback function for received messages
        self.on_message_received = None
    
    def __del__(self):
        """Clean up resources"""
        self.stop_listening()
        if hasattr(self, 'audio'):
            self.audio.terminate()
    
    def send_message(self, message: str, save_to_file: Optional[str] = None):
        """
        Send a message with droid sound effects
        
        Args:
            message: Message to send
            save_to_file: If provided, save audio to this WAV file
        """
        print(f"Sending message: {message}")
        
        # Generate message audio using GGRoid
        self.ggroid.say(
            message=message,
            save_to_file=save_to_file,
            effect=self.effect,
            add_personality=self.add_personality
        )
    
    def _listen_callback(self, in_data, frame_count, time_info, status):
        """
        Callback for audio input stream
        
        This is a simplified version that just detects energy in the signal
        rather than actually decoding GGWave transmissions. In a real
        implementation, you would use GGWave's decoding capabilities.
        """
        if not self.is_listening:
            return (None, pyaudio.paComplete)
        
        # Convert input data to numpy array
        audio_data = np.frombuffer(in_data, dtype=np.float32)
        
        # Detect audio energy (simplified detection)
        energy = np.mean(np.abs(audio_data))
        
        # If energy exceeds threshold, simulate message reception
        # This is a simplified placeholder - real implementation would use GGWave
        if energy > 0.01:  # Arbitrary threshold
            if callable(self.on_message_received):
                # In a real implementation, would decode the actual message
                self.on_message_received("[Droid sounds detected]")
        
        return (None, pyaudio.paContinue)
    
    def start_listening(self, callback=None):
        """
        Start listening for incoming messages
        
        Args:
            callback: Function to call when a message is received
        """
        if self.is_listening:
            print("Already listening!")
            return
        
        # Set callback
        self.on_message_received = callback
        
        # Set listening flag
        self.is_listening = True
        
        # Create listening thread to avoid blocking
        self.listen_thread = threading.Thread(target=self._listening_thread)
        self.listen_thread.daemon = True
        self.listen_thread.start()
        
        print("Started listening for droid transmissions...")
    
    def _listening_thread(self):
        """Background thread for listening"""
        try:
            # Open audio input stream
            self.input_stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=1024,
                stream_callback=self._listen_callback
            )
            
            # Keep thread running while listening
            while self.is_listening:
                time.sleep(0.1)
                
        except Exception as e:
            print(f"Error in listening thread: {e}")
        finally:
            # Clean up
            if self.input_stream:
                self.input_stream.stop_stream()
                self.input_stream.close()
                self.input_stream = None
    
    def stop_listening(self):
        """Stop listening for incoming messages"""
        self.is_listening = False
        
        # Wait for thread to finish
        if self.listen_thread and self.listen_thread.is_alive():
            self.listen_thread.join(timeout=1.0)
            self.listen_thread = None
        
        print("Stopped listening.")


def interactive_mode():
    """Run interactive droid messenger interface"""
    print("\n=== R2-D2 Messenger - Interactive Mode ===")
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="R2-D2 Messenger")
    parser.add_argument("--volume", "-v", type=float, default=0.7, help="Volume (0.0-1.0)")
    parser.add_argument("--exaggeration", "-e", type=float, default=0.7, help="Exaggeration level (0.0-1.0)")
    parser.add_argument("--effect", choices=["normal", "blatt", "trill", "whistle", 
                                          "scream", "happy", "sad", "question", "random"],
                      help="Override sound effect")
    parser.add_argument("--no-personality", action="store_true", help="Disable droid personality")
    
    args = parser.parse_args()
    
    # Create messenger
    messenger = DroidMessenger(
        volume=args.volume,
        exaggeration=args.exaggeration,
        effect=args.effect,
        add_personality=not args.no_personality
    )
    
    # Define message received callback
    def on_message(message):
        print(f"\nReceived: {message}")
    
    # Command prompt
    try:
        print("\nCommands:")
        print("  send <message>  - Send a message with droid sounds")
        print("  listen          - Start listening for messages")
        print("  stop            - Stop listening")
        print("  save <file> <message> - Save message to WAV file")
        print("  quit            - Exit the program")
        print("\nEnter commands:")
        
        while True:
            try:
                command = input("\n> ").strip()
                
                if not command:
                    continue
                
                if command.lower() == "quit":
                    break
                    
                elif command.lower() == "listen":
                    messenger.start_listening(on_message)
                    
                elif command.lower() == "stop":
                    messenger.stop_listening()
                    
                elif command.lower().startswith("send "):
                    message = command[5:].strip()
                    if message:
                        messenger.send_message(message)
                    else:
                        print("Error: No message specified")
                        
                elif command.lower().startswith("save "):
                    parts = command[5:].strip().split(" ", 1)
                    if len(parts) == 2:
                        filename, message = parts
                        messenger.send_message(message, save_to_file=filename)
                    else:
                        print("Error: Format is 'save <file> <message>'")
                        
                else:
                    print("Unknown command. Try 'send', 'listen', 'stop', 'save', or 'quit'.")
                    
            except KeyboardInterrupt:
                break
                
    finally:
        # Clean up
        messenger.stop_listening()
        print("\nExiting R2-D2 Messenger.")


if __name__ == "__main__":
    try:
        interactive_mode()
    except KeyboardInterrupt:
        print("\nProgram interrupted. Exiting...")
    except Exception as e:
        print(f"\nError: {e}")