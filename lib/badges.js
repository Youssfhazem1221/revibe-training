import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getUserStats } from './progress';
import { getUserFeedback } from './feedback';
import { BADGES } from './achievements';

/**
 * Compute currently-earned badges, diff against the set already persisted on
 * the user doc, persist the union, and return only the NEWLY earned badges
 * (so the UI can celebrate them once).
 *
 * First-ever sync establishes a baseline silently (no popup flood for users
 * who already earned badges before this feature existed).
 *
 * @param {string} uid
 * @returns {Promise<Array>} newly earned badge objects (empty if none)
 */
export async function syncEarnedBadges(uid) {
  if (!uid) return [];

  try {
    const [stats, feedbackList] = await Promise.all([
      getUserStats(uid),
      getUserFeedback(uid)
    ]);

    const feedbackCount = feedbackList.length;
    const detailedFeedbackCount = feedbackList.filter(
      f => f.comment && f.comment.trim().length > 0
    ).length;

    const earnedNow = Object.values(BADGES).filter(b =>
      b.requirement(stats, feedbackCount, detailedFeedbackCount)
    );
    const earnedNowIds = earnedNow.map(b => b.id);

    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return []; // user doc created on login; try again later

    const stored = snap.data().earnedBadges;

    // First sync: no earnedBadges field yet → baseline silently.
    if (!Array.isArray(stored)) {
      if (earnedNowIds.length > 0) {
        await updateDoc(userRef, { earnedBadges: earnedNowIds });
      }
      return [];
    }

    const newBadges = earnedNow.filter(b => !stored.includes(b.id));
    if (newBadges.length > 0) {
      await updateDoc(userRef, { earnedBadges: earnedNowIds });
    }
    return newBadges;
  } catch (error) {
    console.warn('Failed to sync earned badges:', error);
    return [];
  }
}
