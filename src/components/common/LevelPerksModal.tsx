import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Lock, Sparkles, Award, Zap, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LevelPerksModal: React.FC = () => {
  const { isLevelPerksModalOpen, closeLevelPerksModal, levelTiers, currentUser } = useApp();

  if (!isLevelPerksModalOpen) return null;

  const currentLevel = currentUser?.level || 1;
  const currentXp = currentUser?.xp || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden my-6"
          id="level-perks-modal"
        >
          {/* Header Banner */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-blue-500/15 border-b border-slate-800">
            <button
              onClick={closeLevelPerksModal}
              id="close-level-perks-modal-btn"
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  University Level Perks & Roadmap
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    9 Tiers
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Earn XP through classroom study, passing quizzes, daily streaks, and community contributions to unlock exclusive perks.
                </p>
              </div>
            </div>

            {/* Current Level Status Widget */}
            {currentUser && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">
                    {levelTiers.find((t) => t.level === currentLevel)?.icon || '⚡'}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">Your Current Standing</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      Level {currentLevel} • {levelTiers.find((t) => t.level === currentLevel)?.title || 'Scholar'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Total XP: </span>
                    <span className="font-bold text-amber-400">{currentXp.toLocaleString()} XP</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Active Streak: </span>
                    <span className="font-bold text-orange-400">🔥 {currentUser.streakDays} Days</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Level List */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            {levelTiers.map((tier) => {
              const isUnlocked = currentLevel >= tier.level;
              const isCurrent = currentLevel === tier.level;

              return (
                <div
                  key={tier.level}
                  id={`level-perk-card-${tier.level}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : isUnlocked
                      ? 'bg-slate-800/50 border-slate-700/60'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${tier.color} text-white shadow-md`}
                      >
                        {tier.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            Level {tier.level}
                          </span>
                          <h3 className="text-base font-bold text-white">{tier.title}</h3>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Requires {tier.minXp.toLocaleString()} XP</span>
                          {tier.maxXp && <span>(up to {tier.maxXp.toLocaleString()} XP)</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5" /> Current Level
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3.5 h-3.5" /> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          <Lock className="w-3 h-3 text-slate-500" /> Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Perks Checklist */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Unlocked Privileges & Access:
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {tier.perks.map((perk, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isUnlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Guide */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Earn XP: Lessons (+20 XP) • Quizzes (+50 XP) • Streaks (+100 XP) • Course Certificates (+200 XP)</span>
            </div>
            <button
              onClick={closeLevelPerksModal}
              id="done-level-perks-btn"
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
