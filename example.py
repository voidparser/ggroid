#!/usr/bin/env python3
"""
GGRoid Example Script

This script demonstrates how to use GGRoid to generate Star Wars droid sounds.
"""

from src.ggroid import GGRoid

def demonstrate_basic_messages():
    """Demonstrate basic message generation"""
    print("\n=== Basic Message Examples ===")
    
    # Create GGRoid instance with moderate exaggeration
    ggroid = GGRoid(
        volume=0.7,
        duty_cycle=0.4,
        lfo_rate=15,
        exaggeration=0.6
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

def demonstrate_sound_effects():
    """Demonstrate different sound effects"""
    print("\n=== Sound Effect Examples ===")
    
    # Create GGRoid instance with high exaggeration
    ggroid = GGRoid(
        volume=0.7,
        duty_cycle=0.4,
        lfo_rate=15,
        exaggeration=0.8
    )
    
    # Define messages for each effect
    effect_examples = [
        ("normal", "Plain droid speech"),
        ("blatt", "Blatts and beeps!"),
        ("trill", "Excited trilling sounds!"),
        ("whistle", "High-pitched whistles"),
        ("scream", "Alarmed scream noises!"),
        ("happy", "Happy chirping tones"),
        ("sad", "Sad descending tones"),
        ("question", "Questioning upward tones?"),
        ("random", "Random mix of effects")
    ]
    
    # Generate and play each effect
    for effect, message in effect_examples:
        print(f"\nEffect: {effect} - '{message}'")
        
        # Play message with specified effect
        ggroid.say(message, effect=effect)
        
        # Wait for user
        input("Press Enter for next effect...")

def demonstrate_personality_messages():
    """Demonstrate droid personality in messages"""
    print("\n=== Droid Personality Examples ===")
    
    # Create GGRoid instance with high exaggeration
    ggroid = GGRoid(
        volume=0.7,
        duty_cycle=0.4,
        lfo_rate=15,
        exaggeration=0.9
    )
    
    # Example messages with different emotions
    messages = [
        "DANGER! IMPERIAL TROOPS DETECTED!",   # Alarmed
        "Hello C-3PO, how are you today?",     # Friendly
        "System malfunction detected...",      # Worried
        "Mission complete! Returning to base!" # Happy
    ]
    
    # Generate and play each message
    for i, message in enumerate(messages):
        print(f"\nPersonality Message {i+1}: {message}")
        
        # Play with personality enabled
        ggroid.say(message, add_personality=True)
        
        # Wait a bit between messages
        if i < len(messages) - 1:
            input("Press Enter for next message...")

def main():
    """Main function to demonstrate GGRoid features"""
    # Basic message examples
    demonstrate_basic_messages()
    
    # Ask user if they want to continue with more examples
    response = input("\nWould you like to hear examples of different sound effects? (y/n): ")
    if response.lower().startswith('y'):
        demonstrate_sound_effects()
    
    response = input("\nWould you like to hear examples with droid personality? (y/n): ")
    if response.lower().startswith('y'):
        demonstrate_personality_messages()
    
    print("\nDemo complete!")

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