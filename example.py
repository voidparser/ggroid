#!/usr/bin/env python3
"""
GGRoid Example Script

This script demonstrates how to use GGRoid to generate Star Wars droid sounds.
"""

from src.ggroid import GGRoid

def main():
    # Create GGRoid instance
    ggroid = GGRoid(
        volume=0.7,
        duty_cycle=0.4,
        lfo_rate=15
    )
    
    # Example messages
    messages = [
        "Hello, I am R2-D2",
        "This is a secret message",
        "May the Force be with you"
    ]
    
    # Generate and play each message
    for i, message in enumerate(messages):
        print(f"\nMessage {i+1}: {message}")
        
        # Play the message with droid sound effects
        ggroid.say(message)
        
        # Wait a bit between messages
        if i < len(messages) - 1:
            input("Press Enter for next message...")

if __name__ == "__main__":
    print("GGRoid - Star Wars Droid Sound Generator")
    print("----------------------------------------")
    print("This example demonstrates R2-D2 style sound generation.")
    
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        print(f"\nError: {e}")