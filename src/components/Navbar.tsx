import React, { useState } from 'react';
import {
  Compass,
  BookOpen,
  Calendar,
  Users,
  Trophy,
  Sparkles,
  PlusCircle,
  Radio,
  Flame,
  Crown,
  Zap,
  LogOut,
  User as UserIcon,
  ChevronDown,
  GraduationCap,
  Shield,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LEVEL_TIERS } from '../data/initialData';
import { User } from '../types';

const visibleRole = (user: User) => {
  if (user.id === 'user-creator') return 'HEADMASTER';
  if (user.id === 'user-instructor') return 'INSTRUCTOR';
  if (user.role === 'moderator') return 'MODERATOR';
  return user.subscriptionTier.toUpperCase();
};

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    openSubscriptionModal,
    openUserProfile,
    openAuthModal,
    users,
    switchUser,
    logout,
    openCourseEditor,
    courses,
    systemAnnouncement,
    dismissAnnouncement,
    openLevelPerksModal,
    subscriptionPlans,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const currentLevelInfo =
    LEVEL_TIERS.find((t) => t.level === (currentUser?.level || 1)) || LEVEL_TIERS[0];
  const nextLevelInfo = LEVEL_TIERS.find((t) => t.level === (currentUser?.level || 1) + 1);

  const currentXp = currentUser?.xp || 0;
  const levelMinXp = currentLevelInfo.minXp;
  const levelMaxXp = nextLevelInfo ? nextLevelInfo.minXp : currentLevelInfo.maxXp;
  const xpProgress = Math.min(
    100,
    Math.max(0, Math.round(((currentXp - levelMinXp) / (levelMaxXp - levelMinXp)) * 100)),
  );

  const isFacultyAdmin =
    currentUser?.id === 'user-creator' || currentUser?.id === 'user-instructor';

  const proPlan = subscriptionPlans.find((plan) => plan.id === 'pro');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-xs">
      {systemAnnouncement && (
        <div className="bg-gradient-to-r from-amber-600 via-indigo-700 to-purple-700 py-1.5 px-4 text-xs font-semibold text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto overflow-hidden w-full">
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
            <span className="truncate">
              <strong>{systemAnnouncement.title}</strong> — {systemAnnouncement.content}
            </span>
            <button
              onClick={dismissAnnouncement}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-black/20 shrink-0 ml-auto"
              title="Dismiss announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {currentUser?.subscriptionTier === 'free' && !systemAnnouncement && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-1.5 px-4 text-center text-xs font-semibold text-white flex items-center justify-center gap-2">
          <span>Free access includes the community and opening Vaughan Code foundations.</span>
          <button
            onClick={openSubscriptionModal}
            className="underline hover:text-amber-100 font-bold ml-2 cursor-pointer"
          >
            {proPlan ? `Unlock full curriculum for $${proPlan.priceMonthly}/mo →` : 'View membership →'}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-15 gap-3">
          <div
            onClick={() => setActiveTab('community')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition-colors shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Vaughan Code University
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                  VCU
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
                Language • Identity • Timeline • Pattern Recognition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentUser && (
              <div
                onClick={openLevelPerksModal}
                className="hidden sm:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
                title={`Level ${currentUser.level}: ${currentLevelInfo.title}`}
              >
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{currentUser.streakDays}d</span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-700">Lvl {currentUser.level}</span>
                  <div className="w-12 lg:w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 hidden md:inline">
                  {currentUser.xp.toLocaleString()} XP
                </span>
              </div>
            )}

            {currentUser?.subscriptionTier === 'free' ? (
              <button
                onClick={openSubscriptionModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Upgrade</span>
              </button>
            ) : currentUser ? (
              <button
                onClick={openSubscriptionModal}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs transition-colors shrink-0 ${
                  currentUser.subscriptionTier === 'vip'
                    ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="uppercase">{currentUser.subscriptionTier} TIER</span>
              </button>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Switch active user"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold hidden sm:inline text-slate-800">Switch User</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Active User
                    </p>
                  </div>
                  <div className="p-1 space-y-1 max-h-80 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setIsSwitcherOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                          currentUser?.id === u.id
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate text-slate-900">{u.name}</p>
                            <span
                              className={`text-[9px] px-1 rounded font-bold shrink-0 ${
                                u.role === 'moderator'
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : u.id === 'user-creator'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : u.id === 'user-instructor'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {visibleRole(u)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {u.title || `Level ${u.level}: ${LEVEL_TIERS.find((l) => l.level === u.level)?.title || 'Student'}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {currentUser ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 focus:outline-none p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition-all cursor-pointer"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-indigo-600 shadow-xs"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-sm animate-fadeIn">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.title || visibleRole(currentUser)}</p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Level {currentUser.level} {currentLevelInfo.icon}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {visibleRole(currentUser)}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          openUserProfile(currentUser.id, 'page');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-indigo-500" />
                        <span>My Profile Page</span>
                      </button>

                      <button
                        onClick={() => {
                          openSubscriptionModal();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Membership & Billing</span>
                      </button>

                      {isFacultyAdmin && (
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-amber-900 hover:bg-amber-50 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span>Admin Control Center</span>
                        </button>
                      )}

                      {currentUser.role === 'creator' && (
                        <button
                          onClick={() => {
                            openCourseEditor();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-purple-700 hover:bg-purple-50 transition-colors text-xs font-medium cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4 text-purple-600" />
                          <span>Create New Course</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-xs font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'community'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Community</span>
            </button>

            <button
              onClick={() => setActiveTab('classroom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'classroom'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Classroom</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                {courses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'leaderboards'
                  ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Leaderboards</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'members'
                  ? 'bg-white text-cyan-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-600" />
              <span>Members</span>
            </button>

            {currentUser && (
              <button
                onClick={() => openUserProfile(currentUser.id, 'page')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <UserIcon className="w-4 h-4 text-indigo-500" />
                <span>Profile</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            {isFacultyAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeTab === 'admin'
                    ? 'bg-amber-100/80 text-amber-950 border-amber-300 shadow-xs'
                    : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/60'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Control</span>
              </button>
            )}

            {currentUser?.role === 'creator' && (
              <button
                onClick={() => setActiveTab('creator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeTab === 'creator'
                    ? 'bg-purple-100/80 text-purple-950 border-purple-300 shadow-xs'
                    : 'bg-purple-50/70 text-purple-800 border-purple-200 hover:bg-purple-100/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
