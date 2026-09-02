import React, { useState } from 'react';
import { X, Sparkles, Image, Paperclip, Music, Video, FileText, Send } from 'lucide-react';
import { PostCategory, PostAttachment } from '../../types';
import { useApp } from '../../context/AppContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: PostCategory[] = [
  'General Discussion',
  'Announcements',
  'Wins & Case Studies',
  'Questions & Help',
  'Action Guides',
  'Resource Share',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const { createPost, currentUser } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('General Discussion');
  const [attachmentType, setAttachmentType] = useState<'none' | 'pdf' | 'audio' | 'video'>('none');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const attachments: PostAttachment[] = [];
    if (attachmentType !== 'none' && attachmentName.trim()) {
      attachments.push({
        type: attachmentType,
        name: attachmentName.trim(),
        url: attachmentUrl.trim() || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        size: '2.5 MB',
      });
    }

    createPost({
      title: title.trim(),
      content: content.trim(),
      category,
      attachments,
    });

    onClose();
    setTitle('');
    setContent('');
    setAttachmentType('none');
    setAttachmentName('');
    setAttachmentUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Create Community Post</h3>
            <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full">
              +5 XP
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                // Restrict announcements to creator
                if (cat === 'Announcements' && currentUser?.role !== 'creator') return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My big takeaways from Module 1, or Question on pricing models..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Post Content
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, ask questions, or post your results to inspire fellow members..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* Attachments Section */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Add Teaching / Media Attachment:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttachmentType(attachmentType === 'pdf' ? 'none' : 'pdf')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    attachmentType === 'pdf'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Doc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttachmentType(attachmentType === 'audio' ? 'none' : 'audio')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    attachmentType === 'audio'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttachmentType(attachmentType === 'video' ? 'none' : 'video')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    attachmentType === 'video'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {attachmentType !== 'none' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="Resource Title (e.g. My Strategy Blueprint.pdf)"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Direct Link / Storage URL (optional)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Posting rewards you <strong className="text-indigo-600 font-bold">+5 XP</strong> toward your next level!
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Post</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
