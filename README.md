# GGRoid: Star Wars Droid Sound Modulation

GGRoid enhances the GGWave protocol with Star Wars droid-like sound aesthetics. This project modifies the underlying sound characteristics of GGWave to emulate the signature sounds of droids like R2-D2 and BB-8 while maintaining data transmission functionality.

## Features

- **Droid-Like Frequency Range**: Adjusts GGWave's base frequencies to span 300Hz to 3kHz, matching R2-D2's characteristic sound profile
- **Variable-Duty-Cycle Square Waves**: Replaces GGWave's sine waves with variable-duty-cycle square waves (30–70%) to emulate the "gritty" texture of droid sounds
- **Warbling Effect**: Implements a low-frequency oscillator (LFO) modulating amplitude (5–20 Hz) to replicate the "warbling" effect heard in R2-D2's speech
- **Compatible with GGWave**: Maintains compatibility with the original GGWave protocol for data transmission

## Implementation

GGRoid is implemented as a Python wrapper around the GGWave JavaScript library, allowing it to be used in web applications that require droid-like sound aesthetics for data transmission.

## Dependencies

- Python 3.6+
- NumPy
- SciPy
- PyAudio
- GGWave

## Getting Started

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run the example script: `python example.py`

## Examples

The `examples` directory contains sample code demonstrating how to use GGRoid for various applications.

## References

- [GGWave Protocol](https://github.com/ggerganov/ggwave)
- [Star Wars Droid Sound Analysis](https://www.samplescience.ca/2018/09/how-to-make-r2d2-sounds.html)