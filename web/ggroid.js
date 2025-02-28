// GGRoid Web Interface
// Enhances GGWave with Star Wars Droid Sound Aesthetics

// Audio context and GGWave instance
let audioContext;
let ggwaveInstance;
let analyser;
let canvasContext;
let isPlaying = false;
let r2d2Animated = false;

// UI elements
const messageInput = document.getElementById('messageInput');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const dutySlider = document.getElementById('dutySlider');
const dutyValue = document.getElementById('dutyValue');
const lfoSlider = document.getElementById('lfoSlider');
const lfoValue = document.getElementById('lfoValue');
const exaggerationSlider = document.getElementById('exaggerationSlider');
const exaggerationValue = document.getElementById('exaggerationValue');
const effectSelect = document.getElementById('effectSelect');
const personalityToggle = document.getElementById('personalityToggle');
const testButton = document.getElementById('testButton');
const sendButton = document.getElementById('sendButton');
const saveButton = document.getElementById('saveButton');
const receivedMessage = document.getElementById('receivedMessage');
const audioCanvas = document.getElementById('audioCanvas');
const r2d2 = document.getElementById('r2d2');

// Initialize canvas
canvasContext = audioCanvas.getContext('2d');
canvasContext.fillStyle = '#333';
canvasContext.fillRect(0, 0, audioCanvas.width, audioCanvas.height);

// Update value displays
function updateValueDisplays() {
    volumeValue.textContent = volumeSlider.value;
    dutyValue.textContent = dutySlider.value;
    lfoValue.textContent = lfoSlider.value;
    exaggerationValue.textContent = exaggerationSlider.value;
}

// Add event listeners for sliders
volumeSlider.addEventListener('input', updateValueDisplays);
dutySlider.addEventListener('input', updateValueDisplays);
lfoSlider.addEventListener('input', updateValueDisplays);
exaggerationSlider.addEventListener('input', updateValueDisplays);

// Initial update
updateValueDisplays();

// Initialize audio context and GGWave
async function initAudio() {
    if (audioContext) return;
    
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser for visualization
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.connect(audioContext.destination);
        
        // Initialize GGWave
        ggwaveInstance = await ggwave_factory();
        
        // Set up parameters
        const params = ggwaveInstance.getDefaultParameters();
        params.sampleRateInp = audioContext.sampleRate;
        params.sampleRateOut = audioContext.sampleRate;
        
        // Initialize instance
        ggwaveInstance = ggwaveInstance.init(params);
        
        console.log('Audio and GGWave initialized');
        
        // Start visualization
        visualize();
    } catch (err) {
        console.error('Failed to initialize audio:', err);
        alert('Failed to initialize audio. Please check console for details.');
    }
}

// Apply droid effects to audio buffer
function applyDroidEffects(buffer, settings) {
    // Create a new buffer for the processed audio
    const processedBuffer = new Float32Array(buffer.length);
    
    // Apply warble effect (LFO modulation)
    for (let i = 0; i < buffer.length; i++) {
        // Time in seconds
        const t = i / audioContext.sampleRate;
        
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
                Math.sin(2 * Math.PI * (4 + 4 * (t / (buffer.length / audioContext.sampleRate))) * t);
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
    
    // Normalize and apply volume
    const maxAmp = Math.max(...processedBuffer.map(Math.abs));
    for (let i = 0; i < processedBuffer.length; i++) {
        processedBuffer[i] = (processedBuffer[i] / maxAmp) * settings.volume;
    }
    
    return processedBuffer;
}

// Generate R2-D2 intro/outro sounds
function generateR2D2Personality(isIntro, duration, settings) {
    const sampleRate = audioContext.sampleRate;
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
}

// Mix personality sounds into the main buffer
function addDroidPersonality(buffer, settings) {
    if (!settings.addPersonality) return buffer;
    
    const sampleRate = audioContext.sampleRate;
    
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
}

// Encode and play a message
async function sendMessage(message, isTest = false) {
    try {
        // Initialize audio if needed
        await initAudio();
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Get settings from UI
        const settings = {
            volume: parseFloat(volumeSlider.value),
            dutyCycle: parseFloat(dutySlider.value),
            lfoRate: parseFloat(lfoSlider.value),
            exaggeration: parseFloat(exaggerationSlider.value),
            effect: effectSelect.value,
            addPersonality: personalityToggle.checked
        };
        
        // Encode message using GGWave - use direct protocol number (4 is AUDIBLE_FAST)
        const protocol = 4; // AUDIBLE_FAST protocol
        const waveform = ggwaveInstance.encode(
            message,
            protocol,
            10 // Default volume, we'll adjust it later
        );
        
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
        const buffer = audioContext.createBuffer(1, processedWaveform.length, audioContext.sampleRate);
        buffer.getChannelData(0).set(processedWaveform);
        
        // Create source node
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Connect to analyser for visualization
        source.connect(analyser);
        
        // Track playback state
        isPlaying = true;
        source.onended = () => {
            isPlaying = false;
            r2d2Animated = false;
        };
        
        // Start playback
        source.start();
        
        // Animate R2-D2
        animateR2D2();
        
        // Update received message if not a test
        if (!isTest) {
            receivedMessage.textContent = message;
        }
        
        console.log('Message sent:', message);
    } catch (err) {
        console.error('Failed to send message:', err);
        alert('Failed to send message. Please check console for details.');
    }
}

// Animate R2-D2
function animateR2D2() {
    // Only animate if not already animated
    if (r2d2Animated) return;
    r2d2Animated = true;
    
    const container = document.getElementById('r2d2Container');
    
    // Add active class
    r2d2.classList.add('glow');
    
    // Add random rotation
    const rotation = Math.random() * 20 - 10;
    container.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    
    // Reset after animation
    setTimeout(() => {
        if (!isPlaying) {
            r2d2.classList.remove('glow');
            container.style.transform = 'translateX(-50%) rotate(0deg)';
            r2d2Animated = false;
        }
    }, 2000);
}

// Visualize audio
function visualize() {
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        // Request next frame
        requestAnimationFrame(draw);
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Clear canvas
        canvasContext.fillStyle = '#1a202c';
        canvasContext.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
        
        // Draw frequency bars
        const barWidth = (audioCanvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 255 * audioCanvas.height;
            
            // Choose color based on frequency and active effect
            let effect = effectSelect.value;
            let hue;
            
            if (effect === 'normal') {
                hue = i / bufferLength * 240; // Blue spectrum
            } else if (effect === 'blatt') {
                hue = 30 + i / bufferLength * 60; // Orange spectrum
            } else if (effect === 'trill') {
                hue = 180 + i / bufferLength * 60; // Cyan spectrum
            } else if (effect === 'whistle') {
                hue = 90 + i / bufferLength * 60; // Green spectrum
            } else if (effect === 'scream') {
                hue = 0 + i / bufferLength * 60; // Red spectrum
            } else if (effect === 'happy') {
                hue = 60 + i / bufferLength * 60; // Yellow spectrum
            } else if (effect === 'sad') {
                hue = 240 + i / bufferLength * 60; // Blue-purple spectrum
            } else if (effect === 'question') {
                hue = 270 + i / bufferLength * 60; // Purple spectrum
            } else if (effect === 'random') {
                hue = (Date.now() / 50 + i * 5) % 360; // Rainbow effect
            }
            
            // Increase bar size and brightness when playing
            const brightness = isPlaying ? '50%' : '30%';
            const intensity = isPlaying ? barHeight : barHeight * 0.6;
            
            canvasContext.fillStyle = `hsl(${hue}, 100%, ${brightness})`;
            canvasContext.fillRect(x, audioCanvas.height - intensity, barWidth, intensity);
            
            x += barWidth + 1;
            if (x > audioCanvas.width) break;
        }
    }
    
    draw();
}

// Save as WAV
function saveAsWav() {
    // Initialize audio if needed
    initAudio().then(() => {
        const message = messageInput.value;
        
        // Get settings from UI
        const settings = {
            volume: parseFloat(volumeSlider.value),
            dutyCycle: parseFloat(dutySlider.value),
            lfoRate: parseFloat(lfoSlider.value),
            exaggeration: parseFloat(exaggerationSlider.value),
            effect: effectSelect.value,
            addPersonality: personalityToggle.checked
        };
        
        // Encode message using GGWave - use direct protocol number (4 is AUDIBLE_FAST)
        const protocol = 4; // AUDIBLE_FAST protocol
        const waveform = ggwaveInstance.encode(
            message,
            protocol,
            10 // Default volume, we'll adjust it later
        );
        
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
        const wavHeader = createWavHeader(pcmData.length, 1, audioContext.sampleRate, 16);
        
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
    });
}

// Create WAV header
function createWavHeader(dataLength, numChannels, sampleRate, bitsPerSample) {
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
}

// Helper to write string to DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Event listeners for buttons
testButton.addEventListener('click', () => {
    sendMessage('Test... test... test...', true);
});

sendButton.addEventListener('click', () => {
    sendMessage(messageInput.value, false);
});

saveButton.addEventListener('click', saveAsWav);

// Initialize on page load
window.addEventListener('load', () => {
    console.log('GGRoid Web Interface loaded');
});