import React, { useState, useRef } from 'react';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';
import { motion } from 'motion/react';
import { MessageSquare, Image as ImageIcon, Video, Map, FileSearch, Mic, Play, Loader2, ArrowLeft, Send, Upload, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const getApiKey = async (requiresPaid = false) => {
  if (requiresPaid && window.aistudio?.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
    return process.env.API_KEY || process.env.GEMINI_API_KEY;
  }
  return process.env.GEMINI_API_KEY;
};

// --- Coach Tab ---
const CoachTab = () => {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'fast' | 'smart' | 'think' | 'search'>('fast');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let model = 'gemini-2.5-flash-lite';
      let config: any = {};

      if (mode === 'smart') {
        model = 'gemini-3.1-pro-preview';
      } else if (mode === 'think') {
        model = 'gemini-3.1-pro-preview';
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else if (mode === 'search') {
        model = 'gemini-3-flash-preview';
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: input,
        config
      });
      
      let text = response.text || '';
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        text += '\n\nSources:\n' + chunks.map(c => c.web?.uri).filter(Boolean).join('\n');
      }

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: 'Error generating response.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-2">
        <select value={mode} onChange={e => setMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium">
          <option value="fast">⚡ Fast (Flash Lite)</option>
          <option value="smart">🧠 Smart (Pro)</option>
          <option value="think">🤔 Deep Think (Pro High)</option>
          <option value="search">🔍 Web Search (Flash)</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-[#0A1931] text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none whitespace-pre-wrap'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="p-4 bg-slate-100 rounded-2xl rounded-tl-none"><Loader2 className="w-5 h-5 animate-spin text-[#0A1931]" /></div></div>}
      </div>
      <div className="p-4 border-t border-slate-200 bg-white flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask your career coach..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0A1931]/20 outline-none" />
        <button onClick={handleSend} disabled={loading} className="p-3 bg-[#0A1931] text-white rounded-xl hover:bg-[#0A1931]/90 disabled:opacity-50"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

// --- Studio Tab ---
const StudioTab = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (mode === 'generate') {
        const key = await getApiKey(true);
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: prompt,
          config: {
            imageConfig: { aspectRatio, imageSize: size }
          }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) setImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      } else {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [
            { inlineData: { data: sourceImage!.split(',')[1], mimeType: 'image/jpeg' } },
            { text: prompt }
          ]
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) setImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => setMode('generate')} className={`px-4 py-2 rounded-xl font-medium ${mode === 'generate' ? 'bg-[#0A1931] text-white' : 'bg-slate-100 text-slate-600'}`}>Generate (Pro)</button>
        <button onClick={() => setMode('edit')} className={`px-4 py-2 rounded-xl font-medium ${mode === 'edit' ? 'bg-[#0A1931] text-white' : 'bg-slate-100 text-slate-600'}`}>Edit (Flash)</button>
      </div>

      {mode === 'edit' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Source Image</label>
          <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
          {sourceImage && <img src={sourceImage} alt="Source" className="h-32 rounded-xl object-cover mt-2" />}
        </div>
      )}

      {mode === 'generate' && (
        <div className="flex gap-4">
          <select value={size} onChange={e => setSize(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 bg-white">
            <option value="1K">1K</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
          </select>
          <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 bg-white">
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the image..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0A1931]/20 outline-none min-h-[100px]" />
      </div>

      <button onClick={handleGenerate} disabled={loading || (mode === 'edit' && !sourceImage)} className="w-full py-4 bg-[#FFAB40] text-white rounded-xl font-bold hover:bg-[#FFAB40]/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        {mode === 'generate' ? 'Generate Image' : 'Edit Image'}
      </button>

      {image && (
        <div className="mt-6">
          <img src={image} alt="Generated" className="w-full rounded-2xl shadow-md" />
        </div>
      )}
    </div>
  );
};

// --- Video Tab ---
const VideoTab = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('Initializing...');
    try {
      const key = await getApiKey(true);
      const ai = new GoogleGenAI({ apiKey: key });

      const req: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio
        }
      };

      if (sourceImage) {
        req.image = {
          imageBytes: sourceImage.split(',')[1],
          mimeType: sourceImage.split(';')[0].split(':')[1]
        };
      }

      let operation = await ai.models.generateVideos(req);

      while (!operation.done) {
        setStatus('Generating video... this may take a few minutes.');
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const res = await fetch(uri, { headers: { 'x-goog-api-key': key } });
        const blob = await res.blob();
        setVideoUri(URL.createObjectURL(blob));
      }
    } catch (e) {
      console.error(e);
      setStatus('Error generating video');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Starting Image (Optional)</label>
        <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
        {sourceImage && <img src={sourceImage} alt="Source" className="h-32 rounded-xl object-cover mt-2" />}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Aspect Ratio</label>
        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white">
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the video..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0A1931]/20 outline-none min-h-[100px]" />
      </div>

      <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-[#FFAB40] text-white rounded-xl font-bold hover:bg-[#FFAB40]/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
        {loading ? status : 'Generate Video (Veo)'}
      </button>

      {videoUri && (
        <div className="mt-6">
          <video src={videoUri} controls className="w-full rounded-2xl shadow-md" />
        </div>
      )}
    </div>
  );
};

// --- Map Tab ---
const MapTab = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleMaps: {} }] }
      });
      setResponse(res.text || '');
      
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const extractedPlaces = chunks.filter(c => c.maps?.uri).map(c => c.maps);
      setPlaces(extractedPlaces);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Find Jobs or Companies</label>
        <div className="flex gap-2">
          <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Tech companies in Mogadishu..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0A1931]/20 outline-none" />
          <button onClick={handleSearch} disabled={loading} className="px-6 py-3 bg-[#0A1931] text-white rounded-xl font-bold hover:bg-[#0A1931]/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Map className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {response && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 whitespace-pre-wrap">
          {response}
        </div>
      )}

      {places.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900">Locations Found:</h4>
          {places.map((p, i) => (
            <a key={i} href={p.uri} target="_blank" rel="noreferrer" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-[#0A1931] transition-colors">
              <div className="font-bold text-[#0A1931]">{p.title || 'View on Maps'}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Analyzer Tab ---
const AnalyzerTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const isAudio = file.type.startsWith('audio/');
        
        const res = await ai.models.generateContent({
          model: isAudio ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview',
          contents: [
            { inlineData: { data: base64, mimeType: file.type } },
            { text: prompt || (isAudio ? 'Transcribe this audio' : 'Analyze this file') }
          ]
        });
        setResult(res.text || '');
        setLoading(false);
      };
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Upload Resume (Image/Video) or Audio</label>
        <input type="file" accept="image/*,video/*,audio/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Instructions (Optional)</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Extract the key skills from this resume..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0A1931]/20 outline-none min-h-[100px]" />
      </div>

      <button onClick={handleAnalyze} disabled={loading || !file} className="w-full py-4 bg-[#0A1931] text-white rounded-xl font-bold hover:bg-[#0A1931]/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSearch className="w-5 h-5" />}
        Analyze File
      </button>

      {result && (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 whitespace-pre-wrap">
          <h4 className="font-bold text-slate-900 mb-2">Analysis Result:</h4>
          {result}
        </div>
      )}
    </div>
  );
};

// --- Interview Tab ---
const InterviewTab = () => {
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const connectLive = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are an expert technical interviewer. Conduct a mock interview.",
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => setConnected(true),
          onmessage: (msg) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
               setTranscript(prev => [...prev, "AI: " + msg.serverContent!.modelTurn!.parts[0].text!]);
            }
          },
          onclose: () => setConnected(false)
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mic className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900">Mock Interview (Live API)</h3>
      <p className="text-slate-500">Practice your interview skills with real-time voice feedback.</p>
      
      <button onClick={connectLive} disabled={connected} className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto ${connected ? 'bg-emerald-500 text-white' : 'bg-[#FFAB40] text-white hover:bg-[#FFAB40]/90'}`}>
        {connected ? 'Connected (Listening...)' : 'Start Interview'}
      </button>

      {transcript.length > 0 && (
        <div className="mt-8 text-left p-4 bg-slate-50 rounded-2xl border border-slate-200 h-64 overflow-y-auto">
          {transcript.map((t, i) => (
            <div key={i} className="mb-2 text-sm text-slate-700">{t}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main AI Hub ---
export default function AIHub() {
  const [activeTab, setActiveTab] = useState('coach');

  const tabs = [
    { id: 'coach', label: 'AI Coach', icon: MessageSquare },
    { id: 'studio', label: 'Profile Studio', icon: ImageIcon },
    { id: 'video', label: 'Video Pitch', icon: Video },
    { id: 'map', label: 'Job Map', icon: Map },
    { id: 'analyzer', label: 'Analyzer', icon: FileSearch },
    { id: 'interview', label: 'Interview', icon: Mic },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#0A1931] px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <Sparkles className="w-6 h-6 text-[#FFAB40]" />
        <h1 className="text-xl font-bold text-white">Maanka AI Hub</h1>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === tab.id ? 'bg-[#0A1931] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          {activeTab === 'coach' && <CoachTab />}
          {activeTab === 'studio' && <StudioTab />}
          {activeTab === 'video' && <VideoTab />}
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'analyzer' && <AnalyzerTab />}
          {activeTab === 'interview' && <InterviewTab />}
        </div>
      </main>
    </div>
  );
}
