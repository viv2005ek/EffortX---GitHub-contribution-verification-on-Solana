import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolana } from '../context/SolanaContext';
import { estimatePlaygroundTokens, chatWithPlayground, chatWithDappier } from '../services/api';
import { transferEcoins, parseBlockchainError } from '../solana/program';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

// The admin wallet that receives the ECOIN payments
const ADMIN_WALLET = 'GNN25gvBm4LZ9sWFBqpDKtYFtpeyT9krJtPpU4myEpJP';

// ----------------------------------------------------------------------
// MODEL DEFINITIONS (for sidebar structure)
// ----------------------------------------------------------------------
const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini-2.5-Flash', cost: 'Variable', active: true, type: 'gemini' },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', cost: 'Variable', active: false, type: 'gemini', soon: true },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', cost: 'Variable', active: false, type: 'gemini', soon: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', cost: 'Variable', active: false, type: 'gemini', soon: true }
];

// Dappier models (grouped)
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

// Claude models (all soon)
const CLAUDE_MODELS = [
  { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'Variable', active: false, type: 'claude', soon: true },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'Variable', active: false, type: 'claude', soon: true },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', cost: 'Variable', active: false, type: 'claude', soon: true }
];

// Codex models (all soon)
const CODEX_MODELS = [
  { id: 'codex-gpt-4.1', name: 'GPT-4.1 Codex', cost: 'Variable', active: false, type: 'codex', soon: true },
  { id: 'codex-optimized', name: 'Codex Optimized', cost: 'Variable', active: false, type: 'codex', soon: true }
];

// Flatten all models for conversation storage
const ALL_MODELS = [
  ...GEMINI_MODELS,
  ...DAPPIER_GROUPS.flatMap(g => g.models),
  ...CLAUDE_MODELS,
  ...CODEX_MODELS
];

// Default selected model = Real Time Search (from Dappier > General)
const DEFAULT_MODEL = DAPPIER_GROUPS.find(g => g.name === 'General').models[0];

// ----------------------------------------------------------------------
// Sidebar section component (collapsible top‑level)
// ----------------------------------------------------------------------
const SidebarSection = ({ title, icon, children, isOpen, onToggle }) => {
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#161b22]/30">
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
            transition={{ duration: 0.2 }}
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
// Model button component (with hover disabled for "soon" models)
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

  // For soon models: no hover effects, default cursor, no background change
  const baseClasses = "w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-between";
  const soonClasses = "cursor-default bg-transparent border-transparent text-text-main/40";
  const activeClasses = isSelected && !isSoon
    ? "bg-accent-green/10 border-accent-green/30 text-white shadow-[0_0_12px_rgba(163,255,18,0.03)]"
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
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_#A3FF12]"></span>
      ) : (
        <svg className="w-3.5 h-3.5 text-text-main/20 opacity-0 group-hover/model:opacity-100 transition-all transform translate-x-1 group-hover/model:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

// ----------------------------------------------------------------------
// Group header icons (for Dappier categories)
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

  // Conversation storage keyed by model.id
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

  // Top-level accordion state: only one section open at a time
  const [openSections, setOpenSections] = useState({
    gemini: false,
    dappier: true,   // Dappier is open by default
    claude: false,
    codex: false
  });

  // Dappier inner categories: only one open at a time (string of the open category name)
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
    // If the clicked category is already open, close it; otherwise open it (and close any other)
    setOpenDappierCategory(prev => (prev === categoryName ? null : categoryName));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Estimate cost based on selected model
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
    // Gemini (and other future variable cost models)
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

      // Determine cost
      if (selectedModel.type === 'dappier') {
        cost = selectedModel.cost;
      } else {
        const estimateRes = await estimatePlaygroundTokens(newMessages, selectedModel.id);
        cost = estimateRes.ecoinCost !== undefined ? estimateRes.ecoinCost : 2;
      }

      // Check balance (skip if cost 0)
      if (cost > 0 && (!profile || profile.ecoinBalance < cost)) {
        toast.error(`Insufficient ECOIN balance. Needed: ${cost} ECOIN`);
        setIsLoading(false);
        setMessages(messages);
        setInput(currentInput);
        return;
      }

      // Transfer ECOIN (skip if cost 0)
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

      // Call AI API
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

  if (!isWalletConnected || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-4">Connect to Access Playground</h2>
        <p className="text-text-main/60 mb-8 max-w-md">
          The AI Playground requires an active on-chain profile and ECOIN balance to use premium developer models.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-12">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">AI Playground</h1>
          <p className="text-accent-green/80 mt-1 font-bold text-sm uppercase tracking-widest">Premium developer AI tooling powered by your on-chain reputation.</p>
        </div>

        <div className="flex items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4 shadow-sm">
          <div className="text-sm">
            <div className="text-text-main/60 uppercase tracking-widest text-[10px] font-black">Balance</div>
            <div className="font-bold text-accent-green text-lg drop-shadow-md">{profile.ecoinBalance} ECOIN</div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-sm">
            <div className="text-text-main/60 uppercase tracking-widest text-[10px] font-black">Est. Cost</div>
            <div className="font-bold text-white text-lg">{estimatedCost || '-'} ECOIN</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
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

          {/* Dappier Section – with nested categories (only one open at a time) */}
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
                        transition={{ duration: 0.2 }}
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

        {/* Chat Area – unchanged except for model‑specific placeholder text */}
        <div className="lg:col-span-3 flex flex-col h-[500px] bg-[#0d1117] border border-[#30363d] rounded-[2rem] overflow-hidden shadow-sm relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3fb950]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-5 py-3 ${msg.role === 'user'
                      ? 'bg-accent-green text-black font-medium'
                      : 'bg-white/10 text-white border border-white/5'
                      }`}
                  >
                    <div className="text-sm leading-relaxed markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-1" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-black text-white" {...props} />,
                          em: ({ node, ...props }) => <em className="italic text-white/90" {...props} />,
                          code: ({ node, inline, ...props }) =>
                            inline
                              ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent-green font-mono text-[10px]" {...props} />
                              : <pre className="bg-black/40 p-4 rounded-xl my-3 overflow-x-auto border border-white/5"><code className="text-xs font-mono text-accent-green" {...props} /></pre>,
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border border-white/10 rounded-lg overflow-hidden" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
                          th: ({ node, ...props }) => <th className="px-4 py-2 border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider" {...props} />,
                          td: ({ node, ...props }) => <td className="px-4 py-2 border-b border-white/5 text-sm" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent-green/30 pl-4 italic my-2 text-white/70" {...props} />,
                          a: ({ node, ...props }) => <a className="text-accent-green hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
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
                <div className="bg-white/10 text-white/50 rounded-2xl px-5 py-3 text-sm flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse animation-delay-200">●</span>
                  <span className="animate-pulse animation-delay-400">●</span>
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
        </div>
      </div>
    </div>
  );
}