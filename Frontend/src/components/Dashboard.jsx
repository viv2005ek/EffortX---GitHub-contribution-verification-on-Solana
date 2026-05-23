import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import {
  Layout, BarChart3, Trophy, History, Activity, 
  Wallet, Coins, ShieldCheck, ArrowUpRight, Send, 
  ExternalLink, Code2 as Github, FileText, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { useSolana } from '../context/SolanaContext.jsx';
import { buyEcoins, transferEcoins, parseBlockchainError } from '../solana/program.js';
import { explorerTxUrl } from '../solana/config.js';
import toast from 'react-hot-toast';

// ----------------------------------------------------------------------
// HELPER COMPONENTS FOR UPGRADED UI
// ----------------------------------------------------------------------

const AnimatedCounter = ({ value, prefix = "", suffix = "" }) => {
  const ref = useRef(null);
  
  // Extract number from string if needed (e.g. "#4" -> 4)
  const cleanVal = value !== null && value !== undefined ? value.toString() : "";
  const num = parseFloat(cleanVal.replace(/[^0-9.]/g, ''));
  const count = useMotionValue(0);

  useEffect(() => {
    if (isNaN(num)) {
      if (ref.current) ref.current.textContent = cleanVal;
      return;
    }
    const controls = animate(count, num, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${Math.round(latest).toLocaleString()}${suffix}`;
        }
      }
    });
    return () => controls.stop();
  }, [num, value, prefix, suffix]);

  return <span ref={ref}>{cleanVal}</span>;
};

const RippleButton = ({ children, onClick, disabled, className, whileHover, whileTap, type = "button" }) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (e) => {
    if (disabled) return;
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
      type={type}
      whileHover={whileHover}
      whileTap={whileTap}
      disabled={disabled}
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

function PullToRefresh({ children, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const handleDrag = (event, info) => {
    const y = info.offset.y;
    if (y > 0) {
      setPullProgress(Math.min(y / 100, 1));
    }
  };

  const handleDragEnd = (event, info) => {
    setPullProgress(0);
    if (info.offset.y > 70 && !refreshing) {
      setRefreshing(true);
      onRefresh().finally(() => {
        setRefreshing(false);
      });
    }
  };

  return (
    <div className="relative overflow-visible">
      <motion.div
        style={{ height: pullProgress * 55 }}
        className="flex items-center justify-center text-accent-green text-xs font-bold gap-2 overflow-hidden pointer-events-none w-full"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-ping" />
        {refreshing ? "Refreshing proofs..." : "Pull down to refresh"}
      </motion.div>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// ----------------------------------------------------------------------

export default function Dashboard() {
  const { wallet, profile, leaderboard, userRank, userProofs, refreshProfile } = useSolana();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProof, setSelectedProof] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'proofs', label: 'On-Chain Proofs', icon: History },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  // Mobile Swipe tab handlers
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    
    // Check if horizontal swipe was dominant and long enough
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      const tabSequence = ['overview', 'stats', 'leaderboard', 'proofs', 'activity'];
      const currentIndex = tabSequence.indexOf(activeTab);
      if (diffX < 0) {
        // swipe left -> next
        if (currentIndex < tabSequence.length - 1) {
          setActiveTab(tabSequence[currentIndex + 1]);
        }
      } else {
        // swipe right -> prev
        if (currentIndex > 0) {
          setActiveTab(tabSequence[currentIndex - 1]);
        }
      }
    }
  };

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-accent-green/20 blur-[100px] rounded-full" />
        <ShieldCheck className="w-20 h-20 text-accent-green/50 mb-6 relative z-10" />
      </motion.div>
      <h2 className="text-3xl font-black text-white mb-3">No Profile Found</h2>
      <p className="text-text-main/60 max-w-md text-lg">Connect your wallet and create a profile to access the EffortX dashboard.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 min-h-[80vh] flex flex-col md:flex-row gap-8 relative z-10">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0">
        <div className="sticky top-28 space-y-6">
          {/* User Brief */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-3xl p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[#238636]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  whileHover={{ rotate: 10, scale: 1.05 }}
                  className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#3fb950] font-black text-2xl shadow-[0_0_15px_rgba(46,160,67,0.2)]"
                >
                  {profile.githubUsername[0].toUpperCase()}
                </motion.div>
                <div>
                  <h3 className="text-xl font-black text-white">@{profile.githubUsername}</h3>
                  <p className="text-xs text-text-main/40 font-mono mt-1 flex items-center gap-1 bg-black/20 px-2 py-1 rounded-md inline-flex border border-[#30363d]">
                    <Wallet className="w-3 h-3" />
                    {wallet.publicKey?.toBase58().slice(0, 4)}...{wallet.publicKey?.toBase58().slice(-4)}
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-black/40 border border-[#30363d] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-main/50 uppercase tracking-wider font-semibold">Global Rank</span>
                  <span className="text-sm font-black text-white">
                    {userRank ? `#${userRank}` : '—'}
                  </span>
                </div>
                <div className="h-px w-full bg-[#30363d]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-main/50 uppercase tracking-wider font-semibold">ECOIN Balance</span>
                  <span className="text-sm font-black text-accent-green flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(46,160,67,0.5)]">
                    <AnimatedCounter value={profile.ecoinBalance} /> <Coins className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group overflow-hidden ${
                    isActive 
                      ? 'text-white' 
                      : 'text-text-main/50 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabBg" 
                      className="absolute inset-0 bg-white/10 border border-[#30363d] rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-accent-green drop-shadow-[0_0_8px_rgba(46,160,67,0.5)]' : 'text-text-main/40 group-hover:text-white/70'}`} />
                    {tab.label}
                    {isActive && (
                      <motion.div layoutId="activeTabIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_rgba(46,160,67,0.8)]" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area with Touch Swiping */}
      <div 
        className="flex-1 min-w-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.05, duration: 0.5 }}
            className="h-full"
          >
            {activeTab === 'overview' && <OverviewTab profile={profile} userRank={userRank} refreshProfile={refreshProfile} wallet={wallet} />}
            {activeTab === 'stats' && <StatsTab profile={profile} userProofs={userProofs} />}
            {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} wallet={wallet} />}
            {activeTab === 'proofs' && <ProofsTab proofs={userProofs} onSelectProof={setSelectedProof} refreshProfile={refreshProfile} />}
            {activeTab === 'activity' && <ActivityTab proofs={userProofs} profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Proof Details Modal */}
      <AnimatePresence>
        {selectedProof && (
          <ProofModal proof={selectedProof} onClose={() => setSelectedProof(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------
// TABS COMPONENTS
// ----------------------------------------------------------------------

function OverviewTab({ profile, userRank, refreshProfile, wallet }) {
  const [solInput, setSolInput] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  const handleBuy = async (e) => {
    e.preventDefault();
    const solAmt = parseFloat(solInput);
    if (!solAmt || solAmt < 0.001) {
      toast.error('Minimum purchase is 0.001 SOL.');
      return;
    }
    setTxLoading(true);
    const toastId = toast.loading(`Buying ECOIN...`);
    try {
      await buyEcoins(wallet, solAmt);
      toast.success(`Purchase successful!`, { id: toastId });
      setSolInput('');
      refreshProfile();
    } catch (err) {
      toast.error(parseBlockchainError(err), { id: toastId });
    } finally {
      setTxLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amt = parseInt(transferAmount, 10);
    if (!transferTo.trim() || !amt || amt <= 0) return;
    setTxLoading(true);
    const toastId = toast.loading(`Transferring ECOIN...`);
    try {
      await transferEcoins(wallet, transferTo.trim(), amt);
      toast.success(`Transfer successful!`, { id: toastId });
      setTransferTo('');
      setTransferAmount('');
      refreshProfile();
    } catch (err) {
      toast.error(parseBlockchainError(err), { id: toastId });
    } finally {
      setTxLoading(false);
    }
  };

  const ecoinPreview = solInput ? Math.floor(parseFloat(solInput || 0) * 1000) : 0;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.3 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <StatCard title="Global Rank" value={userRank ? `#${userRank}` : '—'} icon={Trophy} color="text-yellow-400" bg="bg-yellow-400/10" border="border-yellow-400/20" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="ECOIN Balance" value={<AnimatedCounter value={profile.ecoinBalance} />} icon={Coins} color="text-accent-green" bg="bg-accent-green/10" border="border-accent-green/20" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Total XP" value={<AnimatedCounter value={profile.totalXp} />} icon={ArrowUpRight} color="text-purple-400" bg="bg-purple-400/10" border="border-purple-400/20" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Avg Score" value={profile.averageScore || '—'} icon={BarChart3} color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-green/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none transition-all duration-700 group-hover:bg-accent-green/10" />
          <div className="relative z-10">
            <h4 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent-green/20 flex items-center justify-center">
                <Coins className="w-4 h-4 text-accent-green" />
              </div>
              Buy ECOIN
            </h4>
            <form onSubmit={handleBuy} className="space-y-5">
              <div>
                <label className="text-xs text-text-main/50 mb-2 block uppercase tracking-wider font-bold">Amount in SOL</label>
                <div className="relative">
                  <input
                    type="number" min="0.001" step="0.001"
                    value={solInput} onChange={(e) => setSolInput(e.target.value)}
                    placeholder="0.1" disabled={txLoading}
                    className="w-full bg-black/40 border border-[#30363d] rounded-2xl pl-4 pr-16 py-4 text-white focus:border-accent-green/50 focus:ring-1 focus:ring-accent-green/50 transition-all font-mono text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-main/50 pointer-events-none">SOL</div>
                </div>
                <AnimatePresence>
                  {ecoinPreview > 0 && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-accent-green font-bold mt-3 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4" /> ≈ <AnimatedCounter value={ecoinPreview} /> ECOIN
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <RippleButton 
                type="submit" 
                disabled={txLoading || !solInput} 
                className="w-full py-4 rounded-2xl font-black bg-accent-green text-black hover:bg-[#3fb950] transition-all disabled:opacity-50 shadow-glow cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="relative z-10 pointer-events-none">{txLoading ? 'Processing on Solana...' : 'Purchase ECOIN'}</span>
              </RippleButton>
            </form>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none transition-all duration-700 group-hover:bg-accent-blue/10" />
          <div className="relative z-10">
            <h4 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                <Send className="w-4 h-4 text-accent-blue" />
              </div>
              Transfer ECOIN
            </h4>
            <form onSubmit={handleTransfer} className="space-y-5">
              <div>
                <label className="text-xs text-text-main/50 mb-2 block uppercase tracking-wider font-bold">Recipient Wallet</label>
                <input
                  type="text" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="Solana Address" disabled={txLoading}
                  className="w-full bg-black/40 border border-[#30363d] rounded-2xl px-4 py-4 text-white focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/50 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-text-main/50 mb-2 block uppercase tracking-wider font-bold">Amount (ECOIN)</label>
                <div className="relative">
                  <input
                    type="number" min="1" max={profile.ecoinBalance}
                    value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="100" disabled={txLoading}
                    className="w-full bg-black/40 border border-[#30363d] rounded-2xl pl-4 pr-20 py-4 text-white focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/50 transition-all font-mono text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-main/50 pointer-events-none">ECOIN</div>
                </div>
              </div>
              <RippleButton 
                type="submit" 
                disabled={txLoading || !transferTo || !transferAmount} 
                className="w-full py-4 rounded-2xl font-black bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50 border border-[#30363d] cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
                  {txLoading ? 'Transferring...' : 'Send ECOIN'}
                  {!txLoading && <ArrowUpRight className="w-4 h-4" />}
                </span>
              </RippleButton>
            </form>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatsTab({ profile, userProofs }) {
  const highestScore = userProofs.length > 0 ? Math.max(...userProofs.map(p => p.effortScore)) : 0;
  
  return (
    <div className="space-y-6">
      <div className="glass-card p-10 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        
        <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-accent-green" />
          </div>
          Contribution Analytics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {[
            { label: 'Total Analyzed', value: profile.totalProofs, sub: 'Commits & PRs', color: 'text-white' },
            { label: 'Total Earned', value: <AnimatedCounter value={profile.ecoinEarned} />, sub: 'Lifetime ECOIN', color: 'text-accent-green' },
            { label: 'Avg Score', value: profile.averageScore, sub: 'Out of 100', color: 'text-blue-400' },
            { label: 'Best Score', value: highestScore, sub: 'All time high', color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5, scale: 1.02 }}
              className="p-6 rounded-3xl bg-black/40 border border-[#30363d] shadow-inner "
            >
              <p className="text-xs text-text-main/50 uppercase tracking-widest font-bold mb-3">{stat.label}</p>
              <p className={`text-4xl font-black ${stat.color} mb-1 drop-shadow-md`}>
                {stat.value}
              </p>
              <p className="text-xs text-text-main/40 font-medium">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Chart Placeholder */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="glass-card p-10 rounded-[2rem] h-72 flex flex-col items-center justify-center text-center relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-[#3fb950]/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <Activity className="w-16 h-16 text-white/20 mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:text-white/40" />
        <h4 className="text-xl font-black text-white mb-2 relative z-10">Activity Visualization</h4>
        <p className="text-sm text-text-main/50 relative z-10 max-w-sm">Advanced charting capabilities are coming to EffortX Analytics in v2.0.</p>
        <div className="absolute bottom-6 px-4 py-1 rounded-full border border-[#30363d] bg-[#30363d] text-xs font-bold text-white/50 tracking-widest uppercase">Coming Soon</div>
      </motion.div>
    </div>
  );
}

function LeaderboardTab({ leaderboard, wallet }) {
  const [mode, setMode] = useState('effort');

  const ecoinList = leaderboard; 

  const effortList = useMemo(() => {
    if (!leaderboard.length) return [];
    const sorted = [...leaderboard].sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore; 
      if (b.totalProofs !== a.totalProofs) return b.totalProofs - a.totalProofs;     
      return b.totalXp - a.totalXp;                                                  
    });
    return sorted.map((u, i) => ({ ...u, effortRank: i + 1 }));
  }, [leaderboard]);

  const getQualityLabel = (user) => {
    if (user.averageScore >= 85 && user.totalProofs >= 5) return { label: 'Architect', color: 'text-accent-green border-accent-green/30 bg-accent-green/10' };
    if (user.averageScore >= 75 && user.totalProofs >= 3) return { label: 'High Impact', color: 'text-accent-green/80 border-accent-green/20 bg-accent-green/5' };
    if (user.totalProofs >= 8) return { label: 'Consistent', color: 'text-accent-green/70 border-accent-green/20 bg-accent-green/5' };
    if (user.averageScore >= 65) return { label: 'Verified', color: 'text-accent-green/60 border-accent-green/10 bg-accent-green/5' };
    return null;
  };

  const activeList = mode === 'ecoin' ? ecoinList : effortList;
  const myWallet = wallet.publicKey?.toBase58();
  const rankKey = mode === 'ecoin' ? 'globalRank' : 'effortRank';

  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
  };

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-8 border-b border-[#30363d] relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400/80" />
            {mode === 'effort' ? 'Contribution Leaderboard' : 'ECOIN Leaderboard'}
          </h3>
          <p className="text-sm text-text-main/40 mt-1 font-medium">
            {mode === 'effort' 
              ? 'Ranked by engineering quality and proof consistency.' 
              : 'Ranked by ECOIN holdings and community XP.'}
          </p>
        </div>

        {/* Toggle */}
        <div className="relative flex items-center p-1 rounded-xl bg-black/20 border border-[#30363d] w-fit">
          <motion.div
            layout
            layoutId="leaderboardModePill"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            className="absolute top-1 h-[calc(100%-8px)] rounded-lg bg-[#30363d] shadow-sm"
            style={{ 
              left: mode === 'effort' ? '4px' : 'auto',
              right: mode === 'ecoin' ? '4px' : 'auto',
              width: 'calc(50% - 4px)'
            }}
          />

          <button
            onClick={() => setMode('effort')}
            className={`relative z-10 px-6 py-2 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'effort' ? 'text-white' : 'text-text-main/40 hover:text-text-main/60'
            }`}
          >
            Ref. Effort
          </button>
          <button
            onClick={() => setMode('ecoin')}
            className={`relative z-10 px-6 py-2 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'ecoin' ? 'text-white' : 'text-text-main/40 hover:text-text-main/60'
            }`}
          >
            ECOIN
          </button>
        </div>
      </div>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-text-main/30 uppercase tracking-widest font-black bg-black/10 border-b border-[#30363d]">
                <th className="p-6 pl-8 w-24">Rank</th>
                <th className="p-6">Developer</th>
                {mode === 'effort' ? (
                  <>
                    <th className="p-6">Quality Score</th>
                    <th className="p-6">Proofs</th>
                    <th className="p-6 pr-8 text-right">Badge</th>
                  </>
                ) : (
                  <>
                    <th className="p-6">Balance</th>
                    <th className="p-6">XP</th>
                    <th className="p-6 pr-8 text-right">Proofs</th>
                  </>
                )}
              </tr>
            </thead>
            <motion.tbody
              variants={listContainerVariants}
              initial="hidden"
              animate="show"
            >
              {activeList.map((user, i) => {
                const isMe = user.wallet === myWallet;
                const rank = user[rankKey];
                const badge = mode === 'effort' ? getQualityLabel(user) : null;

                return (
                  <motion.tr
                    variants={listItemVariants}
                    key={`${user.wallet}-${mode}`}
                    className={`border-b border-[#30363d]/50 transition-colors ${
                      isMe ? 'bg-accent-green/[0.03]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="p-6 pl-8">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${
                        rank === 1 ? 'border-yellow-400/30 text-yellow-400 bg-yellow-400/5 shadow-[0_0_10px_rgba(250,204,21,0.1)]' :
                        rank === 2 ? 'border-gray-400/30 text-gray-300 bg-gray-400/5' :
                        rank === 3 ? 'border-amber-700/30 text-amber-600 bg-amber-700/5' :
                        'border-transparent text-text-main/30'
                      }`}>
                        {rank}
                      </div>
                    </td>

                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                          isMe ? 'bg-accent-green/10 border-accent-green/20 text-accent-green' : 'bg-[#30363d]/50 border-[#30363d] text-white/70'
                        }`}>
                          {user.githubUsername[0].toUpperCase()}
                        </div>
                        <span className={`font-bold text-sm ${isMe ? 'text-accent-green' : 'text-white/90'}`}>
                          @{user.githubUsername}
                        </span>
                      </div>
                    </td>

                    {mode === 'effort' ? (
                      <>
                        <td className="p-6">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-accent-green/5 text-accent-green font-bold text-xs">
                            {user.averageScore}
                          </div>
                        </td>
                        <td className="p-6 text-sm text-white/60 font-bold">
                          {user.totalProofs}
                        </td>
                        <td className="p-6 pr-8 text-right">
                          {badge ? (
                            <span className={`text-[9px] px-2 py-0.5 rounded border font-black uppercase tracking-wider ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : <span className="text-text-main/10 text-[9px] font-black uppercase tracking-wider">—</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-6">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-accent-green/5 text-accent-green font-bold text-xs">
                            <AnimatedCounter value={user.ecoinBalance} />
                          </div>
                        </td>
                        <td className="p-6 text-sm text-white/60 font-bold">
                          <AnimatedCounter value={user.totalXp} />
                        </td>
                        <td className="p-6 pr-8 text-right text-text-main/40 text-sm font-bold">
                          {user.totalProofs}
                        </td>
                      </>
                    )}
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProofsTab({ proofs, onSelectProof, refreshProfile }) {
  if (proofs.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-16 rounded-[2rem] text-center flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-[#30363d] flex items-center justify-center mb-6 border border-[#30363d]">
          <FileText className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3">No Immutable Proofs</h3>
        <p className="text-text-main/50 max-w-md">Analyze a GitHub commit on the home page and sign to store the proof permanently on Solana to build your reputation.</p>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <PullToRefresh onRefresh={refreshProfile}>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {proofs.map((proof, i) => (
          <motion.div
            variants={itemVariants}
            key={proof.commitHash}
            whileHover={{ scale: 1.025, y: -4 }}
            onClick={() => onSelectProof(proof)}
            className="glass-card p-6 rounded-3xl cursor-pointer hover:border-accent-green/40 hover:shadow-[0_8px_30px_rgba(46,160,67,0.15)] transition-all duration-300 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-green/10 rounded-full blur-[60px] -mr-24 -mt-24 group-hover:bg-accent-green/20 transition-all duration-500 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                    <Github className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-main/60">Verified Commit</span>
                </div>
                <h4 className="text-xl font-black text-white font-mono group-hover:text-accent-green transition-colors">{proof.commitHash.slice(0, 8)}...</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-text-main/50 uppercase tracking-widest bg-black/40 border border-[#30363d] px-3 py-1.5 rounded-lg shadow-sm">
                  {new Date(proof.timestamp * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="flex gap-6 relative z-10 p-5 rounded-2xl bg-black/30 border border-[#30363d]">
              <div>
                <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-1.5">Effort Score</p>
                <p className="text-2xl font-black text-accent-green">
                  <AnimatedCounter value={proof.effortScore} />
                </p>
              </div>
              <div className="w-px h-10 bg-white/10 my-auto" />
              <div>
                <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-1.5">Reward</p>
                <p className="text-2xl font-black text-accent-green flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(46,160,67,0.4)]">
                  +<AnimatedCounter value={proof.rewardCoins} /> <Coins className="w-4 h-4" />
                </p>
              </div>
              <div className="ml-auto mt-auto">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 45 }}
                  className="w-10 h-10 rounded-xl bg-[#30363d] flex items-center justify-center group-hover:bg-accent-green group-hover:text-black transition-colors duration-300 shadow-sm border border-[#30363d] group-hover:border-transparent"
                >
                  <ArrowUpRight className="w-4 h-4 text-white/70 group-hover:text-black" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </PullToRefresh>
  );
}

function ActivityTab({ proofs, profile }) {
  const events = useMemo(() => {
    const list = proofs.map(p => ({
      type: 'proof',
      title: 'Commit Verified on Chain',
      desc: `Commit ${p.commitHash.slice(0, 8)} analyzed with score ${p.effortScore}`,
      reward: p.rewardCoins,
      timestamp: p.timestamp
    }));
    
    if (profile) {
      list.push({
        type: 'creation',
        title: 'Reputation Profile Created',
        desc: `Joined the EffortX network as @${profile.githubUsername}`,
        reward: null,
        timestamp: profile.createdAt || 0
      });
    }
    
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [proofs, profile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="glass-card p-10 rounded-[2rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />
      
      <h3 className="text-2xl font-black text-white mb-10 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-[#238636]/20 border border-[#3fb950]/30 flex items-center justify-center shadow-[0_0_15px_rgba(46,160,67,0.2)]">
          <Activity className="w-5 h-5 text-[#3fb950]" />
        </div>
        Activity Timeline
      </h3>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 relative z-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-[#30363d]"
      >
        {events.map((event, i) => (
          <motion.div 
            variants={itemVariants}
            key={i} 
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${event.type === 'proof' ? 'border-[#3fb950] bg-[#238636]/10 text-[#3fb950] shadow-[0_0_15px_rgba(46,160,67,0.3)]' : 'border-[#2ea043] bg-[#2ea043]/10 text-[#2ea043] shadow-[0_0_15px_rgba(46,160,67,0.3)]'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform duration-300 group-hover:scale-110`}>
              {event.type === 'proof' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-[#161b22] border border-[#30363d] hover:border-[#3fb950]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-black text-white">{event.title}</h4>
                <span className="text-[10px] font-bold text-text-main/50 uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-md">
                  {new Date(event.timestamp * 1000).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-text-main/70 mb-4 font-medium leading-relaxed">{event.desc}</p>
              {event.reward && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-accent-green bg-accent-green/10 border border-accent-green/20 px-3 py-1.5 rounded-lg shadow-sm">
                  +<AnimatedCounter value={event.reward} /> ECOIN
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SHARED COMPONENTS
// ----------------------------------------------------------------------

function StatCard({ title, value, icon: Icon, color, bg, border }) {
  return (
    <div className="glass-card p-6 rounded-3xl flex items-center gap-5 transition-colors group">
      <div className={`w-14 h-14 rounded-2xl ${bg} ${border} border flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-1">{title}</p>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ProofModal({ proof, onClose }) {
  const { profile } = useSolana();
  const url = `https://github.com/${profile.githubUsername}/commit/${proof.commitHash}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 "
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#161b22] rounded-[2rem] border border-[#30363d] shadow-2xl overflow-hidden p-8"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-[#3fb950]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-green/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10 cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-accent-green/10 border border-accent-green/30 flex items-center justify-center shadow-[0_0_15px_rgba(46,160,67,0.2)]">
            <ShieldCheck className="w-7 h-7 text-accent-green" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Proof Certificate</h2>
            <p className="text-xs text-text-main/50 font-bold uppercase tracking-widest mt-1">Verified on Solana Blockchain</p>
          </div>
        </div>

        <div className="space-y-4 mb-8 relative z-10">
          <div className="bg-black/40 rounded-2xl p-5 border border-[#30363d]">
            <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-2">Commit Hash</p>
            <p className="text-sm font-mono text-white/90 break-all bg-black/50 p-3 rounded-xl border border-[#30363d]">{proof.commitHash}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-2xl p-5 border border-[#30363d]">
              <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-2">Effort Score</p>
              <p className="text-3xl font-black text-blue-400 drop-shadow-md">
                <AnimatedCounter value={proof.effortScore} />
              </p>
            </div>
            <div className="bg-black/40 rounded-2xl p-5 border border-[#30363d]">
              <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-2">Reward</p>
              <p className="text-3xl font-black text-accent-green flex items-center gap-2 drop-shadow-[0_0_8px_rgba(46,160,67,0.4)]">
                <AnimatedCounter value={proof.rewardCoins} /> <Coins className="w-5 h-5" />
              </p>
            </div>
          </div>
          
          <div className="bg-black/40 rounded-2xl p-5 border border-[#30363d]">
            <p className="text-[10px] text-text-main/50 uppercase tracking-widest font-bold mb-2">Timestamp</p>
            <p className="text-sm text-white font-medium bg-black/50 p-3 rounded-xl border border-[#30363d] inline-block">
              {new Date(proof.timestamp * 1000).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-4 px-4 rounded-xl font-black text-sm bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-2 border border-[#30363d]"
          >
            <Github className="w-4 h-4" /> View on GitHub
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(proof.commitHash);
              toast.success('Commit hash copied!');
            }}
            className="flex-1 py-4 px-4 rounded-xl font-black text-sm border border-[#30363d] hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Copy Hash
          </button>
        </div>
      </motion.div>
    </div>
  );
}
