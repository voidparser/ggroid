# GGRoid - Droid Messenger

A fun web application that sends messages with Star Wars droid sound aesthetics. Built with React 19 and deployed on Cloudflare Pages.

## Features

- Send messages encoded with R2-D2 style sound effects
- Customize effects with volume, duty cycle, and other parameters
- Choose from various droid sound profiles (normal, blatt, trill, whistle, etc.)
- Real-time audio visualization
- WebAssembly-powered audio processing with fallback synthetic audio generation

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Building for Production

To build the application for production:

```bash
npm run build
```

To build specifically for Cloudflare Pages deployment:

```bash
npm run build:cloudflare
```

## Technologies Used

- React 19
- TypeScript
- TailwindCSS
- WebAudio API
- GGWave for audio generation

## Deployment

The project is configured for easy deployment to Cloudflare Pages. The build output will be in the `dist` directory.

## License

MIT