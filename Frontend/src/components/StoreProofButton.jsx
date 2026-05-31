import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { useSolana } from '../context/SolanaContext.jsx';
import { submitProof, parseBlockchainError } from '../solana/program.js';
import { explorerTxUrl } from '../solana/config.js';
import toast from 'react-hot-toast';

export default function StoreProofButton({ analysisData }) {
  const { wallet, profile, isWalletConnected, refreshProfile } = useSolana();
  const [loading, setLoading] = useState(false);
  const [stored, setStored] = useState(false);
  const [txSig, setTxSig] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const commitHash = analysisData?.commitHash || '';
  const githubUrl = analysisData?.githubUrl || '';
  const effortScore = Math.round(analysisData?.effortScore || 0);
  const rewardCoins = Math.round(analysisData?.rewardCoins || 1);
  const commitAuthor = analysisData?.author || '';
  const myUsername = profile?.githubUsername || '';

  const isAuthorMismatch = !!(commitAuthor && myUsername && commitAuthor.toLowerCase() !== myUsername.toLowerCase());

  const canStore =
    isWalletConnected &&
    !!profile &&
    commitHash.length > 0 &&
    effortScore > 0 &&
    !isAuthorMismatch;

  const handleStore = async () => {
    if (!canStore || loading || stored) return;

    setLoading(true);
    setErrorMsg(null);
    const toastId = toast.loading('Storing proof on Solana…');

    try {
      const sig = await submitProof(wallet, {
        githubUrl,
        commitHash,
        effortScore,
        rewardCoins,
      });

      setTxSig(sig);
      setStored(true);
      toast.success('Proof stored on Solana! 🎉', { id: toastId });
      await refreshProfile();
    } catch (err) {
      console.error('Submit proof error:', err);
      const message = parseBlockchainError(err);
      setErrorMsg(message);
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (stored) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-end gap-2"
      >
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0d1117] border border-[#3fb950] text-[#3fb950] text-[14px] font-semibold shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          Proof Stored On-Chain
        </div>
        {txSig && (
          <a
            href={explorerTxUrl(txSig)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#8b949e] hover:text-[#58a6ff] transition-colors mr-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on Explorer
          </a>
        )}
      </motion.div>
    );
  }

  if (!isWalletConnected) {
    return (
      <button
        disabled
        className="px-5 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[14px] font-semibold text-[#8b949e] flex items-center gap-2 cursor-not-allowed shadow-sm"
        title="Connect wallet to store proof"
      >
        <Shield className="w-4 h-4" />
        Store Proof On-Chain
        <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d] text-[10px] font-bold text-[#8b949e] uppercase">
          Connect wallet
        </span>
      </button>
    );
  }

  if (!profile) {
    return (
      <button
        disabled
        className="px-5 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[14px] font-semibold text-[#8b949e] flex items-center gap-2 cursor-not-allowed shadow-sm"
        title="Create profile to store proof"
      >
        <Shield className="w-4 h-4" />
        Store Proof On-Chain
        <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d] text-[10px] font-bold text-[#8b949e] uppercase">
          Create profile
        </span>
      </button>
    );
  }

  if (isAuthorMismatch) {
    return (
      <button
        disabled
        className="px-5 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[14px] font-semibold text-[#8b949e] flex items-center gap-2 cursor-not-allowed shadow-sm"
        title={`This commit belongs to @${commitAuthor}, not @${myUsername}`}
      >
        <Shield className="w-4 h-4" />
        Store Proof On-Chain
        <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#f85149]/30 text-[10px] font-bold text-[#f85149] uppercase">
          Author Mismatch
        </span>
      </button>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#161b22] border border-[#f85149] text-[#f85149] text-[14px] font-medium shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setErrorMsg(null); handleStore(); }}
          className="px-5 py-2.5 rounded-lg bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] hover:border-[#8b949e] text-[14px] font-semibold text-[#c9d1d9] flex items-center gap-2 transition-all shadow-sm"
        >
          <Shield className="w-4 h-4" />
          Try Again
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleStore}
      disabled={loading}
      className="px-5 py-2.5 rounded-lg bg-[#238636] border border-[rgba(240,246,252,0.1)] hover:bg-[#2ea043] text-white text-[14px] font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Storing on Solana…
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          Store Proof On-Chain
        </>
      )}
    </motion.button>
  );
}
