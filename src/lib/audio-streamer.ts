/**
 * This utility handles both capturing microphone input (encodes to PCM16 at 16kHz)
 * and playing back incoming audio chunks (decodes PCM16 at 24kHz).
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: AudioWorkletNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private sampleRate = 16000;
  private outputSampleRate = 24000;
  private nextPlayTime = 0;

  constructor() {}

  async startMic(onAudioData: (base64Data: string) => void) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(this.micStream);

    // We use a simple script processor or audio worklet. 
    // For simplicity and compatibility in this environment, a ScriptProcessorNode can work, 
    // but AudioWorklet is more modern. Let's try to use a basic processor if possible.
    // However, the prompt asks for clean architecture.
    
    const processor = this.audioContext.createScriptProcessor(2048, 1, 1);
    source.connect(processor);
    processor.connect(this.audioContext.destination);

    this.analyzer = this.audioContext.createAnalyser();
    source.connect(this.analyzer);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatToPcm16(inputData);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      onAudioData(base64);
    };

    this.processor = processor as unknown as AudioWorkletNode;
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
  }

  private activeSources: AudioBufferSourceNode[] = [];

  async playChunk(base64Data: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.outputSampleRate });
    }

    const arrayBuffer = this.base64ToArrayBuffer(base64Data);
    const pcm16 = new Int16Array(arrayBuffer);
    const float32 = this.pcm16ToFloat32(pcm16);

    const buffer = this.audioContext.createBuffer(1, float32.length, this.outputSampleRate);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Precise scheduling for gapless playback
    const startTime = Math.max(this.audioContext.currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };
  }

  stopAllPlayback() {
    this.activeSources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.activeSources = [];
    this.nextPlayTime = 0;
  }


  getByteFrequencyData() {
    if (!this.analyzer) return new Uint8Array(0);
    const data = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(data);
    return data;
  }

  private floatToPcm16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  private pcm16ToFloat32(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 0x8000;
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
