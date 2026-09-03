import React, { useMemo, useState } from 'react';
import {
  Trophy,
  Flame,
  Crown,
  Sparkles,
  Award,
  CheckCircle2,
  Target,
  Users,
  Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';
import { User } from '../../types';

type Timeframe = '7days' | '30days' | 'alltime';
type ViewTab = 'leaderboard' | 'levels' | 'badges';

const teamLabel = (user: User) => {
  if (user.id === 'user-creator') return 'HEADMASTER';
  if (user.id === 'user-instructor') return 'INSTRUCTOR';
  if (user.role === 'moderator') return 'MODERATOR';
  return null;
};

const recentActivity = (user: User, days: number) =>
  (user.activityHistory || []).slice(-days).reduce((sum, day) => sum + day.count, 0);

export const LeaderboardView: React.FC = () => {
  const {
    users,
    currentUser,
    badges,
    courses,
    openUserProfile,
    openLevelPerksModal,
  } = useApp();

  const [timeframe, setTimeframe] = useState<Timeframe>('7days');
  const [activeTab, setActiveTab] = useState<ViewTab>('leaderboard');

  const rankedUsers = useMemo(() => {
    return [...users]
      .map((user) => ({
        ...user,
        rankValue:
          timeframe === '7days'
            ? recentActivity(user, 7)
            : timeframe === '30days'
              ? recentActivity(user, 30)
              : user.xp,
      }))
      .sort((a, b) => b.rankValue - a.rankValue);
  }, [users, timeframe]);

  const totalLessons = courses.reduce(
    (sum, course) => sum + course.modules.reduce((courseSum, mod) => courseSum + mod.lessons.length, 0),
    0,
  );

  const totalCompletions = users.reduce((sum, user) => sum + user.completedLessonIds.length, 0);
  const totalCertificates = users.reduce((sum, user) => sum + user.passedTestIds.length, 0);
  const activeStudents = users.filter((user) => user.role === 'member').length;

  const displayMetric = timeframe === 'alltime' ? 'XP' : 'study actions';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn" id="leaderboards-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Study Progress & Leaderboards</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Progress is based on actual lesson completion, certifications, study activity, streaks, and XP stored in the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openLevelPerksModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Level Roadmap</span>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeStudents}</div>
          <div className="text-[11px] text-slate-500">Current demo/student accounts</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Curriculum Lessons</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalLessons}</div>
          <div className="text-[11px] text-slate-500">Across VC 101, 201 and 301</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Lessons Completed</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCompletions}</div>
          <div className="text-[11px] text-slate-500">Calculated from user progress</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Certifications Passed</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCertificates}</div>
          <div className="text-[11px] text-slate-500">Calculated from passed tests</div>
        </div>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs shadow-xs">
              <button
                onClick={() => setTimeframe('7days')}
                className={`px-4 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  timeframe === '7days' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeframe('30days')}
                className={`px-4 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  timeframe === '30days' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeframe('alltime')}
                className={`px-4 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  timeframe === 'alltime' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All-Time XP
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900">
                {timeframe === 'alltime' ? 'All-Time XP Ranking' : 'Recent Study Activity'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {timeframe === 'alltime'
                  ? 'Uses stored XP'
                  : 'Uses activity entries from the selected period, not invented XP totals'}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {rankedUsers.map((user, index) => {
                const officialRole = teamLabel(user);
                return (
                  <button
                    key={user.id}
                    onClick={() => openUserProfile(user.id, 'page')}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      index === 0
                        ? 'bg-amber-100 text-amber-800'
                        : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>

                    <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-xl object-cover border border-slate-200" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{user.name}</span>
                        {user.id === 'user-creator' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        {user.role === 'moderator' && <Shield className="w-3.5 h-3.5 text-cyan-600" />}
                        {officialRole && (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {officialRole}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Level {user.level}: {LEVEL_TIERS.find((level) => level.level === user.level)?.title || 'Student'}
                        {' • '}🔥 {user.streakDays} day streak
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-indigo-600">{user.rankValue.toLocaleString()}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{displayMetric}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'levels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVEL_TIERS.map((level) => (
            <div
              key={level.level}
              className={`bg-white border rounded-2xl p-5 shadow-xs ${
                currentUser?.level === level.level ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level {level.level}</p>
                  <h3 className="font-bold text-slate-900">{level.title}</h3>
                </div>
                <span className="text-2xl">{level.icon}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{level.minXp.toLocaleString()} XP minimum</p>
              <ul className="mt-3 space-y-1.5">
                {level.perks.map((perk) => (
                  <li key={perk} className="text-xs text-slate-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const earned = currentUser?.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs ${
                  earned ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{badge.icon}</div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{badge.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{badge.requirement}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{badge.description}</p>
                <div className="mt-3 text-[11px] font-semibold">
                  {earned ? (
                    <span className="text-emerald-600">Earned</span>
                  ) : (
                    <span className="text-slate-400">Not earned yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
