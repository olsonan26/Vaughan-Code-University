import React, { useState } from 'react';
import { 
  BookOpen, 
  Play, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  Award, 
  Video, 
  Music, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Crown,
  Layers,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Course, Lesson } from '../../types';
import { LessonPlayer } from './LessonPlayer';
import { CourseEditorModal } from './CourseEditorModal';
import { CertificateModal } from './CertificateModal';

export const ClassroomView: React.FC = () => {
  const { 
    courses, 
    currentUser, 
    selectedCourseId, 
    setSelectedCourseId, 
    selectedLessonId, 
    setSelectedLessonId, 
    openSubscriptionModal, 
    openCourseEditor,
    isCourseEditorOpen,
    closeCourseEditor,
    editingCourse,
    isCertificateModalOpen,
    closeCertificateModal,
    certificateCourse,
    openCertificateModal
  } = useApp();

  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>({});

  // Active selected course
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || null;

  // Find all lessons in active course
  const allCourseLessons: Lesson[] = activeCourse 
    ? activeCourse.modules.flatMap((m) => m.lessons) 
    : [];

  // Active selected lesson
  const activeLesson = allCourseLessons.find((l) => l.id === selectedLessonId) || allCourseLessons[0] || null;

  // Calculate course completion progress %
  const getCourseProgress = (course: Course) => {
    if (!currentUser) return 0;
    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (allLessonIds.length === 0) return 0;
    const completedCount = allLessonIds.filter((id) => currentUser.completedLessonIds.includes(id)).length;
    return Math.round((completedCount / allLessonIds.length) * 100);
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    const firstLesson = course.modules[0]?.lessons[0];
    if (firstLesson) {
      setSelectedLessonId(firstLesson.id);
    }
    // Auto expand all modules
    const expanded: Record<string, boolean> = {};
    course.modules.forEach((m) => {
      expanded[m.id] = true;
    });
    setExpandedModuleIds(expanded);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Next and prev lesson logic
  const currentLessonIndex = allCourseLessons.findIndex((l) => l.id === activeLesson?.id);
  const hasNext = currentLessonIndex >= 0 && currentLessonIndex < allCourseLessons.length - 1;
  const hasPrev = currentLessonIndex > 0;

  const handleNextLesson = () => {
    if (hasNext) {
      setSelectedLessonId(allCourseLessons[currentLessonIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (hasPrev) {
      setSelectedLessonId(allCourseLessons[currentLessonIndex - 1].id);
    }
  };

  // View: Detailed Course Player
  if (activeCourse && activeLesson) {
    const courseProgress = getCourseProgress(activeCourse);
    const is100Done = courseProgress === 100;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Back navigation & Course Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCourseId(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  {activeCourse.category}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{activeCourse.modules.length} Modules</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {activeCourse.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Badge */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-600">{courseProgress}% Done</span>
            </div>

            {/* Certificate Button if 100% completed */}
            {is100Done && (
              <button
                onClick={() => openCertificateModal(activeCourse)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform hover:scale-105 cursor-pointer"
              >
                <Award className="w-4 h-4 fill-white" />
                <span>Certificate</span>
              </button>
            )}

            {/* Creator Edit Trigger */}
            {currentUser?.role === 'creator' && (
              <button
                onClick={() => openCourseEditor(activeCourse)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Edit Masterclass
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Course Layout: Left = Player, Right = Curriculum Playlist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Player Area (8 columns on lg) */}
          <div className="lg:col-span-8">
            <LessonPlayer
              course={activeCourse}
              lesson={activeLesson}
              onNextLesson={handleNextLesson}
              onPrevLesson={handlePrevLesson}
              hasNext={hasNext}
              hasPrev={hasPrev}
            />
          </div>

          {/* Right Curriculum Playlist (4 columns on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Course Curriculum</h3>
                </div>
                <span className="text-xs text-slate-500">{allCourseLessons.length} teachings</span>
              </div>

              {/* Modules Accordion */}
              <div className="space-y-3">
                {activeCourse.modules.map((mod, modIdx) => {
                  const isExpanded = expandedModuleIds[mod.id] !== false;

                  return (
                    <div key={mod.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                            {modIdx + 1}
                          </span>
                          <span className="font-semibold text-xs text-slate-900 line-clamp-1">{mod.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Lessons in module */}
                      {isExpanded && (
                        <div className="p-2 space-y-1 bg-white border-t border-slate-200">
                          {mod.lessons.map((les) => {
                            const isCurrent = activeLesson.id === les.id;
                            const isDone = currentUser?.completedLessonIds.includes(les.id);
                            const isLocked = les.isProOnly && currentUser?.subscriptionTier === 'free';

                            return (
                              <button
                                key={les.id}
                                onClick={() => setSelectedLessonId(les.id)}
                                className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  {/* Icon by Type */}
                                  {les.type === 'video' && <Video className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-emerald-600'}`} />}
                                  {les.type === 'audio' && <Music className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-cyan-600'}`} />}
                                  {les.type === 'pdf' && <FileText className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-red-500'}`} />}
                                  {les.type === 'quiz' && <Award className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-amber-500'}`} />}

                                  <span className="truncate">{les.title}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : isLocked ? (
                                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                                  ) : (
                                    <span className="text-[10px] text-slate-400">{les.durationMinutes}m</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

        {/* Certificate Modal */}
        <CertificateModal
          isOpen={isCertificateModalOpen}
          onClose={closeCertificateModal}
          course={certificateCourse || activeCourse}
          user={currentUser}
        />
      </div>
    );
  }

  // View: Course Catalog Grid
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Creator Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classroom & Teachings</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Master the Vaughan Code curriculum with video lectures, audio podcast masterclasses, downloadable PDF blueprints, and certification knowledge tests.
          </p>
        </div>

        {currentUser?.role === 'creator' && (
          <button
            onClick={() => openCourseEditor()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Course</span>
          </button>
        )}
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const progress = getCourseProgress(course);
          const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
          const isLockedByTier = course.requiredTier !== 'free' && currentUser?.subscriptionTier === 'free';
          const isLockedByLevel = course.requiredLevel > (currentUser?.level || 1);

          return (
            <div
              key={course.id}
              onClick={() => handleSelectCourse(course)}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col cursor-pointer group"
            >
              {/* Thumbnail with overlay badges */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  {course.courseCode && (
                    <span className="text-[10px] font-bold bg-slate-900/90 text-white px-2 py-0.5 rounded-md backdrop-blur-xs border border-slate-700 shadow-xs">
                      {course.courseCode}
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                    {course.category}
                  </span>
                  {course.badge && (
                    <span className="text-[10px] font-bold bg-indigo-900 text-indigo-100 px-2 py-0.5 rounded-md border border-indigo-700 shadow-xs uppercase tracking-wider">
                      {course.badge}
                    </span>
                  )}
                  {course.requiredTier !== 'free' && (
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                      <Crown className="w-3 h-3 fill-white" />
                      <span className="uppercase">{course.requiredTier} ACCESS</span>
                    </span>
                  )}
                </div>

                {/* Locked indicator if applicable */}
                {isLockedByTier && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                    <Lock className="w-8 h-8 text-amber-300 mb-1.5" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Pro Scholar Exclusive</p>
                    <p className="text-[11px] text-slate-200 mt-0.5">Click to view & enroll</p>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                    {course.title}
                  </h3>
                  {course.tagline && (
                    <p className="text-xs font-semibold text-indigo-700">
                      {course.tagline}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-0.5">
                    {course.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      {course.modules.length} Modules • {totalLessons} Teachings
                    </span>
                    <span className="font-bold text-emerald-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <img
                      src={course.author.avatar}
                      alt={course.author.name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-medium text-slate-700">{course.author.name}</span>
                  </div>

                  <span className="font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Start Learning →
                  </span>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Course Editor Modal */}
      <CourseEditorModal
        isOpen={isCourseEditorOpen}
        onClose={closeCourseEditor}
        initialCourse={editingCourse}
      />
    </div>
  );
};
