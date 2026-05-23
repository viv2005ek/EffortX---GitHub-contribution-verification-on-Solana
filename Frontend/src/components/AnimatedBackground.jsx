import React, { useEffect, useRef } from 'react';

/**
 * AnimatedBackground
 * ------------------
 * Renders a fixed, full-screen animated grid overlay that sits BEHIND all content
 * on every page (home, dashboard, playground).
 *
 * Grid:   semi-transparent #30363d lines, 64 × 64 px cells
 * Glow:   a slowly drifting radial gradient that pulses in opacity over time,
 *         drawn directly onto a <canvas> for smooth 60fps animation without
 *         React re-renders.
 *
 * All colors respect the existing palette – no new colors introduced.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let startTime = performance.now();
    let lastTime = startTime;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize glowing grid pulses
    const createPulse = (w, h) => {
      const isHorizontal = Math.random() > 0.5;
      const gridSize = 64;
      const maxLines = isHorizontal ? Math.floor(h / gridSize) : Math.floor(w / gridSize);
      const lineIndex = Math.floor(Math.random() * maxLines);
      const pos = lineIndex * gridSize;
      const maxDist = isHorizontal ? w : h;
      
      return {
        isHorizontal,
        pos,
        progress: Math.random() * maxDist,
        length: 150 + Math.random() * 300,
        speed: (40 + Math.random() * 100) * (Math.random() > 0.5 ? 1 : -1),
        opacity: 0.15 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? '#2EA043' : '#3fb950'
      };
    };

    let pulses = Array.from({ length: 25 }, () => createPulse(canvas.width, canvas.height));

    const draw = (now) => {
      const elapsed = (now - startTime) / 1000;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw glowing traveling grid lines
      ctx.globalCompositeOperation = 'screen';
      pulses.forEach((pulse, i) => {
        pulse.progress += pulse.speed * dt;
        
        // Wrap around logic
        const maxDist = pulse.isHorizontal ? w : h;
        if (pulse.speed > 0 && pulse.progress - pulse.length > maxDist) {
          pulses[i] = createPulse(w, h);
          pulses[i].progress = -pulses[i].length;
        } else if (pulse.speed < 0 && pulse.progress + pulse.length < 0) {
          pulses[i] = createPulse(w, h);
          pulses[i].progress = maxDist + pulses[i].length;
        }

        const x1 = pulse.isHorizontal ? pulse.progress : pulse.pos;
        const y1 = pulse.isHorizontal ? pulse.pos : pulse.progress;
        const x2 = pulse.isHorizontal ? pulse.progress - (pulse.speed > 0 ? pulse.length : -pulse.length) : pulse.pos;
        const y2 = pulse.isHorizontal ? pulse.pos : pulse.progress - (pulse.speed > 0 ? pulse.length : -pulse.length);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `${pulse.color}${Math.floor(pulse.opacity * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${pulse.color}00`); // transparent

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      });

      // 2. Slow-drifting radial glow
      const orbitX = w * 0.5 + Math.cos(elapsed * 0.18) * w * 0.35;
      const orbitY = h * 0.45 + Math.sin(elapsed * 0.13) * h * 0.28;
      const pulse = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(elapsed * 0.7));

      const grad = ctx.createRadialGradient(orbitX, orbitY, 0, orbitX, orbitY, Math.max(w, h) * 0.55);
      grad.addColorStop(0,   `rgba(46, 160, 67, ${pulse})`);
      grad.addColorStop(0.4, `rgba(46, 160, 67, ${pulse * 0.3})`);
      grad.addColorStop(1,   'rgba(46, 160, 67, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* Static grid of lines */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right,  rgba(48, 54, 61, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(48, 54, 61, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Canvas for the animated glow */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
    </>
  );
}
