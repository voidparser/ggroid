# GGRoid Effect Examples

This document provides examples of how to use GGRoid with various sound effects and exaggeration levels to create Star Wars droid-like sounds.

## Basic Command Format

```bash
python src/ggroid.py "Your message here" [options]
```

## Effect Examples

Each sound effect creates a different droid sound characteristic:

### Blatt Effect (fart-like sounds)

```bash
# Basic blatt effect
python src/ggroid.py "Systems malfunctioning" --effect blatt

# Exaggerated blatt effect
python src/ggroid.py "Critical error detected" --effect blatt --exaggeration 0.9

# Subtle blatt effect
python src/ggroid.py "Minor issue found" --effect blatt --exaggeration 0.3
```

### Trill Effect (excited chirping)

```bash
# Basic trill effect
python src/ggroid.py "Mission accomplished!" --effect trill

# Highly excited trill
python src/ggroid.py "We did it!" --effect trill --exaggeration 1.0

# Subtle trill
python src/ggroid.py "Task complete" --effect trill --exaggeration 0.4
```

### Whistle Effect (high-pitched sounds)

```bash
# Basic whistle
python src/ggroid.py "Look over there" --effect whistle

# Sharp whistle
python src/ggroid.py "Attention required!" --effect whistle --exaggeration 0.8

# Gentle whistle
python src/ggroid.py "Interesting data found" --effect whistle --exaggeration 0.3
```

### Scream Effect (alarmed sounds)

```bash
# Basic scream
python src/ggroid.py "Danger detected!" --effect scream

# Panicked scream
python src/ggroid.py "IMPERIAL TROOPS!" --effect scream --exaggeration 1.0

# Mild concern
python src/ggroid.py "Caution advised" --effect scream --exaggeration 0.4
```

### Happy Effect (cheerful beeps)

```bash
# Basic happy sounds
python src/ggroid.py "Hello, C3PO!" --effect happy

# Very happy sounds
python src/ggroid.py "Master Luke is back!" --effect happy --exaggeration 0.9

# Mildly happy sounds
python src/ggroid.py "Systems optimal" --effect happy --exaggeration 0.4
```

### Sad Effect (descending tones)

```bash
# Basic sad sounds
python src/ggroid.py "Mission failed" --effect sad

# Very sad sounds
python src/ggroid.py "Master Luke is gone" --effect sad --exaggeration 0.9

# Slightly disappointed sounds
python src/ggroid.py "Suboptimal outcome" --effect sad --exaggeration 0.4
```

### Question Effect (rising tones)

```bash
# Basic question
python src/ggroid.py "Where is Luke?" --effect question

# Very inquisitive
python src/ggroid.py "What's happening?" --effect question --exaggeration 0.9

# Mildly curious
python src/ggroid.py "Status update?" --effect question --exaggeration 0.4
```

### Random Effect (mix of sounds)

```bash
# Random mix of effects
python src/ggroid.py "Random droid noises" --effect random

# Highly exaggerated random effects
python src/ggroid.py "Chaotic droid sounds" --effect random --exaggeration 1.0
```

## Adjusting Other Parameters

### LFO Rate (warbling effect)

The LFO (Low Frequency Oscillator) rate controls how quickly the warbling effect occurs:

```bash
# Fast warbling
python src/ggroid.py "Fast warble test" --lfo 20

# Slow warbling
python src/ggroid.py "Slow warble test" --lfo 5
```

### Duty Cycle (waveform shape)

The duty cycle affects the harmonic content of the sound:

```bash
# Sharp, thin sound
python src/ggroid.py "Sharp sound test" --duty 0.3

# Fuller, wider sound
python src/ggroid.py "Fuller sound test" --duty 0.7
```

## Personality and Combined Effects

### With/Without Personality

```bash
# With personality (intro/outro sounds)
python src/ggroid.py "Hello, I am an astromech droid"

# Without personality
python src/ggroid.py "Plain data transmission" --no-personality
```

### Complex Examples

```bash
# Excited, fast, exaggerated trill
python src/ggroid.py "WE FOUND THE REBEL BASE!" --effect trill --exaggeration 1.0 --lfo 18

# Deep, slow, sad sounds
python src/ggroid.py "We are doomed..." --effect sad --exaggeration 0.8 --lfo 7 --duty 0.6

# Distressed alarm with high exaggeration
python src/ggroid.py "IMPERIAL STAR DESTROYER APPROACHING!" --effect scream --exaggeration 0.9 --lfo 15
```

## Saving Output to File

All examples can be saved to WAV files by adding the `--save` option:

```bash
# Save a trill effect to file
python src/ggroid.py "Recording droid sounds" --effect trill --save r2d2_trill.wav

# Save an exaggerated scream to file
python src/ggroid.py "Danger alert!" --effect scream --exaggeration 0.9 --save r2d2_alarm.wav
```

## Example Usage in a Python Script

```python
from src.ggroid import GGRoid

# Create a GGRoid instance with custom parameters
ggroid = GGRoid(
    volume=0.7,
    duty_cycle=0.5,
    lfo_rate=15,
    exaggeration=0.8
)

# Generate a standard message
ggroid.say("Hello, I am R2-D2")

# Generate an alarmed message with scream effect
ggroid.say("DANGER DETECTED!", effect="scream")

# Generate a happy message with increased exaggeration
ggroid.say("Mission accomplished!", effect="happy")

# Save a sad message to file
ggroid.say("Luke has left...", effect="sad", save_to_file="r2d2_sad.wav")

# Create custom mappings for character types
custom_mapping = {
    'uppercase': 'scream',  # UPPERCASE letters get scream effect
    'lowercase': 'normal',  # lowercase get normal sounds
    'number': 'happy',      # Numbers get happy sounds
    'punctuation': 'trill', # Punctuation gets trills
    'whitespace': 'whistle' # Spaces get whistles
}

# Use custom character-to-effect mapping
ggroid.say("R2D2 says HELLO!", effect_mapping=custom_mapping)
```