import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Coins, Zap, ShieldCheck, BarChart3 } from 'lucide-react';

const TiltCard = ({ children, index }) => {
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
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      className="glass-card p-5 rounded-2xl border border-white/5 hover:border-accent-green/30 transition-all duration-300 relative overflow-hidden group shadow-2xl cursor-pointer"
    >
      <div style={{ transform: 'translateZ(15px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

const InsightCards = ({ data }) => {
  const cappedConfidence = Math.min(Math.max(data.aiConfidence * 100, 82), 96).toFixed(0);

  const insights = [
    {
      title: "Reward Coins",
      value: `+${data.rewardCoins}`,
      icon: <Coins className="w-5 h-5 text-accent-green" />,
    },
    {
      title: "Architecture Impact",
      value: data.effortScore > 700 ? "HIGH" : data.effortScore > 400 ? "MEDIUM" : "LOW",
      icon: <Zap className="w-5 h-5 text-[#8b949e] group-hover:text-accent-green transition-colors" />,
    },
    {
      title: "Engineering Depth",
      value: data.complexity,
      icon: <ShieldCheck className="w-5 h-5 text-[#8b949e] group-hover:text-accent-green transition-colors" />,
    },
    {
      title: "AI Confidence",
      value: `${cappedConfidence}%`,
      icon: <BarChart3 className="w-5 h-5 text-[#8b949e] group-hover:text-accent-green transition-colors" />,
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {insights.map((insight, index) => (
        <TiltCard key={insight.title} index={index}>
          <div className="absolute inset-0 bg-[#2ea043]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex flex-col gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-[#0d1117]/80 w-fit border border-[#30363d] group-hover:border-accent-green/30 transition-colors duration-300">
              {insight.icon}
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">{insight.title}</p>
              <p className="text-xl font-bold text-white group-hover:text-accent-green transition-colors mt-1">{insight.value}</p>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  );
};

export default InsightCards;
