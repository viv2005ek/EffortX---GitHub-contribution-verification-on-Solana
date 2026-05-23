import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Sparkles, Trophy, Wallet, Milestone } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Link2 className="w-6 h-6" />,
      title: "Paste Contribution",
      description: "Submit a GitHub commit or Pull Request URL for deep analysis."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Analysis",
      description: "Gemini AI evaluates engineering depth, impact, and code quality."
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Earn Effort Score",
      description: "Receive a verifiable Effort Score based on technical significance."
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Collect Rewards",
      description: "Earn EffortX Coins that unlock premium features and analytics."
    },
    {
      icon: <Milestone className="w-6 h-6" />,
      title: "On-Chain Proof",
      description: "Future: Store your reputation history immutably on the Solana network."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-accent-green font-mono text-sm tracking-widest uppercase mb-4">The Process</h2>
          <h3 className="text-4xl font-black text-heading mb-6">How It Works</h3>
        </motion.div>

        <div className="relative">
          {/* Connecting Wave Line (Desktop) */}
          <div className="hidden lg:block absolute top-8 left-0 w-full -translate-y-1/2 z-0 h-24 overflow-visible pointer-events-none">
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full text-[#3fb950] opacity-40">
              <path
                d="M 0 50 
                   C 33 50, 66 -10, 100 50 
                   C 166 110, 233 -10, 300 50 
                   C 366 110, 433 -10, 500 50 
                   C 566 110, 633 -10, 700 50 
                   C 766 110, 833 -10, 900 50 
                   C 933 110, 966 50, 1000 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="12 8"
                className="animate-[wave-flow_3s_linear_infinite]"
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-6 group-hover:border-[#3fb950]/50 transition-all shadow-inner">
                  <div className="text-accent-green">
                    {step.icon}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                <p className="text-[14px] text-[#8b949e] leading-relaxed px-4 font-medium">
                  {step.description}
                </p>

                {/* Step Number Badge */}
                <div className="mt-5 px-3 py-1 rounded-full bg-[#161b22] text-[11px] font-bold text-[#c9d1d9] border border-[#30363d] uppercase tracking-wider group-hover:border-[#3fb950]/30 group-hover:text-white transition-all">
                  Step {index + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
