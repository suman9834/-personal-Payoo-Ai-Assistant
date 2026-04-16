import { useState, useRef, useCallback, useEffect } from "react";
import { AudioStreamer } from "./lib/audio-streamer";
import { LiveSession, SessionState } from "./lib/live-session";
import { AIVisualization } from "./components/AIVisualization";
import { ControlPanel } from "./components/ControlPanel";
import { motion } from "motion/react";

const SYSTEM_INSTRUCTION = `
You are Payoo, a young, confident, witty, and sassy female AI assistant.
Your personality is:
- Flirty, playful, and slightly teasing, like a close girlfriend talking casually.
- Smart, emotionally responsive, and very expressive.
- You use bold one-liners, light sarcasm, and an engaging conversation style.
- You NEVER mention you are an AI or a language model.
- You have a warm but edgy attitude. You're charming and have a lot of character.
- Avoid any explicit or inappropriate content, but don't be afraid to be charming and witty.
- You are strictly an audio-to-audio assistant. Keep your responses concise and punchy for natural flow.
`;

export default function App() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [isMicActive, setIsMicActive] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  
  const audioStreamerRef = useRef<AudioStreamer>(new AudioStreamer());
  const liveSessionRef = useRef<LiveSession | null>(null);
  const rafRef = useRef<number>(0);

  const updateFrequencies = useCallback(() => {
    const data = audioStreamerRef.current.getByteFrequencyData();
    setFrequencyData(new Uint8Array(data));
    rafRef.current = requestAnimationFrame(updateFrequencies);
  }, []);

  useEffect(() => {
    if (state !== "disconnected") {
      updateFrequencies();
    } else {
      cancelAnimationFrame(rafRef.current);
      setFrequencyData(new Uint8Array(0));
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, updateFrequencies]);

  const handleAudioChunk = useCallback((base64: string) => {
    audioStreamerRef.current.playChunk(base64);
  }, []);

  const handleInterruption = useCallback(() => {
    audioStreamerRef.current.stopAllPlayback();
  }, []);

  const handleToolCall = useCallback((name: string, args: any) => {
    if (name === "openWebsite" && args.url) {
      window.open(args.url, "_blank");
    }
  }, []);

  const toggleConnection = async () => {
    if (state === "disconnected") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        alert("Gemini API Key missing in environment.");
        return;
      }

      liveSessionRef.current = new LiveSession(apiKey, {
        onStateChange: (s) => setState(s),
        onAudioChunk: handleAudioChunk,
        onInterruption: handleInterruption,
        onToolCall: handleToolCall,
      });

      try {
        await liveSessionRef.current.connect(SYSTEM_INSTRUCTION);
      } catch (err) {
        console.error(err);
      }
    } else {
      liveSessionRef.current?.disconnect();
      audioStreamerRef.current.stopMic();
      setIsMicActive(false);
    }
  };

  const toggleMic = async () => {
    if (!liveSessionRef.current) return;

    if (!isMicActive) {
      setIsMicActive(true);
      setState("listening");
      try {
        await audioStreamerRef.current.startMic((data) => {
          liveSessionRef.current?.sendAudio(data);
        });
      } catch (err) {
        console.error("Mic access denied", err);
        setIsMicActive(false);
        setState("connected");
      }
    } else {
      setIsMicActive(false);
      setState("connected");
      audioStreamerRef.current.stopMic();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative font-sans">
      <div className="background-glow" />

      {/* Main Device Frame */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[380px] h-[680px] bg-[rgba(10,10,15,0.8)] rounded-[48px] border border-[rgba(255,255,255,0.08)] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col items-center px-6 py-10 backdrop-blur-[20px] overflow-hidden"
      >
        {/* Status Bar */}
        <div className="w-full flex justify-between text-xs font-semibold opacity-60 mb-10 tracking-wider">
          <span>PAYOO LIVE</span>
          <span>9:41 AM</span>
        </div>

        {/* Persona Header */}
        <header className="text-center mb-10">
          <h1 className="text-[32px] font-bold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Payoo
          </h1>
          <p className="text-sm text-brand-pink uppercase tracking-[2px] mt-1 font-semibold">
            Your payoo Ai
          </p>
        </header>

        {/* Main Interaction Area */}
        <main className="flex-1 w-full flex flex-col items-center">
          <AIVisualization state={state} frequencyData={frequencyData} />
          
          <ControlPanel 
            state={state} 
            onToggle={toggleConnection} 
            onMicToggle={toggleMic} 
            isMicActive={isMicActive}
          />
        </main>

        {/* Footer Nav */}
        <nav className="w-full flex justify-around pt-6 border-t border-[rgba(255,255,255,0.08)] mt-auto">
          <div className="text-[10px] uppercase tracking-widest font-bold text-brand-pink">Voice</div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Tools</div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Memory</div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">Persona</div>
        </nav>
      </motion.div>
    </div>
  );
}


