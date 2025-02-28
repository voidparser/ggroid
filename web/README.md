# GGRoid Web Interface

A modern web interface for GGRoid, enhancing GGWave with Star Wars droid sound aesthetics.

## Features

- **Star Wars Droid Sounds**: Create messages that sound like R2-D2 and other Star Wars droids
- **Customizable Sound Effects**: Change sound parameters in real-time
- **Multiple Sound Types**: Choose from blatt, trill, whistle, scream, happy, sad, and more
- **Advanced Parameters**: Control volume, duty cycle, warble rate (LFO), and exaggeration
- **Droid Personality**: Add intro/outro sounds for authentic droid communication
- **Audio Visualization**: See your droid sounds represented visually
- **Save to WAV**: Download your droid messages for later use

## Local Usage

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Enter your message and adjust sound parameters
4. Click "Test Sound" to preview or "Send Message" to play

## Deploying to Cloudflare Pages

### Method 1: Direct GitHub Connection

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/ggroid.git
   git push -u origin main
   ```

2. **Set up Cloudflare Pages**:
   - Log in to your Cloudflare dashboard
   - Navigate to Pages > Create a project > Connect to Git
   - Select your GitHub repository
   - In the build settings:
     - Set build command to: `(leave blank)`
     - Set build output directory to: `web`
   - Click "Save and Deploy"

3. **Configure your domain (optional)**:
   - Go to your project settings in Cloudflare Pages
   - Navigate to "Custom domains"
   - Add your custom domain (e.g., ggroid.yourdomain.com)

### Method 2: Direct Upload (without GitHub)

1. **Install Wrangler CLI** (Cloudflare's command-line tool):
   ```bash
   npm install -g wrangler
   ```

2. **Log in to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Initialize a new Cloudflare Pages project**:
   ```bash
   wrangler pages project create ggroid
   ```

4. **Deploy your website**:
   ```bash
   wrangler pages deploy web --project-name=ggroid
   ```

5. **Access your deployed website**:
   After deployment, Cloudflare will provide a URL (typically `ggroid.pages.dev`).

## Browser Compatibility

This application works in modern browsers that support the Web Audio API:
- Chrome/Edge (latest versions)
- Firefox (latest version)
- Safari (latest version)

## Customizing Sounds

The interface allows you to adjust several parameters:

- **Volume**: Overall loudness (0.0-1.0)
- **Duty Cycle**: Affects the tonality of square waves (0.3-0.7)
- **Warble Rate**: Speed of frequency modulation in Hz (5-20)
- **Exaggeration**: How pronounced the effects are (0.0-1.0)
- **Sound Effect**: Specific sound character to apply
- **Personality**: Toggle R2-D2-like intro/outro sounds

## Credits

- GGRoid - Star Wars Droid Sound Modulation for GGWave
- GGWave - Audio protocol library by [Georgi Gerganov](https://github.com/ggerganov/ggwave)