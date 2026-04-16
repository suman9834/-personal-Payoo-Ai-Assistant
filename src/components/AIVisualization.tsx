import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AIVisualizationProps {
  state: "disconnected" | "connecting" | "connected" | "listening" | "speaking";
  frequencyData?: Uint8Array;
}

export const AIVisualization: React.FC<AIVisualizationProps> = ({ state, frequencyData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !frequencyData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 80;

      // Draw frequency bars in a circle
      const bars = frequencyData.length / 4;
      ctx.beginPath();
      for (let i = 0; i < bars; i++) {
        const value = frequencyData[i] / 2;
        const angle = (i / bars) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * (radius + value);
        const y = centerY + Math.sin(angle) * (radius + value);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Color based on state
      let color = "rgba(139, 92, 246, 0.5)"; // Default purple
      if (state === "speaking") color = "rgba(236, 72, 153, 0.6)"; // Pink
      if (state === "listening") color = "rgba(16, 185, 129, 0.6)"; // Green
      
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [frequencyData, state]);

  return (
    <div className="relative flex items-center justify-center w-full h-80 mb-10">
      {/* Outer Glow Background */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.15, 1] : state === "listening" ? [1, 1.05, 1] : 1,
          opacity: state === "disconnected" ? 0.1 : [0.3, 0.45, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute w-72 h-72 rounded-full blur-[80px] transition-colors duration-700 ${
          state === "speaking" ? "bg-brand-pink/50" : state === "listening" ? "bg-brand-purple/50" : "bg-zinc-800"
        }`}
      />

      {/* Decorative Outer Ring */}
      <div className="absolute w-[200px] h-[200px] border border-brand-pink/20 rounded-full" />
      
      {/* Decorative Inner Ring */}
      <div className="absolute w-[160px] h-[160px] border-2 border-brand-purple/30 rounded-full" />

      {/* The Core Orb */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.05, 1] : 1,
        }}
        transition={{
          scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
        }}
        className={`relative w-28 h-28 rounded-full overflow-hidden shadow-[0_0_40px_rgba(255,51,102,0.4)] transition-all duration-700 border border-white/10`}
        style={{
          background: "radial-gradient(circle at 30% 30%, #FF3366, #7000FF)",
        }}
      >
        <div className="absolute inset-0 bg-white/10" />
        <canvas ref={canvasRef} width={300} height={300} className="w-full h-full opacity-60" />
      </motion.div>

      {/* Interaction State & Quote */}
      <div className="absolute -bottom-20 flex flex-col items-center w-full px-4 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-lg font-medium mb-1"
          >
            {state === "listening" ? "Payoo is listening..." : state === "speaking" ? "Payoo is talking..." : state === "connected" ? "Ready to chat" : "Offline"}
          </motion.div>
        </AnimatePresence>
        
        <p className="text-sm italic text-white/50 leading-tight max-w-[280px]">
          {state === "listening" 
            ? "\"Honey, I'm all ears. But make it quick, my digital nails are drying.\""
            : state === "speaking"
            ? "\"Just listening to my own voice... it's quite a treat, isn't it?\""
            : "\"Don't just stand there, say something charming.\""}
        </p>
      </div>
    </div>
  );
}

