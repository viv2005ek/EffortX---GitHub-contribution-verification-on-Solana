import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import HeroSection from './components/HeroSection';
import AnalyzerForm from './components/AnalyzerForm';
import LoadingState from './components/LoadingState';
import ResultDashboard from './components/ResultDashboard';
import ErrorCard from './components/ErrorCard';
import AboutSection from './components/AboutSection';
import HowItWorks from './components/HowItWorks';
import WalletButton from './components/WalletButton';
import CreateProfileModal from './components/CreateProfileModal';
import AnimatedBackground from './components/AnimatedBackground';
import { analyzeCommit } from './services/api';
import { useSolana } from './context/SolanaContext.jsx';
import { initializeProtocol } from './solana/program.js';
import toast from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import Playground from './components/Playground';

function InitAdminButton() {
  const { isWalletConnected, wallet } = useSolana();
  const [loading, setLoading] = useState(false);

  if (!isWalletConnected) return null;

  const handleInit = async () => {
    setLoading(true);
    const toastId = toast.loading('Initializing protocol...');
    try {
      const sig = await initializeProtocol(wallet, wallet.publicKey);
      toast.success('Protocol Initialized on-chain!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Initialization failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Only the designated admin should see this button
  const ADMIN_WALLET = 'GNN25gvBm4LZ9sWFBqpDKtYFtpeyT9krJtPpU4myEpJP';
  if (wallet.publicKey?.toBase58() !== ADMIN_WALLET) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(46, 160, 67, 0.4)" }}
      whileTap={{ scale: 0.95 }}
      onClick={handleInit}
      disabled={loading}
      className="text-[10px] uppercase tracking-wider font-bold text-accent-green/60 hover:text-accent-green transition-all bg-accent-green/10 px-2.5 py-1.5 rounded border border-accent-green/20"
      title="Initialize Global Protocol State"
    >
      {loading ? 'Initializing...' : 'Init Protocol'}
    </motion.button>
  );
}

function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 30, stiffness: 350 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only activate cursor if the browser supports hover
    if (window.matchMedia("(hover: hover)").matches) {
      setIsVisible(true);
    }

    const moveCursor = (e) => {
      cursorX.set(e.clientX - 6);
      cursorY.set(e.clientY - 6);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('cursor-pointer') ||
        target.closest('.cursor-pointer')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 w-3 h-3 bg-accent-green rounded-full pointer-events-none z-[9999] mix-blend-screen"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        boxShadow: "0 0 10px #2EA043, 0 0 20px #2EA043",
      }}
      animate={{
        scale: isHovering ? 2.2 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    />
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('home');

  // Ref to the result section for auto-scroll
  const resultRef = useRef(null);

  const { isWalletConnected, profile, profileLoading, profileChecked } = useSolana();

  // ─── #1 Scroll lock when analysis is in flight ─────────────────────────────
  useEffect(() => {
    if (isLoading) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling (whether success or failure)
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    // Always clean up on unmount
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isLoading]);

  // ─── Auto-show create-profile modal ────────────────────────────────────────
  useEffect(() => {
    if (isWalletConnected && profileChecked && !profileLoading && profile === null) {
      const timer = setTimeout(() => setShowCreateProfile(true), 600);
      return () => clearTimeout(timer);
    }
    if (isWalletConnected && profile !== null) {
      setShowCreateProfile(false);
    }
  }, [isWalletConnected, profile, profileLoading, profileChecked]);

  useEffect(() => {
    if (!isWalletConnected) {
      setShowCreateProfile(false);
    }
  }, [isWalletConnected]);

  const handleAnalyze = async (githubUrl) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const [data] = await Promise.all([
        analyzeCommit(githubUrl),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      if (data.success) {
        setResult({ ...data.data, githubUrl });
      } else {
        setError(data.message || "Failed to analyze contribution.");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err.response?.data?.message ||
        "Backend connection error. Please ensure the EffortX API is running on https://effortx-commit-analyzer.vercel.app/api/health"
      );
    } finally {
      setIsLoading(false);
      // ─── #1 Auto-scroll to results/error after loading ends ────────────────
      // Small timeout lets React flush the state & render the result before scroll
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const scrollToAnalyzer = () => {
    document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRetry = () => {
    setError(null);
    scrollToAnalyzer();
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-sans selection:bg-accent-green/30 selection:text-white relative">
      {/* Premium Grain Overlay */}
      <div className="grain-noise" />

      {/* ── #2 Global Animated Background (grid + glow) behind ALL routes ── */}
      <AnimatedBackground />

      {/* Glowing cursor */}
      <CustomCursor />

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full z-45 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-background/80 border-b border-white/5 transition-all duration-300">
        <div
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => {
            setCurrentRoute('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <motion.img
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-8 h-8 rounded-lg bg-accent-green flex items-center justify-center font-black text-black group-hover:shadow-glow transition-all"
            src="./logo.png"
            alt="EffortX"
          />
          <span className="text-2xl font-black text-heading tracking-tighter">
            Effort<span className="text-accent-green group-hover:text-[#3fb950] transition-colors">X</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-main/70">
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (currentRoute !== 'home') {
                setCurrentRoute('home');
                setTimeout(() => {
                  document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 1500);
              } else {
                document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`transition-colors cursor-pointer ${currentRoute === 'home' ? 'text-white font-bold' : 'hover:text-white'}`}
          >
            Analyze
          </motion.button>

          {isWalletConnected && profile && (
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCurrentRoute('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer ${currentRoute === 'dashboard' ? 'text-white font-bold' : 'hover:text-white'}`}
            >
              Dashboard
            </motion.button>
          )}

          {isWalletConnected && profile && (
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCurrentRoute('playground');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition-colors cursor-pointer flex items-center gap-2 ${currentRoute === 'playground' ? 'text-accent-green font-bold' : 'hover:text-white'}`}
            >
              <span className={`w-2 h-2 rounded-full bg-accent-green ${currentRoute === 'playground' ? 'animate-pulse shadow-[0_0_8px_#2ea043]' : 'opacity-50'}`}></span>
              AI Playground
            </motion.button>
          )}

          {currentRoute === 'home' && !isWalletConnected && (
            <>
              <motion.a whileHover={{ scale: 1.05, y: -1 }} href="#about" className="hover:text-white transition-colors cursor-pointer">About EffortX</motion.a>
              <motion.a whileHover={{ scale: 1.05, y: -1 }} href="#how-it-works" className="hover:text-white transition-colors cursor-pointer">How It Works</motion.a>
            </>
          )}

          <motion.a
            whileHover={{ scale: 1.05, y: -1 }}
            href="https://github.com/viv2005ek/EffortX"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors cursor-pointer"
          >
            GitHub
          </motion.a>

          <WalletButton />

          {/* Nudge badge: connected but no profile and check completed */}
          <AnimatePresence>
            {isWalletConnected && profileChecked && !profileLoading && profile === null && (
              <motion.button
                key="nudge"
                initial={{ opacity: 0, scale: 0.85, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 10 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(46, 160, 67, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setShowCreateProfile(true)}
                className="px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green text-xs font-bold hover:bg-accent-green/20 transition-all whitespace-nowrap"
              >
                Create Profile →
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile wallet button */}
        <div className="md:hidden">
          <WalletButton />
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="pt-20">
        <AnimatePresence mode="wait">
          {currentRoute === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroSection onScrollToAnalyzer={scrollToAnalyzer} onOpenPlayground={() => setCurrentRoute('playground')} />

              <div className="pb-40">
                <AnalyzerForm onAnalyze={handleAnalyze} isLoading={isLoading} />

                <AnimatePresence>
                  {isLoading && <LoadingState />}
                </AnimatePresence>

                {/* ─── #1 Sentinel div – we scroll here when results arrive ── */}
                <div ref={resultRef} />

                <AnimatePresence mode="wait">
                  {result && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <ResultDashboard data={result} />
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <ErrorCard message={error} onRetry={handleRetry} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AboutSection />
                <HowItWorks />
              </div>
            </motion.div>
          ) : currentRoute === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Dashboard />
            </motion.div>
          ) : (
            <motion.div
              key="playground"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Playground />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="py-20 border-t border-white/5 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">E</div>
            <span className="text-sm font-bold text-heading">EffortX Engine v1.0</span>
            <InitAdminButton />
          </div>
          <div className="text-sm text-text-main/40">
            © 2026 EffortX Platform. Powered by Gemini 2.5 Pro + Solana.
          </div>
          <div className="flex gap-6 text-text-main/40 hover:text-text-main transition-colors text-xs uppercase tracking-widest font-bold">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="https://github.com/viv2005ek/EffortX" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>

      {/* ── Create Profile Modal ───────────────────────────────────────────────── */}
      <CreateProfileModal
        isOpen={showCreateProfile}
        onClose={() => setShowCreateProfile(false)}
      />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
