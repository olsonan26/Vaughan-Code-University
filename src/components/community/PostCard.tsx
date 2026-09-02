import React, { useState } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Pin, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Download, 
  FileText, 
  Music, 
  Video, 
  ExternalLink,
  Crown,
  Flame,
  MoreHorizontal
} from 'lucide-react';
import { Post, Comment } from '../../types';
import { useApp } from '../../context/AppContext';
import { LEVEL_TIERS } from '../../data/initialData';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { 
    currentUser, 
    toggleLikePost, 
    addCommentToPost, 
    toggleLikeComment, 
    togglePinPost, 
    openUserProfile, 
    showToast 
  } = useApp();

  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
  const authorLevelInfo = LEVEL_TIERS.find((t) => t.level === post.authorLevel) || LEVEL_TIERS[0];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentToPost(post.id, commentText);
    setCommentText('');
    setIsCommentsExpanded(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    showToast({
      title: 'Link Copied! 📋',
      message: 'Post link copied to clipboard.',
      type: 'info',
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs hover:border-slate-300 transition-colors">
      {/* Pinned announcement badge */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full w-fit mb-3.5">
          <Pin className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
          <span>PINNED BY INSTRUCTOR</span>
        </div>
      )}

      {/* Post Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => openUserProfile(post.authorId)}
            className="relative cursor-pointer group"
          >
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 group-hover:border-indigo-600 transition-colors"
            />
            {post.authorRole === 'creator' && (
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-xs" title="Creator">
                <Crown className="w-3 h-3 fill-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                onClick={() => openUserProfile(post.authorId)}
                className="font-bold text-sm text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
              >
                {post.authorName}
              </span>

              {post.authorRole === 'creator' ? (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md">
                  CREATOR
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                  Lvl {post.authorLevel} {authorLevelInfo.icon}
                </span>
              )}

              <span className="text-xs text-slate-400">• {formattedDate}</span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {post.category}
              </span>
            </div>
          </div>
        </div>

        {/* Pin action for Creator */}
        {currentUser?.role === 'creator' && (
          <button
            onClick={() => togglePinPost(post.id)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              post.isPinned 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={post.isPinned ? 'Unpin post' : 'Pin post to top'}
          >
            <Pin className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Post Content */}
      <div className="mt-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
          {post.title}
        </h3>
        
        <div className="mt-2.5 text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-2">
          {post.content}
        </div>
      </div>

      {/* Post Attachments if any */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.attachments.map((att, idx) => (
            <div 
              key={idx} 
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5">
                {att.type === 'pdf' && <FileText className="w-5 h-5 text-red-500 shrink-0" />}
                {att.type === 'audio' && <Music className="w-5 h-5 text-indigo-600 shrink-0" />}
                {att.type === 'video' && <Video className="w-5 h-5 text-emerald-600 shrink-0" />}
                <div>
                  <p className="font-semibold text-slate-800">{att.name || 'Resource Attachment'}</p>
                  {att.size && <p className="text-slate-500 text-[11px]">{att.size}</p>}
                </div>
              </div>

              {att.url && (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Actions Bar */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <button
            onClick={() => toggleLikePost(post.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              isLiked 
                ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200' 
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{post.likes.length}</span>
          </button>

          <button
            onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comments.length} Comments</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>{copiedLink ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Comments Thread Section */}
      {isCommentsExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a supportive reply or ask a question... (+2 XP)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          </form>

          {/* List of Comments */}
          <div className="space-y-2.5 pt-2">
            {post.comments.map((comment) => {
              const isCommentLiked = currentUser ? comment.likes.includes(currentUser.id) : false;
              const commentAuthorLevel = LEVEL_TIERS.find((t) => t.level === comment.authorLevel) || LEVEL_TIERS[0];

              return (
                <div 
                  key={comment.id} 
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        onClick={() => openUserProfile(comment.authorId)}
                        className="w-6 h-6 rounded-full object-cover cursor-pointer border border-slate-200"
                      />
                      <span 
                        onClick={() => openUserProfile(comment.authorId)}
                        className="font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer"
                      >
                        {comment.authorName}
                      </span>
                      {comment.authorRole === 'creator' ? (
                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-bold">
                          CREATOR
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded">
                          Lvl {comment.authorLevel}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleLikeComment(post.id, comment.id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                        isCommentLiked ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{comment.likes.length}</span>
                    </button>
                  </div>

                  <p className="mt-1.5 text-slate-700 leading-normal pl-8">
                    {comment.content}
                  </p>
                </div>
              );
            })}

            {post.comments.length === 0 && (
              <p className="text-center py-3 text-xs text-slate-400 italic">
                No replies yet. Be the first to start the conversation!
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
