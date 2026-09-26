import React, { useState } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Flame,
  Crown,
  Send,
  X,
  User as UserIcon,
  Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';

const roleLabel = (member: User) => {
  if (member.id === 'user-creator') return 'HEADMASTER';
  if (member.id === 'user-instructor') return 'INSTRUCTOR';
  if (member.role === 'moderator') return 'MODERATOR';
  return member.subscriptionTier.toUpperCase();
};

const roleClass = (member: User) => {
  if (member.id === 'user-creator') return 'bg-amber-100 text-amber-900 border-amber-300';
  if (member.id === 'user-instructor') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (member.role === 'moderator') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const MembersView: React.FC = () => {
  const {
    users,
    currentUser,
    openUserProfile,
    directMessages,
    sendDirectMessage,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'team' | 'moderator' | 'pro' | 'vip'>('all');
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.bio.toLowerCase().includes(query) ||
      (u.title || '').toLowerCase().includes(query);

    const matchesTier =
      filterTier === 'all' ||
      (filterTier === 'team' && (u.role === 'creator' || u.role === 'moderator')) ||
      (filterTier === 'moderator' && u.role === 'moderator') ||
      (filterTier === 'pro' && u.subscriptionTier === 'pro') ||
      (filterTier === 'vip' && u.subscriptionTier === 'vip');

    return matchesSearch && matchesTier;
  });

  const conversationMessages = directMessages.filter(
    (dm) =>
      (dm.senderId === currentUser?.id && dm.receiverId === activeChatUser?.id) ||
      (dm.senderId === activeChatUser?.id && dm.receiverId === currentUser?.id),
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUser || !chatMessage.trim()) return;
    sendDirectMessage(activeChatUser.id, chatMessage);
    setChatMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn" id="members-directory-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vaughan Code University Members</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Connect with the Headmaster, Instructor, moderators, and fellow students.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-xs w-56 sm:w-64"
            />
          </div>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as typeof filterTier)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
          >
            <option value="all">All Members</option>
            <option value="team">Official Team</option>
            <option value="moderator">Moderators</option>
            <option value="pro">Pro Students</option>
            <option value="vip">VIP Members</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((member) => {
          const isMe = currentUser?.id === member.id;
          const isTeam = member.role === 'creator' || member.role === 'moderator';

          return (
            <div
              key={member.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => openUserProfile(member.id, 'page')}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-indigo-500 transition-colors"
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Active" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {member.name}
                        </h3>
                        {member.id === 'user-creator' && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {member.role === 'moderator' && (
                          <Shield className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {member.title || `Level ${member.level} Student`}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black border px-2 py-0.5 rounded-md shrink-0 ${roleClass(member)}`}>
                    {roleLabel(member)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{member.bio}</p>

                {member.interests && member.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {member.interests.slice(0, 3).map((interest, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        #{interest}
                      </span>
                    ))}
                  </div>
                )}

                {member.id === 'user-instructor' && (
                  <div className="flex gap-1.5">
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                      INSTRUCTOR
                    </span>
                    <span className="text-[9px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.5 rounded">
                      MODERATOR
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3 text-slate-500 font-medium min-w-0">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    {member.streakDays}d
                  </span>
                  <span>Lvl {member.level}</span>
                  {!isTeam && <span className="font-semibold text-indigo-600">{member.xp.toLocaleString()} XP</span>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openUserProfile(member.id, 'page')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <UserIcon className="w-3 h-3 text-slate-500" />
                    <span>Profile</span>
                  </button>

                  {!isMe && (
                    <button
                      onClick={() => setActiveChatUser(member)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeChatUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col h-[500px]">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div
                onClick={() => {
                  openUserProfile(activeChatUser.id, 'page');
                  setActiveChatUser(null);
                }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <img
                  src={activeChatUser.avatar}
                  alt={activeChatUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {activeChatUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">{activeChatUser.title || roleLabel(activeChatUser)}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveChatUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Start a conversation with {activeChatUser.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ask a study question, share a chart result, or collaborate.</p>
                </div>
              ) : (
                conversationMessages.map((msg) => {
                  const isSentByMe = msg.senderId === currentUser?.id;

                  return (
                    <div key={msg.id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                          isSentByMe
                            ? 'bg-indigo-600 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={`Message ${activeChatUser.name}...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
