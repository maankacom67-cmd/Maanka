/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from '@google/genai';
import { playPCM } from './lib/audio';
import AIHub from './screens/AIHub';
import { 
  Briefcase, 
  MapPin, 
  Search, 
  LogOut, 
  User as UserIcon, 
  ChevronRight, 
  Filter,
  Bell,
  Clock,
  DollarSign,
  ArrowLeft,
  Play,
  Sparkles
} from 'lucide-react';
import { JOBS } from './constants';
import { Job } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' }) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-md',
    secondary: 'bg-secondary text-white hover:bg-secondary/90',
    accent: 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20',
    outline: 'border-2 border-white/20 text-white hover:bg-white/10',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-white/80 ml-1">{label}</label>}
    <input 
      className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none transition-all"
      {...props}
    />
  </div>
);

// --- Screens ---

const LoginScreen = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      localStorage.setItem('maanka_auth', 'true');
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-10 rounded-[2.5rem]"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-3xl mb-6 border border-white/20"
          >
            <Briefcase className="text-white w-10 h-10" />
          </motion.div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tighter">MAANKA</h1>
          <p className="text-white/60 mt-3 font-medium">Your Gateway to Opportunity</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input label="Email" type="email" placeholder="Enter your email" required />
          <Input label="Password" type="password" placeholder="Enter your password" required />
          
          <Button type="submit" variant="accent" className="w-full py-4 text-lg font-bold" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Login'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/signup" className="text-white/80 text-sm font-medium hover:text-white transition-colors">
            Create Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const SignupScreen = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-primary px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-white">Create Account</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Signup Page Coming Soon...</h2>
          <p className="text-slate-500 mt-2">We're working hard to bring this feature to you.</p>
          <Link to="/">
            <Button variant="ghost" className="mt-8 mx-auto">Back to Login</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

const DashboardScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('maanka_auth');
    navigate('/');
  };

  const filteredJobs = JOBS.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReadAloud = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const text = `${job.title} at ${job.company} in ${job.location}. Salary is ${job.salary}.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: text,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        playPCM(base64Audio, 24000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="text-white w-6 h-6" />
            <span className="text-2xl font-display font-bold text-white tracking-tight">Available Jobs</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/ai-hub" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white font-medium transition-colors">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Hub
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search jobs..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Job List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="job-card-gradient p-8 rounded-3xl text-white shadow-xl hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold leading-tight">{job.title}</h3>
                    <div className="space-y-1 opacity-80">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" />
                        Location: {job.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4" />
                        Salary: {job.salary}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => handleReadAloud(e, job)} 
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
                      title="Read Aloud"
                    >
                      <Play className="w-5 h-5 text-white" />
                    </button>
                    <Button variant="accent" className="px-8 py-3 rounded-2xl font-bold">
                      Apply Now
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredJobs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No jobs found</h3>
              <p className="text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Main App ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('maanka_auth') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/ai-hub" element={<ProtectedRoute><AIHub /></ProtectedRoute>} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardScreen />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
