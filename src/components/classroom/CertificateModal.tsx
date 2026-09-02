import React from 'react';
import { Award, Download, CheckCircle2, X, Sparkles, Printer } from 'lucide-react';
import { Course, User } from '../../types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  user: User | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  course,
  user,
}) => {
  if (!isOpen || !course || !user) return null;

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">Official Certificate of Course Completion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Certificate Frame */}
        <div className="p-6 sm:p-10 bg-slate-50">
          <div className="relative border-4 border-double border-amber-600/40 rounded-2xl p-8 sm:p-12 text-center bg-white shadow-sm">
            
            {/* Top Seal Badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 mx-auto flex items-center justify-center shadow-md shadow-amber-500/20 text-white mb-6">
              <Award className="w-9 h-9" />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
              VAUGHAN CODE UNIVERSITY • OFFICIAL CREDENTIAL
            </p>

            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
              Certificate of Academic & Research Mastery
            </h1>

            <p className="text-xs text-slate-500 mt-4 uppercase tracking-wider">
              THIS RECOGNIZES THAT
            </p>

            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-2 border-b border-amber-500/40 pb-2 inline-block px-8">
              {user.name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-4 max-w-lg mx-auto leading-relaxed">
              has successfully completed 100% of the curriculum, audio teachings, PDF blueprints, and passed all certification examinations for
            </p>

            <h3 className="text-base sm:text-xl font-bold text-indigo-700 mt-2">
              "{course.title}"
            </h3>

            {/* Bottom Signatures & Verification */}
            <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">Prof. Vaughan</p>
                <p className="text-[10px] text-slate-500">Main Creator / Headmaster</p>
                <div className="w-20 h-0.5 bg-amber-500/40 mt-1 mx-auto" />
              </div>

              <div>
                <p className="font-bold text-slate-900">Alexander Kotzev</p>
                <p className="text-[10px] text-slate-500">Instructor</p>
                <div className="w-20 h-0.5 bg-indigo-500/40 mt-1 mx-auto" />
              </div>

              <div>
                <p className="font-bold text-slate-900">{today}</p>
                <p className="text-[10px] text-slate-500">ID: #VCU-{Date.now().toString().slice(-6)}</p>
                <div className="w-20 h-0.5 bg-amber-500/40 mt-1 mx-auto" />
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Certified on {today} • +100 XP Awarded
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
