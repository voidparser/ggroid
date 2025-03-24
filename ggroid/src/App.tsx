import GGRoidMessenger from './components/GGRoidMessenger'

function App() {
  // No basePath needed for Cloudflare Pages deployment
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-yellow-400 mb-4">
            GGRoid <span className="text-blue-400">Droid Messenger</span>
          </h1>
          <p className="text-xl text-gray-300">
            Send messages with Star Wars droid sound aesthetics
          </p>
        </header>

        {/* Main GGRoid Messenger component */}
        <GGRoidMessenger />

        <footer className="mt-16 text-center text-gray-400 text-sm">
          <p>© GGRoid - Enhancing GGWave with Star Wars Droid Aesthetics</p>
          <div className="flex justify-center gap-6 mt-4">
            <a 
              href="https://github.com/yourusername/ggroid" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-yellow-400 transition"
            >
              GitHub
            </a>
            <a 
              href="/examples"
              className="hover:text-yellow-400 transition"
            >
              Examples
            </a>
            <a 
              href="/docs"
              className="hover:text-yellow-400 transition"
            >
              Documentation
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App