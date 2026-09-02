import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Flame, 
  Crown, 
  Award, 
  Send, 
  X, 
  Sparkles, 
  CheckCircle2, 
  User as UserIcon,
  Globe,
  MapPin,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, DirectMessage } from '../../types';

export const MembersView: React.FC = () => {
  const { 
    users, 
    currentUser, 
    openUserProfile, 
    directMessages, 
    sendDirectMessage,
    openLevelPerksModal 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'creator' | 'pro' | 'vip'>('all');
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  // Filter members
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.bio.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = 
      filterTier === 'all' ||
      (filterTier === 'creator' && u.role === 'creator') ||
      (filterTier === 'pro' && u.subscriptionTier === 'pro') ||
      (filterTier === 'vip' && u.subscriptionTier === 'vip');

    return matchesSearch && matchesTier;
  });

  // Conversation with activeChatUser
  const conversationMessages = directMessages.filter(
    (dm) =>
      (dm.senderId === currentUser?.id && dm.receiverId === activeChatUser?.id) ||
      (dm.senderId === activeChatUser?.id && dm.receiverId === currentUser?.id)
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUser || !chatMessage.trim()) return;
    sendDirectMessage(activeChatUser.id, chatMessage);
    setChatMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn" id="members-directory-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Scholars & Faculty Directory</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Connect with {users.length} active researchers, instructors, and peers across the Vaughan Code University network.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, title, or interest..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-xs w-56 sm:w-64"
            />
          </div>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 shadow-xs cursor-pointer"
          >
            <option value="all">All Members</option>
            <option value="creator">Faculty & Instructors</option>
            <option value="pro">Pro Scholars</option>
            <option value="vip">VIP Masterminds</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((member) => {
          const isMe = currentUser?.id === member.id;

          return (
            <div
              key={member.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div 
                    onClick={() => openUserProfile(member.id, 'page')}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-200 group-hover:border-indigo-500 transition-colors"
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Online" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</h3>
                        {member.role === 'creator' && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{member.title || (member.role === 'creator' ? 'Faculty Instructor' : `Level ${member.level} Scholar`)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {member.id === 'user-creator' ? (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                        HEADMASTER
                      </span>
                    ) : member.id === 'user-instructor' ? (
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                        INSTRUCTOR
                      </span>
                    ) : member.role === 'creator' ? (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md">
                        FACULTY
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                        {member.subscriptionTier}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {member.bio}
                </p>

                {/* Tags */}
                {member.interests && member.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {member.interests.slice(0, 2).map((interest, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        #{interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats & Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    {member.streakDays}d
                  </span>
                  <span>Lvl {member.level}</span>
                  <span className="font-semibold text-indigo-600">{member.xp.toLocaleString()} XP</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openUserProfile(member.id, 'page')}
                    id={`view-profile-btn-${member.id}`}
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

      {/* Direct Messaging Drawer / Modal */}
      {activeChatUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col h-[500px]">
            
            {/* Header */}
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
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{activeChatUser.name}</h3>
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Active Now • View Profile ↗</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveChatUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Start a discussion with {activeChatUser.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Share research discoveries, code insights, or collaborate.</p>
                </div>
              ) : (
                conversationMessages.map((msg) => {
                  const isSentByMe = msg.senderId === currentUser?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                          isSentByMe
                            ? 'bg-indigo-600 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span
                          className={`text-[9px] block mt-1 ${
                            isSentByMe ? 'text-indigo-200 text-right' : 'text-slate-400'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={`Message ${activeChatUser.name}...`}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
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
