import React, { useEffect, useState } from 'react';
import {
  X,
  GraduationCap,
  ArrowRight,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WelcomeModal: React.FC = () => {
  const { setActiveTab } = useApp();

  // Development/testing behavior: show on every refresh.
  // Production can switch this to a persisted onboarding flag.
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const learningObjectives = [
    'Turn letters into numerical structures using the Vaughan Code key',
    'Preserve compound trails instead of throwing away how a root was reached',
    'Understand what each identity position actually governs',
    'Compare First Name, Called Name, Whole Name and Heart’s Desire',
    'Separate habits from natural skills and talents',
    'Calculate and understand the Ultimate Goal',
    'Build annual and monthly timelines',
    'Read Essence, Personal Year and Combiner in context',
    'Recognize Power Numbers 11, 13 and 16 without jumping to conclusions',
    'Test chart patterns against known, documented events',
  ];

  const close = () => setIsOpen(false);

  const goToClass = () => {
    setActiveTab('classroom');
    setIsOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="relative bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 sm:px-8 pt-7 pb-6 border-b border-slate-800 shrink-0">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />

          <button
            onClick={close}
            title="Close welcome screen"
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors shadow-md cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
                  Language • Identity • Timeline • Pattern Recognition
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-slate-200 text-sm leading-relaxed custom-scrollbar flex-1">
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/50">
            <p className="text-base sm:text-lg font-semibold text-indigo-100 leading-snug">
              You are about to learn a system for seeing people, language, and time differently.
            </p>
          </div>

          <div className="space-y-3 text-slate-300">
            <p>
              Inside Vaughan Code University, you will learn how names and dates are calculated into structured numerical information that can be separated into different areas of personality, motivation, habits, natural abilities, and timing.
            </p>
            <p className="font-semibold text-amber-300/90">
              This is not about memorizing what one number supposedly means everywhere.
            </p>
            <p>
              You will learn to calculate accurately, preserve compound trails, understand what each chart position governs, compare multiple layers, recognize recurring patterns, and test those patterns against real events.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                As you advance, you will learn to:
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {learningObjectives.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-200 font-medium leading-tight">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <p className="text-slate-300">
              The goal is not simply to give you answers.
              <strong className="text-white"> The goal is to teach you how to see the patterns yourself.</strong>
            </p>
            <p className="text-slate-400 text-xs">
              Every lesson builds on what came before it, so begin with the foundations even if you already have experience with numerology.
            </p>
          </div>

          <div className="text-center pt-1">
            <p className="text-base sm:text-lg font-bold text-white tracking-wide">
              Welcome to the Vaughan Code.
            </p>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 italic">
              “Learn the code. Test the patterns. See for yourself.”
            </p>
            <p className="text-[10px] text-slate-500">
              Start with VC 101: The Language Code
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={close}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer w-1/3 sm:w-auto text-center"
            >
              Explore First
            </button>
            <button
              onClick={goToClass}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer group"
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
