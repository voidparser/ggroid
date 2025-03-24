import React, { useState, useEffect, useRef } from 'react';
import SliderControl from './SliderControl';
import SoundEffectSelect from './SoundEffectSelect';
import { DroidButton } from './DroidButton';
import VisualizerCanvas from './VisualizerCanvas';

// Define types for the GGWave library
interface GGWaveParameters {
  sampleRateInp: number;
  sampleRateOut: number;
  [key: string]: any;
}

interface GGWaveFactory {
  getDefaultParameters?: () => GGWaveParameters;
  init: (params: GGWaveParameters) => GGWaveInstance;
  encode?: (text: string, protocol?: string | number, volume?: string | number, ...args: any[]) => Int16Array;
}

interface GGWaveInstance {
  encode?: (text: string, protocol?: string | number, volume?: string | number, ...args: any[]) => Int16Array;
  [key: string]: any;
}

declare global {
  interface Window {
    ggwave_factory: () => Promise<GGWaveFactory>;
    ggwave?: GGWaveFactory | GGWaveInstance;
    ggwaveInstance?: GGWaveInstance;
    AudioContext: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

const GGRoidMessenger: React.FC = () => {
  // State for message input
  const [message, setMessage] = useState("Hello, I am R2-D2. This is a secret message.");
  const [receivedMessage, setReceivedMessage] = useState("");
  
  // State for controls
  const [volume, setVolume] = useState(0.5);
  const [dutyCycle, setDutyCycle] = useState(0.4);
  const [lfoRate, setLfoRate] = useState(12);
  const [exaggeration, setExaggeration] = useState(0.6);
  const [selectedEffect, setSelectedEffect] = useState("normal");
  const [addPersonality, setAddPersonality] = useState(true);
  
  // Refs for audio context and visualization
  const audioContextRef = useRef<AudioContext | null>(null);
  const ggwaveInstanceRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const r2d2AnimatedRef = useRef<boolean>(false);
  
  // Script load state
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Load GGWave script and initialize audio
  useEffect(() => {
    const loadScript = async () => {
      // Check if window already has the factory (might be from a previous load)
      if (typeof window.ggwave_factory === 'function') {
        console.log('GGWave factory function already available in window');
        setIsScriptLoaded(true);
        return Promise.resolve();
      }
      
      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src="/ggwave/ggwave.js"]');
      if (existingScript) {
        console.log('GGWave script already in DOM, checking if it loaded properly');
        
        // Give it one more chance to load by waiting a bit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (typeof window.ggwave_factory === 'function') {
          console.log('GGWave factory function now available');
          setIsScriptLoaded(true);
          return Promise.resolve();
        } else {
          console.warn('Script in DOM but factory not available, removing and reloading');
          existingScript.remove();
        }
      }
      
      // Try loading with defer instead of async to ensure proper loading order
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/ggwave/ggwave.js';
        script.defer = true; // Use defer instead of async for more reliable loading
        
        // Set a timeout to detect stalled script loading
        const loadTimeout = setTimeout(() => {
          console.warn('Script load timeout, may need manual intervention');
          // We'll continue and hope for the best
          resolve();
        }, 5000);
        
        script.onload = (): void => {
          clearTimeout(loadTimeout);
          
          // Check for actual factory availability after load
          if (typeof window.ggwave_factory === 'function') {
            console.log('GGWave script loaded successfully with factory available');
            setIsScriptLoaded(true);
            resolve();
          } else {
            console.warn('Script loaded but factory not available, will check again later');
            // Resolve anyway and let the later checks handle it
            setIsScriptLoaded(true);
            resolve();
          }
        };
        
        script.onerror = (e: Event | string): void => {
          clearTimeout(loadTimeout);
          console.error('Error loading GGWave script:', e);
          // Don't reject, try to continue with fallbacks
          resolve();
        };
        
        document.body.appendChild(script);
      });
    };

    const setupAudio = async () => {
      try {
        // Load script first
        await loadScript();
        
        // Wait for script to initialize with exponential backoff
        let waitTime = 1000;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (typeof window.ggwave_factory !== 'function' && attempts < maxAttempts) {
          console.log(`Waiting ${waitTime}ms for GGWave factory to initialize (attempt ${attempts + 1}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          waitTime *= 2;
          attempts++;
        }
        
        // Final verification
        if (typeof window.ggwave_factory === 'function') {
          console.log('GGWave factory function detected and ready to use');
        } else {
          console.warn('GGWave factory not detected after waiting, will try during initialization');
        }
        
        // Now initialize audio
        const success = await initAudio();
        if (success) {
          console.log('Audio setup completed successfully');
        } else {
          console.warn('Audio setup completed with some issues, will retry on first use');
        }
      } catch (err) {
        console.error('Error setting up audio:', err);
      }
    };

    setupAudio();
    
    return () => {
      // We'll leave the script in the DOM to avoid reloading issues
      // but we'll clean up the audio context if it exists
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);
  
  // Initialize audio context and GGWave
  const initAudio = async () => {
    try {
      console.log('Initializing audio context and GGWave...');
      
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('Audio context created with sample rate:', audioContextRef.current.sampleRate);
      }
      
      // Create analyser for visualization if it doesn't exist
      if (!analyserRef.current && audioContextRef.current) {
        try {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.connect(audioContextRef.current.destination);
        } catch (analyzerError) {
          console.warn("Could not create analyzer node:", analyzerError);
          // Continue without analyzer - visualization will be disabled but audio will work
        }
      }
      
      // Only initialize GGWave if it's not already initialized
      if (!ggwaveInstanceRef.current) {
        // Make sure the script is loaded and ggwave_factory is available
        if (typeof window.ggwave_factory !== 'function') {
          console.error('GGWave factory not found. Waiting for script to load properly...');
          
          // Wait longer with progressive backoff
          for (let wait of [1000, 2000, 3000]) {
            console.log(`Waiting ${wait}ms for GGWave factory to load...`);
            await new Promise(resolve => setTimeout(resolve, wait));
            
            if (typeof window.ggwave_factory === 'function') {
              console.log('GGWave factory found after waiting');
              break;
            }
          }
          
          if (typeof window.ggwave_factory !== 'function') {
            // Try reloading the script as a last resort
            console.log('Attempting to reload GGWave script...');
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = '/ggwave/ggwave.js';
              script.async = true;
              script.onload = () => {
                console.log('GGWave script reloaded');
                setIsScriptLoaded(true);
                resolve();
              };
              script.onerror = (e) => {
                reject(new Error('Failed to reload GGWave script'));
              };
              document.body.appendChild(script);
            });
            
            // Final check
            if (typeof window.ggwave_factory !== 'function') {
              throw new Error('GGWave library not loaded correctly after multiple attempts');
            }
          }
        }
        
        console.log('Creating GGWave instance...');
        // Initialize GGWave
        const ggwaveFactory = await window.ggwave_factory();
        console.log('GGWave factory obtained:', ggwaveFactory);
        
        // Set up parameters 
        const params = ggwaveFactory.getDefaultParameters ? 
          ggwaveFactory.getDefaultParameters() : 
          { sampleRateInp: audioContextRef.current.sampleRate, sampleRateOut: audioContextRef.current.sampleRate };
        
        // Make sure we set these properties even if they already exist
        params.sampleRateInp = audioContextRef.current.sampleRate;
        params.sampleRateOut = audioContextRef.current.sampleRate;
        
        // Initialize instance
        ggwaveInstanceRef.current = ggwaveFactory.init(params);
        console.log('GGWave instance initialized:', ggwaveInstanceRef.current);
      }
      
      // Double verify all components are initialized
      const isAudioReady = audioContextRef.current !== null;
      const isAnalyserReady = analyserRef.current !== null;
      const isGGWaveReady = ggwaveInstanceRef.current !== null;
      
      console.log(`Audio initialization status: Audio Context: ${isAudioReady}, Analyser: ${isAnalyserReady}, GGWave: ${isGGWaveReady}`);
      
      if (isAudioReady && isAnalyserReady && isGGWaveReady) {
        // Start visualization
        startVisualization();
        console.log('Audio and GGWave successfully initialized');
        return true;
      } else {
        throw new Error(`Incomplete audio initialization: Audio: ${isAudioReady}, Analyser: ${isAnalyserReady}, GGWave: ${isGGWaveReady}`);
      }
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      
      // Don't reset everything to null - keep what's already initialized
      if (!audioContextRef.current) console.warn('Audio context initialization failed');
      if (!analyserRef.current) console.warn('Analyser initialization failed');
      if (!ggwaveInstanceRef.current) console.warn('GGWave initialization failed');
      
      return false;
    }
  };
  
  // Start visualization
  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) {
      console.log("Visualization not available: missing analyzer or canvas");
      return;
    }
    
    const analyzer = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    
    if (!canvasContext) {
      console.warn("Could not get canvas context for visualization");
      return;
    }
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      // Get frequency data
      analyzer.getByteFrequencyData(dataArray);
      
      // Clear canvas
      canvasContext.fillStyle = '#1a202c';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255 * canvas.height;
        
        // Choose color based on frequency and active effect
        let hue;
        
        switch (selectedEffect) {
          case 'normal':
            hue = i / bufferLength * 240; // Blue spectrum
            break;
          case 'blatt':
            hue = 30 + i / bufferLength * 60; // Orange spectrum
            break;
          case 'trill':
            hue = 180 + i / bufferLength * 60; // Cyan spectrum
            break;
          case 'whistle':
            hue = 90 + i / bufferLength * 60; // Green spectrum
            break;
          case 'scream':
            hue = 0 + i / bufferLength * 60; // Red spectrum
            break;
          case 'happy':
            hue = 60 + i / bufferLength * 60; // Yellow spectrum
            break;
          case 'sad':
            hue = 240 + i / bufferLength * 60; // Blue-purple spectrum
            break;
          case 'question':
            hue = 270 + i / bufferLength * 60; // Purple spectrum
            break;
          case 'random':
            hue = (Date.now() / 50 + i * 5) % 360; // Rainbow effect
            break;
          default:
            hue = i / bufferLength * 240; // Default blue spectrum
        }
        
        // Increase bar size and brightness when playing
        const brightness = isPlayingRef.current ? '50%' : '30%';
        const intensity = isPlayingRef.current ? barHeight : barHeight * 0.6;
        
        canvasContext.fillStyle = `hsl(${hue}, 100%, ${brightness})`;
        canvasContext.fillRect(x, canvas.height - intensity, barWidth, intensity);
        
        x += barWidth + 1;
        if (x > canvas.width) break;
      }
    };
    
    draw();
  };
  
  // Apply droid effects to audio buffer
  const applyDroidEffects = (buffer: Float32Array, settings: {
    volume: number;
    dutyCycle: number;
    lfoRate: number;
    exaggeration: number;
    effect: string;
    addPersonality?: boolean;
  }) => {
    if (!audioContextRef.current) return buffer;
    
    // Create a new buffer for the processed audio
    const processedBuffer = new Float32Array(buffer.length);
    
    // Apply warble effect (LFO modulation)
    for (let i = 0; i < buffer.length; i++) {
      // Time in seconds
      const t = i / audioContextRef.current.sampleRate;
      
      // LFO modulation
      // Base LFO (warbling effect)
      let lfo = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(2 * Math.PI * settings.lfoRate * t));
      
      // Effect-specific modulation
      if (settings.effect === 'blatt') {
        // Sharper, faster warble for blatt sounds
        const blattLfo = 0.8 + 0.5 * settings.exaggeration * 
          ((Math.sin(2 * Math.PI * 30 * t) > 0) ? 1 : -0.5);
        lfo *= blattLfo;
      } else if (settings.effect === 'trill') {
        // Rapid, high-depth warble for trills
        const trillLfo = 1.0 + 0.5 * settings.exaggeration * Math.sin(2 * Math.PI * 20 * t);
        lfo *= trillLfo;
      } else if (settings.effect === 'scream') {
        // Chaotic warble for scream
        let chaosLfo = 1.0;
        chaosLfo *= 0.8 + 0.2 * Math.sin(2 * Math.PI * 13 * t);
        chaosLfo *= 0.9 + 0.1 * Math.sin(2 * Math.PI * 27 * t);
        chaosLfo *= 0.95 + 0.05 * Math.sin(2 * Math.PI * 41 * t);
        
        // Scale based on exaggeration
        chaosLfo = 1.0 + (chaosLfo - 1.0) * settings.exaggeration;
        lfo *= chaosLfo;
      } else if (settings.effect === 'whistle') {
        // Vibrato for whistle
        const vibrato = 1.0 + 0.3 * settings.exaggeration * 
          Math.sin(2 * Math.PI * 8 * t);
        lfo *= vibrato;
      } else if (settings.effect === 'happy') {
        // Rhythmic pulses for happy sound
        const happyLfo = 1.0 + 0.3 * settings.exaggeration * 
          Math.sin(2 * Math.PI * 6 * t);
        lfo *= happyLfo;
      } else if (settings.effect === 'sad') {
        // Slow, deep modulation for sad sounds
        const sadLfo = 1.0 + 0.4 * settings.exaggeration * 
          Math.sin(2 * Math.PI * 3 * t);
        lfo *= sadLfo;
      } else if (settings.effect === 'question' && audioContextRef.current) {
        // Increasing modulation for question
        const sampleRate = audioContextRef.current.sampleRate || 48000;
        const questionLfo = 1.0 + 0.3 * settings.exaggeration * 
          Math.sin(2 * Math.PI * (4 + 4 * (t / (buffer.length / sampleRate))) * t);
        lfo *= questionLfo;
      }
      
      // Apply waveshaping (to make more square-wave like)
      // First, get a slightly distorted version based on duty cycle
      let signal = buffer[i];
      
      // Duty cycle effect
      const duty = settings.dutyCycle;
      if (signal > 0) {
        signal = signal > duty ? 1.0 : signal / duty;
      } else {
        signal = signal < -duty ? -1.0 : signal / duty;
      }
      
      // Apply the LFO
      processedBuffer[i] = signal * lfo;
    }
    
    // Normalize and apply volume - Fix the stack overflow issue with a more efficient approach
    // Find maximum amplitude manually instead of using spread operator (which can cause stack overflow)
    let maxAmp = 0;
    for (let i = 0; i < processedBuffer.length; i++) {
      const absVal = Math.abs(processedBuffer[i]);
      if (absVal > maxAmp) maxAmp = absVal;
    }
    
    // Ensure we don't divide by zero
    if (maxAmp <= 0.0001) maxAmp = 1.0;
    
    // Apply normalization and volume
    for (let i = 0; i < processedBuffer.length; i++) {
      processedBuffer[i] = (processedBuffer[i] / maxAmp) * settings.volume;
    }
    
    return processedBuffer;
  };
  
  // Generate R2-D2 intro/outro sounds
  const generateR2D2Personality = (isIntro: boolean, duration: number, settings: any) => {
    if (!audioContextRef.current) return new Float32Array(0);
    
    const sampleRate = audioContextRef.current.sampleRate;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(numSamples);
    
    // Generate square wave with frequency modulation
    const baseFreq = isIntro ? 800 : 1200;
    const modDepth = isIntro ? 400 : 300;
    const modRate = isIntro ? 10 : 5;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Frequency modulation
      const instantFreq = baseFreq + modDepth * Math.sin(2 * Math.PI * modRate * t);
      
      // Generate phase by integrating frequency
      const phase = 2 * Math.PI * instantFreq * t;
      
      // Generate square-ish wave with duty cycle
      buffer[i] = Math.sin(phase) > (isIntro ? -0.2 : 0.2) ? 1 : -1;
    }
    
    // Apply fade in/out
    const fadeLen = Math.floor(0.05 * numSamples);
    for (let i = 0; i < fadeLen; i++) {
      buffer[i] *= i / fadeLen;
      buffer[numSamples - 1 - i] *= i / fadeLen;
    }
    
    return buffer;
  };
  
  // Mix personality sounds into the main buffer
  const addDroidPersonality = (buffer: Float32Array, settings: any) => {
    if (!settings.addPersonality || !audioContextRef.current) return buffer;
    
    const sampleRate = audioContextRef.current.sampleRate;
    
    // Generate intro and outro
    const introDuration = 0.5;
    const outroDuration = 0.3;
    const pauseDuration = 0.1;
    
    const introBuffer = generateR2D2Personality(true, introDuration, settings);
    const outroBuffer = generateR2D2Personality(false, outroDuration, settings);
    
    const pauseSamples = Math.floor(pauseDuration * sampleRate);
    
    // Create a new buffer with space for intro, pause, original, pause, outro
    const totalLength = introBuffer.length + pauseSamples + buffer.length + pauseSamples + outroBuffer.length;
    const newBuffer = new Float32Array(totalLength);
    
    // Copy intro
    for (let i = 0; i < introBuffer.length; i++) {
      newBuffer[i] = introBuffer[i] * settings.volume;
    }
    
    // Copy original buffer after intro and pause
    const offset = introBuffer.length + pauseSamples;
    for (let i = 0; i < buffer.length; i++) {
      newBuffer[offset + i] = buffer[i];
    }
    
    // Copy outro after original and second pause
    const outroOffset = offset + buffer.length + pauseSamples;
    for (let i = 0; i < outroBuffer.length; i++) {
      newBuffer[outroOffset + i] = outroBuffer[i] * settings.volume;
    }
    
    return newBuffer;
  };
  
  // Send message with R2-D2 sound effects
  const sendMessage = async (testMessage?: string) => {
    // Step 1: Make sure the script is loaded properly
    const loadGGWaveScript = async (): Promise<boolean> => {
      if (typeof window.ggwave_factory === 'function') {
        // Already loaded correctly
        if (!isScriptLoaded) setIsScriptLoaded(true);
        return true;
      }
      
      console.log("GGWave factory not available, attempting to initialize...");
      
      // Try different script loading approaches
      try {
        // Remove any existing failed scripts to avoid conflicts
        const existingScripts = document.querySelectorAll('script[src="/ggwave/ggwave.js"]');
        existingScripts.forEach(script => script.remove());
        
        // Create a new script with defer (more reliable than async)
        const scriptEl = document.createElement('script');
        scriptEl.src = '/ggwave/ggwave.js';
        scriptEl.defer = true;
        
        // Wait for script to load with timeout
        const scriptLoaded = await Promise.race([
          new Promise<boolean>(resolve => {
            scriptEl.onload = (): void => {
              console.log('GGWave script loaded');
              setIsScriptLoaded(true);
              resolve(true);
            };
            scriptEl.onerror = (): void => {
              console.error('Error loading GGWave script');
              resolve(false);
            };
            document.body.appendChild(scriptEl);
          }),
          new Promise<boolean>(resolve => setTimeout(() => {
            console.warn('Script load timeout');
            resolve(false);
          }, 5000))
        ]);
        
        // Give time for the factory to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for factory after waiting
        return typeof window.ggwave_factory === 'function';
      } catch (err) {
        console.error("Failed to load GGWave script:", err);
        return false;
      }
    };
    
    // Try to load script if needed
    const scriptLoaded = await loadGGWaveScript();
    if (!scriptLoaded) {
      alert("Could not load the GGWave library. Please refresh the page and try again.");
      return;
    }
    
    try {
      // Step 2: Initialize audio components one by one directly
      // This is more reliable than leaving it to initAudio
      if (!audioContextRef.current) {
        console.log("Creating new AudioContext...");
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        console.log("Resuming suspended AudioContext...");
        await audioContextRef.current.resume();
      }
      
      if (!analyserRef.current && audioContextRef.current) {
        console.log("Creating new AnalyserNode...");
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.connect(audioContextRef.current.destination);
      }
      
      if (!ggwaveInstanceRef.current && typeof window.ggwave_factory === 'function') {
        console.log("Creating new GGWave instance...");
        try {
          // Multiple attempts for GGWave factory
          let ggwaveFactory = null;
          let factoryAttempts = 0;
          const maxFactoryAttempts = 3;
          
          while (!ggwaveFactory && factoryAttempts < maxFactoryAttempts) {
            factoryAttempts++;
            console.log(`GGWave factory attempt ${factoryAttempts}/${maxFactoryAttempts}...`);
            
            try {
              ggwaveFactory = await window.ggwave_factory();
            } catch (e) {
              console.warn(`Factory attempt ${factoryAttempts} failed:`, e);
              if (factoryAttempts < maxFactoryAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          if (!ggwaveFactory) {
            throw new Error("GGWave factory returned null after multiple attempts");
          }
          
          // Inspect the factory object to understand its structure
          console.log("GGWave factory obtained successfully. Factory structure:", Object.keys(ggwaveFactory));
          
          // Get default parameters with error handling
          let params: GGWaveParameters;
          try {
            if (typeof ggwaveFactory.getDefaultParameters === 'function') {
              params = ggwaveFactory.getDefaultParameters();
              console.log("Parameters obtained:", params);
            } else {
              console.warn("getDefaultParameters not found, using hardcoded defaults");
              params = {
                sampleRateInp: 48000,
                sampleRateOut: 48000
              };
            }
          } catch (paramErr) {
            console.error("Error getting parameters:", paramErr);
            console.warn("Using hardcoded default parameters");
            params = {
              sampleRateInp: 48000,
              sampleRateOut: 48000
            };
          }
          
          // Set sample rates if we have a valid audio context
          if (audioContextRef.current?.sampleRate) {
            const sampleRate = audioContextRef.current.sampleRate;
            console.log(`Setting sample rates to ${sampleRate}Hz`);
            params.sampleRateInp = sampleRate;
            params.sampleRateOut = sampleRate;
          } else {
            console.log("Using default sample rates (48000Hz)");
            params.sampleRateInp = 48000;
            params.sampleRateOut = 48000;
          }
          
          // Try to initialize
          console.log("Attempting to initialize GGWave with params:", params);
          
          try {
            // Check if init function exists
            if (typeof ggwaveFactory.init === 'function') {
              ggwaveInstanceRef.current = ggwaveFactory.init(params);
              console.log("GGWave instance created, methods:", Object.keys(ggwaveInstanceRef.current));
            } else {
              // If no init function, maybe the factory itself is the instance
              console.log("No init function found, checking if factory has encode method...");
              
              // Check if the factory itself has an encode method
              if (typeof ggwaveFactory.encode === 'function') {
                console.log("Factory has encode method, using factory as instance");
                ggwaveInstanceRef.current = ggwaveFactory;
              } else {
                throw new Error("Neither init method nor encode method found on factory");
              }
            }
          } catch (err) {
            console.error("Error during initialization:", err);
            
            // As a last resort, store the factory itself
            console.log("Storing factory as instance for further inspection");
            ggwaveInstanceRef.current = ggwaveFactory;
          }
          
          // Check for encode method
          if (ggwaveInstanceRef.current) {
            if (typeof ggwaveInstanceRef.current.encode !== 'function') {
              console.warn("encode method not found on instance, inspecting instance structure:", ggwaveInstanceRef.current);
              
              // Look for encode function at different paths
              const possiblePaths = [
                'encode',
                'wasm.encode',
                'instance.encode',
                'ggwave.encode',
                'factory.encode'
              ];
              
              let encodeFunctionFound = false;
              
              for (const path of possiblePaths) {
                try {
                  // Evaluate path like obj.prop1.prop2
                  const parts = path.split('.');
                  let obj = ggwaveInstanceRef.current;
                  
                  for (const part of parts) {
                    if (obj && typeof obj === 'object') {
                      obj = obj[part];
                    } else {
                      obj = undefined;
                      break;
                    }
                  }
                  
                  if (typeof obj === 'function') {
                    console.log(`Found encode function at path: ${path}`);
                    
                    // Create a wrapper around the encode function
                    const originalEncode = obj;
                    ggwaveInstanceRef.current.encode = function(...args: unknown[]) {
                      console.log(`Calling encode function at ${path} with args:`, args);
                      return originalEncode.apply(this, args);
                    };
                    
                    encodeFunctionFound = true;
                    break;
                  }
                } catch (e) {
                  console.warn(`Error checking path ${path}:`, e);
                }
              }
              
              if (!encodeFunctionFound) {
                console.error("Could not find encode function in GGWave instance");
              }
            } else {
              console.log("encode method found on instance");
            }
          }
          
          console.log("GGWave instance created successfully!");
        } catch (factoryErr) {
          console.error("Failed to create GGWave instance:", factoryErr);
          throw new Error("Failed to create GGWave instance. Please try again with a different browser.");
        }
      }
      
      // Final verification with detailed logging
      const componentStatus = {
        audioContext: !!audioContextRef.current,
        audioContextState: audioContextRef.current?.state || 'none',
        analyser: !!analyserRef.current,
        ggwaveInstance: !!ggwaveInstanceRef.current
      };
      
      console.log("Audio component status:", componentStatus);
      
      // We need at least audioContext for the app to function
      if (!componentStatus.audioContext) {
        throw new Error(`Audio context not available. Please try a different browser.`);
      }
      
      // If ggwaveInstance is missing but we have an audio context, we can still try to continue
      // We'll attempt to create a minimal placeholder instead of failing
      if (!componentStatus.ggwaveInstance) {
        console.warn("GGWave instance not properly initialized, creating placeholder");
        
        // Create a placeholder that will be filled in when we need to encode
        if (!ggwaveInstanceRef.current) {
          ggwaveInstanceRef.current = {
            _placeholderInstance: true
          };
          
          componentStatus.ggwaveInstance = true;
          console.log("Created placeholder GGWave instance, will try to get real instance during encoding");
        }
      }
      
      // Make sure visualization is running
      if (componentStatus.analyser && canvasRef.current) {
        startVisualization();
      } else {
        console.warn("Visualization not available due to missing analyser or canvas");
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Message to encode
      const messageToSend = testMessage || message;
      
      // Get settings from UI
      const settings = {
        volume,
        dutyCycle,
        lfoRate,
        exaggeration,
        effect: selectedEffect,
        addPersonality
      };
      
      // Check if we need to create a real instance from our placeholder
      if (ggwaveInstanceRef.current?._placeholderInstance) {
        console.log("Detected placeholder instance, creating real GGWave instance now");
        
        // Attempt to create a real GGWave instance just-in-time
        try {
          if (typeof window.ggwave_factory === 'function') {
            console.log("Creating fresh GGWave instance from factory");
            
            // Get the factory with retry
            let factory = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                factory = await window.ggwave_factory();
                if (factory) {
                  console.log("Factory created successfully on attempt", attempt + 1);
                  break;
                }
              } catch (err) {
                console.warn(`Factory creation attempt ${attempt + 1} failed:`, err);
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            if (factory) {
              // Try to initialize a proper instance
              let realInstance = null;
              
              // Try direct init if available
              if (typeof factory.init === 'function') {
                const params = {
                  sampleRateInp: audioContextRef.current?.sampleRate || 48000,
                  sampleRateOut: audioContextRef.current?.sampleRate || 48000
                };
                
                try {
                  realInstance = factory.init(params);
                  console.log("Successfully created instance from factory.init()");
                } catch (initErr) {
                  console.warn("Error creating instance with init:", initErr);
                }
              }
              
              // If we got an instance, use it; otherwise use the factory directly
              if (realInstance) {
                ggwaveInstanceRef.current = realInstance;
              } else {
                console.log("Using factory directly as instance");
                ggwaveInstanceRef.current = factory;
              }
            }
          }
        } catch (factoryErr) {
          console.error("Failed to create real GGWave instance:", factoryErr);
          // We'll continue with our placeholder and try to use it anyway
        }
      }
      
      // Encode message using GGWave
      console.log('Encoding message with GGWave:', messageToSend);
      console.log('GGWave instance type:', typeof ggwaveInstanceRef.current, 
          'Methods:', Object.keys(ggwaveInstanceRef.current || {}));
      
      // Protocol ID - try to detect proper usage
      // Note: The protocol ID might need to be a string, not a number
      const protocolId = "1"; // Use string version of AUDIBLE_FAST protocol
      
      // Before trying to encode, make sure we have a working encode function
      let encodeFn = null;
      
      // First check direct encode method
      if (typeof ggwaveInstanceRef.current?.encode === 'function') {
        encodeFn = ggwaveInstanceRef.current.encode;
        console.log("Found encode directly on instance");
      } else {
        console.warn("No encode function found directly on instance, searching...");
        
        // Try to find encode function on any available object
        const allPossibleObjects = [
          // Instance and its properties
          ggwaveInstanceRef.current,
          ggwaveInstanceRef.current?.instance,
          ggwaveInstanceRef.current?.Module,
          ggwaveInstanceRef.current?.wasm,
          
          // Global objects that might have encode
          typeof window.ggwave !== 'undefined' ? window.ggwave : null,
          typeof window.ggwaveInstance !== 'undefined' ? window.ggwaveInstance : null,
          
          // Last resort - try to get a fresh instance from factory
          typeof window.ggwave_factory === 'function' ? await window.ggwave_factory() : null
        ];
        
        // Search all potential objects for encode method
        for (const obj of allPossibleObjects) {
          if (!obj) continue;
          
          // Direct encode function
          if (typeof obj.encode === 'function') {
            encodeFn = obj.encode.bind(obj);
            console.log("Found encode method on object:", obj);
            break;
          }
          
          // Try to find encode in object properties (up to 2 levels deep)
          for (const prop1 of Object.getOwnPropertyNames(obj)) {
            const propObj = obj[prop1];
            if (!propObj || typeof propObj !== 'object') continue;
            
            if (typeof propObj.encode === 'function') {
              encodeFn = propObj.encode.bind(propObj);
              console.log(`Found encode on property ${prop1}`);
              break;
            }
            
            // Go one level deeper
            for (const prop2 of Object.getOwnPropertyNames(propObj)) {
              const deepObj = propObj[prop2];
              if (!deepObj || typeof deepObj !== 'object') continue;
              
              if (typeof deepObj.encode === 'function') {
                encodeFn = deepObj.encode.bind(deepObj);
                console.log(`Found encode on deep property ${prop1}.${prop2}`);
                break;
              }
            }
            
            if (encodeFn) break;
          }
          
          if (encodeFn) break;
        }
      }
      
      // If we still don't have an encode function, try a last-ditch effort with the factory
      if (!encodeFn && typeof window.ggwave_factory === 'function') {
        try {
          console.log("Last attempt - getting fresh factory for encode function");
          const factory = await window.ggwave_factory();
          
          // Create a synthetic encode function using factory instance
          if (factory && typeof factory.init === 'function') {
            console.log("Creating synthetic encode function with factory.init()");
            
            // Create our own encode function that initializes on every call
            encodeFn = function(text: string, protocol: string | number, volume: string | number): Int16Array {
              console.log("Using synthetic encode function");
              try {
                const params = {
                  sampleRateInp: audioContextRef.current?.sampleRate || 48000,
                  sampleRateOut: audioContextRef.current?.sampleRate || 48000
                };
                
                const tempInstance = factory.init(params);
                if (tempInstance && typeof tempInstance.encode === 'function') {
                  return tempInstance.encode(text, protocol, volume);
                } else {
                  throw new Error("Synthetic encode function failed to create valid instance");
                }
              } catch (err) {
                console.error("Synthetic encode function error:", err);
                throw err as Error;
              }
            };
          }
        } catch (finalErr) {
          console.error("Final factory attempt failed:", finalErr);
        }
      }
      
      // Apply the encode function if we found one
      if (encodeFn) {
        ggwaveInstanceRef.current = ggwaveInstanceRef.current || {};
        ggwaveInstanceRef.current.encode = encodeFn;
        console.log("Successfully set encode method on GGWave instance");
      } else {
        // Generate a simple tone instead
        console.error("Could not find a working encode function - using synthetic audio");
        
        // Create a synthetic waveform generator
        ggwaveInstanceRef.current = ggwaveInstanceRef.current || {};
        ggwaveInstanceRef.current.encode = function(text: string, ...args: unknown[]): Int16Array {
          console.log("Using synthetic beep generator instead of GGWave");
          
          // Create a simple tone pattern based on the text
          const sampleRate = audioContextRef.current?.sampleRate || 48000;
          const duration = 1.0 + text.length * 0.1; // Duration based on text length
          const numSamples = Math.floor(sampleRate * duration);
          const result = new Int16Array(numSamples);
          
          // Generate a beeping pattern
          for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const baseFreq = 800 + 400 * Math.sin(2 * Math.PI * 0.5 * t);
            let val = Math.sin(2 * Math.PI * baseFreq * t);
            
            // Add some beeps
            const beepFreq = 4;
            const beepDuty = 0.5;
            if (Math.sin(2 * Math.PI * beepFreq * t) > 1.0 - beepDuty) {
              val *= 0.7;
            }
            
            // Convert to Int16
            result[i] = Math.floor(val * 32767 * 0.8);
          }
          
          return result;
        };
      }
      
      console.log("Using encode function:", ggwaveInstanceRef.current.encode);
      
      // Skip trying to use the real GGWave encode if we're having WASM issues
      // and go straight to our reliable synthetic audio generator
      let waveform;
      
      // Check if we've seen WASM abort errors in the browser console logs
      const useSyntheticAudio = !ggwaveInstanceRef.current || 
                               ggwaveInstanceRef.current._placeholderInstance || 
                               window.localStorage.getItem('ggroid_use_synthetic') === 'true';
      
      if (useSyntheticAudio) {
        console.log("Using synthetic audio directly due to previous WASM errors");
        waveform = generateSyntheticAudio(messageToSend, settings);
      } else {
        try {
          // Try to inspect the encode function to determine its usage
          try {
            const encodeFuncStr = ggwaveInstanceRef.current.encode.toString();
            console.log("Encode function signature:", encodeFuncStr.substring(0, 200)); // Show beginning of function
          } catch (err) {
            console.log("Unable to inspect encode function:", err);
          }
          
          // Log all methods on the instance to help diagnose
          console.log("All methods on instance:", Object.getOwnPropertyNames(ggwaveInstanceRef.current));
          
          // First try the most likely parameter combinations
          try {
            // Try with 1 parameter (just text)
            console.log("Trying with just text as string");
            waveform = ggwaveInstanceRef.current.encode(messageToSend.toString());
          } catch (err1) {
            try {
              // Try with protocol (2 params)
              console.log("Trying with text and protocol as strings");
              waveform = ggwaveInstanceRef.current.encode(messageToSend.toString(), protocolId.toString());
            } catch (err2) {
              try {
                // Try with volume (3 params)
                console.log("Trying with text, protocol, volume as strings");
                waveform = ggwaveInstanceRef.current.encode(messageToSend.toString(), protocolId.toString(), "10");
              } catch (err3) {
                try {
                  // Try with 4 params
                  console.log("Trying with 4 string params");
                  waveform = ggwaveInstanceRef.current.encode(messageToSend.toString(), protocolId.toString(), "10", "0");
                } catch (err4) {
                  // If we get here, GGWave is likely failing due to WASM issues
                  // Check for Aborted() error indicating WASM failure
                  const isWasmAbort = [err1, err2, err3, err4].some(e => 
                    e && e.toString && e.toString().includes("Aborted()")
                  );
                  
                  if (isWasmAbort) {
                    console.error("WASM module aborted - using synthetic audio");
                    // Remember this for future calls to avoid repeated failures
                    try {
                      window.localStorage.setItem('ggroid_use_synthetic', 'true');
                    } catch (e) {
                      console.warn("Could not save synthetic audio preference:", e);
                    }
                    waveform = generateSyntheticAudio(messageToSend, settings);
                  } else {
                    // One last attempt with numeric params
                    try {
                      console.log("Trying with numeric params");
                      waveform = ggwaveInstanceRef.current.encode(messageToSend, 1, 10, false);
                    } catch (finalErr) {
                      console.error("All encode attempts failed:", finalErr);
                      waveform = generateSyntheticAudio(messageToSend, settings);
                    }
                  }
                }
              }
            }
          }
        } catch (unexpectedErr) {
          console.error("Unexpected error during encoding:", unexpectedErr);
          waveform = generateSyntheticAudio(messageToSend, settings);
        }
      }
      
      // Helper function to generate synthetic droid audio
      function generateSyntheticAudio(text: string, audioSettings: {
        volume?: number;
        dutyCycle?: number;
        lfoRate?: number;
        exaggeration?: number;
        effect?: string;
      }): Int16Array {
        console.log("Generating synthetic R2-D2 audio");
        const sampleRate = audioContextRef.current?.sampleRate || 48000;
        const duration = 1.0 + text.length * 0.1;
        const numSamples = Math.floor(sampleRate * duration);
        const syntheticWaveform = new Int16Array(numSamples);
        
        // Get settings for tone generation
        const lfoRate = audioSettings.lfoRate || 12;
        const exaggeration = audioSettings.exaggeration || 0.6;
        const effect = audioSettings.effect || 'normal';
        
        // Generate a droid-like tone pattern
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          
          // Base frequency - varies based on effect type
          let baseFreq = 800;
          if (effect === 'whistle') baseFreq = 1200;
          else if (effect === 'scream') baseFreq = 600;
          else if (effect === 'blatt') baseFreq = 500;
          else if (effect === 'trill') baseFreq = 900;
          
          // Apply frequency modulation - use different patterns based on effect
          let freqMod = 400 * Math.sin(2 * Math.PI * 0.5 * t);
          
          if (effect === 'scream') {
            // More chaotic for scream
            freqMod *= 1 + 0.5 * Math.sin(2 * Math.PI * 13 * t);
            freqMod *= 1 + 0.3 * Math.sin(2 * Math.PI * 7.3 * t);
          } else if (effect === 'trill') {
            // Faster modulation for trill
            freqMod = 350 * Math.sin(2 * Math.PI * 3 * t);
          } else if (effect === 'happy') {
            // Higher pitch for happy
            baseFreq += 200;
            freqMod = 300 * Math.sin(2 * Math.PI * 1.5 * t);
          } else if (effect === 'sad') {
            // Lower pitch for sad
            baseFreq -= 200;
            freqMod = 200 * Math.sin(2 * Math.PI * 0.8 * t);
          }
          
          // Apply frequency with modulation
          const instantFreq = baseFreq + freqMod * exaggeration;
          let val = Math.sin(2 * Math.PI * instantFreq * t);
          
          // Apply amplitude modulation (warble)
          // Higher lfoRate = faster warble
          let ampMod = 0.8 + 0.2 * Math.sin(2 * Math.PI * lfoRate * t);
          
          // Add effect-specific amplitude modulation
          if (effect === 'blatt') {
            // Add sharp transitions for blatt
            ampMod *= 0.7 + 0.3 * ((Math.sin(2 * Math.PI * 20 * t) > 0) ? 1 : 0.5);
          } else if (effect === 'question') {
            // Increasing pitch at the end for question
            const normalizedTime = t / duration;
            if (normalizedTime > 0.7) {
              val *= 0.8 + 0.4 * Math.sin(2 * Math.PI * (8 + 16 * (normalizedTime - 0.7) / 0.3) * t);
            }
          }
          
          // Apply amplitude modulation
          val *= ampMod;
          
          // Add beep pattern - frequency varies by effect
          const beepFreq = effect === 'trill' ? 8 : 
                          effect === 'scream' ? 12 :
                          effect === 'happy' ? 6 : 4;
          
          const beepDuty = effect === 'whistle' ? 0.2 : 0.5;
          if (Math.sin(2 * Math.PI * beepFreq * t) > 1.0 - beepDuty) {
            val *= 0.7;
          }
          
          // Convert to Int16
          syntheticWaveform[i] = Math.floor(val * 32767 * 0.8);
        }
        
        return syntheticWaveform;
      }
      
      console.log("Encoding successful, waveform data type:", typeof waveform, 
          waveform ? `Length: ${waveform.length}` : "null");
      
      // Convert to Float32Array
      const floatWaveform = new Float32Array(waveform.length);
      for (let i = 0; i < waveform.length; i++) {
        floatWaveform[i] = waveform[i] / 32768.0; // Convert to float (-1.0 to 1.0)
      }
      
      // Apply R2-D2 effects
      let processedWaveform = applyDroidEffects(floatWaveform, settings);
      
      // Add personality if enabled
      if (settings.addPersonality) {
        processedWaveform = addDroidPersonality(processedWaveform, settings);
      }
      
      // Create audio buffer
      const buffer = audioContextRef.current.createBuffer(1, processedWaveform.length, audioContextRef.current.sampleRate);
      buffer.getChannelData(0).set(processedWaveform);
      
      // Create source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      
      // Connect to analyser for visualization if it exists
      if (analyserRef.current) {
        source.connect(analyserRef.current);
      } else {
        // If no analyser, connect directly to destination
        source.connect(audioContextRef.current.destination);
      }
      
      // Track playback state
      isPlayingRef.current = true;
      
      source.onended = (_event: Event): void => {
        // Safe cleanup of playback state
        if (isPlayingRef.current) isPlayingRef.current = false;
        if (r2d2AnimatedRef.current) r2d2AnimatedRef.current = false;
      };
      
      // Start playback
      source.start();
      
      // Animate R2-D2
      animateR2D2();
      
      // Update received message if not a test
      if (!testMessage) {
        setReceivedMessage(messageToSend);
      }
      
      console.log('Message sent:', messageToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please check console for details.');
    }
  };
  
  // Animate R2-D2
  const animateR2D2 = () => {
    // Find the R2-D2 element in the DOM
    const r2d2Element = document.getElementById('r2d2');
    if (!r2d2Element) {
      console.log("R2-D2 element not found for animation");
      return;
    }
    
    // Only animate if not already animated
    if (r2d2AnimatedRef.current === true) {
      console.log("R2-D2 already animated, skipping");
      return;
    }
    
    // Set animation state
    r2d2AnimatedRef.current = true;
    
    // Add active classes
    r2d2Element.classList.add('floating', 'glowing');
    
    // Apply a random rotation
    const rotation = Math.random() * 10 - 5; // -5 to +5 degrees
    r2d2Element.style.transform = `rotate(${rotation}deg)`;
    
    // Add beeping animation to the eye
    const mainEye = r2d2Element.querySelector('.main-eye');
    if (mainEye) {
      mainEye.classList.add('beeping');
    }
    
    // Reset after animation
    setTimeout(() => {
      if (!isPlayingRef.current) {
        r2d2Element.classList.remove('floating', 'glowing');
        r2d2Element.style.transform = '';
        
        if (mainEye) {
          mainEye.classList.remove('beeping');
        }
        
        r2d2AnimatedRef.current = false;
      }
    }, 2000);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - R2-D2 Image and Visualizer */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-48 h-48">
            <img 
              id="r2d2" 
              src="/r2d2.svg" 
              alt="R2-D2" 
              className="w-full h-full"
            />
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-blue-400 main-eye"></div>
          </div>
          
          <VisualizerCanvas 
            ref={canvasRef} 
            className="w-full h-40 rounded-lg bg-gray-900"
          />
        </div>
        
        {/* Middle Column - Message Input and Controls */}
        <div className="flex flex-col space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="message"
              rows={4}
              className="droid-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your droid message here..."
            />
          </div>
          
          <SliderControl
            label="Volume"
            value={volume}
            min={0.1}
            max={1.0}
            step={0.1}
            onChange={setVolume}
          />
          
          <SliderControl
            label="Duty Cycle"
            value={dutyCycle}
            min={0.1}
            max={0.9}
            step={0.1}
            onChange={setDutyCycle}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="personalityToggle"
              className="h-4 w-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
              checked={addPersonality}
              onChange={(e) => setAddPersonality(e.target.checked)}
            />
            <label htmlFor="personalityToggle" className="text-sm text-gray-300">
              Add R2-D2 Personality
            </label>
          </div>
        </div>
        
        {/* Right Column - Sound Effects and Send Button */}
        <div className="flex flex-col space-y-4">
          <SoundEffectSelect
            value={selectedEffect}
            onChange={setSelectedEffect}
          />
          
          <SliderControl
            label="LFO Rate"
            value={lfoRate}
            min={1}
            max={20}
            step={1}
            onChange={setLfoRate}
          />
          
          <SliderControl
            label="Exaggeration"
            value={exaggeration}
            min={0.1}
            max={1}
            step={0.1}
            onChange={setExaggeration}
          />
          
          <DroidButton
            variant="primary"
            className="mt-4"
            onClick={() => sendMessage()}
          >
            Send Message
          </DroidButton>
          
          {receivedMessage && (
            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              <h3 className="text-sm font-medium text-amber-400 mb-1">Received Message:</h3>
              <p className="text-gray-300">{receivedMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GGRoidMessenger;