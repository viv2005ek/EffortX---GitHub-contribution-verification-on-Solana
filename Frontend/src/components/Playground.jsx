import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useSolana } from '../context/SolanaContext';
import { estimatePlaygroundTokens, chatWithPlayground, chatWithDappier } from '../services/api';
import { transferEcoins, parseBlockchainError } from '../solana/program';
import TypingMessage from './TypingMessage';
import toast from 'react-hot-toast';

// The admin wallet that receives the ECOIN payments
const ADMIN_WALLET = 'GNN25gvBm4LZ9sWFBqpDKtYFtpeyT9krJtPpU4myEpJP';

// ----------------------------------------------------------------------
// 3D ROTATING SOLANA LOGO COMPONENT & HELPERS
// ----------------------------------------------------------------------

const LoadingWords = () => {
  const words = [
    'EffortX', 'Analyzing', 'Verifying', 'Scoring', 'Minting', 'Syncing', 
    'Computing', 'Evaluating', 'Proofing', 'Hashing', 'Staking', 
    'Calibrating', 'Indexing', 'Validating', 'Parsing', 'Quantizing', 'Assessing'
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-xs text-white/50 font-mono tracking-widest uppercase inline-block min-w-[100px] text-left">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="inline-block"
        >
          {words[index]}…
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
const SolanaLogo3D = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none z-0 overflow-hidden">
      <motion.div
        animate={{
          rotateY: 360,
          rotateX: [10, 20, 10],
        }}
        transition={{
          rotateY: { repeat: Infinity, duration: 20, ease: "linear" },
          rotateX: { repeat: Infinity, duration: 6, ease: "easeInOut" }
        }}
        className="w-80 h-80"
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      >
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-accent-green">
          <path d="m23.8764 18.0313-3.962 4.1393a.9201.9201 0 0 1-.306.2106.9407.9407 0 0 1-.367.0742H.4599a.4689.4689 0 0 1-.2522-.0733.4513.4513 0 0 1-.1696-.1962.4375.4375 0 0 1-.0314-.2545.4438.4438 0 0 1 .117-.2298l3.9649-4.1393a.92.92 0 0 1 .3052-.2102.9407.9407 0 0 1 .3658-.0746H23.54a.4692.4692 0 0 1 .2523.0734.4531.4531 0 0 1 .1697.196.438.438 0 0 1 .0313.2547.4442.4442 0 0 1-.1169.2297zm-3.962-8.3355a.9202.9202 0 0 0-.306-.2106.941.941 0 0 0-.367-.0742H.4599a.4687.4687 0 0 0-.2522.0734.4513.4513 0 0 0-.1696.1961.4376.4376 0 0 0-.0314.2546.444.444 0 0 0 .117.2297l3.9649 4.1394a.9204.9204 0 0 0 .3052.2102c.1154.049.24.0744.3658.0746H23.54a.469.469 0 0 0 .2523-.0734.453.453 0 0 0 .1697-.1961.4382.4382 0 0 0 .0313-.2546.4444.4444 0 0 0-.1169-.2297zM.46 6.7225h18.7815a.9411.9411 0 0 0 .367-.0742.9202.9202 0 0 0 .306-.2106l3.962-4.1394a.4442.4442 0 0 0 .117-.2297.4378.4378 0 0 0-.0314-.2546.453.453 0 0 0-.1697-.196.469.469 0 0 0-.2523-.0734H4.7596a.941.941 0 0 0-.3658.0745.9203.9203 0 0 0-.3052.2102L.1246 5.9687a.4438.4438 0 0 0-.1169.2295.4375.4375 0 0 0 .0312.2544.4512.4512 0 0 0 .1692.196.4689.4689 0 0 0 .2518.0739z" fill="currentColor"/>
        </svg>
      </motion.div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MODEL DEFINITIONS
// ----------------------------------------------------------------------
const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini-2.5-Flash', cost: 'Variable', active: true, type: 'gemini' },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', cost: 'Variable', active: false, type: 'gemini', soon: true },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', cost: 'Variable', active: false, type: 'gemini', soon: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', cost: 'Variable', active: false, type: 'gemini', soon: true }
];

const DAPPIER_GROUPS = [
  {
    name: 'General',
    models: [
      { id: 'real-time-search', name: 'Real Time Search', cost: 0, active: true, type: 'dappier' }
    ]
  },
  {
    name: 'Academic & Research',
    models: [
      { id: 'research-papers', name: 'Research Papers', cost: 3, active: true, type: 'dappier' }
    ]
  },
  {
    name: 'Financial & Market Data',
    models: [
      { id: 'stock-market', name: 'Stock Market Data', cost: 7, active: true, type: 'dappier' },
      { id: 'benzinga', name: 'Benzinga', cost: 20, active: true, type: 'dappier' }
    ]
  },
  {
    name: 'News & Lifestyle',
    models: [
      { id: 'sports-news', name: 'Sports News', cost: 10, active: true, type: 'dappier' },
      { id: 'lifestyle-news', name: 'Lifestyle News', cost: 10, active: true, type: 'dappier' }
    ]
  },
  {
    name: 'Health & Wellness',
    models: [
      { id: 'iheartcats', name: 'iHeartCats', cost: 1, active: true, type: 'dappier' },
      { id: 'iheartdogs', name: 'iHeartDogs', cost: 1, active: true, type: 'dappier' },
      { id: 'cafemom-parenting', name: 'CafeMom Parenting', cost: 1, active: true, type: 'dappier' }
    ]
  }
];

const CLAUDE_MODELS = [
  { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'Variable', active: false, type: 'claude', soon: true },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'Variable', active: false, type: 'claude', soon: true },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', cost: 'Variable', active: false, type: 'claude', soon: true }
];

const CODEX_MODELS = [
  { id: 'codex-gpt-4.1', name: 'GPT-4.1 Codex', cost: 'Variable', active: false, type: 'codex', soon: true },
  { id: 'codex-optimized', name: 'Codex Optimized', cost: 'Variable', active: false, type: 'codex', soon: true }
];

const ALL_MODELS = [
  ...GEMINI_MODELS,
  ...DAPPIER_GROUPS.flatMap(g => g.models),
  ...CLAUDE_MODELS,
  ...CODEX_MODELS
];

const DEFAULT_MODEL = DAPPIER_GROUPS.find(g => g.name === 'General').models[0];

// ----------------------------------------------------------------------
// Sidebar section component (collapsible top‑level)
// ----------------------------------------------------------------------
const SidebarSection = ({ title, icon, children, isOpen, onToggle }) => {
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#161b22]/30 backdrop-blur-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-[#161b22]/50 hover:bg-[#161b22] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-xs text-white/95 tracking-wide">{title}</span>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-text-main/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/5 bg-black/10 p-2 space-y-1.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ----------------------------------------------------------------------
// Model button component
// ----------------------------------------------------------------------
const ModelButton = ({ model, isSelected, onSelect }) => {
  const isSoon = model.soon === true;
  const handleClick = () => {
    if (isSoon) {
      toast.info(`${model.name} is coming soon!`, { icon: '🚀' });
      return;
    }
    onSelect(model);
  };

  const baseClasses = "w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-between";
  const soonClasses = "cursor-default bg-transparent border-transparent text-text-main/40";
  const activeClasses = isSelected && !isSoon
    ? "bg-accent-green/10 border-accent-green/30 text-white shadow-[0_0_12px_rgba(46,160,67,0.15)]"
    : "bg-transparent border-transparent text-text-main/60 hover:bg-white/5 hover:text-white";

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${isSoon ? soonClasses : activeClasses}`}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{model.name}</span>
          {isSoon && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-md">
              Soon
            </span>
          )}
        </div>
        <span className={`text-[9px] mt-0.5 font-medium ${isSelected && !isSoon ? 'text-accent-green' : 'text-text-main/40'}`}>
          {model.cost === 0 ? 'Free' : model.cost === 'Variable' ? 'Variable' : `${model.cost} ECOIN`}
        </span>
      </div>
      {isSelected && !isSoon ? (
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_#2ea043]"></span>
      ) : (
        <svg className="w-3.5 h-3.5 text-text-main/20 opacity-0 group-hover/model:opacity-100 transition-all transform translate-x-1 group-hover/model:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

// ----------------------------------------------------------------------
// Group header icons
// ----------------------------------------------------------------------
const GroupIcon = ({ name }) => {
  switch (name) {
    case 'General':
      return (
        <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'Academic & Research':
      return (
        <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'Financial & Market Data':
      return (
        <svg className="w-4 h-4 text-[#fbbf24]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'News & Lifestyle':
      return (
        <svg className="w-4 h-4 text-[#f472b6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      );
    case 'Health & Wellness':
      return (
        <svg className="w-4 h-4 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
  }
};

// ----------------------------------------------------------------------
// MAIN PLAYGROUND COMPONENT
// ----------------------------------------------------------------------
export default function Playground() {
  const { isWalletConnected, wallet, profile, refreshProfile } = useSolana();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  const [conversations, setConversations] = useState(() => {
    const initial = {};
    ALL_MODELS.forEach(model => { initial[model.id] = []; });
    return initial;
  });

  const messages = conversations[selectedModel.id] || [];
  const setMessages = (newMsgs) => {
    setConversations(prev => ({
      ...prev,
      [selectedModel.id]: newMsgs
    }));
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const messagesEndRef = useRef(null);

  // Top-level accordion state
  const [openSections, setOpenSections] = useState({
    gemini: false,
    dappier: true,   
    claude: false,
    codex: false
  });

  // Dappier categories
  const [openDappierCategory, setOpenDappierCategory] = useState('General');

  const toggleTopLevel = (section) => {
    setOpenSections(prev => ({
      gemini: section === 'gemini' ? !prev.gemini : false,
      dappier: section === 'dappier' ? !prev.dappier : false,
      claude: section === 'claude' ? !prev.claude : false,
      codex: section === 'codex' ? !prev.codex : false,
    }));
  };

  const toggleDappierCategory = (categoryName) => {
    setOpenDappierCategory(prev => (prev === categoryName ? null : categoryName));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const calculateEstimate = async (text) => {
    if (!text.trim()) {
      setEstimatedCost(null);
      return null;
    }
    if (selectedModel.type === 'dappier') {
      const cost = selectedModel.cost;
      setEstimatedCost(cost);
      return cost;
    }
    try {
      const totalChars = messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) + text.length;
      const estimatedTokens = Math.ceil(totalChars / 4);
      const cost = Math.max(2, Math.ceil(estimatedTokens / 50));
      setEstimatedCost(cost);
      return cost;
    } catch (e) {
      console.error(e);
      setEstimatedCost(2);
      return 2;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateEstimate(input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input, messages, selectedModel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isTransferring) return;
    if (!isWalletConnected || !wallet || !wallet.publicKey || !wallet.connected) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }

    const currentInput = input;
    setInput('');
    setEstimatedCost(null);

    const newUserMessage = { role: 'user', content: currentInput };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);

    try {
      setIsLoading(true);
      let cost = 0;

      if (selectedModel.type === 'dappier') {
        cost = selectedModel.cost;
      } else {
        const estimateRes = await estimatePlaygroundTokens(newMessages, selectedModel.id);
        cost = estimateRes.ecoinCost !== undefined ? estimateRes.ecoinCost : 2;
      }

      if (cost > 0 && (!profile || profile.ecoinBalance < cost)) {
        toast.error(`Insufficient ECOIN balance. Needed: ${cost} ECOIN`);
        setIsLoading(false);
        setMessages(messages);
        setInput(currentInput);
        return;
      }

      if (cost > 0) {
        setIsTransferring(true);
        setIsLoading(false);
        const toastId = toast.loading(`Transferring ${cost} ECOIN...`);
        try {
          await transferEcoins(wallet, ADMIN_WALLET, cost);
          toast.success(`Transferred ${cost} ECOIN successfully!`, { id: toastId });
          refreshProfile();
        } catch (txError) {
          console.error("Transfer error:", txError);
          const readableError = parseBlockchainError(txError);
          toast.error(readableError, { id: toastId });
          setIsTransferring(false);
          setMessages(messages);
          setInput(currentInput);
          return;
        }
      }

      setIsTransferring(false);
      setIsLoading(true);

      let aiRes;
      if (selectedModel.type === 'dappier') {
        aiRes = await chatWithDappier(selectedModel.id, currentInput, wallet.publicKey.toBase58());
      } else {
        aiRes = await chatWithPlayground(newMessages, wallet.publicKey.toBase58(), selectedModel.id);
      }

      if (aiRes.success) {
        setMessages([...newMessages, { role: 'assistant', content: aiRes.reply }]);
      } else {
        throw new Error(aiRes.error || "Failed to get AI response");
      }

    } catch (error) {
      console.error(error);
      toast.error(error.message || "An error occurred.");
      setMessages(messages);
      setInput(currentInput);
    } finally {
      setIsLoading(false);
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 3D Tilt for Chat Area box
  const chatX = useMotionValue(0);
  const chatY = useMotionValue(0);
  const chatXSpring = useSpring(chatX, { stiffness: 120, damping: 28 });
  const chatYSpring = useSpring(chatY, { stiffness: 120, damping: 28 });
  const chatRotateX = useTransform(chatYSpring, [-0.5, 0.5], ["2deg", "-2deg"]);
  const chatRotateY = useTransform(chatXSpring, [-0.5, 0.5], ["-2deg", "2deg"]);

  const handleChatMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    chatX.set(mouseX / width - 0.5);
    chatY.set(mouseY / height - 0.5);
  };

  const handleChatMouseLeave = () => {
    chatX.set(0);
    chatY.set(0);
  };

  if (!isWalletConnected || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 relative">
        <SolanaLogo3D />
        <h2 className="text-2xl font-bold text-white mb-4">Connect to Access Playground</h2>
        <p className="text-text-main/60 mb-8 max-w-md">
          The AI Playground requires an active on-chain profile and ECOIN balance to use premium developer models.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-12 relative overflow-visible">
      {/* 3D Solana logo in background */}
      <SolanaLogo3D />

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">AI Playground</h1>
          <p className="text-accent-green/80 mt-1 font-bold text-sm uppercase tracking-widest">Premium developer AI tooling powered by your on-chain reputation.</p>
        </div>

        <div className="flex items-center gap-4 bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-xl p-4 shadow-sm">
          <div className="text-sm">
            <div className="text-text-main/60 uppercase tracking-widest text-[10px] font-black">Balance</div>
            <div className="font-bold text-accent-green text-lg drop-shadow-md">{profile.ecoinBalance} ECOIN</div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-sm">
            <div className="text-text-main/60 uppercase tracking-widest text-[10px] font-black">Est. Cost</div>
            <div className="font-bold text-white text-lg">{estimatedCost !== null ? estimatedCost : '-'} ECOIN</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Sidebar - glassmorphism wrapper */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              AI Engines
            </h3>
            <span className="text-[10px] bg-accent-green/10 text-accent-green border border-accent-green/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {ALL_MODELS.length} Models
            </span>
          </div>

          {/* Gemini Section */}
          <SidebarSection
            title="Gemini"
            icon={<svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" /></svg>}
            isOpen={openSections.gemini}
            onToggle={() => toggleTopLevel('gemini')}
          >
            {GEMINI_MODELS.map(model => (
              <ModelButton
                key={model.id}
                model={model}
                isSelected={selectedModel.id === model.id}
                onSelect={setSelectedModel}
              />
            ))}
          </SidebarSection>

          {/* Dappier Section */}
          <SidebarSection
            title="Dappier"
            icon={<svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            isOpen={openSections.dappier}
            onToggle={() => toggleTopLevel('dappier')}
          >
            {DAPPIER_GROUPS.map(group => {
              const isOpen = openDappierCategory === group.name;
              return (
                <div key={group.name} className="mt-1 first:mt-0">
                  <button
                    onClick={() => toggleDappierCategory(group.name)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-text-main/50 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <GroupIcon name={group.name} />
                      <span>{group.name}</span>
                    </div>
                    <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden pl-2 space-y-1.5"
                      >
                        {group.models.map(model => (
                          <ModelButton
                            key={model.id}
                            model={model}
                            isSelected={selectedModel.id === model.id}
                            onSelect={setSelectedModel}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </SidebarSection>

          {/* Claude Section */}
          <SidebarSection
            title="Claude"
            icon={<svg className="w-4 h-4 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            isOpen={openSections.claude}
            onToggle={() => toggleTopLevel('claude')}
          >
            {CLAUDE_MODELS.map(model => (
              <ModelButton
                key={model.id}
                model={model}
                isSelected={selectedModel.id === model.id}
                onSelect={setSelectedModel}
              />
            ))}
          </SidebarSection>

          {/* Codex Section */}
          <SidebarSection
            title="Codex"
            icon={<svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            isOpen={openSections.codex}
            onToggle={() => toggleTopLevel('codex')}
          >
            {CODEX_MODELS.map(model => (
              <ModelButton
                key={model.id}
                model={model}
                isSelected={selectedModel.id === model.id}
                onSelect={setSelectedModel}
              />
            ))}
          </SidebarSection>
        </div>

        {/* 3D Floating Chat Area */}
        <motion.div 
          onMouseMove={handleChatMouseMove}
          onMouseLeave={handleChatMouseLeave}
          style={{
            rotateX: chatRotateX,
            rotateY: chatRotateY,
            transformStyle: "preserve-3d"
          }}
          className="lg:col-span-3 flex flex-col h-[500px] bg-[#0d1117]/85 backdrop-blur-md border border-[#30363d] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.7)] relative group"
        >
          {/* Neon inner edge reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#3fb950]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-accent-green scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                  {selectedModel.type === 'dappier' ? (
                    <GroupIcon name={DAPPIER_GROUPS.find(g => g.models.some(m => m.id === selectedModel.id))?.name} />
                  ) : (
                    <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <p className="text-lg font-bold text-white mb-1">Query {selectedModel.name}</p>
                <p className="text-sm text-text-main/60 max-w-sm">
                  {selectedModel.id === 'gemini-2.5-flash'
                    ? "Ask coding questions, review logic, or generate snippets."
                    : selectedModel.id === 'real-time-search'
                      ? "Search the web in real-time with zero latency."
                      : `Get specialized insight from the ${selectedModel.name} model.`}
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-5 py-3 ${
                      msg.role === 'user'
                        ? 'bg-accent-green text-black font-medium shadow-[0_4px_15px_rgba(46,160,67,0.2)]'
                        : 'bg-white/10 text-white border border-white/5 backdrop-blur-sm'
                    }`}
                  >
                    <div className="text-sm leading-relaxed markdown-content">
                      {msg.role === 'assistant' ? (
                        /* ── #4.2 Typing animation – keyed by index so each message
                             mounts fresh and types from the start ── */
                        <TypingMessage key={i} text={msg.content} speed={28} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTransferring && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-[#161b22] border border-[#3fb950]/30 text-accent-green rounded-2xl px-5 py-3 text-sm flex items-center gap-3 font-bold shadow-sm">
                  <div className="w-4 h-4 border-2 border-[#3fb950]/30 border-t-accent-green rounded-full animate-spin"></div>
                  Transferring ECOIN...
                </div>
              </motion.div>
            )}

            {isLoading && !isTransferring && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                {/* ── #4.1 Premium gradient-ring spinner ── */}
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3">
                  <svg
                    className="w-5 h-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="spinner-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"  stopColor="#2EA043" stopOpacity="1" />
                        <stop offset="60%" stopColor="#3fb950" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2EA043" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="url(#spinner-grad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="44 18"
                    />
                  </svg>
                  <LoadingWords />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-[#0d1117] border-t border-[#30363d] relative z-10">
            <form onSubmit={handleSubmit} className="relative group/input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedModel.type === 'dappier'
                    ? `Query ${selectedModel.name}...`
                    : `Ask ${selectedModel.name} anything...`
                }
                disabled={isLoading || isTransferring}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl pl-6 pr-14 py-5 text-[#c9d1d9] placeholder:text-[#8b949e] focus:outline-none focus:border-[#3fb950]/50 transition-all duration-300 group-hover/input:border-[#8b949e]/50 font-mono text-sm shadow-inner disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isTransferring}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#30363d]/50 hover:bg-[#3fb950] hover:text-white rounded-xl text-[#c9d1d9] transition-all duration-300 disabled:opacity-50 disabled:hover:bg-[#30363d]/50 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}