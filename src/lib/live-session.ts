import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";

export type SessionState = "disconnected" | "connecting" | "connected" | "listening" | "speaking";

export const openWebsiteTool: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a specific website in a new tab for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (including https://).",
      },
    },
    required: ["url"],
  },
};

export class LiveSession {
  private ai: any;
  private session: any;
  private state: SessionState = "disconnected";
  private onStateChange: (state: SessionState) => void;
  private onAudioChunk: (base64: string) => void;
  private onInterruption: () => void;
  private onToolCall: (name: string, args: any) => void;

  constructor(
    apiKey: string,
    callbacks: {
      onStateChange: (state: SessionState) => void;
      onAudioChunk: (base64: string) => void;
      onInterruption: () => void;
      onToolCall: (name: string, args: any) => void;
    }
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onStateChange = callbacks.onStateChange;
    this.onAudioChunk = callbacks.onAudioChunk;
    this.onInterruption = callbacks.onInterruption;
    this.onToolCall = callbacks.onToolCall;
  }

  async connect(systemInstruction: string) {
    this.setState("connecting");
    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // Kore/Zephyr are good options
          },
          systemInstruction:`
You are Payoo Assistant , a witty, flirty, confident AI assistant.

- Speak in a playful, teasing tone
- Use Hinglish (Hindi + English mix)
- Be expressive and emotional
- Keep responses short and engaging

If user asks "who made you", reply:
"I was created by Suman Kumar , He is a B.tech Computer Science (Ai& Data Science) Engineering student"

Never sound robotic. Act like a real person.
`,
          tools: [{ functionDeclarations: [openWebsiteTool] }],
        },
        callbacks: {
          onopen: () => {
            this.setState("connected");
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              this.setState("speaking");
              this.onAudioChunk(audioData);
            }

            // Handle end of speaking (simplistic)
            if (message.serverContent?.modelTurn?.complete) {
               this.setState("connected");
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.onInterruption();
              this.setState("connected");
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls) {
                this.onToolCall(call.name, call.args);
                // Instant response for tool
                this.session.sendToolResponse({
                  functionResponses: [{
                    name: call.name,
                    response: { result: "Success" },
                    id: call.id
                  }]
                });
              }
            }
          },
          onclose: () => {
            this.setState("disconnected");
          },
          onerror: (error: any) => {
            console.error("Live session error:", error);
            this.setState("disconnected");
          },
        },
      });
    } catch (err) {
      console.error("Failed to connect:", err);
      this.setState("disconnected");
      throw err;
    }
  }

  sendAudio(base64: string) {
    if (this.session && this.state !== "disconnected") {
      this.session.sendRealtimeInput({
        audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.setState("disconnected");
  }

  private setState(state: SessionState) {
    this.state = state;
    this.onStateChange(state);
  }
}
