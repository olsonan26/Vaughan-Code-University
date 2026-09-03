import {
  Badge,
  CommunityEvent,
  Course,
  LevelInfo,
  Lesson,
  Post,
  SubscriptionPlan,
  User,
} from '../types';

const VIDEO_SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const AUDIO_SAMPLE = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg';
const PDF_SAMPLE = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

function lesson(
  id: string,
  title: string,
  description: string,
  type: Lesson['type'],
  durationMinutes: number,
  isProOnly = false,
  contentMarkdown?: string,
): Lesson {
  const base: Lesson = {
    id,
    title,
    description,
    type,
    durationMinutes,
    xpReward: type === 'quiz' ? 50 : 20,
    isProOnly,
    contentMarkdown:
      contentMarkdown ||
      `### ${title}

${description}

#### Study rule
Calculate carefully, preserve the full compound trail, and interpret a number according to the position in which it appears.`,
  };

  if (type === 'video') base.videoUrl = VIDEO_SAMPLE;
  if (type === 'audio') base.audioUrl = AUDIO_SAMPLE;
  if (type === 'pdf') {
    base.pdfUrl = PDF_SAMPLE;
    base.pdfFileName = `${id.replace(/-/g, '_')}_study_guide.pdf`;
    base.pdfFileSize = 'Study PDF';
  }
  return base;
}

function moduleBlock(
  id: string,
  title: string,
  description: string,
  lessons: Lesson[],
): Course['modules'][number] {
  return { id, title, description, lessons };
}

function generateActivityHistory(activeCount: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const today = new Date('2026-09-03');
  for (let i = 60; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const rand = Math.sin(i * 12.9898) * 43758.5453;
    const isDayActive = (Math.abs(rand) % 1) < activeCount / 120;
    result.push({
      date: dateStr,
      count: isDayActive ? Math.floor((Math.abs(rand) % 4) + 1) : 0,
    });
  }
  return result;
}

export const LEVEL_TIERS: LevelInfo[] = [
  {
    level: 1,
    title: 'New Student',
    minXp: 0,
    maxXp: 100,
    perks: ['Community access', 'VC 101 foundations', 'Ask questions and join discussions'],
    icon: '🌱',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    level: 2,
    title: 'Code Apprentice',
    minXp: 100,
    maxXp: 300,
    perks: ['Full VC 101 access', 'Study guides and calculation practice', 'Audio teachings'],
    icon: '🔢',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    level: 3,
    title: 'Chart Student',
    minXp: 300,
    maxXp: 700,
    perks: ['Identity chart practice', 'Certification quizzes', 'Community case studies'],
    icon: '📘',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    level: 4,
    title: 'Pattern Practitioner',
    minXp: 700,
    maxXp: 1500,
    perks: ['Advanced chart exercises', 'Live workshops', 'Historical validation practice'],
    icon: '🧩',
    color: 'from-amber-500 to-orange-600',
  },
  {
    level: 5,
    title: 'Chart Analyst',
    minXp: 1500,
    maxXp: 3000,
    perks: ['Complete identity synthesis labs', 'Peer study collaboration', 'Case-study submissions'],
    icon: '📊',
    color: 'from-rose-500 to-pink-600',
  },
  {
    level: 6,
    title: 'Timeline Analyst',
    minXp: 3000,
    maxXp: 5000,
    perks: ['Annual and monthly timeline labs', 'Power Number context exercises', 'Timeline workshops'],
    icon: '🗓️',
    color: 'from-purple-600 to-amber-500',
  },
  {
    level: 7,
    title: 'Advanced Practitioner',
    minXp: 5000,
    maxXp: 7500,
    perks: ['Advanced case-study archive', 'Study-room leadership', 'Early access to new teaching material'],
    icon: '🧭',
    color: 'from-violet-600 to-indigo-600',
  },
  {
    level: 8,
    title: 'Vaughan Code Scholar',
    minXp: 7500,
    maxXp: 9500,
    perks: ['Advanced synthesis workshops', 'Faculty Q&A priority', 'Scholar recognition'],
    icon: '🎓',
    color: 'from-amber-600 to-yellow-500',
  },
  {
    level: 9,
    title: 'Master Code Analyst',
    minXp: 9500,
    maxXp: 15000,
    perks: ['Maximum learning level', 'Master analyst recognition', 'Full curriculum access'],
    icon: '🏆',
    color: 'from-yellow-400 via-amber-500 to-red-500',
  },
];

export const BADGES: Badge[] = [
  {
    id: 'first-step',
    name: 'First Calculation',
    description: 'Completed your first letter-to-number calculation.',
    icon: '🔢',
    category: 'learning',
    xpReward: 25,
    requirement: 'Complete 1 lesson',
  },
  {
    id: 'quiz-master',
    name: 'Compound Keeper',
    description: 'Demonstrated that the full compound trail should be preserved before reduction.',
    icon: '🧮',
    category: 'mastery',
    xpReward: 50,
    requirement: 'Pass 1 certification test with 80%+',
  },
  {
    id: 'streak-7',
    name: '7 Day Study Streak',
    description: 'Maintained seven consecutive days of study activity.',
    icon: '🔥',
    category: 'streak',
    xpReward: 100,
    requirement: '7-day streak',
  },
  {
    id: 'discussion-starter',
    name: 'Community Helper',
    description: 'Contributed a useful question, answer, or study discussion.',
    icon: '💬',
    category: 'engagement',
    xpReward: 30,
    requirement: 'Create 1 community post',
  },
  {
    id: 'audio-listener',
    name: 'Deep Listener',
    description: 'Completed an audio teaching and reviewed the lesson notes.',
    icon: '🎧',
    category: 'learning',
    xpReward: 35,
    requirement: 'Complete 1 audio teaching',
  },
  {
    id: 'pdf-scholar',
    name: 'First Chart',
    description: 'Completed a chart worksheet or study blueprint.',
    icon: '📄',
    category: 'learning',
    xpReward: 35,
    requirement: 'Complete 1 chart study guide',
  },
  {
    id: 'course-graduate',
    name: 'Course Graduate',
    description: 'Completed a full Vaughan Code course and its certification.',
    icon: '🎓',
    category: 'mastery',
    xpReward: 200,
    requirement: 'Complete 100% of 1 course',
  },
  {
    id: 'pro-member',
    name: 'Power Spotter',
    description: 'Recognized a Power Number and identified the chart position in which it appeared.',
    icon: '⚡',
    category: 'mastery',
    xpReward: 75,
    requirement: 'Complete Power Number context practice',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Community',
    priceMonthly: 0,
    priceAnnual: 0,
    description: 'Community access plus the opening Vaughan Code foundations.',
    features: [
      'General Community Feed',
      'VC 101 starter lessons',
      'Basic XP and level progression',
      'Public live-event viewing',
      'Member profile',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Scholar',
    priceMonthly: 29,
    priceAnnual: 290,
    description: 'Full classroom access, study blueprints, audio teachings, and certifications.',
    isPopular: true,
    badgeText: 'MOST POPULAR',
    features: [
      'Full VC 101, VC 201 and VC 301 curriculum',
      'Downloadable study guides and chart blueprints',
      'Audio teachings and transcripts',
      'Certification quizzes',
      'Weekly live Q&A access',
      'Course completion certificates',
      'Direct member messaging',
    ],
  },
  {
    id: 'vip',
    name: 'VIP Mastermind',
    priceMonthly: 79,
    priceAnnual: 790,
    description: 'Everything in Pro plus private study sessions and advanced workshops.',
    badgeText: 'PREMIUM VIP',
    features: [
      'Everything in Pro Scholar',
      'Private mastermind sessions',
      'Advanced chart and timeline workshops',
      'Priority Q&A access with faculty',
      'Feedback on submitted chart practice',
      'VIP community room',
    ],
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-creator',
    name: 'Prof. Vaughan',
    title: 'Headmaster / Lead Instructor',
    email: 'vaughan@vaughancode.edu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'creator',
    subscriptionTier: 'vip',
    level: 9,
    xp: 9950,
    streakDays: 88,
    lastActiveDate: '2026-09-03',
    bio: 'Headmaster and Lead Instructor of Vaughan Code University.',
    joinedDate: 'Jan 2024',
    interests: ['Teaching', 'Chart interpretation', 'Timeline analysis'],
    socials: {},
    badges: ['first-step', 'quiz-master', 'streak-7', 'discussion-starter', 'audio-listener', 'pdf-scholar', 'course-graduate', 'pro-member'],
    completedLessonIds: ['les-1-1', 'les-1-2', 'les-1-3', 'les-1-4', 'les-2-1', 'les-2-2', 'les-2-3', 'les-3-1', 'les-3-2', 'les-3-3'],
    passedTestIds: ['quiz-1', 'quiz-2', 'quiz-3'],
    activityHistory: generateActivityHistory(120),
  },
  {
    id: 'user-instructor',
    name: 'Alexander Kotzev',
    title: 'Instructor / Moderator',
    email: 'alexander.kotzev@vaughancode.edu',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'creator',
    subscriptionTier: 'vip',
    level: 8,
    xp: 8200,
    streakDays: 45,
    lastActiveDate: '2026-09-03',
    bio: 'Instructor and Moderator at Vaughan Code University, focused on practical chart building, identity synthesis, and timeline study.',
    joinedDate: 'Jan 2025',
    interests: ['Chart building', 'Student support', 'Timeline practice'],
    socials: {},
    badges: ['first-step', 'quiz-master', 'streak-7', 'discussion-starter', 'audio-listener', 'pdf-scholar', 'course-graduate', 'pro-member'],
    completedLessonIds: ['les-1-1', 'les-1-2', 'les-1-3', 'les-1-4', 'les-2-1', 'les-2-2', 'les-2-3', 'les-3-1', 'les-3-2'],
    passedTestIds: ['quiz-1', 'quiz-2'],
    activityHistory: generateActivityHistory(110),
  },
  {
    id: 'user-moderator-carolyn',
    name: 'Carolyn',
    title: 'Moderator',
    email: 'carolyn@vaughancode.local',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'moderator',
    subscriptionTier: 'vip',
    level: 5,
    xp: 2100,
    streakDays: 16,
    lastActiveDate: '2026-09-03',
    bio: 'Vaughan Code University Community Moderator.',
    joinedDate: 'Sep 2026',
    interests: ['Community support'],
    socials: {},
    badges: ['first-step', 'discussion-starter'],
    completedLessonIds: ['les-1-1', 'les-1-2'],
    passedTestIds: [],
    activityHistory: generateActivityHistory(80),
  },
  {
    id: 'user-moderator-soarsa',
    name: 'Soarsa',
    title: 'Moderator',
    email: 'soarsa@vaughancode.local',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'moderator',
    subscriptionTier: 'vip',
    level: 5,
    xp: 2050,
    streakDays: 14,
    lastActiveDate: '2026-09-03',
    bio: 'Vaughan Code University Community Moderator.',
    joinedDate: 'Sep 2026',
    interests: ['Community support'],
    socials: {},
    badges: ['first-step', 'discussion-starter'],
    completedLessonIds: ['les-1-1', 'les-1-2'],
    passedTestIds: [],
    activityHistory: generateActivityHistory(78),
  },
  {
    id: 'user-moderator-julie',
    name: 'Julie',
    title: 'Moderator',
    email: 'julie@vaughancode.local',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'moderator',
    subscriptionTier: 'vip',
    level: 5,
    xp: 1980,
    streakDays: 12,
    lastActiveDate: '2026-09-03',
    bio: 'Vaughan Code University Community Moderator.',
    joinedDate: 'Sep 2026',
    interests: ['Community support'],
    socials: {},
    badges: ['first-step', 'discussion-starter'],
    completedLessonIds: ['les-1-1'],
    passedTestIds: [],
    activityHistory: generateActivityHistory(76),
  },
  {
    id: 'user-pro',
    name: 'Jordan Lee',
    title: 'Level 4 Student',
    email: 'jordan@example.com',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    subscriptionTier: 'pro',
    level: 4,
    xp: 1120,
    streakDays: 14,
    lastActiveDate: '2026-09-03',
    bio: 'Studying identity charts and beginning annual timeline analysis.',
    joinedDate: 'Mar 2026',
    interests: ['Identity charts', 'Timeline practice'],
    socials: {},
    badges: ['first-step', 'quiz-master', 'streak-7', 'discussion-starter'],
    completedLessonIds: ['les-1-1', 'les-1-2', 'les-1-3', 'les-1-4', 'les-2-1'],
    passedTestIds: ['quiz-1'],
    activityHistory: generateActivityHistory(85),
  },
  {
    id: 'user-free',
    name: 'Sam Taylor',
    title: 'New Student',
    email: 'sam@example.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'member',
    subscriptionTier: 'free',
    level: 1,
    xp: 45,
    streakDays: 2,
    lastActiveDate: '2026-09-03',
    bio: 'Learning letter conversion and compound-number trails in VC 101.',
    joinedDate: 'Aug 2026',
    interests: ['Foundations'],
    socials: {},
    badges: ['first-step'],
    completedLessonIds: ['les-1-1'],
    passedTestIds: [],
    activityHistory: generateActivityHistory(30),
  },
];

const vc101Quiz = lesson(
  'les-1-12',
  'Teaching 4.3: VC 101 Certification Exam — The Language Code',
  'Test calculation accuracy, compound retention, and position awareness.',
  'quiz',
  12,
  false,
);
vc101Quiz.quiz = {
  id: 'quiz-1',
  title: 'VC 101 Certification: Language Code Foundations',
  description: 'Demonstrate accurate letter conversion, reduction, compound retention, and position awareness.',
  passingScorePercentage: 80,
  xpReward: 50,
  questions: [
    {
      id: 'q1-1',
      question: 'Why should a result such as 28 → 10 → 1 be preserved rather than recorded only as 1?',
      options: [
        'Because the compound trail preserves how the root number was reached',
        'Because single digits are invalid',
        'Because every compound is a Power Number',
        'Because the extra numbers are only decorative',
      ],
      correctAnswerIndex: 0,
      explanation: 'The Vaughan Code preserves the calculation route. The root matters, but so does the compound trail that produced it.',
    },
    {
      id: 'q1-2',
      question: 'What value does the letter J have in the standard repeating 1–9 letter key?',
      options: ['1', '2', '9', '10'],
      correctAnswerIndex: 0,
      explanation: 'After I = 9, the sequence repeats. J = 1.',
    },
    {
      id: 'q1-3',
      question: 'Why does chart position matter?',
      options: [
        'Because the same number answers a different question depending on where it appears',
        'Because only birth-date numbers have meaning',
        'Because names are ignored after childhood',
        'Because every position uses the same interpretation',
      ],
      correctAnswerIndex: 0,
      explanation: 'A number found in Heart’s Desire is describing something different from the same number found in the Day of Birth or Total Birth Date.',
    },
    {
      id: 'q1-4',
      question: 'Which numbers are specifically introduced as Power Numbers in the Vaughan system?',
      options: ['11, 13 and 16', '2, 4 and 8', '10, 20 and 30', '3, 6 and 9 only'],
      correctAnswerIndex: 0,
      explanation: '11, 13 and 16 are specifically taught as Power Numbers. Their interpretation depends on where they appear.',
    },
  ],
};

const vc201Quiz = lesson(
  'les-2-18',
  'Teaching 9.2: VC 201 Certification Exam — The Identity Code',
  'Demonstrate that you can keep the identity positions separate and synthesize them correctly.',
  'quiz',
  15,
  true,
);
vc201Quiz.quiz = {
  id: 'quiz-2',
  title: 'VC 201 Certification: Identity Code',
  description: 'Test your understanding of First Name, Called Name, Whole Name, Heart’s Desire, Day, Total Birth Date, and Ultimate Goal.',
  passingScorePercentage: 80,
  xpReward: 50,
  questions: [
    {
      id: 'q2-1',
      question: 'Which position governs natural skills and talents?',
      options: ['Total Birth Date', 'Day of Birth', 'Heart’s Desire', 'Called Name'],
      correctAnswerIndex: 0,
      explanation: 'The Total Birth Date describes natural skills, talents, characteristics, and capacity.',
    },
    {
      id: 'q2-2',
      question: 'What does the Day of Birth primarily describe?',
      options: ['Habits and natural traits', 'Long-term destination', 'Social second impressions', 'Full personality'],
      correctAnswerIndex: 0,
      explanation: 'The Day of Birth is read for habits, natural traits, and repeated/default behavior.',
    },
    {
      id: 'q2-3',
      question: 'How is the Ultimate Goal formed?',
      options: [
        'Whole Name + Total Birth Date',
        'First Name + Day of Birth',
        'Vowels + Personal Year',
        'Called Name + Calendar Month',
      ],
      correctAnswerIndex: 0,
      explanation: 'The Ultimate Goal combines the Whole Name with the Total Birth Date and speaks to longer-term direction.',
    },
    {
      id: 'q2-4',
      question: 'Which layer is most directly associated with internal motivation and desire?',
      options: ['Heart’s Desire / Vowels', 'Called Name', 'Calendar Year', 'Combiner'],
      correctAnswerIndex: 0,
      explanation: 'The vowel total is the Heart’s Desire and relates to motivation, passions, and inner emotional drive.',
    },
  ],
};

const vc301Quiz = lesson(
  'les-3-24',
  'Teaching 8.3: VC 301 Master Certification — The Timeline Code',
  'Test annual, monthly, and historical-validation understanding.',
  'quiz',
  18,
  true,
);
vc301Quiz.quiz = {
  id: 'quiz-3',
  title: 'VC 301 Master Certification: Timeline Code',
  description: 'Demonstrate correct use of Essence, Personal Year, Combiner, monthly layers, and validation practice.',
  passingScorePercentage: 80,
  xpReward: 50,
  questions: [
    {
      id: 'q3-1',
      question: 'What does the annual Essence primarily describe?',
      options: [
        'The internal condition and how the person is feeling or experiencing themselves',
        'The subscription tier',
        'The person’s complete personality',
        'The Calendar Month only',
      ],
      correctAnswerIndex: 0,
      explanation: 'Essence is derived from the active letters and relates to the internal experience during that period.',
    },
    {
      id: 'q3-2',
      question: 'What does the Personal Year primarily describe?',
      options: [
        'The conditions and environment around the person',
        'Only the person’s vowels',
        'The First Name',
        'The Whole Name',
      ],
      correctAnswerIndex: 0,
      explanation: 'The Personal Year describes the conditions the person is moving through.',
    },
    {
      id: 'q3-3',
      question: 'What is the annual Combiner?',
      options: [
        'Essence + Personal Year',
        'First Name + Whole Name',
        'Day + Vowels',
        'Personal Month + Calendar Year',
      ],
      correctAnswerIndex: 0,
      explanation: 'The Combiner is the result of Essence + Personal Year and is used to understand the interaction and appropriate response.',
    },
    {
      id: 'q3-4',
      question: 'Why validate known past events before attempting forward analysis?',
      options: [
        'To test the chart against documented reality and improve interpretation discipline',
        'To guarantee every future event',
        'To avoid doing any calculations',
        'To replace the annual chart with a biography',
      ],
      correctAnswerIndex: 0,
      explanation: 'Historical validation gives the student a way to test calculations and interpretations against events that are already known.',
    },
  ],
};

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-1',
    courseCode: 'VC 101',
    title: 'VC 101: The Language Code',
    slug: 'the-language-code',
    tagline: 'How Letters Become Numbers',
    category: 'Foundations',
    description: 'Learn the Vaughan Code language: the number key, letter conversion, compound trails, reduction, position awareness, and the foundations needed to calculate accurately.',
    thumbnail: '/src/assets/images/vc101_language_code_1788336655344.jpg',
    author: {
      id: 'user-creator',
      name: 'Prof. Vaughan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: 'Headmaster / Lead Instructor',
    },
    requiredTier: 'free',
    requiredLevel: 1,
    createdAt: '2026-01-15',
    updatedAt: '2026-09-03',
    modules: [
      moduleBlock('mod-1-1', 'Module 1: The Language of Numbers', 'Learn the base language before interpreting people.', [
        lesson('les-1-1', 'Teaching 1.1: Welcome — This Is a Method You Work With', 'An orientation to calculation, observation, practice, and testing patterns for yourself.', 'video', 10, false,
          `### Welcome to the Vaughan Code

The Vaughan Code is learned by working with it.

You will calculate names and dates, preserve the trail that produced each result, learn what each chart position governs, and compare interpretations against real examples.

The goal is not to memorize a collection of fortune-telling meanings.

The goal is to calculate accurately, understand position, compare layers, and test what you see.`),
        lesson('les-1-2', 'Teaching 1.2: The Base Number Language', 'Learn the working meanings of the base numbers before applying them to specific chart positions.', 'audio', 16),
        lesson('les-1-3', 'Teaching 1.3: Reduction — Find the Root and Preserve the Trail', 'Practice reduction without discarding compound totals such as 34 → 7 or 28 → 10 → 1.', 'pdf', 16),
      ]),
      moduleBlock('mod-1-2', 'Module 2: Turning Letters Into Numbers', 'Convert names accurately using the repeating 1–9 letter key.', [
        lesson('les-1-4', 'Teaching 2.1: The Vaughan Code Letter Key', 'Learn A=1 through I=9, then repeat the 1–9 sequence through the alphabet.', 'video', 15),
        lesson('les-1-5', 'Teaching 2.2: First Name Calculation — Maurice', 'Work through M A U R I C E = 4+1+3+9+9+3+5 = 34 → 7 and keep the complete trail.', 'article', 14),
        lesson('les-1-6', 'Teaching 2.3: Calculation Lab — Accuracy Before Speed', 'Practice several name calculations and verify every letter before interpretation.', 'pdf', 18),
      ]),
      moduleBlock('mod-1-3', 'Module 3: Position Changes the Question', 'Understand why the same number means something different in different chart positions.', [
        lesson('les-1-7', 'Teaching 3.1: One Number, Different Positions', 'Compare the same root number in a name position, a birth position, and a timing position.', 'video', 18),
        lesson('les-1-8', 'Teaching 3.2: Introduction to Power Numbers 11, 13 and 16', 'Recognize Power Numbers without reducing them away or making a conclusion from one number alone.', 'audio', 18),
        lesson('les-1-9', 'Teaching 3.3: Pattern Recognition Without Jumping to Conclusions', 'Learn to record what is present before deciding what a pattern means.', 'article', 14),
      ]),
      moduleBlock('mod-1-4', 'Module 4: Foundations Synthesis & Certification', 'Bring the foundation together and demonstrate calculation accuracy.', [
        lesson('les-1-10', 'Teaching 4.1: Complete Calculation Lab', 'Calculate a full set of names while preserving every compound trail.', 'pdf', 20),
        lesson('les-1-11', 'Teaching 4.2: From Language to Identity', 'Preview how the calculations become different identity positions in VC 201.', 'video', 12),
        vc101Quiz,
      ]),
    ],
  },
  {
    id: 'course-2',
    courseCode: 'VC 201',
    title: 'VC 201: The Identity Code',
    slug: 'the-identity-code',
    tagline: 'Reading the Human Blueprint',
    category: 'Human Blueprint',
    description: 'Learn why a person is not one number. Separate First Name, Called Name, Whole Name, Heart’s Desire, Day of Birth, Total Birth Date, and Ultimate Goal before synthesizing the complete profile.',
    thumbnail: '/src/assets/images/vc201_identity_code_1788336668852.jpg',
    author: {
      id: 'user-instructor',
      name: 'Alexander Kotzev',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'Instructor / Moderator',
    },
    requiredTier: 'pro',
    requiredLevel: 2,
    createdAt: '2026-02-10',
    updatedAt: '2026-09-03',
    modules: [
      moduleBlock('mod-2-1', 'Module 1: The Main Identity Areas', 'Learn the distinct questions answered by each fixed identity position.', [
        lesson('les-2-1', 'Teaching 1.1: A Person Is Not One Number', 'Separate personality, motivation, habits, abilities, and long-term direction before synthesis.', 'video', 18, true),
        lesson('les-2-2', 'Teaching 1.2: The Position Map', 'Map First Name, Whole Name, Vowels, Day, Total Birth Date, and Ultimate Goal, with Called Name as an additional social layer.', 'pdf', 16, true),
      ]),
      moduleBlock('mod-2-2', 'Module 2: First Name — Primary Personality', 'Study the entire First Name as the first and most intimate personality layer.', [
        lesson('les-2-3', 'Teaching 2.1: First Name & Initial Impressions', 'Read the complete First Name as primary personality and early emotional blueprint.', 'video', 20, true),
        lesson('les-2-4', 'Teaching 2.2: First Name Calculation Lab', 'Calculate First Names accurately and compare their compound trails.', 'article', 16, true),
      ]),
      moduleBlock('mod-2-3', 'Module 3: Called Name — Second Impressions', 'Study the socially used First Name + Surname as an additional perception layer.', [
        lesson('les-2-5', 'Teaching 3.1: How the Called Name Changes the View', 'Compare First Name with Called Name to study how social perception develops.', 'video', 18, true),
        lesson('les-2-6', 'Teaching 3.2: First, Called, Whole — Three Levels of Personality', 'Practice keeping initial, social, and deeper personality layers separate.', 'audio', 18, true),
      ]),
      moduleBlock('mod-2-4', 'Module 4: Whole Name — Full Personality', 'Read the full birth name as the overriding or more complete personality expression.', [
        lesson('les-2-7', 'Teaching 4.1: The Whole Name', 'Learn what the Full Birth Name governs and how it differs from the First and Called Name.', 'video', 20, true),
        lesson('les-2-8', 'Teaching 4.2: Whole Name Comparison Lab', 'Compare complete-name totals while preserving the route to each root.', 'pdf', 18, true),
      ]),
      moduleBlock('mod-2-5', 'Module 5: Heart’s Desire — Vowels', 'Study the internal motivational and emotional layer.', [
        lesson('les-2-9', 'Teaching 5.1: The Vowels as Motivation', 'Calculate the vowels in the full name and interpret them as Heart’s Desire, passions, and inner drive.', 'video', 20, true),
        lesson('les-2-10', 'Teaching 5.2: When Motivation and Personality Differ', 'Practice explaining differences between what a person expresses and what they internally want.', 'article', 16, true),
      ]),
      moduleBlock('mod-2-6', 'Module 6: Day of Birth — Habits & Natural Traits', 'Keep the Day position distinct from skills and talents.', [
        lesson('les-2-11', 'Teaching 6.1: What the Day of Birth Governs', 'Read habits, natural traits, and repeated/default behavior from the Day position.', 'video', 20, true),
        lesson('les-2-12', 'Teaching 6.2: Preserving the Original Day', 'Practice reading days such as 11, 13, 16, 22, and 29 without immediately erasing the compound.', 'pdf', 16, true),
      ]),
      moduleBlock('mod-2-7', 'Module 7: Total Birth Date — Skills & Talents', 'Study natural capacity separately from personality.', [
        lesson('les-2-13', 'Teaching 7.1: Natural Skills, Talents & Characteristics', 'Use the Total Birth Date to study what the person is naturally equipped to do.', 'video', 20, true),
        lesson('les-2-14', 'Teaching 7.2: Capacity vs Expression', 'Compare Total Birth Date with name positions to see when ability and personality are aligned or different.', 'article', 17, true),
      ]),
      moduleBlock('mod-2-8', 'Module 8: Ultimate Goal — Long-Term Direction', 'Combine Whole Name and Total Birth Date without losing the raw trail.', [
        lesson('les-2-15', 'Teaching 8.1: The Ultimate Goal Formula', 'Calculate Whole Name + Total Birth Date and preserve the resulting compound trail.', 'video', 22, true),
        lesson('les-2-16', 'Teaching 8.2: Personality + Capacity = Direction', 'Practice reading the Ultimate Goal as the blended long-term destination rather than a replacement for the other positions.', 'audio', 18, true),
      ]),
      moduleBlock('mod-2-9', 'Module 9: Full Profile Synthesis & Certification', 'Bring all identity positions together without forcing them to agree.', [
        lesson('les-2-17', 'Teaching 9.1: Full Human Profile Synthesis Lab', 'Assemble First Name, Called Name, Whole Name, Heart’s Desire, Day, Total Birth Date, and Ultimate Goal into one coherent reading.', 'article', 24, true),
        vc201Quiz,
      ]),
    ],
  },
  {
    id: 'course-3',
    courseCode: 'VC 301',
    badge: 'ADVANCED',
    title: 'VC 301: The Timeline Code',
    slug: 'the-timeline-code',
    tagline: 'Mapping Past, Present & Future',
    category: 'Timeline Analysis',
    description: 'Learn how the chart moves through time using Age, active Letters, Essence, Personal Year, Combiner, Calendar Year, monthly layers, Power Numbers in context, and historical validation.',
    thumbnail: '/src/assets/images/vc301_timeline_code_1788336681392.jpg',
    author: {
      id: 'user-creator',
      name: 'Prof. Vaughan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: 'Headmaster / Lead Instructor',
    },
    requiredTier: 'pro',
    requiredLevel: 3,
    createdAt: '2026-03-01',
    updatedAt: '2026-09-03',
    modules: [
      moduleBlock('mod-3-1', 'Module 1: Understanding the Time Map', 'Learn what the annual timeline chart represents.', [
        lesson('les-3-1', 'Teaching 1.1: The Annual Time Map', 'Orient to Age, active Letters, Essence, Personal Year, Combiner, and Calendar Year.', 'video', 20, true,
          `### The Annual Time Map

The annual chart is a moving view of the person through time.

Key rows include:

- **Age**
- **Active Letters**
- **Essence (ESS)** — the internal condition and how the person is feeling or experiencing themselves
- **Personal Year (PY)** — the conditions and environment around the person
- **Combiner (COM)** — Essence + Personal Year, used to study the resulting interaction and best response
- **Calendar Year (CY)** — the broader year condition

Do not rename ESS or COM with invented technical expansions.`),
        lesson('les-3-2', 'Teaching 1.2: Why Letters Move Through Time', 'Study how active letters contribute to Essence as the chart advances.', 'audio', 18, true),
        lesson('les-3-3', 'Teaching 1.3: Reading the Chart Before Interpreting It', 'Practice locating the correct year, age, letters, and governing rows before drawing a conclusion.', 'pdf', 16, true),
      ]),
      moduleBlock('mod-3-2', 'Module 2: Building the Annual Chart', 'Construct the annual chart carefully and preserve compounds.', [
        lesson('les-3-4', 'Teaching 2.1: Positioning Age & Active Letters', 'Build the timeline columns and identify which letters are active in each period.', 'video', 20, true),
        lesson('les-3-5', 'Teaching 2.2: Calculating Essence', 'Sum the active letters to form the annual Essence and preserve compound results.', 'article', 18, true),
        lesson('les-3-6', 'Teaching 2.3: Personal Year, Combiner & Calendar Year', 'Place the Personal Year, calculate the Combiner, and keep the Calendar Year visible as broader context.', 'pdf', 20, true),
      ]),
      moduleBlock('mod-3-3', 'Module 3: Reading Essence', 'Study the internal experience shown by the annual Essence.', [
        lesson('les-3-7', 'Teaching 3.1: Essence as Internal Condition', 'Interpret Essence as the internal condition rather than inventing a new technical meaning for ESS.', 'video', 20, true),
        lesson('les-3-8', 'Teaching 3.2: Repeated Essence & Stability Runs', 'Notice repeated Essence values and compare them against known periods of life.', 'article', 16, true),
        lesson('les-3-9', 'Teaching 3.3: Essence Validation Exercise', 'Use a known biography or personal timeline to test how Essence lines up with documented experience.', 'pdf', 18, true),
      ]),
      moduleBlock('mod-3-4', 'Module 4: Personal Years & the Combiner', 'Separate environmental conditions from the internal Essence, then study their interaction.', [
        lesson('les-3-10', 'Teaching 4.1: Personal Year as Environmental Condition', 'Read the Personal Year as the conditions surrounding the person.', 'video', 20, true),
        lesson('les-3-11', 'Teaching 4.2: The Combiner — A + B = C', 'Calculate Essence + Personal Year and study how the result informs response and action.', 'audio', 18, true),
        lesson('les-3-12', 'Teaching 4.3: Annual Context Lab', 'Practice reading Essence, Personal Year, Combiner, and Calendar Year together.', 'article', 20, true),
      ]),
      moduleBlock('mod-3-5', 'Module 5: Monthly Progression', 'Move from the annual chart into PM, PME, MCOM, and CM.', [
        lesson('les-3-13', 'Teaching 5.1: Personal Month (PM)', 'Calculate Personal Month from Personal Year + Calendar Month while preserving compounds.', 'video', 20, true),
        lesson('les-3-14', 'Teaching 5.2: Personal Month Essence (PME)', 'Calculate PME from Personal Month + Annual Essence.', 'article', 18, true),
        lesson('les-3-15', 'Teaching 5.3: Monthly Combiner (MCOM)', 'Calculate MCOM from Personal Month + Personal Month Essence and read it inside the annual conditions.', 'pdf', 20, true),
      ]),
      moduleBlock('mod-3-6', 'Module 6: Power Numbers Through Time', 'Recognize 11, 13 and 16 in annual and monthly positions without sensationalism.', [
        lesson('les-3-16', 'Teaching 6.1: Power Numbers in Annual Positions', 'Identify where 11, 13, and 16 appear and name the position before interpreting them.', 'video', 20, true),
        lesson('les-3-17', 'Teaching 6.2: Power Numbers in Monthly Positions', 'Practice distinguishing a Power Number in PM, PME, or MCOM from the annual governing conditions.', 'article', 18, true),
        lesson('les-3-18', 'Teaching 6.3: Context Before Conclusion', 'Use surrounding rows, timing layers, and known facts instead of making a prediction from one number.', 'audio', 17, true),
      ]),
      moduleBlock('mod-3-7', 'Module 7: Historical Validation', 'Test the system against known past events before attempting forward analysis.', [
        lesson('les-3-19', 'Teaching 7.1: Validate the Past First', 'Use documented events to test whether calculations and interpretations fit the known timeline.', 'video', 20, true),
        lesson('les-3-20', 'Teaching 7.2: Case Study Worksheet', 'Record what happened, when it happened, which positions were active, and whether patterns repeat.', 'pdf', 22, true),
        lesson('les-3-21', 'Teaching 7.3: Interpretation Discipline', 'Separate observation from assumption and avoid presenting one chart marker as certainty.', 'audio', 18, true),
      ]),
      moduleBlock('mod-3-8', 'Module 8: Timeline Synthesis & Master Certification', 'Bring annual and monthly layers together, with daily analysis reserved for advanced study.', [
        lesson('les-3-22', 'Teaching 8.1: Full Timeline Synthesis Lab', 'Build a multi-year annual chart, select important years, and open the monthly layers for closer study.', 'article', 25, true),
        lesson('les-3-23', 'Teaching 8.2: From Past Validation to Forward Questions', 'Use what has been validated to ask disciplined forward-looking questions without claiming certainty.', 'video', 20, true),
        vc301Quiz,
      ]),
    ],
  },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    authorId: 'user-creator',
    authorName: 'Prof. Vaughan',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'creator',
    authorLevel: 9,
    category: 'Announcements',
    title: 'Welcome to Vaughan Code University',
    content: `Start with VC 101 even if you already know traditional numerology.

The learning path is intentional:

1. Learn the number and letter language.
2. Learn what each identity position governs.
3. Learn how the chart moves through time.
4. Test what you see against real, documented events.

The aim is not to hand you answers. It is to teach you how to calculate, compare, question, and see the patterns for yourself.

Learn the code. Test the patterns. See for yourself.`,
    isPinned: true,
    likes: ['user-instructor', 'user-moderator-carolyn', 'user-moderator-soarsa', 'user-moderator-julie', 'user-pro'],
    createdAt: '2026-09-01T14:30:00Z',
    comments: [
      {
        id: 'c-1-1',
        authorId: 'user-instructor',
        authorName: 'Alexander Kotzev',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        authorLevel: 8,
        authorRole: 'creator',
        content: 'Begin with the calculations and keep your compound trails. If something does not make sense, bring the exact calculation into the community and we can work through it.',
        createdAt: '2026-09-01T15:00:00Z',
        likes: ['user-creator', 'user-pro'],
      },
    ],
  },
  {
    id: 'post-2',
    authorId: 'user-pro',
    authorName: 'Jordan Lee',
    authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'member',
    authorLevel: 4,
    category: 'Wins & Case Studies',
    title: 'I finally understood why position matters',
    content: `I kept trying to interpret the same number the same way everywhere.

VC 201 made it click that a 5 in Heart’s Desire is answering a different question than a 5 in the Day of Birth or Total Birth Date.

That completely changed the way I read a chart.`,
    likes: ['user-instructor', 'user-moderator-carolyn'],
    createdAt: '2026-09-02T18:45:00Z',
    comments: [],
  },
  {
    id: 'post-3',
    authorId: 'user-free',
    authorName: 'Sam Taylor',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    authorRole: 'member',
    authorLevel: 1,
    category: 'Questions & Help',
    title: 'Question about preserving compound trails',
    content: `If a Full Name gives me 38 → 11 → 2, should I record the complete 38/11/2 trail even though the final root is 2?

I think the answer is yes after VC 101, but I want to make sure I am writing the chart correctly.`,
    likes: ['user-moderator-soarsa', 'user-pro'],
    createdAt: '2026-09-03T09:15:00Z',
    comments: [
      {
        id: 'c-3-1',
        authorId: 'user-moderator-soarsa',
        authorName: 'Soarsa',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        authorLevel: 5,
        authorRole: 'moderator',
        content: 'Yes. Keep the full 38 → 11 → 2 trail in your notes. The root is still 2, but the route should not be discarded.',
        createdAt: '2026-09-03T09:40:00Z',
        likes: ['user-free', 'user-instructor'],
      },
    ],
  },
  {
    id: 'post-4',
    authorId: 'user-moderator-julie',
    authorName: 'Julie',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    authorRole: 'moderator',
    authorLevel: 5,
    category: 'Action Guides',
    title: 'Past timeline validation checklist',
    content: `When you practice VC 301, write down the known event before you interpret the chart.

Ask:

• What happened?
• When did it happen?
• What were the Essence, Personal Year and Combiner?
• What changed when you open the monthly chart?
• Is the pattern repeated anywhere else?

Observation first. Interpretation second.`,
    likes: ['user-creator', 'user-instructor', 'user-pro'],
    createdAt: '2026-09-03T12:00:00Z',
    comments: [],
  },
];

export const INITIAL_EVENTS: CommunityEvent[] = [
  {
    id: 'ev-1',
    title: 'Live Class: Building Your First Complete Chart',
    description: 'A guided chart-building session covering accurate calculation, compound trails, and the main identity positions.',
    date: '2026-09-04',
    startTime: '11:00 AM',
    endTime: '12:30 PM',
    timeZone: 'MT',
    speaker: {
      name: 'Prof. Vaughan & Alexander Kotzev',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      title: 'Headmaster / Lead Instructor & Instructor / Moderator',
    },
    locationType: 'zoom',
    meetingUrl: 'https://zoom.us/',
    requiredTier: 'free',
    rsvpUserIds: ['user-creator', 'user-instructor', 'user-moderator-carolyn', 'user-pro'],
  },
  {
    id: 'ev-2',
    title: 'Chart Lab: First Name, Whole Name & Heart’s Desire',
    description: 'Practice keeping personality and motivation layers separate before combining them into a full profile.',
    date: '2026-09-08',
    startTime: '2:00 PM',
    endTime: '3:30 PM',
    timeZone: 'MT',
    speaker: {
      name: 'Alexander Kotzev',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      title: 'Instructor / Moderator',
    },
    locationType: 'meet',
    meetingUrl: 'https://meet.google.com/',
    requiredTier: 'pro',
    rsvpUserIds: ['user-creator', 'user-instructor', 'user-pro'],
  },
  {
    id: 'ev-3',
    title: 'Timeline Workshop: Essence, Personal Year & Combiner',
    description: 'Build and interpret an annual time map, then compare it with known events from the subject’s past.',
    date: '2026-09-12',
    startTime: '4:00 PM',
    endTime: '5:00 PM',
    timeZone: 'MT',
    speaker: {
      name: 'Prof. Vaughan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      title: 'Headmaster / Lead Instructor',
    },
    locationType: 'youtube',
    meetingUrl: 'https://youtube.com/',
    requiredTier: 'pro',
    rsvpUserIds: ['user-creator', 'user-instructor', 'user-pro'],
  },
  {
    id: 'ev-4',
    title: 'Moderator Study Room: Student Chart Practice & Questions',
    description: 'Bring your calculations, chart questions, and study notes for a community practice session with the moderator team.',
    date: '2026-09-15',
    startTime: '7:00 PM',
    endTime: '8:00 PM',
    timeZone: 'MT',
    speaker: {
      name: 'Carolyn, Soarsa & Julie',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      title: 'Community Moderators',
    },
    locationType: 'zoom',
    meetingUrl: 'https://zoom.us/',
    requiredTier: 'free',
    rsvpUserIds: ['user-moderator-carolyn', 'user-moderator-soarsa', 'user-moderator-julie', 'user-free'],
  },
];
