import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Crown, 
  Sparkles, 
  Medal, 
  Award, 
  Lock, 
  CheckCircle2, 
  ChevronRight, 
  User as UserIcon, 
  Zap,
  Target,
  TrendingUp,
  Users,
  Star,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';

export const LeaderboardView: React.FC = () => {
  const { 
    users, 
    currentUser, 
    badges, 
    openUserProfile, 
    openSubscriptionModal, 
    openLevelPerksModal 
  } = useApp();

  const [timeframe, setTimeframe] = useState<'7days' | '30days' | 'alltime'>('7days');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'levels' | 'badges'>('leaderboard');

  // Rich Dummy Leaderboard Data for VCU
  const leaderboardDataset = [
    {
      id: 'lb-1',
      name: 'Alexander Kotzev',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      level: 8,
      xp: timeframe === '7days' ? 1420 : timeframe === '30days' ? 4850 : 18500,
      streakDays: 45,
      role: 'creator',
      title: 'Instructor • Computational Semiotics',
      badgesCount: 8,
      lessonsFinished: 38,
    },
    {
      id: 'lb-2',
      name: 'Prof. Vaughan',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 9,
      xp: timeframe === '7days' ? 1280 : timeframe === '30days' ? 4200 : 24900,
      streakDays: 62,
      role: 'creator',
      title: 'Main Creator / Headmaster',
      badgesCount: 8,
      lessonsFinished: 42,
    },
    {
      id: 'lb-3',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 7,
      xp: timeframe === '7days' ? 980 : timeframe === '30days' ? 3420 : 12450,
      streakDays: 31,
      role: 'member',
      title: 'Senior Fellow • Matrix Decoders',
      badgesCount: 6,
      lessonsFinished: 29,
    },
    {
      id: 'lb-4',
      name: 'Jordan Lee',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      level: 5,
      xp: timeframe === '7days' ? 840 : timeframe === '30days' ? 2890 : 8450,
      streakDays: 14,
      role: 'member',
      title: 'Pro Scholar • Pattern Analyst',
      badgesCount: 5,
      lessonsFinished: 24,
    },
    {
      id: 'lb-5',
      name: 'Marcus Chen',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      level: 4,
      xp: timeframe === '7days' ? 710 : timeframe === '30days' ? 2400 : 6120,
      streakDays: 9,
      role: 'member',
      title: 'Research Fellow',
      badgesCount: 4,
      lessonsFinished: 18,
    },
    {
      id: 'lb-6',
      name: 'Dr. Aris Thorne',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      level: 4,
      xp: timeframe === '7days' ? 620 : timeframe === '30days' ? 1950 : 5800,
      streakDays: 11,
      role: 'member',
      title: 'Epistemology Scholar',
      badgesCount: 3,
      lessonsFinished: 16,
    },
    {
      id: 'lb-7',
      name: 'Sophia Sterling',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      level: 3,
      xp: timeframe === '7days' ? 510 : timeframe === '30days' ? 1720 : 4300,
      streakDays: 8,
      role: 'member',
      title: 'Linguistic Matrix Student',
      badgesCount: 3,
      lessonsFinished: 14,
    },
    {
      id: 'lb-8',
      name: 'Darius Thorne',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      level: 3,
      xp: timeframe === '7days' ? 440 : timeframe === '30days' ? 1410 : 3890,
      streakDays: 6,
      role: 'member',
      title: 'Cryptographic Scholar',
      badgesCount: 2,
      lessonsFinished: 12,
    },
  ];

  const top3 = leaderboardDataset.slice(0, 3);
  const remaining = leaderboardDataset.slice(3);

  const handleUserClick = (name: string) => {
    const existing = users.find((u) => u.name === name);
    if (existing) {
      openUserProfile(existing.id, 'page');
    } else if (users.length > 0) {
      openUserProfile(users[0].id, 'page');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn" id="leaderboards-view">
      
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Gamification & Leaderboards</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Scholars gain XP for course completion (+20 XP), passing mastery tests (+50 XP), daily login streaks 🔥, and scholarly discussions.
          </p>
        </div>

        {/* View Switcher Tabs & Level Perks Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openLevelPerksModal}
            id="view-all-level-perks-btn"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>View All Level Perks Roadmap ↗</span>
          </button>

          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-xs">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rankings
            </button>
            <button
              onClick={() => setActiveTab('levels')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'levels' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All 9 Levels
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'badges' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Badges
            </button>
          </div>
        </div>
      </div>

      {/* Community KPI Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Weekly XP Earned</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">42,850 XP</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18% activity pace
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Avg Active Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">18.4 Days</div>
          <div className="text-[11px] text-slate-500">Top streak: 62 days 🔥</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Lessons Completed</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">1,482</div>
          <div className="text-[11px] text-indigo-600 font-semibold">Across all 5 courses</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Certificates Awarded</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">128 Pass</div>
          <div className="text-[11px] text-purple-600 font-semibold">Official VCU Mastery</div>
        </div>
      </div>

      {/* TAB 1: LEADERBOARD RANKINGS & PODIUM */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-8">
          
          {/* Timeframe Filter */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-xs">
              <button
                onClick={() => setTimeframe('7days')}
                id="timeframe-7days"
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  timeframe === '7days' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeframe('30days')}
                id="timeframe-30days"
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  timeframe === '30days' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeframe('alltime')}
                id="timeframe-alltime"
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  timeframe === 'alltime' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All-Time XP
              </button>
            </div>
          </div>

          {/* TOP 3 PODIUM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
            
            {/* Rank 2 (Silver) */}
            {top3[1] && (
              <div 
                onClick={() => handleUserClick(top3[1].name)}
                className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 relative hover:border-indigo-300 shadow-sm transition-all cursor-pointer order-2 md:order-1 mt-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center mx-auto shadow-xs">
                  #2
                </div>
                <img
                  src={top3[1].avatar}
                  alt={top3[1].name}
                  className="w-18 h-18 rounded-2xl object-cover mx-auto border-2 border-slate-300 shadow-sm group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{top3[1].name}</h3>
                    {top3[1].role === 'creator' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-500">Level {top3[1].level} • {top3[1].title}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">🔥 {top3[1].streakDays}d Streak</span>
                  <span className="text-sm font-extrabold text-indigo-600">{top3[1].xp.toLocaleString()} XP</span>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold / Crown) */}
            {top3[0] && (
              <div 
                onClick={() => handleUserClick(top3[0].name)}
                className="bg-gradient-to-b from-amber-50/70 via-white to-white border-2 border-amber-400 rounded-3xl p-6 text-center space-y-3 relative hover:border-amber-500 transition-all cursor-pointer order-1 md:order-2 shadow-lg shadow-amber-500/10 group"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
                  <Crown className="w-3.5 h-3.5 fill-slate-950" />
                  <span>PODIUM CHAMPION</span>
                </div>

                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center mx-auto shadow-md mt-1">
                  #1
                </div>

                <img
                  src={top3[0].avatar}
                  alt={top3[0].name}
                  className="w-22 h-22 rounded-2xl object-cover mx-auto border-4 border-amber-400 shadow-md group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-black text-base text-slate-900 group-hover:text-amber-600 transition-colors">{top3[0].name}</h3>
                    {top3[0].role === 'creator' && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-xs text-amber-800 font-semibold">Level {top3[0].level} • {top3[0].title}</p>
                </div>
                <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
                  <span className="text-amber-700 font-bold">🔥 {top3[0].streakDays}d Streak</span>
                  <span className="text-base font-black text-amber-600">{top3[0].xp.toLocaleString()} XP</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3[2] && (
              <div 
                onClick={() => handleUserClick(top3[2].name)}
                className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 relative hover:border-indigo-300 shadow-sm transition-all cursor-pointer order-3 mt-8 group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center mx-auto shadow-xs">
                  #3
                </div>
                <img
                  src={top3[2].avatar}
                  alt={top3[2].name}
                  className="w-18 h-18 rounded-2xl object-cover mx-auto border-2 border-amber-200 shadow-sm group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{top3[2].name}</h3>
                  </div>
                  <p className="text-xs text-slate-500">Level {top3[2].level} • {top3[2].title}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">🔥 {top3[2].streakDays}d Streak</span>
                  <span className="text-sm font-extrabold text-indigo-600">{top3[2].xp.toLocaleString()} XP</span>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table for remaining ranks */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-w-4xl mx-auto">
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-6">
                <span>Rank</span>
                <span>Scholar / Fellow</span>
              </div>
              <div className="flex items-center gap-8">
                <span>Streak</span>
                <span>Level</span>
                <span>Total XP</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboardDataset.map((user, idx) => {
                const isCurrent = currentUser?.name === user.name;

                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.name)}
                    className={`px-6 py-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-50/70 text-slate-900 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <span className={`w-5 text-center text-xs font-bold ${
                        idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : idx === 2 ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 hover:text-indigo-600">{user.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                            {user.role === 'creator' && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> FACULTY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{user.title}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-xs font-semibold">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Flame className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{user.streakDays}d</span>
                      </div>

                      <span className="text-slate-600 font-medium">Lvl {user.level}</span>

                      <span className="font-bold text-indigo-600 w-20 text-right">
                        {user.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ALL 9 LEVELS & PERKS ROADMAP */}
      {activeTab === 'levels' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Vaughan Code University 9-Level Roadmap</h2>
            <p className="text-xs text-slate-500">
              Each level unlocked grants higher community status, secret laboratory rooms, downloadable research materials, and certificate badges.
            </p>
          </div>

          <div className="grid gap-4">
            {LEVEL_TIERS.map((tier) => {
              const isCurrent = (currentUser?.level || 1) === tier.level;
              const isUnlocked = (currentUser?.level || 1) >= tier.level;

              return (
                <div
                  key={tier.level}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/70 border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                      : isUnlocked
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50/60 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs ${
                        isUnlocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {tier.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">Level {tier.level}: {tier.title}</h4>
                          {isCurrent && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-indigo-600 text-white">
                              Your Level
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{tier.minXp.toLocaleString()} XP required</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {tier.perks.map((perk, pIdx) => (
                        <span key={pIdx} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BADGES GALLERY */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {badges.map((b) => {
            const isEarned = currentUser?.badges?.includes(b.id);

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-between space-y-3 transition-all ${
                  isEarned
                    ? 'bg-white border-amber-400/80 shadow-md'
                    : 'bg-slate-50 border-slate-200 opacity-60 grayscale'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-xs">
                  {b.icon}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>
                </div>

                <div className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  +{b.xpReward} XP Reward
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
