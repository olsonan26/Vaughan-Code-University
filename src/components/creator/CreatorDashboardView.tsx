import React from 'react';
import { 
  DollarSign, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Plus, 
  Video, 
  Music, 
  FileText, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CreatorDashboardView: React.FC = () => {
  const { 
    courses, 
    users, 
    posts, 
    openCourseEditor, 
    openUserProfile, 
    setActiveTab 
  } = useApp();

  const proCount = users.filter((u) => u.subscriptionTier === 'pro').length;
  const vipCount = users.filter((u) => u.subscriptionTier === 'vip').length;
  const freeCount = users.filter((u) => u.subscriptionTier === 'free').length;

  // Calculate MRR
  const mrr = (proCount * 29) + (vipCount * 79);
  const arr = mrr * 12;

  // Total lessons uploaded
  const totalLessons = courses.reduce(
    (acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Creator & Instructor Studio</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your digital academy teachings, monitor recurring subscription revenues, and track student completion metrics.
          </p>
        </div>

        <button
          onClick={() => openCourseEditor()}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Masterclass Course</span>
        </button>
      </div>

      {/* Revenue & Academy Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: MRR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Monthly Recurring (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">${mrr.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>${arr.toLocaleString()} Projected ARR</span>
          </div>
        </div>

        {/* Metric 2: Active Subscribers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Paid Subscribers</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{proCount + vipCount}</p>
          <p className="text-[11px] text-slate-500">
            {proCount} Pro ($29/mo) • {vipCount} VIP ($79/mo)
          </p>
        </div>

        {/* Metric 3: Total Teachings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Uploaded Teachings</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalLessons}</p>
          <p className="text-[11px] text-slate-500">
            {courses.length} Active Courses across {courses.reduce((a, c) => a + c.modules.length, 0)} Modules
          </p>
        </div>

        {/* Metric 4: Community Engagement */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Discussions & Posts</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{posts.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            High member engagement
          </p>
        </div>

      </div>

      {/* Teaching Upload Quick Shortcuts */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Quick Teaching Content Uploaders</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => openCourseEditor()}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl text-left space-y-2 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">Upload Video Lecture</h4>
            <p className="text-[11px] text-slate-500">Stream MP4/HLS video with chapter markers and notes.</p>
          </button>

          <button
            onClick={() => openCourseEditor()}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl text-left space-y-2 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-800">Add Audio Podcast Masterclass</h4>
            <p className="text-[11px] text-slate-500">Audio teaching with speed controller and interactive transcript.</p>
          </button>

          <button
            onClick={() => openCourseEditor()}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-red-400 hover:bg-red-50/30 rounded-xl text-left space-y-2 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-800">Upload PDF Blueprint</h4>
            <p className="text-[11px] text-slate-500">Attach printable guidebooks, checklists, and reference cheat sheets.</p>
          </button>

          <button
            onClick={() => openCourseEditor()}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl text-left space-y-2 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-900">Create Certification Test</h4>
            <p className="text-[11px] text-slate-500">Build multiple-choice tests with instant scoring and XP rewards.</p>
          </button>
        </div>
      </div>

      {/* Student Membership & Progress Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Student Roster & Certification Progress</h3>
          <span className="text-xs text-slate-500">{users.length} Total Scholars</span>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((member) => (
            <div
              key={member.id}
              onClick={() => openUserProfile(member.id)}
              className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{member.name}</span>
                    <span className="text-[10px] text-slate-400">{member.email}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Level {member.level} • {member.completedLessonIds.length} Lessons Finished • {member.passedTestIds.length} Tests Passed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  member.subscriptionTier === 'vip'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : member.subscriptionTier === 'pro'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {member.subscriptionTier}
                </span>
                <span className="font-bold text-indigo-600">{member.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
