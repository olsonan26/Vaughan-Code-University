import React, { useState } from 'react';
import { Lock, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useApp } from '../../context/AppContext';

export const ResetPasswordPage: React.FC = () => {
  const auth = useAuth();
  const { setActiveTab } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.updatePassword(newPassword);
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-xl overflow-hidden text-slate-900">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Please enter your new password below to secure your Vaughan Code University account.
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 mb-1">Password updated successfully!</p>
                  <p className="text-emerald-700">You can now sign in with your new password.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('community')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Go to Community</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {auth.mode === 'demo' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Demo mode: no backend configured. Password update simulator.</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="reset-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
