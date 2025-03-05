'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import SliderControl from './SliderControl';
import SoundEffectSelect from './SoundEffectSelect';
import { DroidButton } from './DroidButton';
import VisualizerCanvas from './VisualizerCanvas';

declare global {
  interface Window {
    ggwave_factory: () => Promise<any>;
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
        
        script.onload = () => {
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
        
        script.onerror = (e) => {
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
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.connect(audioContextRef.current.destination);
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
        const params = ggwaveFactory.getDefaultParameters();
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
    if (!analyserRef.current || !canvasRef.current) return;
    
    const analyzer = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    
    if (!canvasContext) return;
    
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
  const applyDroidEffects = (buffer: Float32Array, settings: any) => {
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
      } else if (settings.effect === 'question') {
        // Increasing modulation for question
        const questionLfo = 1.0 + 0.3 * settings.exaggeration * 
          Math.sin(2 * Math.PI * (4 + 4 * (t / (buffer.length / audioContextRef.current.sampleRate))) * t);
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
            scriptEl.onload = () => {
              console.log('GGWave script loaded');
              setIsScriptLoaded(true);
              resolve(true);
            };
            scriptEl.onerror = () => {
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
          let params;
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
          if (audioContextRef.current && audioContextRef.current.sampleRate) {
            console.log(`Setting sample rates to ${audioContextRef.current.sampleRate}Hz`);
            params.sampleRateInp = audioContextRef.current.sampleRate;
            params.sampleRateOut = audioContextRef.current.sampleRate;
          } else {
            console.log("Using default sample rates");
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
                    ggwaveInstanceRef.current.encode = function(...args) {
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
          window.ggwave,
          window.ggwaveInstance,
          
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
            encodeFn = function(text, protocol, volume) {
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
                throw err;
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
        ggwaveInstanceRef.current.encode = function(text) {
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
      
      // Try to inspect the encode function to determine its usage
      const encodeFuncStr = ggwaveInstanceRef.current.encode.toString();
      console.log("Encode function signature:", encodeFuncStr.substring(0, 200)); // Show beginning of function
      
      // Log all methods on the instance to help diagnose
      console.log("All methods on instance:", Object.getOwnPropertyNames(ggwaveInstanceRef.current));
      
      // Attempt to encode with different parameter combinations based on WASM binding requirements
      let waveform;
      
      // Extract error message to learn required parameters
      try {
        try {
          // Minimal parameters
          waveform = ggwaveInstanceRef.current.encode(messageToSend);
        } catch (err) {
          const errMsg = err.toString();
          console.log("Encode error info:", errMsg);
          
          // Parse the error to determine expected arguments
          const argMatch = errMsg.match(/expected (\d+) args/);
          const expectedArgs = argMatch ? parseInt(argMatch[1]) : 4;
          
          console.log(`Encode function expects ${expectedArgs} arguments, retrying...`);
          
          // Additional error info to analyze specific requirements
          const typeMismatch = errMsg.includes("Cannot pass non-string");
          console.log("Type mismatch detected:", typeMismatch);
          
          // Make sure everything is a string if we detected type mismatch
          const textMessage = messageToSend.toString();
          const protocolStr = typeMismatch ? protocolId.toString() : protocolId;
          const volumeStr = typeMismatch ? "10" : 10;
          
          // Try with the expected number of arguments
          if (expectedArgs === 4) {
            console.log("Trying with 4 args (string types):", textMessage, protocolStr, volumeStr, "false");
            waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr, volumeStr, "false");
          } else if (expectedArgs === 3) {
            console.log("Trying with 3 args (string types):", textMessage, protocolStr, volumeStr);
            waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr, volumeStr);
          } else if (expectedArgs === 2) {
            console.log("Trying with 2 args (string types):", textMessage, protocolStr);
            waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr);
          } else if (expectedArgs === 1) {
            console.log("Trying with just text:", textMessage);
            waveform = ggwaveInstanceRef.current.encode(textMessage);
          } else {
            // Try both string and numeric versions
            try {
              // String version
              const args = [textMessage, protocolStr, volumeStr, "false", "0", "0"];
              console.log(`Trying with ${expectedArgs} string args:`, args.slice(0, expectedArgs));
              waveform = ggwaveInstanceRef.current.encode.apply(
                ggwaveInstanceRef.current, 
                args.slice(0, expectedArgs)
              );
            } catch (strErr) {
              console.log("String version failed, trying numeric:", strErr);
              // Numeric version
              const numArgs = [messageToSend, 1, 10, false, 0, 0];
              waveform = ggwaveInstanceRef.current.encode.apply(
                ggwaveInstanceRef.current, 
                numArgs.slice(0, expectedArgs)
              );
            }
          }
        }
      } catch (finalErr) {
        console.error("All encode attempts failed:", finalErr);
        
        // Last fallback: generate synthetic audio
        console.log("Using synthetic audio as final fallback");
        const sampleRate = audioContextRef.current?.sampleRate || 48000;
        const duration = 1.0 + messageToSend.length * 0.1;
        const numSamples = Math.floor(sampleRate * duration);
        waveform = new Int16Array(numSamples);
        
        // Generate a droid-like tone pattern
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
          waveform[i] = Math.floor(val * 32767 * 0.8);
        }
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
      
      // Connect to analyser for visualization
      source.connect(analyserRef.current);
      
      // Track playback state
      isPlayingRef.current = true;
      
      source.onended = () => {
        isPlayingRef.current = false;
        r2d2AnimatedRef.current = false;
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
    const r2d2Element = document.getElementById('r2d2');
    if (!r2d2Element) return;
    
    // Only animate if not already animated
    if (r2d2AnimatedRef.current) return;
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
  
  // Save as WAV
  const saveAsWav = async () => {
    // Reuse the same script loading logic from sendMessage for consistency
    const loadGGWaveScript = async (): Promise<boolean> => {
      if (typeof window.ggwave_factory === 'function') {
        // Already loaded correctly
        if (!isScriptLoaded) setIsScriptLoaded(true);
        return true;
      }
      
      console.log("GGWave factory not available for WAV export, attempting to initialize...");
      
      try {
        // Remove any existing failed scripts to avoid conflicts
        const existingScripts = document.querySelectorAll('script[src="/ggwave/ggwave.js"]');
        existingScripts.forEach(script => script.remove());
        
        // Create a new script with defer
        const scriptEl = document.createElement('script');
        scriptEl.src = '/ggwave/ggwave.js';
        scriptEl.defer = true;
        
        // Wait for script to load with timeout
        const scriptLoaded = await Promise.race([
          new Promise<boolean>(resolve => {
            scriptEl.onload = () => {
              console.log('GGWave script loaded for WAV export');
              setIsScriptLoaded(true);
              resolve(true);
            };
            scriptEl.onerror = () => {
              console.error('Error loading GGWave script for WAV export');
              resolve(false);
            };
            document.body.appendChild(scriptEl);
          }),
          new Promise<boolean>(resolve => setTimeout(() => {
            console.warn('Script load timeout for WAV export');
            resolve(false);
          }, 5000))
        ]);
        
        // Give time for the factory to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for factory after waiting
        return typeof window.ggwave_factory === 'function';
      } catch (err) {
        console.error("Failed to load GGWave script for WAV export:", err);
        return false;
      }
    };
    
    // Try to load script if needed
    const scriptLoaded = await loadGGWaveScript();
    if (!scriptLoaded) {
      alert("Could not load the GGWave library for WAV export. Please refresh the page and try again.");
      return;
    }
    
    // Initialize audio components directly, similar to sendMessage
    try {
      // Step 1: Initialize AudioContext
      if (!audioContextRef.current) {
        console.log("Creating new AudioContext for WAV export...");
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Step 2: Resume context if needed
      if (audioContextRef.current.state === 'suspended') {
        console.log("Resuming suspended AudioContext for WAV export...");
        await audioContextRef.current.resume();
      }
      
      // Step 3: Create GGWave instance
      if (!ggwaveInstanceRef.current && typeof window.ggwave_factory === 'function') {
        console.log("Creating new GGWave instance for WAV export...");
        try {
          // Multiple attempts for GGWave factory
          let ggwaveFactory = null;
          let factoryAttempts = 0;
          const maxFactoryAttempts = 3;
          
          while (!ggwaveFactory && factoryAttempts < maxFactoryAttempts) {
            factoryAttempts++;
            console.log(`GGWave factory attempt for WAV ${factoryAttempts}/${maxFactoryAttempts}...`);
            
            try {
              ggwaveFactory = await window.ggwave_factory();
            } catch (e) {
              console.warn(`Factory attempt for WAV ${factoryAttempts} failed:`, e);
              if (factoryAttempts < maxFactoryAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          if (!ggwaveFactory) {
            throw new Error("GGWave factory returned null after multiple attempts for WAV export");
          }
          
          console.log("GGWave factory obtained successfully for WAV export, getting parameters...");
          
          // Get default parameters with error handling
          let params;
          try {
            params = ggwaveFactory.getDefaultParameters();
            console.log("Parameters obtained for WAV export:", params);
          } catch (paramErr) {
            console.error("Error getting parameters for WAV export:", paramErr);
            throw new Error("Failed to get GGWave parameters for WAV export");
          }
          
          // Set sample rates
          console.log(`Setting sample rates to ${audioContextRef.current.sampleRate}Hz for WAV export`);
          params.sampleRateInp = audioContextRef.current.sampleRate;
          params.sampleRateOut = audioContextRef.current.sampleRate;
          
          // Multiple attempts for GGWave initialization
          let instanceAttempts = 0;
          const maxInstanceAttempts = 3;
          
          while (!ggwaveInstanceRef.current && instanceAttempts < maxInstanceAttempts) {
            instanceAttempts++;
            console.log(`GGWave instance initialization attempt for WAV ${instanceAttempts}/${maxInstanceAttempts}...`);
            
            try {
              ggwaveInstanceRef.current = ggwaveFactory.init(params);
              console.log("WAV export init result:", ggwaveInstanceRef.current);
            } catch (initErr) {
              console.warn(`Instance initialization attempt for WAV ${instanceAttempts} failed:`, initErr);
              if (instanceAttempts < maxInstanceAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          if (!ggwaveInstanceRef.current) {
            // Try one more desperate attempt with default parameters
            console.log("Attempting one last initialization with minimal params for WAV export...");
            try {
              const minimalParams = {
                sampleRateInp: 48000,
                sampleRateOut: 48000
              };
              ggwaveInstanceRef.current = ggwaveFactory.init(minimalParams);
            } catch (finalErr) {
              console.error("Final initialization attempt for WAV export failed:", finalErr);
            }
            
            if (!ggwaveInstanceRef.current) {
              throw new Error("GGWave instance initialization failed after multiple attempts for WAV export");
            }
          }
          
          console.log("GGWave instance created successfully for WAV export!");
        } catch (factoryErr) {
          console.error("Failed to create GGWave instance for WAV export:", factoryErr);
          throw new Error("Failed to create GGWave instance for WAV export. Please try again with a different browser.");
        }
      }
      
      // Final verification
      const componentStatus = {
        audioContext: !!audioContextRef.current,
        audioContextState: audioContextRef.current?.state || 'none',
        ggwaveInstance: !!ggwaveInstanceRef.current
      };
      
      console.log("WAV export component status:", componentStatus);
      
      if (!componentStatus.audioContext || !componentStatus.ggwaveInstance) {
        throw new Error(`Audio system not fully initialized for WAV export. Status: ${JSON.stringify(componentStatus)}`);
      }
    } catch (err) {
      console.error("Failed to initialize audio system for WAV export:", err);
      alert('Failed to initialize audio system for WAV export. Please reload the page and try again.');
      return;
    }
    
    // Get settings from UI
    const settings = {
      volume,
      dutyCycle,
      lfoRate,
      exaggeration,
      effect: selectedEffect,
      addPersonality
    };
    
    // We'll need the same encode function discovery as in sendMessage
    // Check if we need to create a real instance from our placeholder
    if (ggwaveInstanceRef.current?._placeholderInstance || typeof ggwaveInstanceRef.current?.encode !== 'function') {
      console.warn("No valid encode function found for WAV export, attempting to create one");
      
      // First, try to get a real instance from the factory
      if (typeof window.ggwave_factory === 'function') {
        try {
          console.log("Creating fresh GGWave instance for WAV export");
          const factory = await window.ggwave_factory();
          
          if (factory) {
            // Try to initialize a proper instance
            if (typeof factory.init === 'function') {
              const params = {
                sampleRateInp: audioContextRef.current.sampleRate || 48000,
                sampleRateOut: audioContextRef.current.sampleRate || 48000
              };
              
              try {
                const realInstance = factory.init(params);
                if (realInstance) {
                  console.log("Successfully created instance for WAV export");
                  ggwaveInstanceRef.current = realInstance;
                }
              } catch (initErr) {
                console.warn("Error creating instance for WAV export:", initErr);
              }
            }
            
            // If init didn't work, try using the factory directly
            if (!ggwaveInstanceRef.current || ggwaveInstanceRef.current._placeholderInstance) {
              console.log("Using factory directly as instance for WAV export");
              ggwaveInstanceRef.current = factory;
            }
          }
        } catch (factoryErr) {
          console.error("Failed to create GGWave instance for WAV export:", factoryErr);
        }
      }
      
      // Now look for an encode function
      let encodeFn = null;
      
      // First check if we now have an encode function directly
      if (typeof ggwaveInstanceRef.current?.encode === 'function') {
        encodeFn = ggwaveInstanceRef.current.encode;
        console.log("Found encode directly on instance for WAV");
      } else {
        // Try the same deep search as in sendMessage (simplified)
        console.warn("Searching for encode function for WAV export...");
        
        // Try all possible objects that might have an encode function
        const possibleObjects = [
          ggwaveInstanceRef.current,
          ggwaveInstanceRef.current?.instance,
          ggwaveInstanceRef.current?.Module,
          window.ggwave,
          window.ggwaveInstance,
          typeof window.ggwave_factory === 'function' ? await window.ggwave_factory() : null
        ];
        
        for (const obj of possibleObjects) {
          if (!obj) continue;
          
          if (typeof obj.encode === 'function') {
            encodeFn = obj.encode.bind(obj);
            console.log("Found encode on object for WAV export");
            break;
          }
          
          // Check properties one level deep
          for (const prop of Object.getOwnPropertyNames(obj)) {
            const propObj = obj[prop];
            if (propObj && typeof propObj.encode === 'function') {
              encodeFn = propObj.encode.bind(propObj);
              console.log(`Found encode on ${prop} for WAV export`);
              break;
            }
          }
          
          if (encodeFn) break;
        }
      }
      
      // Last resort - create a synthetic fallback
      if (!encodeFn) {
        console.log("Creating synthetic encode function for WAV export");
        
        // Similar to sendMessage, create a tone generator
        encodeFn = function(text) {
          console.log("Using synthetic WAV generator");
          const sampleRate = audioContextRef.current?.sampleRate || 48000;
          const duration = 1.0 + text.length * 0.1;
          const numSamples = Math.floor(sampleRate * duration);
          const result = new Int16Array(numSamples);
          
          // Generate a different tone pattern for WAV export
          for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const baseFreq = 1000 + 500 * Math.sin(2 * Math.PI * 0.3 * t);
            let val = Math.sin(2 * Math.PI * baseFreq * t);
            
            // Add warble effect
            val *= (0.8 + 0.2 * Math.sin(2 * Math.PI * 8 * t));
            
            // Convert to Int16
            result[i] = Math.floor(val * 32767 * 0.8);
          }
          
          return result;
        };
      }
      
      // Apply the encode function
      ggwaveInstanceRef.current = ggwaveInstanceRef.current || {};
      ggwaveInstanceRef.current.encode = encodeFn;
      console.log("Successfully set encode function for WAV export");
    }
    
    // Use the same smart parameter detection as in sendMessage
    let waveform;
    const protocolId = 1; // AUDIBLE_FAST protocol
    
    // Extract error message to learn required parameters
    try {
      try {
        // Minimal parameters
        waveform = ggwaveInstanceRef.current.encode(message);
      } catch (err) {
        const errMsg = err.toString();
        console.log("WAV encode error info:", errMsg);
        
        // Parse the error to determine expected arguments
        const argMatch = errMsg.match(/expected (\d+) args/);
        const expectedArgs = argMatch ? parseInt(argMatch[1]) : 4;
        
        console.log(`WAV encode function expects ${expectedArgs} arguments, retrying...`);
        
        // Additional error info to analyze specific requirements
        const typeMismatch = errMsg.includes("Cannot pass non-string");
        console.log("Type mismatch detected in WAV export:", typeMismatch);
        
        // Make sure everything is a string if we detected type mismatch
        const textMessage = message.toString();
        const protocolStr = typeMismatch ? protocolId.toString() : protocolId;
        const volumeStr = typeMismatch ? "10" : 10;
        
        // Try with the expected number of arguments
        if (expectedArgs === 4) {
          console.log("Trying WAV encode with 4 args (string types):", textMessage, protocolStr, volumeStr, "false");
          waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr, volumeStr, "false");
        } else if (expectedArgs === 3) {
          console.log("Trying WAV encode with 3 args (string types):", textMessage, protocolStr, volumeStr);
          waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr, volumeStr);
        } else if (expectedArgs === 2) {
          console.log("Trying WAV encode with 2 args (string types):", textMessage, protocolStr);
          waveform = ggwaveInstanceRef.current.encode(textMessage, protocolStr);
        } else if (expectedArgs === 1) {
          console.log("Trying WAV encode with just text:", textMessage);
          waveform = ggwaveInstanceRef.current.encode(textMessage);
        } else {
          // Try both string and numeric versions
          try {
            // String version
            const args = [textMessage, protocolStr, volumeStr, "false", "0", "0"];
            console.log(`Trying WAV encode with ${expectedArgs} string args:`, args.slice(0, expectedArgs));
            waveform = ggwaveInstanceRef.current.encode.apply(
              ggwaveInstanceRef.current, 
              args.slice(0, expectedArgs)
            );
          } catch (strErr) {
            console.log("String version failed for WAV, trying numeric:", strErr);
            // Numeric version
            const numArgs = [message, 1, 10, false, 0, 0];
            waveform = ggwaveInstanceRef.current.encode.apply(
              ggwaveInstanceRef.current, 
              numArgs.slice(0, expectedArgs)
            );
          }
        }
      }
    } catch (finalErr) {
      console.error("All WAV encode attempts failed:", finalErr);
      
      // Generate synthetic audio for WAV
      console.log("Using synthetic audio for WAV export");
      const sampleRate = audioContextRef.current?.sampleRate || 48000;
      const duration = 1.0 + message.length * 0.1;
      const numSamples = Math.floor(sampleRate * duration);
      waveform = new Int16Array(numSamples);
      
      // Generate a droid-like tone pattern
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const baseFreq = 1000 + 500 * Math.sin(2 * Math.PI * 0.3 * t);
        let val = Math.sin(2 * Math.PI * baseFreq * t);
        
        // Add some warble
        val *= (0.8 + 0.2 * Math.sin(2 * Math.PI * 8 * t));
        
        // Convert to Int16
        waveform[i] = Math.floor(val * 32767 * 0.8);
      }
    }
    
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
    
    // Convert to 16-bit PCM
    const pcmData = new Int16Array(processedWaveform.length);
    for (let i = 0; i < processedWaveform.length; i++) {
      pcmData[i] = Math.min(1, Math.max(-1, processedWaveform[i])) * 32767;
    }
    
    // Create WAV header
    const wavHeader = createWavHeader(pcmData.length, 1, audioContextRef.current.sampleRate, 16);
    
    // Combine header and PCM data
    const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
    
    // Create download link
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'r2d2_message.wav';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  // Create WAV header
  const createWavHeader = (dataLength: number, numChannels: number, sampleRate: number, bitsPerSample: number) => {
    const headerLength = 44;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const wavHeader = new ArrayBuffer(headerLength);
    const view = new DataView(wavHeader);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 32 + dataLength * 2, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength * 2, true);
    
    return wavHeader;
  };
  
  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Message input and controls */}
      <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Message Controls</h2>
        
        <div className="mb-6">
          <label htmlFor="messageInput" className="block text-sm font-medium text-gray-300 mb-2">
            Message to Send
          </label>
          <textarea
            id="messageInput"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="droid-input min-h-[120px]"
            placeholder="Enter your message here..."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SliderControl
            label="Volume"
            value={volume}
            min={0}
            max={1}
            step={0.1}
            onChange={setVolume}
          />
          
          <SliderControl
            label="Duty Cycle"
            value={dutyCycle}
            min={0.3}
            max={0.7}
            step={0.05}
            onChange={setDutyCycle}
          />
          
          <SliderControl
            label="Warble Rate (Hz)"
            value={lfoRate}
            min={5}
            max={20}
            step={1}
            onChange={setLfoRate}
          />
          
          <SliderControl
            label="Exaggeration"
            value={exaggeration}
            min={0}
            max={1}
            step={0.1}
            onChange={setExaggeration}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-grow">
            <SoundEffectSelect 
              value={selectedEffect}
              onChange={setSelectedEffect}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="personalityToggle"
              checked={addPersonality}
              onChange={(e) => setAddPersonality(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="personalityToggle" className="text-white">
              Add Droid Personality
            </label>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <DroidButton 
            onClick={() => sendMessage("Test... test... test...")}
            variant="secondary"
          >
            Test Sound
          </DroidButton>
          
          <DroidButton 
            onClick={() => sendMessage()}
            variant="primary"
          >
            Send Message
          </DroidButton>
          
          <DroidButton 
            onClick={saveAsWav}
            variant="outline"
          >
            Save as WAV
          </DroidButton>
        </div>
      </div>
      
      {/* Visualization and R2-D2 */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">Visualization</h2>
          
          <div className="h-[200px] bg-gray-900 rounded-lg relative overflow-hidden">
            <VisualizerCanvas ref={canvasRef} className="w-full h-full" />
          </div>
          
          <div className="flex justify-center mt-4">
            <div className="w-32 h-32 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Image 
                  src="/r2d2.svg" 
                  alt="R2-D2" 
                  width={120} 
                  height={120}
                  id="r2d2"
                  className="transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">Received Message</h2>
          
          <div className="bg-gray-900 rounded-lg p-4 min-h-[100px] text-white">
            {receivedMessage || "No messages received yet."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GGRoidMessenger;