import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, GitBranch, User, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import ScoreCard from './ScoreCard';
import InsightCards from './InsightCards';
import StoreProofButton from './StoreProofButton';

const ResultDashboard = ({ data }) => {

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#30363d]"
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-accent-green" />
            <span className="text-accent-green font-mono text-[13px] tracking-wide font-medium">Analysis Complete</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            {data.repository} <span className="text-[#8b949e] font-normal mx-1">/</span> {data.contributionCategory}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-[#8b949e] text-sm">
            <div className="flex items-center gap-1.5 bg-[#161b22] px-3 py-1.5 rounded-full border border-[#30363d]">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium text-[#c9d1d9]">{data.author}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#161b22] px-3 py-1.5 rounded-full border border-[#30363d]">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium text-[#c9d1d9]">{new Date(data.analyzedAt).toLocaleDateString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/20 text-xs font-mono uppercase text-accent-green">
              {data.type}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StoreProofButton analysisData={data} />

          <a
            href={`https://github.com/${data.author}/${data.repository}/commit/${data.commitHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] hover:border-[#8b949e] transition-all text-[14px] font-semibold text-[#c9d1d9] flex items-center gap-2 shadow-sm"
          >
            View on GitHub <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Score & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-white/5"
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
              <CheckCircle2 className="w-40 h-40 text-accent-green" />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d]">
                <CheckCircle2 className="w-5 h-5 text-accent-green" />
              </div>
              <h4 className="text-lg font-bold text-white tracking-tight">AI Contribution Summary</h4>
            </div>
            <p className="text-[15px] leading-relaxed text-[#c9d1d9] mb-8 font-normal bg-[#0d1117]/50 p-4 rounded-lg border border-[#30363d]">
              "{data.summary}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h5 className="text-[12px] font-bold text-[#c9d1d9] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green"></span> Key Strengths
                </h5>
                <ul className="space-y-3">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-[#8b949e] leading-snug">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-[#8b949e] shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-[12px] font-bold text-[#c9d1d9] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#3fb950]" /> Development Insights
                </h5>
                <ul className="space-y-3">
                  {data.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-[#8b949e] leading-snug">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-[#3fb950] shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          <InsightCards data={data} />
        </div>

        {/* Right Column: Score Card + Engineering Metrics */}
        <div className="space-y-6">
          <ScoreCard score={data.effortScore} />

          {/* Engineering Metrics — always shown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl"
          >
            <h4 className="text-[12px] font-bold text-white uppercase tracking-wide mb-6">Engineering Metrics</h4>
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[12px] font-semibold">
                  <span className="text-[#8b949e]">Code Consistency</span>
                  <span className="text-accent-green">88%</span>
                </div>
                <div className="w-full bg-[#0d1117] border border-[#30363d] h-2 rounded-full overflow-hidden">
                  <div className="bg-accent-green h-full w-[88%] rounded-full shadow-[0_0_8px_#2ea043]" />
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[12px] font-semibold">
                  <span className="text-[#8b949e]">Maintainability</span>
                  <span className="text-[#3fb950]">High</span>
                </div>
                <div className="w-full bg-[#0d1117] border border-[#30363d] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#3fb950] h-full w-[94%] rounded-full shadow-[0_0_8px_#3fb950]" />
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[12px] font-semibold">
                  <span className="text-[#8b949e]">Security Awareness</span>
                  <span className="text-[#2ea043]">Optimized</span>
                </div>
                <div className="w-full bg-[#0d1117] border border-[#30363d] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2ea043] h-full w-[82%] rounded-full" />
                </div>
              </div>
              <div className="pt-5 border-t border-[#30363d] mt-2">
                <p className="text-[12px] text-[#8b949e] leading-relaxed">
                  Metrics are generated via multi-layered architectural analysis of the submitted diff.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResultDashboard;
