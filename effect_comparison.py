#!/usr/bin/env python3
"""
GGRoid Effect Comparison Script

This script demonstrates the different sound effects and exaggeration levels 
available in GGRoid for creating Star Wars droid sounds.
"""

import time
import argparse
from src.ggroid import GGRoid

# Default parameters
DEFAULT_VOLUME = 0.7
DEFAULT_MESSAGE = "R2-D2 is transmitting data"

def compare_effects(volume=DEFAULT_VOLUME, message=DEFAULT_MESSAGE):
    """Compare all available sound effects"""
    print("\n=== Comparing Different Sound Effects ===")
    print(f"Message: \"{message}\"")
    print("Volume:", volume)
    
    # Create GGRoid instance with moderate exaggeration
    ggroid = GGRoid(
        volume=volume,
        exaggeration=0.7
    )
    
    # List of effects to demonstrate
    effects = [
        "normal", "blatt", "trill", "whistle", 
        "scream", "happy", "sad", "question"
    ]
    
    # Play each effect
    for effect in effects:
        print(f"\nEffect: {effect}")
        
        # Short pause before playing
        time.sleep(0.5)
        
        # Play message with this effect
        ggroid.say(message, effect=effect)
        
        # Wait for user input before next effect
        input("Press Enter for next effect...")

def compare_exaggeration_levels(effect="trill", volume=DEFAULT_VOLUME, message=DEFAULT_MESSAGE):
    """Compare different exaggeration levels for a specific effect"""
    print(f"\n=== Comparing Exaggeration Levels for '{effect}' Effect ===")
    print(f"Message: \"{message}\"")
    print("Volume:", volume)
    
    # Exaggeration levels to demonstrate
    levels = [0.0, 0.3, 0.6, 0.9]
    
    for level in levels:
        # Create new GGRoid instance with this exaggeration level
        ggroid = GGRoid(
            volume=volume,
            exaggeration=level
        )
        
        print(f"\nExaggeration level: {level}")
        
        # Short pause before playing
        time.sleep(0.5)
        
        # Play message with this exaggeration level
        ggroid.say(message, effect=effect)
        
        # Wait for user input before next level
        input("Press Enter for next exaggeration level...")

def demonstrate_character_effects(volume=DEFAULT_VOLUME):
    """Demonstrate how different character types get different effects"""
    print("\n=== Demonstrating Character-Specific Effects ===")
    print("Volume:", volume)
    
    # Create GGRoid instance with high exaggeration
    ggroid = GGRoid(
        volume=volume,
        exaggeration=0.8
    )
    
    # Messages showcasing different character types
    messages = [
        "UPPERCASE gets trills",
        "lowercase gets normal sounds",
        "1234 numbers get blatts",
        "!?.,:; punctuation gets whistles",
        "Mixed CASE with 123 and !?."
    ]
    
    # Play each message
    for msg in messages:
        print(f"\nMessage: \"{msg}\"")
        
        # Short pause before playing
        time.sleep(0.5)
        
        # Play message with default character mapping
        ggroid.say(msg)
        
        # Wait for user input before next message
        input("Press Enter for next message...")

def demonstrate_personality(volume=DEFAULT_VOLUME):
    """Demonstrate personality features"""
    print("\n=== Demonstrating Personality Features ===")
    print("Volume:", volume)
    
    # Create GGRoid instance with high exaggeration
    ggroid = GGRoid(
        volume=volume,
        exaggeration=0.8
    )
    
    # Play message with personality
    print("\nWith personality (intro/outro sounds):")
    ggroid.say("Transmitting important message to Rebel Alliance", add_personality=True)
    
    # Wait for user input
    input("Press Enter to hear without personality...")
    
    # Play message without personality
    print("\nWithout personality:")
    ggroid.say("Transmitting important message to Rebel Alliance", add_personality=False)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="GGRoid Effect Comparison Demo")
    parser.add_argument("--volume", "-v", type=float, default=DEFAULT_VOLUME, help="Volume (0.0-1.0)")
    parser.add_argument("--message", "-m", default=DEFAULT_MESSAGE, help="Custom message to use")
    parser.add_argument("--effect", "-e", default="trill", 
                        choices=["normal", "blatt", "trill", "whistle", "scream", "happy", "sad", "question"],
                        help="Effect to use for exaggeration comparison")
    
    # Parse arguments
    args = parser.parse_args()
    
    print("GGRoid - Star Wars Droid Sound Effect Comparison")
    print("================================================")
    
    # Menu loop
    while True:
        print("\nDemonstration Options:")
        print("1. Compare different sound effects")
        print("2. Compare exaggeration levels")
        print("3. Demonstrate character-specific effects")
        print("4. Demonstrate personality features")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ")
        
        if choice == "1":
            compare_effects(args.volume, args.message)
        elif choice == "2":
            compare_exaggeration_levels(args.effect, args.volume, args.message)
        elif choice == "3":
            demonstrate_character_effects(args.volume)
        elif choice == "4":
            demonstrate_personality(args.volume)
        elif choice == "5":
            print("\nExiting demo. Thank you!")
            break
        else:
            print("Invalid choice. Please enter a number from 1 to 5.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted. Exiting...")
    except Exception as e:
        print(f"\nError: {e}")