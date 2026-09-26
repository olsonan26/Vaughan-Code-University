import React, { useMemo, useState } from 'react';
import {
  Shield,
  Crown,
  Users,
  BookOpen,
  MessageSquare,
  Radio,
  Zap,
  Search,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Pin,
  Eye,
  Send,
  Award,
  CheckCircle2,
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
    subscriptionPlans,
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
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'moderation' | 'curriculum' | 'broadcast'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | SubscriptionTier>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [isPriority, setIsPriority] = useState(true);
  const [selectedUserForXp, setSelectedUserForXp] = useState<User | null>(null);
  const [customXpAmount, setCustomXpAmount] = useState(100);
  const [xpReason, setXpReason] = useState('Faculty recognition');

  const isAuthorized = currentUser?.id === 'user-creator' || currentUser?.id === 'user-instructor';

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    const matchesTier = tierFilter === 'all' || user.subscriptionTier === tierFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesTier && matchesRole;
  });

  const stats = useMemo(() => {
    const studentAccounts = users.filter((user) => user.role === 'member').length;
    const moderators = users.filter((user) => user.role === 'moderator').length;
    const totalLessons = courses.reduce(
      (sum, course) => sum + course.modules.reduce((moduleSum, mod) => moduleSum + mod.lessons.length, 0),
      0,
    );
    const completions = users.reduce((sum, user) => sum + user.completedLessonIds.length, 0);
    const certifications = users.reduce((sum, user) => sum + user.passedTestIds.length, 0);
    return { studentAccounts, moderators, totalLessons, completions, certifications };
  }, [users, courses]);

  const proPlan = subscriptionPlans.find((plan) => plan.id === 'pro');
  const vipPlan = subscriptionPlans.find((plan) => plan.id === 'vip');

  const roleLabel = (user: User) => {
    if (user.id === 'user-creator') return 'Headmaster / Lead Instructor';
    if (user.id === 'user-instructor') return 'Instructor / Moderator';
    if (user.role === 'moderator') return 'Moderator';
    return 'Member';
  };

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

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Faculty administration only</h1>
          <p className="text-sm text-slate-500 mt-1">
            Community moderators can moderate discussions from the Community feed but do not have full platform administration access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn" id="admin-control-view">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">VCU Faculty Administration</h1>
              <p className="text-xs text-slate-300 mt-1">
                Full administration for Prof. Vaughan and Alexander Kotzev. Moderator permissions remain limited to community moderation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700/80 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium pl-1">Acting as:</span>
            <button
              onClick={() => switchUser('user-creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentUser?.id === 'user-creator'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Prof. Vaughan
            </button>
            <button
              onClick={() => switchUser('user-instructor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentUser?.id === 'user-instructor'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Alexander Kotzev
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-xs text-slate-400">Student Accounts</p>
          <p className="text-2xl font-black text-white mt-1">{stats.studentAccounts}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-xs text-slate-400">Moderators</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">{stats.moderators}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-xs text-slate-400">Curriculum Lessons</p>
          <p className="text-2xl font-black text-white mt-1">{stats.totalLessons}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-xs text-slate-400">Lesson Completions</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completions}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-xs text-slate-400">Tests Passed</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{stats.certifications}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          ['members', 'Members', Users],
          ['moderation', 'Moderation', MessageSquare],
          ['curriculum', 'Curriculum', BookOpen],
          ['broadcast', 'Announcements', Radio],
        ].map(([key, label, Icon]) => (
          <button
            key={key as string}
            onClick={() => setActiveSubTab(key as typeof activeSubTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 ${
              activeSubTab === key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label as string}</span>
          </button>
        ))}
      </div>

      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as 'all' | SubscriptionTier)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="all">All Tiers</option>
                <option value="vip">VIP</option>
                <option value="pro">Pro</option>
                <option value="free">Free</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="all">All Roles</option>
                <option value="creator">Faculty</option>
                <option value="moderator">Moderator</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Member</th>
                    <th className="py-3.5 px-3 font-semibold">Progress</th>
                    <th className="py-3.5 px-3 font-semibold">Membership</th>
                    <th className="py-3.5 px-3 font-semibold">University Role</th>
                    <th className="py-3.5 px-3 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSuspended = user.status === 'suspended';
                    const protectedTeamRole = user.id === 'user-creator' || user.id === 'user-instructor';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              onClick={() => openUserProfile(user.id, 'page')}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 cursor-pointer"
                            />
                            <div>
                              <button
                                onClick={() => openUserProfile(user.id, 'page')}
                                className="font-bold text-slate-900 hover:text-indigo-600"
                              >
                                {user.name}
                              </button>
                              <div className="text-[11px] text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-indigo-700">Level {user.level}</div>
                          <div className="text-[11px] text-slate-500">{user.xp.toLocaleString()} XP • {user.streakDays}d streak</div>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={user.subscriptionTier}
                            onChange={(e) => adminUpdateUserTier(user.id, e.target.value as SubscriptionTier)}
                            className="rounded-lg px-2.5 py-1 text-xs font-bold border border-slate-200 bg-white text-slate-700"
                          >
                            <option value="free">FREE</option>
                            <option value="pro">PRO{proPlan ? ` ($${proPlan.priceMonthly}/mo)` : ''}</option>
                            <option value="vip">VIP{vipPlan ? ` ($${vipPlan.priceMonthly}/mo)` : ''}</option>
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          {protectedTeamRole ? (
                            <span className="font-semibold text-slate-800">{roleLabel(user)}</span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => adminUpdateUserRole(user.id, e.target.value as UserRole)}
                              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <button
                            onClick={() => adminUpdateUserStatus(user.id, isSuspended ? 'active' : 'suspended')}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              isSuspended
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isSuspended ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            {isSuspended ? 'Suspended' : 'Active'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => adminAwardUserXP(user.id, 100, 'Faculty recognition')}
                              className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[11px] font-bold"
                            >
                              +100 XP
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForXp(user);
                                setCustomXpAmount(100);
                              }}
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                              title="Custom XP"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                            </button>
                            <button
                              onClick={() => openUserProfile(user.id, 'page')}
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200"
                              title="View profile"
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

      {activeSubTab === 'moderation' && (
        <div className="space-y-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-600">
              Full faculty controls are shown here. Community moderators can remove inappropriate posts directly from the Community feed without receiving billing, course-owner, or system-administrator access.
            </p>
          </div>

          {posts.map((post) => (
            <div key={post.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{post.authorName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{post.category}</span>
                    {post.isPinned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{post.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{post.content}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePinPost(post.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                      post.isPinned
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    <span>{post.isPinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                  <button
                    onClick={() => adminDeletePost(post.id)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600"
                    title="Remove post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900">University Curriculum</h3>
              <p className="text-xs text-slate-500">Manage the existing course structure without changing the Vaughan Code teaching definitions.</p>
            </div>
            <button
              onClick={() => openCourseEditor()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((course) => {
              const allLessons = course.modules.flatMap((mod) => mod.lessons);
              return (
                <div key={course.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <img src={course.thumbnail} alt={course.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{course.title}</h4>
                      <p className="text-xs text-indigo-600 font-medium">{course.author.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {course.modules.length} modules • {allLessons.length} teachings • {course.requiredTier.toUpperCase()} access
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{course.description}</p>
                  <button
                    onClick={() => openCourseEditor(course)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Edit Course
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'broadcast' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={handlePublishBroadcast} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Publish University Announcement</h3>
              <p className="text-xs text-slate-500 mt-1">Send a short campus-wide update without inventing events or claims.</p>
            </div>

            <input
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            <textarea
              required
              rows={5}
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Announcement message"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={isPriority} onChange={(e) => setIsPriority(e.target.checked)} />
              Priority banner
            </label>

            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Publish Announcement
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Current Announcement</h3>
            {systemAnnouncement ? (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-sm text-slate-900">{systemAnnouncement.title}</p>
                <p className="text-xs text-slate-600">{systemAnnouncement.content}</p>
                <button onClick={dismissAnnouncement} className="text-xs font-semibold text-rose-600 hover:underline">
                  Dismiss announcement
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-3">No active university announcement.</p>
            )}
          </div>
        </div>
      )}

      {selectedUserForXp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleGrantCustomXp} className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">Adjust XP for {selectedUserForXp.name}</h3>
            </div>
            <input
              type="number"
              value={customXpAmount}
              onChange={(e) => setCustomXpAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              value={xpReason}
              onChange={(e) => setXpReason(e.target.value)}
              placeholder="Reason"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedUserForXp(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Apply XP
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
