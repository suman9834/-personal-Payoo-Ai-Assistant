import React from "react";
import { Mic, MicOff, Power, PowerOff } from "lucide-react";
import { motion } from "motion/react";

interface ControlPanelProps {
  state: "disconnected" | "connecting" | "connected" | "listening" | "speaking";
  onToggle: () => void;
  onMicToggle: () => void;
  isMicActive: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  onToggle,
  onMicToggle,
  isMicActive,
}) => {
  const isConnected = state !== "disconnected";

  return (
    <div className="flex flex-col items-center mt-12 w-full">
      <div className="flex flex-col items-center gap-6 relative">
        {/* Main Mic Button */}
        <motion.button
          disabled={!isConnected}
          whileHover={isConnected ? { scale: 1.05 } : {}}
          whileTap={isConnected ? { scale: 0.95 } : {}}
          onClick={onMicToggle}
          className={`w-[110px] h-[110px] rounded-full flex items-center justify-center relative z-10 transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(255,51,102,0.4)] ${
            !isConnected
              ? "bg-zinc-900 text-zinc-700 cursor-not-allowed border border-white/5 opacity-50 shadow-none"
              : "bg-gradient-to-br from-brand-pink to-brand-purple text-white border-2 border-white/20"
          }`}
        >
          {isMicActive ? <Mic size={32} /> : <MicOff size={32} />}
          
          {/* Internal Glow Effect */}
          {isConnected && (
            <div className="absolute inset-0 bg-white/20 blur-md pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          )}

          {/* Sassy pulse for active state */}
          {isMicActive && (
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-white"
            />
          )}
        </motion.button>

        {/* Connection Toggle (Power) - Floating smaller button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className={`absolute -right-16 top-1/2 -translate-y-1/2 p-3 rounded-full border transition-all duration-500 backdrop-blur-md ${
            isConnected
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}
        >
          {isConnected ? <PowerOff size={18} /> : <Power size={18} />}
        </motion.button>
      </div>

      <p className="mt-8 text-[11px] text-white/30 uppercase tracking-[2px] font-bold">
        {state === "disconnected" 
          ? "System Standby" 
          : isMicActive 
          ? "Receiving Input" 
          : "Channel Open"}
      </p>
    </div>
  );
}

