import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  Play, 
  Pause, 
  Volume2, 
  Download, 
  FileText, 
  Music, 
  Video as VideoIcon, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Lock, 
  ExternalLink,
  BookOpen,
  HelpCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Lesson, Course } from '../../types';
import { useApp } from '../../context/AppContext';

interface LessonPlayerProps {
  course: Course;
  lesson: Lesson;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  course,
  lesson,
  onNextLesson,
  onPrevLesson,
  hasNext,
  hasPrev,
}) => {
  const { 
    currentUser, 
    markLessonComplete, 
    submitQuizResult, 
    openSubscriptionModal, 
    openCertificateModal 
  } = useApp();

  const isCompleted = currentUser?.completedLessonIds.includes(lesson.id) || false;
  const isLockedByTier = lesson.isProOnly && currentUser?.subscriptionTier === 'free';
  const isLockedByLevel = (lesson.lockedLevel || 1) > (currentUser?.level || 1);

  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [hasPassedQuiz, setHasPassedQuiz] = useState(false);

  // Reset quiz state when switching lessons
  useEffect(() => {
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
    setQuizScore(null);
    setIsPlayingAudio(false);
    setAudioProgress(0);
  }, [lesson.id]);

  // Audio Play/Pause toggle
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 1;
    setAudioProgress((current / duration) * 100);
  };

  const handleAudioSpeedChange = (rate: number) => {
    setAudioPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Quiz handlers
  const handleSelectQuizOption = (questionId: string, optionIndex: number) => {
    if (isQuizSubmitted) return; // Locked once submitted
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleQuizSubmit = () => {
    if (!lesson.quiz) return;
    let correctCount = 0;
    lesson.quiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / lesson.quiz.questions.length) * 100);
    const passed = percentage >= lesson.quiz.passingScorePercentage;

    setQuizScore(percentage);
    setHasPassedQuiz(passed);
    setIsQuizSubmitted(true);

    submitQuizResult(lesson.quiz.id, percentage, passed, course.id, lesson.id);
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
    setQuizScore(null);
  };

  // Locked View if user doesn't have tier or level
  if (isLockedByTier) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            PRO SUBSCRIBER EXCLUSIVE
          </span>
          <h3 className="text-xl font-bold text-slate-900 pt-2">{lesson.title}</h3>
          <p className="text-sm text-slate-500">
            This premium teaching (featuring full video, audio masterclass, PDF blueprints, and certification test) is reserved for Pro and VIP members.
          </p>
        </div>
        <button
          onClick={openSubscriptionModal}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-sm shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Upgrade to Pro to Unlock ($29/mo)</span>
        </button>
      </div>
    );
  }

  if (isLockedByLevel) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
            LEVEL {lesson.lockedLevel} REQUIRED
          </span>
          <h3 className="text-xl font-bold text-slate-900 pt-2">{lesson.title}</h3>
          <p className="text-sm text-slate-500">
            You need to reach Level {lesson.lockedLevel} to unlock this masterclass lesson. Earn XP by taking earlier quizzes and commenting in discussions!
          </p>
        </div>
      </div>
    );
  }

  // YouTube embed helper
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&modestbranding=1`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Player Container based on teaching type */}
      <div className="bg-slate-950 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        
        {/* TYPE 1: VIDEO TEACHING */}
        {lesson.type === 'video' && (
          <div className="aspect-video w-full bg-slate-950 relative flex items-center justify-center">
            {lesson.videoUrl ? (
              (() => {
                const ytEmbedUrl = getYouTubeEmbedUrl(lesson.videoUrl);
                if (ytEmbedUrl) {
                  return (
                    <iframe
                      src={ytEmbedUrl}
                      title={lesson.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <video
                    src={lesson.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster={course.thumbnail}
                    onEnded={() => {
                      if (!isCompleted) markLessonComplete(lesson.id, course.id);
                    }}
                  />
                );
              })()
            ) : (
              <div className="text-center p-8 text-slate-400">
                <VideoIcon className="w-12 h-12 mx-auto text-indigo-400 mb-2" />
                <p className="text-sm font-semibold text-white">Video Teaching Stream</p>
              </div>
            )}
          </div>
        )}

        {/* TYPE 2: AUDIO PODCAST TEACHING */}
        {lesson.type === 'audio' && (
          <div className="p-6 sm:p-8 bg-slate-50 text-slate-900 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* Cover Art / Waveform animation */}
              <div className="relative w-28 h-28 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <Music className="w-12 h-12 text-white" />
                {isPlayingAudio && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-indigo-900/60 rounded-2xl backdrop-blur-xs">
                    <span className="w-1 bg-white h-6 animate-pulse" />
                    <span className="w-1 bg-white h-10 animate-bounce" />
                    <span className="w-1 bg-white h-4 animate-pulse" />
                    <span className="w-1 bg-white h-8 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Audio Controls */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      AUDIO TEACHING PODCAST
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">{lesson.title}</h3>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {lesson.durationMinutes} min
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>

                {/* Player Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayAudio}
                      className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg text-xs shadow-xs">
                      {[1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleAudioSpeedChange(rate)}
                          className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                            audioPlaybackRate === rate
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                  </button>
                </div>

                {/* Audio Element */}
                <audio
                  ref={audioRef}
                  src={lesson.audioUrl || 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    if (!isCompleted) markLessonComplete(lesson.id, course.id);
                  }}
                />
              </div>
            </div>

            {/* Audio Interactive Transcript */}
            {showTranscript && lesson.audioTranscript && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Interactive Audio Transcript & Notes
                </h4>
                <div className="bg-white p-4 rounded-xl text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line max-h-48 overflow-y-auto border border-slate-200 shadow-xs">
                  {lesson.audioTranscript}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TYPE 3: PDF TEACHING & BLUEPRINT */}
        {lesson.type === 'pdf' && (
          <div className="p-6 sm:p-8 bg-white border border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shrink-0">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    OFFICIAL TEACHING PDF GUIDEBOOK
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{lesson.pdfFileName || lesson.title + '.pdf'}</h3>
                  <p className="text-xs text-slate-500">{lesson.pdfFileSize || '4.8 MB'} • Full Printable Document</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lesson.pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            {/* Embedded PDF Viewer simulation */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-200">
                <span>Interactive PDF Preview Window</span>
                <span>Document Verified ✓</span>
              </div>
              <div className="py-8 space-y-2">
                <FileText className="w-10 h-10 text-red-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">{lesson.title}</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click Download PDF above to save the complete handbook, templates, worksheets, and blueprints to your device.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TYPE 4: INTERACTIVE KNOWLEDGE CERTIFICATION TEST */}
        {lesson.type === 'quiz' && lesson.quiz && (
          <div className="p-6 sm:p-8 bg-white border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  CERTIFICATION KNOWLEDGE TEST
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{lesson.quiz.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{lesson.quiz.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-600">Passing: {lesson.quiz.passingScorePercentage}%</span>
                <p className="text-[11px] text-amber-600 font-semibold">Reward: +{lesson.quiz.xpReward} XP</p>
              </div>
            </div>

            {/* Quiz Questions List */}
            <div className="space-y-6">
              {lesson.quiz.questions.map((q, qIndex) => {
                const selectedOption = selectedAnswers[q.id];
                const isCorrect = isQuizSubmitted && selectedOption === q.correctAnswerIndex;
                const isWrong = isQuizSubmitted && selectedOption !== undefined && selectedOption !== q.correctAnswerIndex;

                return (
                  <div key={q.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {qIndex + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.question}
                      </h4>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="space-y-2 pt-1 pl-8">
                      {q.options.map((option, optIdx) => {
                        const isThisSelected = selectedOption === optIdx;
                        const isThisCorrect = isQuizSubmitted && optIdx === q.correctAnswerIndex;
                        const isThisWrong = isQuizSubmitted && isThisSelected && optIdx !== q.correctAnswerIndex;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectQuizOption(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-between cursor-pointer ${
                              isThisCorrect
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                                : isThisWrong
                                ? 'bg-rose-50 border-rose-500 text-rose-800'
                                : isThisSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span>{option}</span>
                            {isThisCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Post-submission explanation */}
                    {isQuizSubmitted && (
                      <div className="mt-3 pl-8 text-xs p-3 rounded-xl bg-white border border-slate-200 text-slate-700 space-y-1">
                        <p className="font-bold text-indigo-600">Explanation:</p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Result Banner */}
            {isQuizSubmitted && quizScore !== null && (
              <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                hasPassedQuiz
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {hasPassedQuiz ? (
                    <>
                      <Award className="w-6 h-6 text-emerald-600" />
                      <h4 className="text-base font-bold text-slate-900">
                        Congratulations! You Passed with {quizScore}%! 🎉
                      </h4>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-6 h-6 text-rose-600" />
                      <h4 className="text-base font-bold text-slate-900">
                        Score: {quizScore}% (Passing is {lesson.quiz.passingScorePercentage}%)
                      </h4>
                    </>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  {hasPassedQuiz
                    ? 'Your score has been certified! +50 XP and Knowledge Badge awarded.'
                    : 'Review the teaching videos, audios, and PDF blueprints above and try again!'}
                </p>

                {!hasPassedQuiz && (
                  <button
                    onClick={handleRetakeQuiz}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Quiz</span>
                  </button>
                )}
              </div>
            )}

            {/* Submit Quiz Action */}
            {!isQuizSubmitted && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(selectedAnswers).length < lesson.quiz.questions.length}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Submit Answers for Grading (+50 XP)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lesson Details, Markdown Notes & Completion Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
        
        {/* Title & Complete Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {lesson.type.toUpperCase()} TEACHING
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {lesson.durationMinutes} minutes
              </span>
              <span className="text-xs font-bold text-amber-600">
                +{lesson.xpReward} XP Reward
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{lesson.title}</h2>
          </div>

          <button
            onClick={() => markLessonComplete(lesson.id, course.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-white'}`} />
            <span>{isCompleted ? 'Completed ✓' : 'Mark as Done (+20 XP)'}</span>
          </button>
        </div>

        {/* Written Notes / Markdown Body */}
        {lesson.contentMarkdown && (
          <div className="prose max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {lesson.contentMarkdown}
          </div>
        )}

        {/* Downloadable Resources List */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Downloadable Teaching Materials & Assets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lesson.resources.map((res, rIdx) => (
                <a
                  key={rIdx}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-400 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    {res.type === 'pdf' && <FileText className="w-4 h-4 text-red-500 shrink-0" />}
                    {res.type === 'audio' && <Music className="w-4 h-4 text-indigo-600 shrink-0" />}
                    {res.type === 'link' && <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {res.title}
                      </p>
                      {res.size && <p className="text-[11px] text-slate-400">{res.size}</p>}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Footer (Prev / Next Lesson) */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onPrevLesson}
            disabled={!hasPrev}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Lesson</span>
          </button>

          <button
            onClick={onNextLesson}
            disabled={!hasNext}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>Next Lesson</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
