import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSolana } from '../context/SolanaContext.jsx';
import { Wallet, ChevronDown, LogOut, ExternalLink, Copy, CheckCheck, Coins, AlertCircle } from 'lucide-react';
import { explorerAccountUrl } from '../solana/config.js';
import { checkGithubAuthStatus, getGithubAuthUrl } from '../services/api';

// ============================================================
// WalletButton — premium, minimal Phantom wallet button
// ============================================================

const RippleButton = ({ children, onClick, className, whileHover, whileTap }) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples((prev) => [...prev, newRipple]);
  };

  const removeRipple = (id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <motion.button
      whileHover={whileHover}
      whileTap={whileTap}
      className={`relative overflow-hidden ${className}`}
      onClick={(e) => {
        createRipple(e);
        if (onClick) onClick(e);
      }}
    >
      {children}
      <span className="absolute inset-0 pointer-events-none z-0">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
            className="absolute bg-white/20 rounded-full animate-ripple pointer-events-none"
            onAnimationEnd={() => removeRipple(ripple.id)}
          />
        ))}
      </span>
    </motion.button>
  );
};

export default function WalletButton() {
  const { wallet, profile, profileLoading, isWalletConnected } = useSolana();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ghAuthStatus, setGhAuthStatus] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (profile?.githubUsername) {
      checkGithubAuthStatus(profile.githubUsername).then(setGhAuthStatus);
    } else {
      setGhAuthStatus(null);
    }
  }, [profile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shortAddress = wallet?.publicKey
    ? `${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}`
    : '';

  const handleCopy = async () => {
    if (!wallet?.publicKey) return;
    await navigator.clipboard.writeText(wallet.publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    wallet?.disconnect?.();
    setMenuOpen(false);
  };

  // ——— NOT CONNECTED ———
  if (!isWalletConnected) {
    return (
      <RippleButton
        whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(46, 160, 67, 0.25)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setVisible(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#30363d] border border-[#30363d] hover:bg-accent-green/10 hover:border-accent-green/30 text-white text-sm font-bold transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-2 relative z-10 pointer-events-none">
          <Wallet className="w-4 h-4 text-accent-green animate-pulse" />
          Connect Wallet
        </div>
      </RippleButton>
    );
  }

  // ——— CONNECTED ———
  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(46, 160, 67, 0.25)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#30363d] border border-accent-green/30 hover:bg-accent-green/10 text-white text-sm font-bold transition-all duration-200 cursor-pointer"
      >
        {/* Online dot */}
        {ghAuthStatus === false ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
          </span>
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
        )}

        {profileLoading ? (
          <span className="text-text-main/60 text-xs">Loading...</span>
        ) : profile ? (
          <span className="text-accent-green text-xs font-mono">@{profile.githubUsername}</span>
        ) : (
          <span className="font-mono text-xs text-text-main/80">{shortAddress}</span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-text-main/50 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-[#161b22]/90 backdrop-blur-md rounded-2xl border border-[#30363d] shadow-2xl z-50 overflow-hidden"
          >
            {/* Profile header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-accent-green" />
                </div>
                <div>
                  {profile && (
                    <p className="text-xs font-bold text-white">@{profile.githubUsername}</p>
                  )}
                  <p className="text-[10px] text-text-main/40 font-mono">{shortAddress}</p>
                </div>
              </div>

              {/* ECOIN balance */}
              {profile && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent-green/5 border border-accent-green/10">
                  <Coins className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-xs text-accent-green font-bold">{profile.ecoinBalance} ECOIN</span>
                  <span className="ml-auto text-[10px] text-text-main/30">{profile.totalProofs} proofs</span>
                </div>
              )}

              {/* GitHub Auth Status */}
              {profile && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-[#161b22] border-[#30363d]">
                  {ghAuthStatus === false ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-xs text-yellow-500 font-bold">GitHub Auth Required</span>
                      <button 
                        onClick={async () => {
                          const { url } = await getGithubAuthUrl();
                          if (url) window.location.href = url;
                        }} 
                        className="ml-auto text-[10px] bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500 px-2 py-0.5 rounded cursor-pointer transition-colors font-bold"
                      >
                        Reconnect
                      </button>
                    </>
                  ) : ghAuthStatus === true ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-accent-green" />
                      <span className="text-xs text-accent-green font-bold">GitHub Authenticated</span>
                    </>
                  ) : (
                    <span className="text-xs text-text-main/50 font-bold px-1">Checking GitHub...</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="py-2">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text-main/70 hover:text-white hover:bg-[#30363d] transition-all cursor-pointer"
              >
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-accent-green" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>

              <a
                href={explorerAccountUrl(wallet.publicKey?.toBase58())}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text-main/70 hover:text-white hover:bg-[#30363d] transition-all"
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>

              <div className="my-1.5 border-t border-[#30363d]" />

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
