import React, { useState } from 'react';
import { 
  Shield, 
  Crown, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Radio, 
  Zap, 
  Award, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Plus, 
  Sparkles, 
  UserCheck, 
  UserX, 
  Lock, 
  Unlock, 
  Send, 
  ArrowUpRight,
  Pin,
  Flame,
  Check,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubscriptionTier, UserRole, User } from '../../types';

export const AdminControlView: React.FC = () => {
  const { 
    currentUser, 
    users, 
    courses, 
    posts, 
    badges, 
    systemAnnouncement, 
    adminUpdateUserTier, 
    adminUpdateUserRole, 
    adminUpdateUserStatus, 
    adminAwardUserXP, 
    adminToggleBadge, 
    adminDeletePost, 
    adminBroadcastAnnouncement, 
    dismissAnnouncement,
    openUserProfile,
    openCourseEditor,
    switchUser,
    togglePinPost,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'moderation' | 'curriculum' | 'broadcast' | 'analytics'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [isPriority, setIsPriority] = useState(true);

  // Custom XP modal state
  const [selectedUserForXp, setSelectedUserForXp] = useState<User | null>(null);
  const [customXpAmount, setCustomXpAmount] = useState<number>(100);
  const [xpReason, setXpReason] = useState<string>('Excellence in Research');

  // Check if current user is authorized
  const isAuthorized = 
    currentUser?.id === 'user-creator' || 
    currentUser?.id === 'user-instructor' || 
    currentUser?.name === 'Prof. Vaughan' || 
    currentUser?.name === 'Alexander Kotzev' || 
    currentUser?.role === 'creator';

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || u.subscriptionTier === tierFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesTier && matchesRole;
  });

  const handlePublishBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;
    adminBroadcastAnnouncement(broadcastTitle.trim(), broadcastContent.trim(), isPriority);
    setBroadcastTitle('');
    setBroadcastContent('');
  };

  const handleGrantCustomXp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForXp) return;
    adminAwardUserXP(selectedUserForXp.id, customXpAmount, xpReason);
    setSelectedUserForXp(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn" id="admin-control-view">
      {/* Faculty Credentials Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-300/40 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  VCU Faculty & Administrator Control Hub
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Faculty Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Authorized command center for <strong className="text-amber-300">Prof. Vaughan</strong> (Headmaster) and <strong className="text-amber-300">Alexander Kotzev</strong> (Instructor). Control student tiers, roles, gamification XP, courses, and platform moderation.
              </p>
            </div>
          </div>

          {/* Quick Switcher for Faculty */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700/80 shrink-0">
            <div className="text-[11px] text-slate-400 font-medium pl-1">Acting as:</div>
            <button
              onClick={() => switchUser('user-creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentUser?.id === 'user-creator' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Prof. Vaughan
            </button>
            <button
              onClick={() => switchUser('user-instructor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentUser?.id === 'user-instructor' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Alexander Kotzev
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Enrolled Scholars</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{users.length + 1242}</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" /> +14% this month
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monthly Revenue (MRR)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">$18,450</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" /> 892 Active Pro/VIP
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Masterclasses & Labs</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{courses.length} Courses</div>
          <div className="text-[10px] text-slate-400">4,120 Lessons Mastered</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>System Operational</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">100% OK</div>
          <div className="text-[10px] text-slate-400">256-Bit SSL Secured</div>
        </div>
      </div>

      {/* Admin Nav Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('members')}
          id="admin-tab-members"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
            activeSubTab === 'members' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student & Member Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('moderation')}
          id="admin-tab-moderation"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
            activeSubTab === 'moderation' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Post & Content Moderation ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('curriculum')}
          id="admin-tab-curriculum"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
            activeSubTab === 'curriculum' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Management</span>
        </button>

        <button
          onClick={() => setActiveSubTab('broadcast')}
          id="admin-tab-broadcast"
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
            activeSubTab === 'broadcast' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          <span>University Announcements</span>
        </button>
      </div>

      {/* SUB-TAB 1: MEMBERS MANAGEMENT TABLE */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Tiers</option>
                <option value="vip">VIP Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="free">Free Tier</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="creator">Creator / Faculty</option>
                <option value="moderator">Moderator</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Scholar / User</th>
                    <th className="py-3.5 px-3 font-semibold">Level & XP</th>
                    <th className="py-3.5 px-3 font-semibold">Membership Tier</th>
                    <th className="py-3.5 px-3 font-semibold">Role</th>
                    <th className="py-3.5 px-3 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Faculty Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((u) => {
                    const isSuspended = u.status === 'suspended';

                    return (
                      <tr key={u.id} className="hover:bg-slate-850 hover:bg-slate-800/40 transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              onClick={() => openUserProfile(u.id, 'page')}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                            <div>
                              <div
                                onClick={() => openUserProfile(u.id, 'page')}
                                className="font-bold text-white hover:text-indigo-400 cursor-pointer flex items-center gap-1.5"
                              >
                                <span>{u.name}</span>
                                {u.role === 'creator' && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Level & XP */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-amber-400">Level {u.level}</div>
                          <div className="text-[11px] text-slate-400">{u.xp.toLocaleString()} XP • 🔥 {u.streakDays}d</div>
                        </td>

                        {/* Tier Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={u.subscriptionTier}
                            onChange={(e) => adminUpdateUserTier(u.id, e.target.value as SubscriptionTier)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none ${
                              u.subscriptionTier === 'vip'
                                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                                : u.subscriptionTier === 'pro'
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <option value="free">FREE</option>
                            <option value="pro">PRO ($49/mo)</option>
                            <option value="vip">VIP ($99/mo)</option>
                          </select>
                        </td>

                        {/* Role Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => adminUpdateUserRole(u.id, e.target.value as UserRole)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="creator">Creator / Faculty</option>
                          </select>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => adminUpdateUserStatus(u.id, isSuspended ? 'active' : 'suspended')}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <UserX className="w-3 h-3" /> Suspended
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" /> Active
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Award XP Quick Buttons */}
                            <button
                              onClick={() => adminAwardUserXP(u.id, 100, 'Faculty Commendation')}
                              title="Award +100 XP"
                              className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-colors"
                            >
                              +100 XP
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForXp(u);
                                setCustomXpAmount(500);
                              }}
                              title="Custom XP"
                              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                            <button
                              onClick={() => openUserProfile(u.id, 'page')}
                              title="View Full Profile Page"
                              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONTENT & POST MODERATION */}
      {activeSubTab === 'moderation' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="text-xs text-slate-300">
              Moderation controls: Pin announcements to the top of feed, or delete non-compliant posts immediately.
            </div>
            <span className="text-xs font-bold text-indigo-400">{posts.length} Total Discussions</span>
          </div>

          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`p-4 rounded-2xl border transition-all ${
                  post.isPinned
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      onClick={() => openUserProfile(post.authorId, 'page')}
                      className="w-9 h-9 rounded-xl object-cover cursor-pointer hover:opacity-80"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => openUserProfile(post.authorId, 'page')}
                          className="font-bold text-xs text-white hover:text-indigo-400 cursor-pointer"
                        >
                          {post.authorName}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {post.category}
                        </span>
                        {post.isPinned && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{post.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => togglePinPost(post.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                        post.isPinned
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      <span>{post.isPinned ? 'Unpin' : 'Pin to Top'}</span>
                    </button>

                    <button
                      onClick={() => adminDeletePost(post.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 transition-colors"
                      title="Moderate / Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed pl-12">
                  {post.content}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80 pl-12">
                  <span>❤️ {post.likes.length} Likes</span>
                  <span>💬 {post.comments.length} Comments</span>
                  <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CURRICULUM MANAGEMENT */}
      {activeSubTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">University Course Catalog</h3>
              <p className="text-xs text-slate-400">Launch lesson builder or configure access tier restrictions.</p>
            </div>
            <button
              onClick={() => openCourseEditor()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Masterclass</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((course) => {
              const allLessons = course.modules.flatMap((m) => m.lessons);

              return (
                <div key={course.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={course.thumbnail} alt={course.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{course.title}</h4>
                      <p className="text-xs text-indigo-400 font-medium">{course.author?.name || 'Prof. Vaughan'}</p>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {course.modules.length} Modules • {allLessons.length} Lessons • Requires {course.requiredTier.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Level {course.requiredLevel}+
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCourseEditor(course)}
                        className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        Edit Course & Lessons
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CAMPUS BROADCAST ANNOUNCEMENTS */}
      {activeSubTab === 'broadcast' && (
        <div className="space-y-4">
          {/* Active Announcement Preview */}
          {systemAnnouncement && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Live Campus Broadcast
                </span>
                <button
                  onClick={dismissAnnouncement}
                  className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 bg-slate-900/60 rounded-lg"
                >
                  Dismiss / Archive Broadcast
                </button>
              </div>
              <h4 className="text-sm font-bold text-white">{systemAnnouncement.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{systemAnnouncement.content}</p>
              <div className="text-[10px] text-amber-400 font-medium">
                Author: {systemAnnouncement.authorName} ({systemAnnouncement.authorRole}) • Published {new Date(systemAnnouncement.date).toLocaleString()}
              </div>
            </div>
          )}

          {/* Broadcast Form */}
          <form onSubmit={handlePublishBroadcast} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Radio className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white">Publish New University Broadcast</h3>
                <p className="text-xs text-slate-400">Broadcast banner message across the top of the campus for all students and faculty.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Broadcast Headline</label>
              <input
                type="text"
                required
                placeholder="e.g. 🎓 Faculty Live Laboratory This Thursday with Prof. Vaughan"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Message</label>
              <textarea
                required
                rows={3}
                placeholder="Include agenda, links, workshop room info, or important timeline updates..."
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Mark as High Priority Alert (Gold Alert Banner)</span>
              </label>

              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Publish Campus Broadcast</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM XP MODAL */}
      {selectedUserForXp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleGrantCustomXp}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Adjust Scholar XP: {selectedUserForXp.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserForXp(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">XP Amount (Positive or Negative)</label>
              <input
                type="number"
                required
                value={customXpAmount}
                onChange={(e) => setCustomXpAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Citation</label>
              <input
                type="text"
                required
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForXp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
              >
                Apply XP Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
