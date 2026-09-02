import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Users, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  Sparkles,
  Lock,
  Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CommunityEvent } from '../../types';

export const CalendarView: React.FC = () => {
  const { events, currentUser, toggleEventRSVP, openSubscriptionModal, showToast } = useApp();

  const handleExportCalendar = (event: CommunityEvent) => {
    showToast({
      title: 'Calendar Event (.ICS) Created! 📅',
      message: `Event for "${event.title}" prepared for Google Calendar / Apple iCal.`,
      type: 'info',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community Events & Live Calls</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Join weekly live coaching workshops, teardowns, research seminars, and interactive masterminds with Headmaster Prof. Vaughan, Instructor Alexander Kotzev, and guest fellows.
          </p>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-5">
        {events.map((event) => {
          const isRsvpd = currentUser ? event.rsvpUserIds.includes(currentUser.id) : false;
          const isVipOnly = event.requiredTier === 'vip' && currentUser?.subscriptionTier !== 'vip';

          return (
            <div
              key={event.id}
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${
                isVipOnly ? 'border-slate-200 opacity-80' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Left Date / Badge & Info */}
                <div className="flex items-start gap-4">
                  {/* Date Badge */}
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {event.startTime} – {event.endTime} {event.timeZone}
                      </span>

                      {event.requiredTier === 'vip' ? (
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                          VIP MASTERMIND EXCLUSIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ALL SCHOLARS WELCOME
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <img
                          src={event.speaker.avatar}
                          alt={event.speaker.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200"
                        />
                        <span className="font-medium text-slate-800">{event.speaker.name}</span>
                        <span className="text-slate-400">({event.speaker.title})</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{event.rsvpUserIds.length} attending</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => handleExportCalendar(event)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Add to Google Calendar / iCal"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>

                  {isVipOnly ? (
                    <button
                      onClick={openSubscriptionModal}
                      className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Upgrade to VIP</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEventRSVP(event.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isRsvpd
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isRsvpd ? 'text-emerald-700' : 'text-white'}`} />
                        <span>{isRsvpd ? 'Attending ✓' : 'RSVP Now'}</span>
                      </button>

                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                      >
                        <Video className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Join Stage</span>
                      </a>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
