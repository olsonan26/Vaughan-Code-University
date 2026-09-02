import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  ArrowRight, 
  Binary, 
  Compass, 
  Layers, 
  GitBranch, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck,
  Clock,
  Search,
  Activity
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface WelcomeModalProps {
  forcedOpen?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = () => {
  const { setActiveTab } = useApp();
  
  // For testing purposes: temporarily display on every page refresh as requested.
  // In production, this can check localStorage.getItem('vcu_welcome_completed') === 'true'.
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoToClass = () => {
    // Navigate user directly to the classroom environment
    setActiveTab('classroom');
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const learningObjectives = [
    { text: "Decode the different layers of a person's identity", icon: "01" },
    { text: "Understand behavioral patterns and natural tendencies", icon: "02" },
    { text: "Identify strengths, challenges, and internal motivations", icon: "03" },
    { text: "Map yearly, monthly, and daily cycles", icon: "04" },
    { text: "Compare important events against a person's timeline", icon: "05" },
    { text: "Recognize repeating numerical signatures", icon: "06" },
    { text: "Study relationships between language, identity, and time", icon: "07" },
    { text: "Use charts to ask better questions and understand people more deeply", icon: "08" },
    { text: "Analyze historical case studies and test the system for yourself", icon: "09" },
    { text: "Eventually learn advanced timeline analysis and pattern forecasting", icon: "10" }
  ];

  return (
    <div 
      id="welcome-vcu-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="relative bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top University Crest Banner Header with Subtle Mathematical Grid */}
        <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 sm:px-8 pt-7 pb-6 border-b border-slate-800 shrink-0">
          
          {/* Subtle Geometric / Coordinate Grid Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {/* Close button 'X' */}
          <button
            onClick={handleClose}
            id="close-welcome-modal-btn"
            title="Close Welcome Screen"
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors shadow-md cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10">
            {/* Small tracking line above title */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>YOUR STUDY BEGINS HERE</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-400/40 flex items-center justify-center shadow-lg shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                  Welcome to Vaughan Code University
                </h1>
                <p className="text-xs sm:text-sm text-indigo-300/90 font-medium">
                  Faculty of Linguistics, Numerical Architecture & Chronological Cycles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Academic Welcome Body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-slate-200 text-sm leading-relaxed custom-scrollbar flex-1">
          
          {/* Primary Opening Declaration */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-base sm:text-lg font-semibold text-indigo-100 leading-snug">
              You are about to learn a system for seeing people, language, and time differently.
            </p>
          </div>

          {/* Academic Philosophy Context */}
          <div className="space-y-3 text-slate-300 text-sm">
            <p>
              Inside Vaughan Code University, you will learn how names and dates can be translated into numerical patterns that reveal layers of personality, motivation, natural abilities, habits, recurring cycles, and important periods throughout a person's life.
            </p>
            <p className="font-semibold text-amber-300/90">
              But this is not about memorizing what individual numbers supposedly mean.
            </p>
            <p>
              You will learn how to build complete charts, compare multiple layers of information, recognize repeating patterns, study real historical events, and understand why certain combinations appear during specific experiences.
            </p>
          </div>

          {/* Section: Learning Objectives List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                As you advance, you will learn how the Vaughan Code can be used to:
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {learningObjectives.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                    {item.icon}
                  </span>
                  <span className="text-xs text-slate-200 font-medium leading-tight">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pedagogy & University Philosophy */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Academic Inquiry & Independent Verification</span>
            </div>
            <p className="text-slate-300">
              The goal is not to simply give you answers. <strong className="text-white">The goal is to teach you how to see the patterns yourself.</strong>
            </p>
            <p className="text-slate-400 text-xs">
              Every lesson builds on the one before it, so begin with the foundations even if you already have experience with numerology.
            </p>
          </div>

          {/* Welcome Affirmation */}
          <div className="text-center pt-2">
            <p className="text-base sm:text-lg font-bold text-white tracking-wide">
              Welcome to the Vaughan Code.
            </p>
          </div>

        </div>

        {/* Bottom Action Footer with University Motto & "Go to Class" Button */}
        <div className="px-6 sm:px-8 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 italic">
              "Learn the code. Test the patterns. See for yourself."
            </p>
            <p className="text-[10px] text-slate-500">
              Foundational Matrix • Module 1 Ready
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer w-1/3 sm:w-auto text-center"
            >
              Explore First
            </button>
            <button
              onClick={handleGoToClass}
              id="welcome-go-to-class-btn"
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 transition-all cursor-pointer group"
            >
              <span>Go to Class</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
