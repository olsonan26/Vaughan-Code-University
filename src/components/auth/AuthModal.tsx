import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../features/auth/useAuthShim';

type AuthTab = 'signin' | 'signup' | 'magic_link' | 'forgot_password';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, signup, switchUser } = useApp();
  const auth = useAuth();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setError(null);
      setInfo(null);
      firstInputRef.current?.focus();
    }
  }, [isAuthModalOpen, tab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (auth.mode === 'supabase') {
      if (tab === 'signin') {
        if (!email.trim() || !password) {
          setError('Please fill in all required fields.');
          return;
        }
        setLoading(true);
        try {
          const res = await auth.signInWithPassword(email.trim(), password);
          if (res.ok) {
            closeAuthModal();
          } else {
            setError(res.error || 'Failed to sign in.');
          }
        } catch (err: any) {
          setError(err?.message || 'An error occurred during sign in.');
        } finally {
          setLoading(false);
        }
      } else if (tab === 'signup') {
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
          setError('Please fill in all required fields.');
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        setLoading(true);
        try {
          const res = await auth.signUp(name.trim(), email.trim(), password);
          if (res.ok) {
            setInfo(res.info || 'Check your email to confirm your account.');
          } else {
            setError(res.error || 'Failed to create account.');
          }
        } catch (err: any) {
          setError(err?.message || 'An error occurred during account creation.');
        } finally {
          setLoading(false);
        }
      } else if (tab === 'magic_link') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }
        setLoading(true);
        try {
          const res = await auth.sendMagicLink(email.trim());
          if (res.ok) {
            setInfo(res.info || 'Check your email for the magic sign-in link.');
          } else {
            setError(res.error || 'Failed to send magic link.');
          }
        } catch (err: any) {
          setError(err?.message || 'An error occurred while sending magic link.');
        } finally {
          setLoading(false);
        }
      } else if (tab === 'forgot_password') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }
        setLoading(true);
        try {
          const res = await auth.sendPasswordReset(email.trim());
          if (res.ok) {
            setInfo(res.info || 'Check your email for password reset instructions.');
          } else {
            setError(res.error || 'Failed to send password reset email.');
          }
        } catch (err: any) {
          setError(err?.message || 'An error occurred while sending password reset email.');
        } finally {
          setLoading(false);
        }
      }
    } else {
      // Demo mode
      if (tab === 'signin') {
        if (!email.trim()) {
          setError('Please enter an email.');
          return;
        }
        const ok = login(email.trim(), password);
        if (ok) {
          closeAuthModal();
        } else {
          setError('Invalid login credentials.');
        }
      } else if (tab === 'signup') {
        if (!name.trim() || !email.trim()) {
          setError('Please fill in name and email.');
          return;
        }
        signup(name.trim(), email.trim(), password);
        closeAuthModal();
      } else if (tab === 'magic_link') {
        if (!email.trim()) {
          setError('Please enter an email.');
          return;
        }
        const res = await auth.sendMagicLink(email.trim());
        if (res.ok) {
          setInfo(res.info || 'Magic link sent.');
        } else {
          setError(res.error || 'Demo mode: no backend configured.');
        }
      } else if (tab === 'forgot_password') {
        if (!email.trim()) {
          setError('Please enter an email.');
          return;
        }
        const res = await auth.sendPasswordReset(email.trim());
        if (res.ok) {
          setInfo(res.info || 'Password reset link sent.');
        } else {
          setError(res.error || 'Demo mode: no backend configured.');
        }
      }
    }
  };

  const getTitle = () => {
    switch (tab) {
      case 'signin':
        return 'Welcome Back to Vaughan Code University';
      case 'signup':
        return 'Join Vaughan Code University';
      case 'magic_link':
        return 'Sign In with Magic Link';
      case 'forgot_password':
        return 'Reset Your Password';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 id="auth-modal-title" className="font-bold text-base text-slate-900">
              {getTitle()}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close auth modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-2 pt-2 gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); setInfo(null); }}
            className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'signin'
                ? 'border-indigo-600 text-indigo-600 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setInfo(null); }}
            className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'signup'
                ? 'border-indigo-600 text-indigo-600 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => { setTab('magic_link'); setError(null); setInfo(null); }}
            className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'magic_link'
                ? 'border-indigo-600 text-indigo-600 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => { setTab('forgot_password'); setError(null); setInfo(null); }}
            className={`px-3 py-2 rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'forgot_password'
                ? 'border-indigo-600 text-indigo-600 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Forgot password
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {auth.mode === 'demo' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Demo mode: no backend configured. Accounts are local to this browser.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{info}</span>
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label htmlFor="auth-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  ref={tab === 'signup' ? firstInputRef : undefined}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Taylor Swift"
                  autoComplete="name"
                  disabled={loading}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="auth-email-input"
                type="email"
                required
                ref={tab !== 'signup' ? firstInputRef : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
              />
            </div>
          </div>

          {(tab === 'signin' || tab === 'signup') && (
            <div>
              <label htmlFor="auth-password-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-password-input"
                  type="password"
                  required={tab === 'signup' || auth.mode === 'supabase'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  disabled={loading}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label htmlFor="auth-confirm-password-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : tab === 'signin' ? (
              'Sign In'
            ) : tab === 'signup' ? (
              'Sign Up & Get +20 XP Bonus'
            ) : tab === 'magic_link' ? (
              'Send Magic Link'
            ) : (
              'Send Password Reset Link'
            )}
          </button>

          {/* Quick Demo Switcher - ONLY shown in demo mode */}
          {auth.mode === 'demo' && (
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
          )}

        </form>

      </div>
    </div>
  );
};
