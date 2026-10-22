import { getUserStats } from './progress';
import { getUserFeedback } from './feedback';

/**
 * Achievement/Badge definitions
 */
// Colours stay inside the revibe.me palette (purple / violet / magenta, with the
// rare orange and star-gold reserved for the "hot" achievements). `unit` feeds
// the locked-badge hint ("2 more decks to go").
export const BADGES = {
  FIRST_STEP: {
    id: 'first_step',
    name: 'First Step',
    description: 'Start your first training material',
    icon: 'rocket_launch',
    color: '#A267F4',
    unit: 'deck',
    requirement: (stats) => stats.totalStarted >= 1
  },
  COMMITTED_LEARNER: {
    id: 'committed_learner',
    name: 'Committed Learner',
    description: 'Start 5 different materials',
    icon: 'school',
    color: '#7F19A0',
    unit: 'deck',
    requirement: (stats) => stats.totalStarted >= 5
  },
  FIRST_COMPLETION: {
    id: 'first_completion',
    name: 'First Victory',
    description: 'Complete your first material',
    icon: 'celebration',
    color: '#C82D8C',
    unit: 'deck',
    requirement: (stats) => stats.totalCompleted >= 1
  },
  DEDICATED: {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 3 materials',
    icon: 'workspace_premium',
    color: '#5019A0',
    unit: 'deck',
    requirement: (stats) => stats.totalCompleted >= 3
  },
  EXPERT: {
    id: 'expert',
    name: 'Expert',
    description: 'Complete 10 materials',
    icon: 'military_tech',
    color: '#121212',
    unit: 'deck',
    requirement: (stats) => stats.totalCompleted >= 10
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Maintain 100% average completion across all materials',
    icon: 'verified',
    color: '#A11F70',
    unit: '%',
    requirement: (stats) => stats.averageCompletion === 100 && stats.totalStarted >= 3
  },
  SPEED_READER: {
    id: 'speed_reader',
    name: 'Speed Reader',
    description: 'Complete 5 materials',
    icon: 'bolt',
    color: '#FF6400',
    unit: 'deck',
    requirement: (stats) => stats.totalCompleted >= 5
  },
  FEEDBACK_GIVER: {
    id: 'feedback_giver',
    name: 'Voice of Improvement',
    description: 'Provide feedback for 5 materials',
    icon: 'rate_review',
    color: '#D6479E',
    unit: 'rating',
    requirement: (stats, feedbackCount) => feedbackCount >= 5
  },
  QUALITY_RATER: {
    id: 'quality_rater',
    name: 'Quality Rater',
    description: 'Provide detailed feedback (with comments) for 3 materials',
    icon: 'star',
    color: '#E8A200',
    unit: 'review',
    requirement: (stats, feedbackCount, detailedFeedbackCount) => detailedFeedbackCount >= 3
  }
};

/**
 * Get all earned badges for a user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of earned badges
 */
export async function getUserBadges(uid) {
  try {
    const [stats, feedbackList] = await Promise.all([
      getUserStats(uid),
      getUserFeedback(uid)
    ]);

    const feedbackCount = feedbackList.length;
    const detailedFeedbackCount = feedbackList.filter(f => f.comment && f.comment.trim().length > 0).length;

    const earnedBadges = [];

    Object.values(BADGES).forEach(badge => {
      if (badge.requirement(stats, feedbackCount, detailedFeedbackCount)) {
        earnedBadges.push({
          ...badge,
          earnedAt: new Date().toISOString() // In production, store this in Firestore
        });
      }
    });

    return earnedBadges;
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
}

/**
 * Get progress towards next badge
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of badges with progress
 */
export async function getBadgeProgress(uid) {
  try {
    const [stats, feedbackList] = await Promise.all([
      getUserStats(uid),
      getUserFeedback(uid)
    ]);

    const feedbackCount = feedbackList.length;
    const detailedFeedbackCount = feedbackList.filter(f => f.comment && f.comment.trim().length > 0).length;

    const badgeProgress = [];

    Object.values(BADGES).forEach(badge => {
      const isEarned = badge.requirement(stats, feedbackCount, detailedFeedbackCount);
      
      let progress = 0;
      let target = 0;
      let current = 0;

      // Calculate progress based on badge type
      if (badge.id === 'first_step' || badge.id === 'committed_learner') {
        current = stats.totalStarted;
        target = badge.id === 'first_step' ? 1 : 5;
      } else if (badge.id === 'first_completion' || badge.id === 'dedicated' || badge.id === 'expert' || badge.id === 'speed_reader') {
        current = stats.totalCompleted;
        if (badge.id === 'first_completion') target = 1;
        else if (badge.id === 'dedicated') target = 3;
        else if (badge.id === 'speed_reader') target = 5;
        else if (badge.id === 'expert') target = 10;
      } else if (badge.id === 'perfectionist') {
        current = stats.averageCompletion;
        target = 100;
      } else if (badge.id === 'feedback_giver') {
        current = feedbackCount;
        target = 5;
      } else if (badge.id === 'quality_rater') {
        current = detailedFeedbackCount;
        target = 3;
      }

      progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      badgeProgress.push({
        ...badge,
        isEarned,
        progress,
        current,
        target
      });
    });

    return badgeProgress;
  } catch (error) {
    console.error('Error getting badge progress:', error);
    return [];
  }
}

/** Small, stable string hash (FNV-1a) → base36, for certificate IDs. */
function shortHash(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

/**
 * Generate certificate data for a completed material
 * @param {Object} user - User object
 * @param {string} materialName - Name of the material
 * @param {string} completedAt - Completion date
 * @param {string} [materialId] - Material ID (makes the certificate ID stable)
 * @returns {Object} Certificate data
 */
export function generateCertificateData(user, materialName, completedAt, materialId) {
  const parsed = completedAt ? new Date(completedAt) : new Date();
  const completionDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const uid = user?.uid || 'anon';
  const stamp = completionDate.toISOString().slice(0, 10).replace(/-/g, '');

  return {
    userName: user?.displayName || user?.email?.split('@')[0] || 'Learner',
    userEmail: user?.email,
    materialName,
    completedAt: completionDate.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    // Same learner + same deck + same day always yields the same ID.
    certificateId: `REVIBE-${stamp}-${uid.substring(0, 8).toUpperCase()}-${shortHash(`${uid}:${materialId || materialName}`)}`,
    issuedBy: 'Revibe Training Hub',
    issueDate: new Date().toISOString()
  };
}
