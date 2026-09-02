import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Trash2, 
  Video, 
  Music, 
  FileText, 
  Award, 
  Save, 
  BookOpen,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Course, CourseModule, Lesson, LessonType, SubscriptionTier } from '../../types';
import { useApp } from '../../context/AppContext';

interface CourseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourse: Course | null;
}

export const CourseEditorModal: React.FC<CourseEditorModalProps> = ({
  isOpen,
  onClose,
  initialCourse,
}) => {
  const { saveCourse, currentUser } = useApp();

  const [title, setTitle] = useState(initialCourse?.title || '');
  const [tagline, setTagline] = useState(initialCourse?.tagline || '');
  const [description, setDescription] = useState(initialCourse?.description || '');
  const [thumbnail, setThumbnail] = useState(initialCourse?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80');
  const [category, setCategory] = useState(initialCourse?.category || 'Specialized Teachings');
  const [requiredTier, setRequiredTier] = useState<SubscriptionTier>(initialCourse?.requiredTier || 'free');
  const [requiredLevel, setRequiredLevel] = useState<number>(initialCourse?.requiredLevel || 1);

  // Modules state
  const [modules, setModules] = useState<CourseModule[]>(
    initialCourse?.modules || [
      {
        id: `mod-${Date.now()}`,
        title: 'Module 1: Core Teachings',
        description: 'Key principles and interactive practice.',
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            title: 'Lesson 1.1: Video Orientation & Strategy',
            description: 'Introduction to the concepts.',
            type: 'video',
            durationMinutes: 15,
            xpReward: 20,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            contentMarkdown: '### Lesson Overview\nWatch the full video above and take notes.',
          },
        ],
      },
    ]
  );

  // New Lesson form state
  const [activeModuleId, setActiveModuleId] = useState<string>(modules[0]?.id || '');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<LessonType>('video');
  const [newLessonDuration, setNewLessonDuration] = useState(15);
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [newLessonNotes, setNewLessonNotes] = useState('');
  const [newLessonPdfName, setNewLessonPdfName] = useState('');

  if (!isOpen) return null;

  const handleAddModule = () => {
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      title: `Module ${modules.length + 1}: New Curriculum Block`,
      description: 'Module objectives and teachings.',
      lessons: [],
    };
    setModules([...modules, newMod]);
    setActiveModuleId(newMod.id);
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !activeModuleId) return;

    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: newLessonTitle.trim(),
      description: `Comprehensive ${newLessonType} lesson.`,
      type: newLessonType,
      durationMinutes: Number(newLessonDuration) || 10,
      xpReward: newLessonType === 'quiz' ? 50 : 20,
      videoUrl: newLessonType === 'video' ? (newLessonUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4') : undefined,
      audioUrl: newLessonType === 'audio' ? (newLessonUrl || 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg') : undefined,
      pdfUrl: newLessonType === 'pdf' ? (newLessonUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf') : undefined,
      pdfFileName: newLessonType === 'pdf' ? (newLessonPdfName || 'Teaching_Guidebook.pdf') : undefined,
      contentMarkdown: newLessonNotes.trim() || `### ${newLessonTitle}\nStudy the material thoroughly and implement the frameworks.`,
      quiz: newLessonType === 'quiz' ? {
        id: `quiz-${Date.now()}`,
        title: `${newLessonTitle} Certification Test`,
        description: 'Test your understanding of the teachings.',
        passingScorePercentage: 80,
        xpReward: 50,
        questions: [
          {
            id: `q-${Date.now()}-1`,
            question: 'What is the most critical factor for community member retention?',
            options: [
              'Posting once per year with no engagement',
              'Consistent value delivery, multimodal teachings (Video/Audio/PDF), and gamification feedback loops',
              'Charging $10,000 upfront with zero support',
              'Deleting the classroom',
            ],
            correctAnswerIndex: 1,
            explanation: 'High retention stems from multi-format accessibility and clear reward progressions.',
          },
        ],
      } : undefined,
    };

    setModules(
      modules.map((m) =>
        m.id === activeModuleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
      )
    );

    setNewLessonTitle('');
    setNewLessonUrl('');
    setNewLessonNotes('');
    setNewLessonPdfName('');
  };

  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    setModules(
      modules.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
          : m
      )
    );
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveCourse({
      id: initialCourse?.id,
      title: title.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      thumbnail,
      category,
      requiredTier,
      requiredLevel,
      modules,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">
              {initialCourse ? 'Edit Masterclass Teachings' : 'Creator Studio: Upload New Course & Teachings'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSaveCourse} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* General Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Creator Monetization Blueprint"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Short Hook</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Master videos, audios, PDFs, and testing systems."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. System Design, Marketing, Code..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thumbnail Cover Image URL</label>
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Access Tier Requirement</label>
                  <select
                    value={requiredTier}
                    onChange={(e) => setRequiredTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 shadow-sm cursor-pointer"
                  >
                    <option value="free">Free for All Members</option>
                    <option value="pro">Pro Subscribers ($29/mo)</option>
                    <option value="vip">VIP Mastermind ($79/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Gamification Level</label>
                  <select
                    value={requiredLevel}
                    onChange={(e) => setRequiredLevel(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 shadow-sm cursor-pointer"
                  >
                    <option value={1}>Level 1 (Everyone)</option>
                    <option value={2}>Level 2 (Active)</option>
                    <option value={3}>Level 3 (Scholar)</option>
                    <option value={4}>Level 4 (Elite)</option>
                    <option value={5}>Level 5 (Champion)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of what students will achieve upon completion..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Curriculum Builder & Modules */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Course Modules & Teachings Playlist</h4>
              </div>
              <button
                type="button"
                onClick={handleAddModule}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Module</span>
              </button>
            </div>

            {/* Modules List */}
            <div className="space-y-4">
              {modules.map((mod, modIdx) => (
                <div key={mod.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={mod.title}
                      onChange={(e) => {
                        const updated = [...modules];
                        updated[modIdx].title = e.target.value;
                        setModules(updated);
                      }}
                      className="bg-transparent font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                    />
                    <span className="text-xs text-slate-500">{mod.lessons.length} Lessons</span>
                  </div>

                  {/* Lessons list in this module */}
                  <div className="space-y-1.5 pl-2">
                    {mod.lessons.map((les) => (
                      <div key={les.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
                        <div className="flex items-center gap-2">
                          {les.type === 'video' && <Video className="w-4 h-4 text-emerald-600" />}
                          {les.type === 'audio' && <Music className="w-4 h-4 text-indigo-600" />}
                          {les.type === 'pdf' && <FileText className="w-4 h-4 text-rose-600" />}
                          {les.type === 'quiz' && <Award className="w-4 h-4 text-amber-500" />}
                          <span className="font-semibold text-slate-900">{les.title}</span>
                          <span className="text-[10px] text-slate-500">({les.durationMinutes}m • +{les.xpReward} XP)</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLesson(mod.id, les.id)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {mod.lessons.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-1">No teachings added to this module yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Teaching Lesson Box */}
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Teaching (Video / Audio / PDF / Quiz) to Selected Module</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Target Module</label>
                <select
                  value={activeModuleId}
                  onChange={(e) => setActiveModuleId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm cursor-pointer"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Teaching Type</label>
                <select
                  value={newLessonType}
                  onChange={(e) => setNewLessonType(e.target.value as LessonType)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm cursor-pointer"
                >
                  <option value="video">🎥 Video Teaching</option>
                  <option value="audio">🎧 Audio Podcast Masterclass</option>
                  <option value="pdf">📄 Downloadable PDF Blueprint</option>
                  <option value="quiz">🧠 Interactive Certification Test</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Estimated Duration (mins)</label>
                <input
                  type="number"
                  value={newLessonDuration}
                  onChange={(e) => setNewLessonDuration(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Lesson Title (e.g. Lesson 2.3: Audio Guide on Scaling...)"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
              />

              <input
                type="text"
                placeholder="Media URL or Storage Link (MP4, MP3, PDF, or Stream)"
                value={newLessonUrl}
                onChange={(e) => setNewLessonUrl(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            </div>

            {newLessonType === 'pdf' && (
              <input
                type="text"
                placeholder="PDF File Name (e.g. FullStack_CheatSheet.pdf)"
                value={newLessonPdfName}
                onChange={(e) => setNewLessonPdfName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-sm"
              />
            )}

            <button
              type="button"
              onClick={handleAddLesson}
              disabled={!newLessonTitle.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              + Insert Lesson to Module
            </button>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Publish & Save Course</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
