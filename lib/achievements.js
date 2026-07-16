import { getUserStats } from './progress';
import { getUserFeedback } from './feedback';

/**
 * Achievement/Badge definitions
 */
export const BADGES = {
  FIRST_STEP: {
    id: 'first_step',
    name: 'First Step',
    description: 'Start your first training material',
    icon: 'rocket_launch',
    color: '#3B82F6',
    requirement: (stats) => stats.totalStarted >= 1
  },
  COMMITTED_LEARNER: {
    id: 'committed_learner',
    name: 'Committed Learner',
    description: 'Start 5 different materials',
    icon: 'school',
    color: '#8B5CF6',
    requirement: (stats) => stats.totalStarted >= 5
  },
  FIRST_COMPLETION: {
    id: 'first_completion',
    name: 'First Victory',
    description: 'Complete your first material',
    icon: 'celebration',
    color: '#10B981',
    requirement: (stats) => stats.totalCompleted >= 1
  },
  DEDICATED: {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 3 materials',
    icon: 'workspace_premium',
    color: '#F59E0B',
    requirement: (stats) => stats.totalCompleted >= 3
  },
  EXPERT: {
    id: 'expert',
    name: 'Expert',
    description: 'Complete 10 materials',
    icon: 'military_tech',
    color: '#EF4444',
    requirement: (stats) => stats.totalCompleted >= 10
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Maintain 100% average completion across all materials',
    icon: 'verified',
    color: '#06B6D4',
    requirement: (stats) => stats.averageCompletion === 100 && stats.totalStarted >= 3
  },
  SPEED_READER: {
    id: 'speed_reader',
    name: 'Speed Reader',
    description: 'Complete 5 materials',
    icon: 'bolt',
    color: '#FFB800',
    requirement: (stats) => stats.totalCompleted >= 5
  },
  FEEDBACK_GIVER: {
    id: 'feedback_giver',
    name: 'Voice of Improvement',
    description: 'Provide feedback for 5 materials',
    icon: 'rate_review',
    color: '#EC4899',
    requirement: (stats, feedbackCount) => feedbackCount >= 5
  },
  QUALITY_RATER: {
    id: 'quality_rater',
    name: 'Quality Rater',
    description: 'Provide detailed feedback (with comments) for 3 materials',
    icon: 'star',
    color: '#F59E0B',
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

/**
 * Generate certificate data for a completed material
 * @param {Object} user - User object
 * @param {string} materialName - Name of the material
 * @param {string} completedAt - Completion date
 * @returns {Object} Certificate data
 */
export function generateCertificateData(user, materialName, completedAt) {
  const completionDate = new Date(completedAt);
  
  return {
    userName: user.displayName || 'Learner',
    userEmail: user.email,
    materialName,
    completedAt: completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    certificateId: `REVIBE-${Date.now()}-${user.uid.substring(0, 8).toUpperCase()}`,
    issuedBy: 'REVIBE Training Hub',
    issueDate: new Date().toISOString()
  };
}
