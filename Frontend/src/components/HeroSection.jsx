import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';

const Cube3D = () => {
  return (
    <div className="absolute opacity-[0.04] pointer-events-none select-none overflow-visible w-80 h-80 flex items-center justify-center top-[25%] left-[10%] z-0">
      <motion.div
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateX: [0, 360],
          rotateY: [0, 360],
          y: [-15, 15, -15]
        }}
        transition={{
          rotateX: { repeat: Infinity, duration: 25, ease: "linear" },
          rotateY: { repeat: Infinity, duration: 25, ease: "linear" },
          y: { repeat: Infinity, duration: 6, ease: "easeInOut" }
        }}
        className="relative w-44 h-44"
      >
        {/* Front */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "translateZ(88px)" }} />
        {/* Back */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "rotateY(180deg) translateZ(88px)" }} />
        {/* Left */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "rotateY(-90deg) translateZ(88px)" }} />
        {/* Right */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "rotateY(90deg) translateZ(88px)" }} />
        {/* Top */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "rotateX(90deg) translateZ(88px)" }} />
        {/* Bottom */}
        <div className="absolute inset-0 border border-accent-green bg-accent-green/5" style={{ transform: "rotateX(-90deg) translateZ(88px)" }} />
      </motion.div>
    </div>
  );
};

const TiltCard = ({ children }) => {
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 24 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 24 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
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
      className="relative w-full max-w-4xl mx-auto z-10"
    >
      {children}
    </motion.div>
  );
};

const HeroSection = ({ onScrollToAnalyzer, onOpenPlayground }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 60]);
  const opacity1 = useTransform(scrollY, [0, 600, 1000], [1, 1, 0]);

  // Parallax transforms for hero ambient glows only (grid is handled globally)
  const orb1Y = useTransform(scrollY, [0, 1000], [0, -150]);
  const orb2Y = useTransform(scrollY, [0, 1000], [0, -80]);

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-12 overflow-visible">

      {/* 3D Wireframe Cube in Background */}
      <Cube3D />

      {/* Top Ambient Glow - strict green with parallax */}
      <motion.div
        style={{ y: orb1Y }}
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-green/10 blur-[150px] rounded-full pointer-events-none"
      />

      <motion.div
        style={{ y: orb2Y }}
        className="absolute top-[40%] right-[5%] w-[400px] h-[400px] bg-[#238636]/5 blur-[120px] rounded-full pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 max-w-5xl mx-auto flex flex-col items-center w-full "
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className=""
        >
          <div className="group relative inline-flex items-center justify-center cursor-pointer">
            <div className="absolute inset-0 bg-accent-green/20 rounded-full blur-md transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
            <div className="relative px-5 py-2 rounded-full border border-[#30363d] bg-[#161b22] text-[13px] font-semibold tracking-wide text-[#c9d1d9] flex items-center gap-3 transition-all hover:border-accent-green/50 hover:text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_8px_#2ea043] animate-pulse"></span>
              EffortX Mainnet Beta
            </div>
          </div>
        </motion.div>

        <h1 className="text-5xl md:text-[80px] lg:text-[96px] font-extrabold tracking-tighter mb-8 leading-[1.05] text-white">
          Verify Real Developer<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#3fb950] to-[#238636]">Contribution.</span>
        </h1>

        <p className="text-lg md:text-xl text-[#8b949e] max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          GitHub tracks commits. EffortX analyzes what actually changed. <br /> AI-powered, on-chain proof of engineering quality built on Solana.
        </p>

        <motion.div
          className="flex flex-col sm:flex-row gap-5 items-center justify-center w-full sm:w-auto mb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onScrollToAnalyzer}
            className="group relative px-8 py-4 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 text-[16px] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(46,160,67,0.15)] hover:shadow-[0_0_30px_rgba(46,160,67,0.3)] border border-[#3fb950]/30 w-full sm:w-auto cursor-pointer"
          >
            Analyze Commit
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenPlayground}
            className="px-8 py-4 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white font-semibold rounded-xl transition-all duration-300 text-[16px] flex items-center justify-center border border-[#30363d] w-full sm:w-auto shadow-sm cursor-pointer"
          >
            Open Playground
          </motion.button>
        </motion.div>

        {/* Premium 3D Isometric Element */}
        <motion.div
          style={{ y: y1, opacity: opacity1, perspective: 1000 }}
          className="w-full relative z-30"
        >
          <TiltCard>
            {/* Glowing backdrop shadow for 3D depth */}
            <div
              className="absolute -inset-4 bg-accent-green/20 blur-[100px] rounded-3xl pointer-events-none"
              style={{ transform: 'translateZ(-20px)' }}
            />

            <div
              className="relative bg-[#0d1117]/90 backdrop-blur-md border border-[#30363d] rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(48,54,61,0.5)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#30363d]" />
                  <div className="w-3 h-3 rounded-full bg-[#30363d]" />
                  <div className="w-3 h-3 rounded-full bg-[#30363d]" />
                </div>
                <div className="mx-auto text-[13px] font-mono font-medium text-[#8b949e]">Analyzer Engine</div>
                <div className="w-12"></div>
              </div>

              {/* Code Body */}
              <div className="p-8 text-left font-mono text-[14px] leading-loose text-[#c9d1d9] overflow-x-auto bg-[#0d1117]">
                <div className="flex">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">1</span>
                  <span><span className="text-[#ff7b72]">import</span> &#123; <span className="text-[#d2a8ff]">EffortEngine</span> &#125; <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'@effortx/core'</span>;</span>
                </div>
                <div className="flex">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">2</span>
                  <span></span>
                </div>
                <div className="flex">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">3</span>
                  <span><span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">engine</span> <span className="text-[#ff7b72]">=</span> <span className="text-[#ff7b72]">new</span> <span className="text-[#d2a8ff]">EffortEngine</span>();</span>
                </div>
                <div className="flex">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">4</span>
                  <span><span className="text-[#ff7b72]">const</span> <span className="text-[#79c0ff]">proof</span> <span className="text-[#ff7b72]">=</span> <span className="text-[#ff7b72]">await</span> engine.<span className="text-[#d2a8ff]">analyzeCommit</span>(<span className="text-[#a5d6ff]">'c4f3b2a'</span>);</span>
                </div>
                <div className="flex">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">5</span>
                  <span></span>
                </div>
                <div className="flex relative items-center">
                  <span className="text-[#484f58] w-10 select-none text-right pr-4 border-r border-[#30363d] mr-4">6</span>
                  <span className="text-[#8b949e] italic">// Point generated and secured on Solana</span>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 1, duration: 0.6, type: "spring" }}
                    className="ml-6 px-3 py-1 rounded-lg text-[12px] font-sans font-bold bg-accent-green/10 text-accent-green border border-accent-green/30 shadow-[0_0_15px_rgba(46,160,67,0.15)] flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
                    Verified Score: 98
                  </motion.div>
                </div>
              </div>

              {/* Subtle top reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none h-[40%]" />
            </div>
          </TiltCard>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
