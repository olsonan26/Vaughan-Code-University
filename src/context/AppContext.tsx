import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Course, 
  Post, 
  CommunityEvent, 
  Badge, 
  LevelInfo, 
  SubscriptionPlan, 
  SubscriptionTier, 
  UserRole,
  Lesson, 
  DirectMessage,
  PostCategory,
  SystemAnnouncement
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_COURSES, 
  INITIAL_POSTS, 
  INITIAL_EVENTS, 
  BADGES, 
  LEVEL_TIERS, 
  SUBSCRIPTION_PLANS 
} from '../data/initialData';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'xp' | 'badge' | 'warning';
  xpAmount?: number;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  courses: Course[];
  posts: Post[];
  events: CommunityEvent[];
  badges: Badge[];
  levelTiers: LevelInfo[];
  subscriptionPlans: SubscriptionPlan[];
  directMessages: DirectMessage[];
  toasts: Toast[];
  levelUpModal: { isOpen: boolean; newLevel: LevelInfo | null };
  activeTab: 'community' | 'classroom' | 'calendar' | 'members' | 'leaderboards' | 'creator' | 'profile' | 'admin';
  selectedCourseId: string | null;
  selectedLessonId: string | null;
  isAuthModalOpen: boolean;
  isSubscriptionModalOpen: boolean;
  isUserProfileModalOpen: boolean;
  isProfileModalOpen: boolean;
  viewingUserId: string | null;
  viewingUser: User | null;
  isCourseEditorOpen: boolean;
  editingCourse: Course | null;
  isCertificateModalOpen: boolean;
  certificateCourse: Course | null;
  isLevelPerksModalOpen: boolean;
  systemAnnouncement: SystemAnnouncement | null;

  // Navigation & UI controls
  setActiveTab: (tab: 'community' | 'classroom' | 'calendar' | 'members' | 'leaderboards' | 'creator' | 'profile' | 'admin') => void;
  setSelectedCourseId: (id: string | null) => void;
  setSelectedLessonId: (id: string | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  openUserProfile: (userId: string, viewMode?: 'modal' | 'page') => void;
  closeUserProfile: () => void;
  openCourseEditor: (course?: Course) => void;
  closeCourseEditor: () => void;
  openCertificateModal: (course: Course) => void;
  closeCertificateModal: () => void;
  openLevelPerksModal: () => void;
  closeLevelPerksModal: () => void;
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissAnnouncement: () => void;

  // Auth & User Actions
  login: (email: string, password?: string) => boolean;
  signup: (name: string, email: string, password?: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateUserProfile: (data: Partial<User>, targetUserId?: string) => void;

  // Gamification & XP
  awardXP: (amount: number, reason: string) => void;
  checkAndAwardBadges: (user: User) => void;

  // Classroom & Teachings
  markLessonComplete: (lessonId: string, courseId: string) => void;
  submitQuizResult: (quizId: string, scorePercentage: number, passed: boolean, courseId: string, lessonId: string) => void;
  saveCourse: (courseData: Partial<Course>) => void;
  deleteCourse: (courseId: string) => void;
  addLessonToModule: (courseId: string, moduleId: string, lesson: Lesson) => void;

  // Community Posts
  createPost: (postData: { title: string; content: string; category: PostCategory; attachments?: any[] }) => void;
  toggleLikePost: (postId: string) => void;
  addCommentToPost: (postId: string, content: string) => void;
  toggleLikeComment: (postId: string, commentId: string) => void;
  togglePinPost: (postId: string) => void;

  // Calendar
  toggleEventRSVP: (eventId: string) => void;

  // Subscription & Payment
  upgradeSubscription: (tier: SubscriptionTier, paymentDetails: any) => Promise<boolean>;

  // Messaging
  sendDirectMessage: (receiverId: string, content: string) => void;

  // Admin Capabilities for Prof. Vaughan & Alexander Kotzev
  adminUpdateUserTier: (userId: string, tier: SubscriptionTier) => void;
  adminUpdateUserRole: (userId: string, role: UserRole) => void;
  adminUpdateUserStatus: (userId: string, status: 'active' | 'suspended') => void;
  adminAwardUserXP: (userId: string, amount: number, reason?: string) => void;
  adminToggleBadge: (userId: string, badgeId: string) => void;
  adminDeletePost: (postId: string) => void;
  adminToggleCoursePublished: (courseId: string) => void;
  adminBroadcastAnnouncement: (title: string, content: string, isPriority: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial states with local storage caching for state persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('vcu_v4_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.some((u: User) => u.id === 'user-creator' && u.name !== 'Prof. Vaughan') || !parsed.some((u: User) => u.id === 'user-instructor')) {
          return INITIAL_USERS;
        }
        return parsed;
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('vcu_v4_current_user_id');
    return saved || 'user-pro'; // Default to Jordan Lee (Pro Member) so user sees full active dashboard
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('vcu_v4_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.some((c: Course) => c.author?.name === 'Prof. Vaughan')) return INITIAL_COURSES;
        // Ensure the first training video matches the latest YouTube URL
        const updated = parsed.map((c: Course) => {
          if (c.id === 'course-1') {
            return {
              ...c,
              modules: c.modules.map((m) => ({
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === 'les-1-1' && (!l.videoUrl || l.videoUrl.includes('BigBuckBunny') || !l.videoUrl.includes('09v3u2J1hWY'))
                    ? { ...l, videoUrl: 'https://www.youtube.com/watch?v=09v3u2J1hWY' }
                    : l
                ),
              })),
            };
          }
          return c;
        });
        return updated;
      } catch {
        return INITIAL_COURSES;
      }
    }
    return INITIAL_COURSES;
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('vcu_v4_posts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.some((p: Post) => p.authorName === 'Prof. Vaughan')) return INITIAL_POSTS;
        return parsed;
      } catch {
        return INITIAL_POSTS;
      }
    }
    return INITIAL_POSTS;
  });

  const [events, setEvents] = useState<CommunityEvent[]>(() => {
    const saved = localStorage.getItem('vcu_v4_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    const saved = localStorage.getItem('vcu_v4_dms');
    return saved ? JSON.parse(saved) : [];
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'community' | 'classroom' | 'calendar' | 'members' | 'leaderboards' | 'creator' | 'profile' | 'admin'>('community');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<Course | null>(null);
  const [isLevelPerksModalOpen, setIsLevelPerksModalOpen] = useState(false);
  const [systemAnnouncement, setSystemAnnouncement] = useState<SystemAnnouncement | null>(() => {
    const saved = localStorage.getItem('vcu_v4_announcement');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return {
      id: 'anno-1',
      title: '🎓 Faculty Office Hours & New Masterclass Laboratory Live This Thursday',
      content: 'Headmaster Prof. Vaughan and Instructor Alexander Kotzev will lead a live decoding lab on Cyclical Timelines at 5:00 PM EST. RSVP in the Calendar tab!',
      authorName: 'Prof. Vaughan',
      authorRole: 'Headmaster',
      date: new Date().toISOString(),
      isPriority: true,
      active: true,
    };
  });
  const [levelUpModal, setLevelUpModal] = useState<{ isOpen: boolean; newLevel: LevelInfo | null }>({
    isOpen: false,
    newLevel: null,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Derived current user and viewing user
  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const viewingUser = users.find((u) => u.id === viewingUserId) || currentUser || users[0] || null;

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('vcu_v4_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('vcu_v4_current_user_id', currentUserId);
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('vcu_v4_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('vcu_v4_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('vcu_v4_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('vcu_v4_dms', JSON.stringify(directMessages));
  }, [directMessages]);

  // Check and maintain user daily streaks on load / user switch
  useEffect(() => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // If not recorded yet today
    if (currentUser.lastActiveDate !== todayStr) {
      const lastDate = currentUser.lastActiveDate ? new Date(currentUser.lastActiveDate) : null;
      const todayDate = new Date(todayStr);
      let diffDays = 1;

      if (lastDate) {
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Calculate new streak
      let newStreak = currentUser.streakDays || 1;
      if (diffDays === 1) {
        // Consecutive daily login!
        newStreak = (currentUser.streakDays || 0) + 1;
      } else if (diffDays > 2) {
        // Gracefully keep streak or start fresh if long gap
        newStreak = Math.max(1, currentUser.streakDays);
      }

      // Record in activity history
      const updatedActivity = [...(currentUser.activityHistory || [])];
      const todayIndex = updatedActivity.findIndex((a) => a.date === todayStr);
      if (todayIndex >= 0) {
        updatedActivity[todayIndex] = { ...updatedActivity[todayIndex], count: updatedActivity[todayIndex].count + 1 };
      } else {
        updatedActivity.push({ date: todayStr, count: 1 });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                streakDays: newStreak,
                lastActiveDate: todayStr,
                activityHistory: updatedActivity,
              }
            : u
        )
      );
    }
  }, [currentUserId]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const awardXP = (amount: number, reason: string) => {
    if (!currentUser) return;

    const oldXp = currentUser.xp;
    const newXp = oldXp + amount;
    const oldLevel = currentUser.level;

    // Calculate new level based on LEVEL_TIERS
    let calculatedLevel = 1;
    for (const tier of LEVEL_TIERS) {
      if (newXp >= tier.minXp) {
        calculatedLevel = tier.level;
      }
    }

    const leveledUp = calculatedLevel > oldLevel;
    const newLevelInfo = LEVEL_TIERS.find((t) => t.level === calculatedLevel) || null;

    // Update user in state
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          // Record today activity
          const todayStr = new Date().toISOString().split('T')[0];
          const updatedActivity = [...(u.activityHistory || [])];
          const dayIndex = updatedActivity.findIndex((a) => a.date === todayStr);
          if (dayIndex >= 0) {
            updatedActivity[dayIndex] = { ...updatedActivity[dayIndex], count: updatedActivity[dayIndex].count + 1 };
          } else {
            updatedActivity.push({ date: todayStr, count: 1 });
          }

          return {
            ...u,
            xp: newXp,
            level: calculatedLevel,
            activityHistory: updatedActivity,
          };
        }
        return u;
      })
    );

    showToast({
      title: `+${amount} XP Earned!`,
      message: reason,
      type: 'xp',
      xpAmount: amount,
    });

    if (leveledUp && newLevelInfo) {
      // Fire confetti and show level up modal
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }
      setLevelUpModal({
        isOpen: true,
        newLevel: newLevelInfo,
      });
      showToast({
        title: `🎉 LEVEL UP: Level ${calculatedLevel}!`,
        message: `Congratulations! You unlocked ${newLevelInfo.title} and new community perks!`,
        type: 'badge',
      });
    }

    // Check badge triggers
    setTimeout(() => {
      const updatedUser = users.find((u) => u.id === currentUser.id);
      if (updatedUser) {
        checkAndAwardBadges({ ...updatedUser, xp: newXp, level: calculatedLevel });
      }
    }, 100);
  };

  const checkAndAwardBadges = (user: User) => {
    const earnedBadgeIds = new Set(user.badges);
    const newlyAwardedBadges: Badge[] = [];

    // Badge 1: first-step
    if (!earnedBadgeIds.has('first-step') && user.completedLessonIds.length >= 1) {
      newlyAwardedBadges.push(BADGES.find((b) => b.id === 'first-step')!);
    }

    // Badge 2: quiz-master
    if (!earnedBadgeIds.has('quiz-master') && user.passedTestIds.length >= 1) {
      newlyAwardedBadges.push(BADGES.find((b) => b.id === 'quiz-master')!);
    }

    // Badge 3: pro-member
    if (!earnedBadgeIds.has('pro-member') && (user.subscriptionTier === 'pro' || user.subscriptionTier === 'vip')) {
      newlyAwardedBadges.push(BADGES.find((b) => b.id === 'pro-member')!);
    }

    // Badge 4: discussion-starter
    const userPosts = posts.filter((p) => p.authorId === user.id);
    if (!earnedBadgeIds.has('discussion-starter') && userPosts.length >= 1) {
      newlyAwardedBadges.push(BADGES.find((b) => b.id === 'discussion-starter')!);
    }

    // Badge 5: course-graduate
    if (!earnedBadgeIds.has('course-graduate') && user.completedLessonIds.length >= 4) {
      newlyAwardedBadges.push(BADGES.find((b) => b.id === 'course-graduate')!);
    }

    if (newlyAwardedBadges.length > 0) {
      const newBadgeIds = newlyAwardedBadges.map((b) => b.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, badges: [...u.badges, ...newBadgeIds] } : u))
      );

      newlyAwardedBadges.forEach((badge) => {
        showToast({
          title: `🏆 New Badge Unlocked: ${badge.name}`,
          message: badge.description,
          type: 'badge',
        });
      });
    }
  };

  const login = (email: string) => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUserId(found.id);
      setIsAuthModalOpen(false);
      showToast({
        title: `Welcome back, ${found.name}! 👋`,
        message: `Logged in as ${found.role === 'creator' ? 'Community Creator' : found.subscriptionTier.toUpperCase() + ' Member'}.`,
        type: 'success',
      });
      return true;
    }
    showToast({
      title: 'Account Not Found',
      message: 'No account found with this email. You can sign up below or switch to a demo account!',
      type: 'warning',
    });
    return false;
  };

  const signup = (name: string, email: string) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      role: 'member',
      subscriptionTier: 'free',
      level: 1,
      xp: 20,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      bio: 'New community explorer ready to learn and grow.',
      joinedDate: 'September 2026',
      badges: [],
      completedLessonIds: [],
      passedTestIds: [],
      activityHistory: [{ date: new Date().toISOString().split('T')[0], count: 1 }],
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);
    setIsAuthModalOpen(false);
    showToast({
      title: `Welcome to the Community, ${name}! 🎉`,
      message: 'Your account is created. +20 XP Welcome Bonus awarded!',
      type: 'success',
    });
  };

  const logout = () => {
    setCurrentUserId('user-free');
    showToast({
      title: 'Logged Out',
      message: 'You have been logged out to guest mode.',
      type: 'info',
    });
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUserId(userId);
      showToast({
        title: `Switched User: ${target.name}`,
        message: `Now operating as ${target.role === 'creator' ? 'Creator & Admin' : target.subscriptionTier.toUpperCase() + ' Member (Level ' + target.level + ')'}.`,
        type: 'info',
      });
    }
  };

  const updateUserProfile = (data: Partial<User>, targetUserId?: string) => {
    const idToUpdate = targetUserId || currentUser?.id;
    if (!idToUpdate) return;
    setUsers((prev) => prev.map((u) => (u.id === idToUpdate ? { ...u, ...data } : u)));
    showToast({
      title: 'Profile Updated',
      message: 'Profile information was saved successfully.',
      type: 'success',
    });
  };

  // Admin Actions for Prof. Vaughan & Alexander Kotzev
  const adminUpdateUserTier = (userId: string, tier: SubscriptionTier) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscriptionTier: tier } : u)));
    const target = users.find((u) => u.id === userId);
    showToast({
      title: 'Subscription Updated 🛡️',
      message: `Set ${target?.name || 'User'} subscription tier to ${tier.toUpperCase()}.`,
      type: 'success',
    });
  };

  const adminUpdateUserRole = (userId: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    const target = users.find((u) => u.id === userId);
    showToast({
      title: 'User Role Changed 👑',
      message: `Updated ${target?.name || 'User'} to role: ${role.toUpperCase()}.`,
      type: 'info',
    });
  };

  const adminUpdateUserStatus = (userId: string, status: 'active' | 'suspended') => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    const target = users.find((u) => u.id === userId);
    showToast({
      title: status === 'active' ? 'Account Activated' : 'Account Suspended ⚠️',
      message: `${target?.name || 'User'} is now ${status}.`,
      type: status === 'active' ? 'success' : 'warning',
    });
  };

  const adminAwardUserXP = (userId: string, amount: number, reason: string = 'Faculty Admin Grant') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newXp = Math.max(0, u.xp + amount);
          let newLevel = u.level;
          for (const tier of LEVEL_TIERS) {
            if (newXp >= tier.minXp) {
              newLevel = tier.level;
            }
          }
          return { ...u, xp: newXp, level: newLevel };
        }
        return u;
      })
    );
    const target = users.find((u) => u.id === userId);
    showToast({
      title: `XP Adjustment (${amount > 0 ? '+' : ''}${amount} XP)`,
      message: `Granted ${amount} XP to ${target?.name || 'User'} for: ${reason}.`,
      type: 'xp',
      xpAmount: amount,
    });
  };

  const adminToggleBadge = (userId: string, badgeId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const hasBadge = u.badges.includes(badgeId);
          const nextBadges = hasBadge ? u.badges.filter((b) => b !== badgeId) : [...u.badges, badgeId];
          return { ...u, badges: nextBadges };
        }
        return u;
      })
    );
    const badge = BADGES.find((b) => b.id === badgeId);
    showToast({
      title: 'Badge Status Toggled 🏅',
      message: `Updated badge "${badge?.name || badgeId}" for student.`,
      type: 'badge',
    });
  };

  const adminDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast({
      title: 'Post Moderated 🗑️',
      message: 'Discussion post removed from community feed.',
      type: 'info',
    });
  };

  const adminToggleCoursePublished = (courseId: string) => {
    showToast({
      title: 'Course Updated 📚',
      message: `Course status toggled for course ID: ${courseId}`,
      type: 'success',
    });
  };

  const adminBroadcastAnnouncement = (title: string, content: string, isPriority: boolean) => {
    const newAnno: SystemAnnouncement = {
      id: `anno-${Date.now()}`,
      title,
      content,
      authorName: currentUser?.name || 'Prof. Vaughan',
      authorRole: currentUser?.role === 'creator' ? 'Faculty / Creator' : 'Admin',
      date: new Date().toISOString(),
      isPriority,
      active: true,
    };
    setSystemAnnouncement(newAnno);
    localStorage.setItem('vcu_v4_announcement', JSON.stringify(newAnno));
    showToast({
      title: 'University Broadcast Published 📢',
      message: 'Announcement is now visible across the campus banner.',
      type: 'success',
    });
  };

  const dismissAnnouncement = () => {
    setSystemAnnouncement(null);
    localStorage.removeItem('vcu_v4_announcement');
  };

  const markLessonComplete = (lessonId: string, courseId: string) => {
    if (!currentUser) return;
    const isAlreadyCompleted = currentUser.completedLessonIds.includes(lessonId);

    if (isAlreadyCompleted) {
      // Toggle off
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, completedLessonIds: u.completedLessonIds.filter((id) => id !== lessonId) }
            : u
        )
      );
      showToast({
        title: 'Lesson Progress Updated',
        message: 'Marked as uncompleted.',
        type: 'info',
      });
      return;
    }

    // Mark complete and award XP
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, completedLessonIds: [...u.completedLessonIds, lessonId] }
          : u
      )
    );

    awardXP(20, 'Completed Lesson in Classroom! 📚');

    // Check if entire course is now completed
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const newlyCompleted = [...currentUser.completedLessonIds, lessonId];
      const isCourseDone = allLessonIds.every((id) => newlyCompleted.includes(id));
      if (isCourseDone) {
        awardXP(100, `Completed 100% of "${course.title}"! 🎓`);
        setCertificateCourse(course);
        setIsCertificateModalOpen(true);
      }
    }
  };

  const submitQuizResult = (
    quizId: string,
    scorePercentage: number,
    passed: boolean,
    courseId: string,
    lessonId: string
  ) => {
    if (!currentUser) return;

    if (passed) {
      const wasAlreadyPassed = currentUser.passedTestIds.includes(quizId);
      if (!wasAlreadyPassed) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === currentUser.id
              ? {
                  ...u,
                  passedTestIds: [...u.passedTestIds, quizId],
                  completedLessonIds: u.completedLessonIds.includes(lessonId)
                    ? u.completedLessonIds
                    : [...u.completedLessonIds, lessonId],
                }
              : u
          )
        );

        awardXP(50, `Passed Knowledge Test with ${scorePercentage}%! 🧠`);

        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      } else {
        showToast({
          title: `Test Retake Passed: ${scorePercentage}%!`,
          message: 'Great job reaffirming your knowledge.',
          type: 'success',
        });
      }
    } else {
      showToast({
        title: `Test Score: ${scorePercentage}%`,
        message: 'Passing requirement is 80%. Review the teachings and try again!',
        type: 'warning',
      });
    }
  };

  const saveCourse = (courseData: Partial<Course>) => {
    if (courseData.id) {
      // Update
      setCourses((prev) =>
        prev.map((c) => (c.id === courseData.id ? ({ ...c, ...courseData, updatedAt: new Date().toISOString() } as Course) : c))
      );
      showToast({
        title: 'Course Updated',
        message: `"${courseData.title}" has been saved.`,
        type: 'success',
      });
    } else {
      // Create new
      const newCourse: Course = {
        id: `course-${Date.now()}`,
        title: courseData.title || 'Untitled Masterclass',
        slug: (courseData.title || 'course').toLowerCase().replace(/\s+/g, '-'),
        tagline: courseData.tagline || 'Essential teachings and practice modules.',
        description: courseData.description || 'Comprehensive step-by-step masterclass teachings.',
        thumbnail: courseData.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
        category: courseData.category || 'Specialized Teachings',
        author: {
          id: currentUser?.id || 'user-creator',
          name: currentUser?.name || 'Instructor',
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'Course Creator',
        },
        requiredTier: courseData.requiredTier || 'free',
        requiredLevel: courseData.requiredLevel || 1,
        modules: courseData.modules || [
          {
            id: `mod-${Date.now()}`,
            title: 'Module 1: Getting Started',
            description: 'Core concepts and foundations.',
            lessons: [],
          },
        ],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setCourses((prev) => [newCourse, ...prev]);
      showToast({
        title: 'New Course Published! 🚀',
        message: `"${newCourse.title}" is now live in the Classroom.`,
        type: 'success',
      });
    }
    setIsCourseEditorOpen(false);
    setEditingCourse(null);
  };

  const deleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      setSelectedLessonId(null);
    }
    showToast({
      title: 'Course Removed',
      message: 'Course has been deleted from classroom.',
      type: 'info',
    });
  };

  const addLessonToModule = (courseId: string, moduleId: string, lesson: Lesson) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const updatedModules = c.modules.map((m) => {
            if (m.id === moduleId) {
              return { ...m, lessons: [...m.lessons, lesson] };
            }
            return m;
          });
          return { ...c, modules: updatedModules, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    );
    showToast({
      title: 'Lesson Added! 📚',
      message: `"${lesson.title}" (${lesson.type.toUpperCase()}) added to module.`,
      type: 'success',
    });
  };

  const createPost = (postData: { title: string; content: string; category: PostCategory; attachments?: any[] }) => {
    if (!currentUser) return;
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      authorLevel: currentUser.level,
      category: postData.category,
      title: postData.title,
      content: postData.content,
      attachments: postData.attachments || [],
      likes: [currentUser.id], // Creator self-likes
      comments: [],
      createdAt: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);
    awardXP(5, 'Published a new Community Discussion Post! 💬');
  };

  const toggleLikePost = (postId: string) => {
    if (!currentUser) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const alreadyLiked = p.likes.includes(currentUser.id);
          const newLikes = alreadyLiked
            ? p.likes.filter((id) => id !== currentUser.id)
            : [...p.likes, currentUser.id];
          return { ...p, likes: newLikes };
        }
        return p;
      })
    );
  };

  const addCommentToPost = (postId: string, content: string) => {
    if (!currentUser || !content.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorLevel: currentUser.level,
      authorRole: currentUser.role,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: [],
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      })
    );

    awardXP(2, 'Contributed a comment to community discussion! 💬');
  };

  const toggleLikeComment = (postId: string, commentId: string) => {
    if (!currentUser) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const updatedComments = p.comments.map((c) => {
            if (c.id === commentId) {
              const alreadyLiked = c.likes.includes(currentUser.id);
              const newLikes = alreadyLiked
                ? c.likes.filter((id) => id !== currentUser.id)
                : [...c.likes, currentUser.id];
              return { ...c, likes: newLikes };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    );
  };

  const togglePinPost = (postId: string) => {
    if (currentUser?.role !== 'creator') {
      showToast({
        title: 'Permission Denied',
        message: 'Only the Community Creator can pin posts.',
        type: 'warning',
      });
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
    );
    showToast({
      title: 'Post Pin Toggled',
      message: 'Updated pinned announcement status.',
      type: 'info',
    });
  };

  const toggleEventRSVP = (eventId: string) => {
    if (!currentUser) return;
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === eventId) {
          const isRsvpd = ev.rsvpUserIds.includes(currentUser.id);
          const newRsvps = isRsvpd
            ? ev.rsvpUserIds.filter((id) => id !== currentUser.id)
            : [...ev.rsvpUserIds, currentUser.id];
          return { ...ev, rsvpUserIds: newRsvps };
        }
        return ev;
      })
    );

    showToast({
      title: 'Event RSVP Updated! 📅',
      message: 'You have updated your attendance for this live workshop.',
      type: 'success',
    });
  };

  const upgradeSubscription = async (tier: SubscriptionTier, _paymentDetails: any): Promise<boolean> => {
    if (!currentUser) return false;

    // Simulate SSL handshake and Stripe charge
    await new Promise((resolve) => setTimeout(resolve, 1400));

    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, subscriptionTier: tier } : u))
    );

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch (e) {}

    awardXP(150, `Subscribed to ${tier.toUpperCase()} Tier! 💎 All Masterclasses & Resources Unlocked!`);
    setIsSubscriptionModalOpen(false);
    return true;
  };

  const sendDirectMessage = (receiverId: string, content: string) => {
    if (!currentUser || !content.trim()) return;
    const newDM: DirectMessage = {
      id: `dm-${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setDirectMessages((prev) => [...prev, newDM]);
    showToast({
      title: 'Message Sent! ✉️',
      message: 'Direct message delivered to member.',
      type: 'success',
    });
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
  const closeSubscriptionModal = () => setIsSubscriptionModalOpen(false);
  const openUserProfile = (userId: string, viewMode: 'modal' | 'page' = 'modal') => {
    setViewingUserId(userId);
    if (viewMode === 'page') {
      setActiveTab('profile');
      setIsUserProfileModalOpen(false);
    } else {
      setIsUserProfileModalOpen(true);
    }
  };
  const closeUserProfile = () => {
    setIsUserProfileModalOpen(false);
    setViewingUserId(null);
  };
  const openCourseEditor = (course?: Course) => {
    setEditingCourse(course || null);
    setIsCourseEditorOpen(true);
  };
  const closeCourseEditor = () => {
    setIsCourseEditorOpen(false);
    setEditingCourse(null);
  };
  const openCertificateModal = (course: Course) => {
    setCertificateCourse(course);
    setIsCertificateModalOpen(true);
  };
  const closeCertificateModal = () => {
    setIsCertificateModalOpen(false);
    setCertificateCourse(null);
  };
  const openLevelPerksModal = () => setIsLevelPerksModalOpen(true);
  const closeLevelPerksModal = () => setIsLevelPerksModalOpen(false);
  const closeLevelUpModal = () => setLevelUpModal({ isOpen: false, newLevel: null });

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        courses,
        posts,
        events,
        badges: BADGES,
        levelTiers: LEVEL_TIERS,
        subscriptionPlans: SUBSCRIPTION_PLANS,
        directMessages,
        toasts,
        levelUpModal,
        activeTab,
        selectedCourseId,
        selectedLessonId,
        isAuthModalOpen,
        isSubscriptionModalOpen,
        isUserProfileModalOpen,
        isProfileModalOpen: isUserProfileModalOpen,
        viewingUserId,
        viewingUser,
        isCourseEditorOpen,
        editingCourse,
        isCertificateModalOpen,
        certificateCourse,
        isLevelPerksModalOpen,
        systemAnnouncement,
        setActiveTab,
        setSelectedCourseId,
        setSelectedLessonId,
        openAuthModal,
        closeAuthModal,
        openSubscriptionModal,
        closeSubscriptionModal,
        openUserProfile,
        closeUserProfile,
        openCourseEditor,
        closeCourseEditor,
        openCertificateModal,
        closeCertificateModal,
        openLevelPerksModal,
        closeLevelPerksModal,
        closeLevelUpModal,
        dismissToast,
        showToast,
        dismissAnnouncement,
        login,
        signup,
        logout,
        switchUser,
        updateUserProfile,
        awardXP,
        checkAndAwardBadges,
        markLessonComplete,
        submitQuizResult,
        saveCourse,
        deleteCourse,
        addLessonToModule,
        createPost,
        toggleLikePost,
        addCommentToPost,
        toggleLikeComment,
        togglePinPost,
        toggleEventRSVP,
        upgradeSubscription,
        sendDirectMessage,
        adminUpdateUserTier,
        adminUpdateUserRole,
        adminUpdateUserStatus,
        adminAwardUserXP,
        adminToggleBadge,
        adminDeletePost,
        adminToggleCoursePublished,
        adminBroadcastAnnouncement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
