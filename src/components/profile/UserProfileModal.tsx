import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  Crown, 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles,
  Zap,
  Maximize2,
  Edit3,
  Globe,
  Twitter,
  Github,
  Linkedin,
  MapPin,
  Mail,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';

export const UserProfileModal: React.FC = () => {
  const { 
    isProfileModalOpen, 
    closeUserProfile, 
    viewingUser, 
    currentUser,
    badges, 
    courses, 
    posts,
    setActiveTab,
    openLevelPerksModal,
    openCertificateModal,
    sendDirectMessage
  } = useApp();

  const [activeTab, setModalTab] = useState<'activity' | 'courses' | 'badges'>('activity');
  const [isSendingDM, setIsSendingDM] = useState(false);
  const [dmText, setDmText] = useState('');

  if (!isProfileModalOpen || !viewingUser) return null;

  const user = viewingUser;
  const isOwnProfile = currentUser?.id === user.id;

  const currentLevelTier = LEVEL_TIERS.find((t) => t.level === user.level) || LEVEL_TIERS[0];
  const nextLevelTier = LEVEL_TIERS.find((t) => t.level === user.level + 1);

  const xpProgress = nextLevelTier
    ? Math.min(
        100,
        Math.round(
          ((user.xp - currentLevelTier.minXp) /
            (nextLevelTier.minXp - currentLevelTier.minXp)) *
            100
        )
      )
    : 100;

  const userEarnedBadges = badges.filter((b) => user.badges.includes(b.id));
  const userPosts = posts.filter((p) => p.authorId === user.id);

  // Activity contribution matrix
  const activityDays = Array.from({ length: 60 }, (_, i) => {
    const isLit = (i * 7 + user.xp) % 4 !== 0;
    const intensity = (i + user.level) % 4;
    return { id: i, isLit, intensity };
  });

  const handleOpenFullPage = () => {
    closeUserProfile();
    setActiveTab('profile');
  };

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim()) return;
    sendDirectMessage(user.id, dmText.trim());
    setDmText('');
    setIsSendingDM(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUserProfile();
      }}
    >
      <div 
        id="user-profile-modal-box"
        className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Scrollable Container containing Banner + Content together (eliminating top clipping) */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Cover Banner */}
          <div className="h-36 sm:h-44 bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 relative">
            <img
              src={user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
              alt="Cover"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

            {/* Top Action Controls */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
              <button
                onClick={handleOpenFullPage}
                title="Open full page view"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/70 transition-all text-xs font-semibold flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Page</span>
              </button>
              <button
                onClick={closeUserProfile}
                id="close-profile-modal-btn"
                title="Close"
                className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700/70 transition-all shadow-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Content Body */}
          <div className="px-5 sm:px-6 pb-6 pt-0 space-y-4">
            
            {/* Avatar & Header Info (Unclipped Overlap) */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 relative z-10">
              <div className="flex items-end gap-4">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-900 shadow-2xl bg-slate-800"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online Scholar" />
                </div>

                <div className="mb-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name}</h2>
                    {user.role === 'creator' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{user.id === 'user-creator' ? 'HEADMASTER' : 'FACULTY'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-400 font-semibold">{user.title || (user.role === 'creator' ? 'Faculty Instructor' : `Level ${user.level} Research Scholar`)}</p>
                  <p className="text-[11px] text-slate-400">{user.email}</p>
                </div>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center gap-2 flex-wrap sm:mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                  user.subscriptionTier === 'vip'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : user.subscriptionTier === 'pro'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {user.subscriptionTier} Tier
                </span>

                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{user.streakDays}d Streak</span>
                </span>

                {isOwnProfile ? (
                  <button
                    onClick={handleOpenFullPage}
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSendingDM(!isSendingDM)}
                    className="text-xs font-bold px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bio Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
              {user.bio || 'Exploring linguistics, pattern decoding, and personal matrices at Vaughan Code University.'}
            </p>

            {/* Direct Message Form */}
            {isSendingDM && (
              <form onSubmit={handleSendDM} className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Send Direct Message to {user.name}</span>
                  <button type="button" onClick={() => setIsSendingDM(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder={`Write a scholarly message to ${user.name}...`}
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsSendingDM(false)} className="text-xs text-slate-400 px-3 py-1 hover:text-white cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="text-xs font-bold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-sm cursor-pointer">
                    Send Message
                  </button>
                </div>
              </form>
            )}

            {/* Gamification Progress Bar */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Level {user.level}: {currentLevelTier.title}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">{user.xp.toLocaleString()} XP</span>
                  <button
                    onClick={() => {
                      closeUserProfile();
                      openLevelPerksModal();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                  >
                    View Perks ↗
                  </button>
                </div>
              </div>

              <div className="w-full bg-slate-700/70 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {nextLevelTier
                    ? `${(nextLevelTier.minXp - user.xp).toLocaleString()} XP needed for Level ${user.level + 1} (${nextLevelTier.title})`
                    : 'Maximum Master Level Achieved! 🏆'}
                </span>
                <span className="font-medium text-slate-300">{xpProgress}%</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 pt-1">
              <button
                onClick={() => setModalTab('activity')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Activity ({userPosts.length})
              </button>
              <button
                onClick={() => setModalTab('courses')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'courses' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Classroom & Certificates
              </button>
              <button
                onClick={() => setModalTab('badges')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'badges' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Badges ({userEarnedBadges.length})
              </button>
            </div>

            {/* Tab 1: Activity */}
            {activeTab === 'activity' && (
              <div className="space-y-2.5">
                {userPosts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                    No community posts created yet.
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <div key={post.id} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-indigo-400">{post.category}</span>
                        <span className="text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{post.title}</h4>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{post.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Courses */}
            {activeTab === 'courses' && (
              <div className="space-y-2.5">
                {courses.map((course) => {
                  const allLessons = course.modules.flatMap((m) => m.lessons);
                  const completedCount = allLessons.filter((l) => user.completedLessonIds.includes(l.id)).length;
                  const isFinished = allLessons.length > 0 && completedCount === allLessons.length;
                  const pct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

                  return (
                    <div key={course.id} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img src={course.thumbnail} alt={course.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{course.title}</h4>
                          <div className="text-[10px] text-slate-400">{pct}% Complete • {completedCount}/{allLessons.length} Lessons</div>
                        </div>
                      </div>
                      {isFinished && (
                        <button
                          onClick={() => {
                            closeUserProfile();
                            openCertificateModal(course);
                          }}
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Certificate</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Badges */}
            {activeTab === 'badges' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {badges.map((b) => {
                  const isEarned = user.badges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded-xl border text-center ${
                        isEarned
                          ? 'bg-slate-800/80 border-amber-500/30'
                          : 'bg-slate-900/40 border-slate-800 opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-xl mb-1">{b.icon}</div>
                      <div className="text-[11px] font-bold text-white line-clamp-1">{b.name}</div>
                      <div className="text-[10px] text-amber-400 font-semibold">+{b.xpReward} XP</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 60-Day Learning Matrix */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Daily Study Activity</span>
                <span className="text-[10px] text-slate-500">Last 60 days</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {activityDays.map((day) => (
                  <div
                    key={day.id}
                    className={`w-2.5 h-2.5 rounded-xs ${
                      day.isLit
                        ? day.intensity === 3
                          ? 'bg-emerald-500'
                          : day.intensity === 2
                          ? 'bg-emerald-400'
                          : 'bg-emerald-300/80'
                        : 'bg-slate-800 border border-slate-700/50'
                    }`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Fixed Bottom Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleOpenFullPage}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Open in Full Profile View</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeUserProfile}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
