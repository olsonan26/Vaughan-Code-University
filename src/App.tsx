/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { CommunityView } from './components/community/CommunityView';
import { ClassroomView } from './components/classroom/ClassroomView';
import { LeaderboardView } from './components/gamification/LeaderboardView';
import { CalendarView } from './components/calendar/CalendarView';
import { MembersView } from './components/members/MembersView';
import { CreatorDashboardView } from './components/creator/CreatorDashboardView';
import { ProfileView } from './components/profile/ProfileView';
import { AdminControlView } from './components/admin/AdminControlView';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { LevelUpModal } from './components/common/LevelUpModal';
import { LevelPerksModal } from './components/common/LevelPerksModal';
import { CertificateModal } from './components/classroom/CertificateModal';
import { CourseEditorModal } from './components/classroom/CourseEditorModal';
import { WelcomeModal } from './components/common/WelcomeModal';
import { ToastContainer } from './components/common/ToastContainer';
import { Crown, ShieldCheck, Zap } from 'lucide-react';

// Reset the old seeded demo cache once so the corrected Vaughan Code curriculum,
// team roster, posts, levels, and events replace the previous AI-generated content.
const CONTENT_VERSION = 'vaughan-code-content-2026-09-03';
const storedContentVersion = localStorage.getItem('vcu_content_version');
if (storedContentVersion !== CONTENT_VERSION) {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('vcu_v4_'))
    .forEach((key) => localStorage.removeItem(key));
  localStorage.setItem('vcu_content_version', CONTENT_VERSION);
}

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isSubscriptionModalOpen,
    closeSubscriptionModal,
    openSubscriptionModal,
    currentUser,
    subscriptionPlans,
  } = useApp();

  const proPlan = subscriptionPlans.find((plan) => plan.id === 'pro');
  const vipPlan = subscriptionPlans.find((plan) => plan.id === 'vip');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white font-sans antialiased">
      <Navbar />

      <main className="flex-1 pb-16">
        {activeTab === 'community' && <CommunityView />}
        {activeTab === 'classroom' && <ClassroomView />}
        {(activeTab === 'leaderboard' || activeTab === 'leaderboards') && <LeaderboardView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'members' && <MembersView />}
        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'admin' && <AdminControlView />}
        {activeTab === 'creator' && <CreatorDashboardView />}
      </main>

      {currentUser?.subscriptionTier === 'free' && (
        <div className="sticky bottom-0 z-30 bg-white/95 border-t border-slate-200 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Unlock the full VC 101, VC 201 and VC 301 curriculum, study guides, audio teachings and certifications.
                </p>
                <p className="text-[11px] text-slate-500">
                  {proPlan && `Pro Scholar $${proPlan.priceMonthly}/mo`}
                  {proPlan && vipPlan && ' • '}
                  {vipPlan && `VIP Mastermind $${vipPlan.priceMonthly}/mo`}
                </p>
              </div>
            </div>

            <button
              onClick={openSubscriptionModal}
              id="bottom-upgrade-cta-btn"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 cursor-pointer shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{proPlan ? `Upgrade to Pro ($${proPlan.priceMonthly}/mo)` : 'Upgrade to Pro'}</span>
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center font-bold text-[10px] text-white">
              V
            </div>
            <span className="font-bold text-slate-800">Vaughan Code University</span>
            <span className="text-slate-400">• Learn the code. Test the patterns. See for yourself.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure Learning Platform</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>XP & Study Progress</span>
            <span className="text-slate-300">|</span>
            <span>Video, Audio & Study Guides</span>
          </div>
        </div>
      </footer>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={closeSubscriptionModal}
      />
      <AuthModal />
      <UserProfileModal />
      <LevelUpModal />
      <LevelPerksModal />
      <CertificateModal />
      <CourseEditorModal />
      <WelcomeModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
