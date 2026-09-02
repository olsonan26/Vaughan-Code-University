export type UserRole = 'creator' | 'moderator' | 'member';

export type SubscriptionTier = 'free' | 'pro' | 'vip';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  coverImage?: string;
  role: UserRole;
  title?: string;
  subscriptionTier: SubscriptionTier;
  status?: 'active' | 'suspended';
  level: number;
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  bio: string;
  joinedDate: string;
  location?: string;
  interests?: string[];
  socials?: {
    twitter?: string;
    github?: string;
    website?: string;
    linkedin?: string;
    youtube?: string;
  };
  badges: string[]; // Badge IDs
  completedLessonIds: string[];
  passedTestIds: string[];
  activityHistory: { date: string; count: number }[];
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  date: string;
  isPriority: boolean;
  active: boolean;
}

export type LessonType = 'video' | 'audio' | 'pdf' | 'quiz' | 'article';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  passingScorePercentage: number;
  xpReward: number;
  questions: QuizQuestion[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: LessonType;
  durationMinutes: number;
  xpReward: number;
  videoUrl?: string;
  audioUrl?: string;
  audioTranscript?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  contentMarkdown?: string;
  quiz?: Quiz;
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'code' | 'link' | 'audio';
    size?: string;
  }[];
  lockedLevel?: number; // Minimum level to access
  isProOnly?: boolean; // Requires Pro/VIP subscription
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  courseCode?: string;
  badge?: string;
  slug: string;
  tagline: string;
  description: string;
  thumbnail: string;
  category: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  requiredTier: SubscriptionTier;
  requiredLevel: number;
  modules: CourseModule[];
  createdAt: string;
  updatedAt: string;
}

export type PostCategory = 
  | 'General Discussion'
  | 'Announcements'
  | 'Wins & Case Studies'
  | 'Questions & Help'
  | 'Action Guides'
  | 'Resource Share';

export interface PostAttachment {
  type: 'image' | 'pdf' | 'audio' | 'video' | 'link' | 'poll';
  url?: string;
  name?: string;
  size?: string;
  pollData?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    userVotedOptionId?: string;
  };
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorLevel: number;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  likes: string[]; // User IDs
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  authorLevel: number;
  category: PostCategory;
  title: string;
  content: string;
  attachments?: PostAttachment[];
  likes: string[]; // User IDs
  comments: Comment[];
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO format
  startTime: string;
  endTime: string;
  timeZone: string;
  speaker: {
    name: string;
    avatar: string;
    title: string;
  };
  locationType: 'zoom' | 'youtube' | 'meet';
  meetingUrl: string;
  requiredTier: SubscriptionTier;
  rsvpUserIds: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'engagement' | 'mastery' | 'streak' | 'special';
  xpReward: number;
  requirement: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  perks: string[];
  icon: string;
  color: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  badgeText?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}
