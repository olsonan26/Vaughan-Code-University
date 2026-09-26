import React, { useState } from 'react';
import {
  Plus,
  Search,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  Compass,
  TrendingUp,
  Clock,
  Shield,
  Crown,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { PostCategory, User } from '../../types';
import { LEVEL_TIERS } from '../../data/initialData';

const CATEGORIES: ('All' | PostCategory)[] = [
  'All',
  'Announcements',
  'General Discussion',
  'Wins & Case Studies',
  'Questions & Help',
  'Action Guides',
  'Resource Share',
];

const teamRole = (user: User) => {
  if (user.id === 'user-creator') return 'HEADMASTER';
  if (user.id === 'user-instructor') return 'INSTRUCTOR / MODERATOR';
  if (user.role === 'moderator') return 'MODERATOR';
  return null;
};

export const CommunityView: React.FC = () => {
  const {
    posts,
    currentUser,
    users,
    events,
    awardXP,
    setActiveTab,
    openUserProfile,
    openLevelPerksModal,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'All' | PostCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'trending'>('newest');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasClaimedDailyStreak, setHasClaimedDailyStreak] = useState(false);

  const filteredPosts = posts
    .filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortBy === 'trending') {
        return b.likes.length + b.comments.length - (a.likes.length + a.comments.length);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const officialTeam = users.filter(
    (user) => user.id === 'user-creator' || user.id === 'user-instructor' || user.role === 'moderator',
  );

  const topStudents = users
    .filter((user) => user.role === 'member')
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);

  const upcomingEvent = events[0];

  const currentLevelInfo =
    LEVEL_TIERS.find((tier) => tier.level === (currentUser?.level || 1)) || LEVEL_TIERS[0];
  const nextLevelInfo = LEVEL_TIERS.find((tier) => tier.level === (currentUser?.level || 1) + 1);

  const handleClaimDailyStreak = () => {
    if (hasClaimedDailyStreak) return;
    setHasClaimedDailyStreak(true);
    awardXP(10, 'Daily community study check-in');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'User'}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-left text-xs sm:text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Ask a question, share a chart observation, or post a study result...</span>
              <span className="hidden sm:inline text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                +5 XP
              </span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-slate-100 text-slate-900 border-slate-300 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
              <button
                onClick={() => setSortBy('trending')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  sortBy === 'trending'
                    ? 'bg-slate-100 text-slate-900 border-slate-300 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span>Trending</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {filteredPosts.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
                <Compass className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-900">No discussions found</p>
                <p className="text-xs text-slate-500 mt-1">Try another search or start a new study discussion.</p>
              </div>
            )}
          </div>
        </main>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-xs tracking-wider border border-slate-700">
                VCU
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">Vaughan Code University</h2>
                <p className="text-xs text-slate-500">Language → Identity → Timeline</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Learn the code, understand what each chart position governs, build complete profiles and timelines, then test what you see against known events.
            </p>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Official Team</p>
              {officialTeam.map((member) => {
                const role = teamRole(member);
                return (
                  <div
                    key={member.id}
                    onClick={() => openUserProfile(member.id, 'page')}
                    className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                        {member.id === 'user-creator' && (
                          <Crown className="absolute -right-1 -bottom-1 w-3 h-3 text-amber-500 fill-amber-500" />
                        )}
                        {member.role === 'moderator' && (
                          <Shield className="absolute -right-1 -bottom-1 w-3 h-3 text-cyan-600 fill-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block leading-tight truncate">{member.name}</span>
                        <span className="text-[10px] text-slate-500 truncate block">{member.title}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        member.id === 'user-creator'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : member.id === 'user-instructor'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}
                    >
                      {role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {currentUser && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-sm text-slate-900">{currentUser.streakDays} Day Streak</span>
                </div>
                <button
                  onClick={handleClaimDailyStreak}
                  disabled={hasClaimedDailyStreak}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    hasClaimedDailyStreak
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {hasClaimedDailyStreak ? '✓ Checked In' : 'Check In +10 XP'}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-700">
                    Level {currentUser.level}: {currentLevelInfo.title}
                  </span>
                  <span className="text-slate-500">{currentUser.xp} XP</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round(
                            ((currentUser.xp - currentLevelInfo.minXp) /
                              ((nextLevelInfo ? nextLevelInfo.minXp : currentLevelInfo.maxXp) - currentLevelInfo.minXp)) *
                              100,
                          ),
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={openLevelPerksModal}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Level Roadmap</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {upcomingEvent && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900">Next Live Session</h3>
                </div>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="text-xs text-indigo-600 hover:underline cursor-pointer font-medium"
                >
                  Calendar →
                </button>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-snug">{upcomingEvent.title}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{upcomingEvent.description}</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">Top Students</h3>
              </div>
              <button
                onClick={() => setActiveTab('leaderboards')}
                className="text-xs text-indigo-600 hover:underline cursor-pointer font-medium"
              >
                View Full →
              </button>
            </div>

            <div className="space-y-2">
              {topStudents.map((member, index) => (
                <div
                  key={member.id}
                  onClick={() => openUserProfile(member.id, 'page')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-[11px] font-black text-slate-400">#{index + 1}</span>
                    <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-lg object-cover border border-slate-200" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{member.name}</p>
                      <p className="text-[10px] text-slate-500">Level {member.level}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">{member.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
