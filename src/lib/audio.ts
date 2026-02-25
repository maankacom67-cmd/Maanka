export const playPCM = async (base64: string, sampleRate = 24000) => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    const buffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
    buffer.getChannelData(0).set(float32Array);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};