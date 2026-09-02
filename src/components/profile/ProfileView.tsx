import React, { useState } from 'react';
import { 
  Flame, 
  Crown, 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles,
  Zap,
  Globe,
  Twitter,
  Github,
  Linkedin,
  MapPin,
  Edit3,
  Check,
  X,
  Share2,
  Mail,
  Shield,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';
import { User } from '../../types';

interface ProfileViewProps {
  userId?: string;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ userId, onBack }) => {
  const { 
    currentUser, 
    viewingUser, 
    users, 
    badges, 
    courses, 
    posts, 
    updateUserProfile, 
    openCertificateModal,
    openLevelPerksModal,
    sendDirectMessage,
    setActiveTab,
    showToast
  } = useApp();

  const user = (userId ? users.find((u) => u.id === userId) : viewingUser) || currentUser || users[0];
  const isOwnProfile = currentUser?.id === user?.id;

  const [activeTab, setProfileTab] = useState<'activity' | 'courses' | 'badges' | 'about'>('activity');
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingDM, setIsSendingDM] = useState(false);
  const [dmText, setDmText] = useState('');

  // Edit form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    title: user?.title || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    coverImage: user?.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    location: user?.location || 'Boston, MA',
    interests: user?.interests ? user.interests.join(', ') : 'Linguistics, Human Blueprint, Timeline Decoders, Cycle Analysis',
    twitter: user?.socials?.twitter || '',
    github: user?.socials?.github || '',
    website: user?.socials?.website || '',
    linkedin: user?.socials?.linkedin || '',
  });

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

  // Generate 70-day heatmap data
  const activityDays = Array.from({ length: 70 }, (_, i) => {
    const isLit = (i * 7 + user.xp) % 4 !== 0;
    const intensity = (i + user.level) % 4;
    return { id: i, isLit, intensity };
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedFields: Partial<User> = {
      name: formData.name.trim() || user.name,
      title: formData.title.trim(),
      bio: formData.bio.trim(),
      avatar: formData.avatar.trim() || user.avatar,
      coverImage: formData.coverImage.trim(),
      location: formData.location.trim(),
      interests: formData.interests.split(',').map((s) => s.trim()).filter(Boolean),
      socials: {
        twitter: formData.twitter.trim(),
        github: formData.github.trim(),
        website: formData.website.trim(),
        linkedin: formData.linkedin.trim(),
      },
    };

    updateUserProfile(updatedFields, user.id);
    setIsEditing(false);
  };

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim()) return;
    sendDirectMessage(user.id, dmText.trim());
    setDmText('');
    setIsSendingDM(false);
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  ];

  const coverPresets = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fadeIn" id="profile-page-view">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack || (() => setActiveTab('community'))}
          id="profile-back-btn"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              id="edit-profile-btn"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Editing' : 'Edit My Profile'}</span>
            </button>
          )}

          {!isOwnProfile && currentUser && (
            <button
              onClick={() => setIsSendingDM(true)}
              id="dm-user-btn"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Direct Message</span>
            </button>
          )}

          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              showToast({ title: 'Profile Link Copied!', message: 'Shareable URL copied to clipboard.', type: 'info' });
            }}
            id="share-profile-btn"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Share Profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Card Header (Skool Style) */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Cover Photo */}
        <div className="h-44 sm:h-52 w-full relative bg-slate-800 overflow-hidden">
          <img
            src={user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
            alt="Cover Banner"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 pb-6 pt-0 relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-slate-900 shadow-2xl bg-slate-800"
                />
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online Member" />
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-white tracking-tight">{user.name}</h1>
                  {user.role === 'creator' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <Crown className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Headmaster / Faculty</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-400 font-medium">{user.title || (user.role === 'creator' ? 'Faculty Instructor' : 'University Research Fellow')}</p>
                <p className="text-[11px] text-slate-400">{user.email}</p>
              </div>
            </div>

            {/* Badges & Tiers */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${
                user.subscriptionTier === 'vip'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : user.subscriptionTier === 'pro'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {user.subscriptionTier} Tier
              </span>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {user.streakDays} Day Streak
              </span>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="space-y-3 pt-2">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {user.bio || 'Exploring linguistics, pattern decoding, and personal matrices at Vaughan Code University.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Joined {user.joinedDate}</span>
              </div>
              {user.socials?.website && (
                <a href={user.socials.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:underline">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}
              {user.socials?.twitter && (
                <a href={`https://twitter.com/${user.socials.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-400 hover:underline">
                  <Twitter className="w-3.5 h-3.5" />
                  <span>{user.socials.twitter}</span>
                </a>
              )}
              {user.socials?.github && (
                <a href={`https://github.com/${user.socials.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-300 hover:underline">
                  <Github className="w-3.5 h-3.5" />
                  <span>{user.socials.github}</span>
                </a>
              )}
            </div>

            {/* Interest Tags */}
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Focus Areas:</span>
                {user.interests.map((interest, i) => (
                  <span key={i} className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    #{interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Level Progress Bar Banner */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Level {user.level}: {currentLevelTier.title}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-amber-400">{user.xp.toLocaleString()} Total XP</span>
                <button
                  onClick={openLevelPerksModal}
                  id="profile-view-level-perks-btn"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                >
                  View All Perks ↗
                </button>
              </div>
            </div>
            <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                {nextLevelTier
                  ? `${(nextLevelTier.minXp - user.xp).toLocaleString()} XP to reach Level ${user.level + 1} (${nextLevelTier.title})`
                  : 'Maximum Grandmaster Level Reached! 🏆'}
              </span>
              <span className="font-medium text-slate-300">Active Rank #{user.level >= 7 ? '1 (Podium)' : user.level >= 4 ? 'Top 10' : '42'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE FORM MODAL / PANEL */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Edit Your Skool Profile Page</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Headline Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Research Fellow • Pattern Analyst"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Personal Bio & Research Focus</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Avatar Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Avatar Image URL or Quick Selector</label>
            <input
              type="text"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mb-2"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {avatarPresets.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="preset"
                  onClick={() => setFormData({ ...formData, avatar: img })}
                  className={`w-8 h-8 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                    formData.avatar === img ? 'border-indigo-500 scale-110 shadow' : 'border-transparent hover:border-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quick Cover Banner Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cover Banner Image URL</label>
            <input
              type="text"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mb-2"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {coverPresets.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="cover preset"
                  onClick={() => setFormData({ ...formData, coverImage: img })}
                  className={`w-14 h-7 rounded-md object-cover cursor-pointer border-2 transition-all ${
                    formData.coverImage === img ? 'border-indigo-500 scale-105' : 'border-transparent hover:border-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Focus Areas (Comma Separated)</label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Twitter / X Handle</label>
              <input
                type="text"
                placeholder="@username"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Username</label>
              <input
                type="text"
                placeholder="github-username"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Personal Website</label>
              <input
                type="text"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-profile-btn"
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* SEND DIRECT MESSAGE MODAL */}
      {isSendingDM && (
        <form onSubmit={handleSendDM} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>Direct Message to {user.name}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsSendingDM(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            required
            rows={3}
            placeholder={`Write a message to ${user.name}...`}
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSendingDM(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
            >
              Send Message
            </button>
          </div>
        </form>
      )}

      {/* Skool Style Profile Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setProfileTab('activity')}
          id="profile-tab-activity"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Activity & Posts ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('courses')}
          id="profile-tab-courses"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'courses' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Classroom & Certificates</span>
        </button>

        <button
          onClick={() => setProfileTab('badges')}
          id="profile-tab-badges"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'badges' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Badges ({userEarnedBadges.length}/{badges.length})</span>
        </button>

        <button
          onClick={() => setProfileTab('about')}
          id="profile-tab-about"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'about' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Learning Matrix</span>
        </button>
      </div>

      {/* TAB CONTENT: Activity */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {userPosts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No community posts published yet.</p>
              <p className="text-xs text-slate-500 mt-1">Discussions and insights posted by {user.name} will appear here.</p>
            </div>
          ) : (
            userPosts.map((post) => (
              <div key={post.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="text-base font-bold text-white">{post.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>❤️ {post.likes.length} Likes</span>
                  <span>💬 {post.comments.length} Comments</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: Classroom & Certificates */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((course) => {
              const allLessons = course.modules.flatMap((m) => m.lessons);
              const completedCount = allLessons.filter((l) => user.completedLessonIds.includes(l.id)).length;
              const isFinished = allLessons.length > 0 && completedCount === allLessons.length;
              const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

              return (
                <div key={course.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={course.thumbnail} alt={course.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{course.title}</h4>
                      <p className="text-xs text-slate-400">{course.modules.length} Modules • {allLessons.length} Lessons</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold text-white">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {isFinished && (
                    <button
                      onClick={() => openCertificateModal(course)}
                      className="w-full py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>View Official Certificate 📜</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Badges */}
      {activeTab === 'badges' && (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((b) => {
            const isEarned = user.badges.includes(b.id);
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between space-y-2 ${
                  isEarned
                    ? 'bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/40 border-slate-800 opacity-50 grayscale'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                  {b.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{b.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{b.description}</p>
                </div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  +{b.xpReward} XP Reward
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: Learning Matrix & Heatmap */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-sm font-bold text-white">Daily Learning Activity Heatmap (Last 10 Weeks)</h4>
            <div className="flex gap-1.5 flex-wrap pt-2">
              {activityDays.map((day) => (
                <div
                  key={day.id}
                  className={`w-3.5 h-3.5 rounded-sm ${
                    day.isLit
                      ? day.intensity === 3
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20'
                        : day.intensity === 2
                        ? 'bg-emerald-400'
                        : 'bg-emerald-300/80'
                      : 'bg-slate-800 border border-slate-700/50'
                  }`}
                  title={`Activity score: ${day.intensity}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Less Active</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              </div>
              <span>Highly Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
