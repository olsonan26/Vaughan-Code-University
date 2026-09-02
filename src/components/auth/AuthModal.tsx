import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, CheckCircle2, Crown, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, signup, users, switchUser } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!name.trim() || !email.trim()) return;
      signup(name.trim(), email.trim(), password);
    } else {
      if (!email.trim()) return;
      login(email.trim(), password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">
              {isSignUp ? 'Join Vaughan Code University' : 'Welcome Back to Vaughan Code University'}
            </h3>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Taylor Swift"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            {isSignUp ? 'Sign Up & Get +20 XP Bonus' : 'Sign In'}
          </button>

          {/* Toggle between login and sign up */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-indigo-600 hover:underline cursor-pointer font-medium"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Free"}
            </button>
          </div>

          {/* Quick Demo Switcher */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Quick 1-Click Demo Login:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchUser('user-creator');
                  closeAuthModal();
                }}
                className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-[11px] font-semibold text-purple-800 transition-colors text-center cursor-pointer"
              >
                👑 Prof. Vaughan (Headmaster)
              </button>
              <button
                type="button"
                onClick={() => {
                  switchUser('user-instructor');
                  closeAuthModal();
                }}
                className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-[11px] font-semibold text-indigo-800 transition-colors text-center cursor-pointer"
              >
                🎓 Alex Kotzev (Instructor)
              </button>
              <button
                type="button"
                onClick={() => {
                  switchUser('user-pro');
                  closeAuthModal();
                }}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[11px] font-semibold text-emerald-800 transition-colors text-center cursor-pointer"
              >
                ⚡ Jordan Lee (Pro)
              </button>
              <button
                type="button"
                onClick={() => {
                  switchUser('user-free');
                  closeAuthModal();
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition-colors text-center cursor-pointer"
              >
                🌱 Sam Taylor (Free)
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
