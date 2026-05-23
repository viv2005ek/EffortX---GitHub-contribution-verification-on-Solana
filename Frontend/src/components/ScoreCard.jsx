import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const ScoreCard = ({ score }) => {
  const percentage = (score / 1000) * 100;
  const ref = useRef(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-2xl group border border-white/5 hover:border-accent-green/30"
    >
      {/* Background glow orb */}
      <div className="absolute inset-0 bg-[#2ea043]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <h3 className="text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-8 relative z-10">Effort Score</h3>
      
      <div className="relative w-52 h-52" style={{ transform: 'translateZ(20px)' }}>
        {/* Glow filter definition */}
        <svg className="w-full h-full transform -rotate-90 overflow-visible">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <circle
            cx="104"
            cy="104"
            r="88"
            fill="none"
            stroke="#0d1117"
            strokeWidth="8"
          />
          <motion.circle
            cx="104"
            cy="104"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={2 * Math.PI * 88}
            initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - score / 1000) }}
            transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-accent-green"
            strokeLinecap="round"
            style={{ filter: "url(#glow)" }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
            className="text-6xl font-black text-white tracking-tighter"
          >
            {score}
          </motion.span>
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mt-2"
          >
            / 1000 MAX
          </motion.span>
        </div>
      </div>

      <div className="mt-10 flex gap-4 relative z-10 w-full justify-center" style={{ transform: 'translateZ(10px)' }}>
        <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#0d1117]/60 border border-[#30363d] group-hover:border-accent-green/20 transition-all duration-300">
          <span className="text-accent-green font-bold uppercase text-xs tracking-wider">Verified</span>
          <span className="text-[#8b949e] text-[10px] block uppercase tracking-widest mt-1">Authenticity</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#0d1117]/60 border border-[#30363d] group-hover:border-accent-green/20 transition-all duration-300">
          <span className="text-white font-bold uppercase text-xs tracking-wider">{score > 750 ? "Architect" : "Core"}</span>
          <span className="text-[#8b949e] text-[10px] block uppercase tracking-widest mt-1">Profile</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ScoreCard;
