import React from 'react';
import { Sparkles, Trophy, Crown, ArrowRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';

export const LevelUpModal: React.FC = () => {
  const { isLevelUpModalOpen, levelUpLevel, closeLevelUpModal, setActiveTab } = useApp();

  if (!isLevelUpModalOpen || !levelUpLevel) return null;

  const currentTier = LEVEL_TIERS.find((t) => t.level === levelUpLevel) || LEVEL_TIERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white border-2 border-amber-400 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-900 text-center p-8 relative shadow-amber-500/10">
        
        <button
          onClick={closeLevelUpModal}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Animated Badge */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-amber-500/30 animate-bounce mb-4">
          {currentTier.icon}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-amber-700">
            COMMUNITY LEVEL UP!
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Level {currentTier.level}: {currentTier.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Congratulations! Your continuous engagement, completed teachings, and test scores have promoted you to a new tier.
          </p>
        </div>

        {/* Unlocked Perks */}
        <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            New Privileges Unlocked:
          </p>
          <ul className="space-y-1.5 text-xs text-emerald-800 font-medium">
            {currentTier.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            closeLevelUpModal();
            setActiveTab('leaderboard');
          }}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-transform hover:scale-102 cursor-pointer"
        >
          <span>View Leaderboards & Badges</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
