import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, query, 
  where, orderBy, serverTimestamp, updateDoc, arrayUnion 
} from 'firebase/firestore';

const PROGRESS_COLLECTION = 'progress';

/**
 * Record that a user viewed a specific page of a material
 * @param {string} uid - User ID
 * @param {string} materialId - Material ID
 * @param {number} pageNum - Page number (1-indexed)
 * @param {number} totalPages - Total pages in the material
 * @param {string} materialName - Name of the material
 */
export async function recordPageView(uid, materialId, pageNum, totalPages, materialName) {
  const progressId = `${uid}_${materialId}`;
  const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
  
  try {
    const progressDoc = await getDoc(progressRef);
    const now = new Date().toISOString();
    
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      const viewedPages = data.viewedPages || [];
      
      // Add page if not already viewed
      if (!viewedPages.includes(pageNum)) {
        viewedPages.push(pageNum);
        viewedPages.sort((a, b) => a - b);
      }
      
      const completed = viewedPages.length >= totalPages;
      const completionPercentage = Math.round((viewedPages.length / totalPages) * 100);
      
      await updateDoc(progressRef, {
        viewedPages,
        lastPage: pageNum,
        lastViewedAt: now,
        completed,
        completionPercentage,
        ...(completed && !data.completed ? { completedAt: now } : {})
      });
    } else {
      // Create new progress document
      const completed = totalPages === 1;
      await setDoc(progressRef, {
        uid,
        materialId,
        materialName,
        totalPages,
        viewedPages: [pageNum],
        completed,
        completionPercentage: Math.round((1 / totalPages) * 100),
        lastPage: pageNum,
        startedAt: now,
        lastViewedAt: now,
        ...(completed ? { completedAt: now } : {})
      });
    }
  } catch (error) {
    console.error('Error recording page view:', error);
    throw error;
  }
}

/**
 * Get all progress records for a specific user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of progress records
 */
export async function getUserProgress(uid) {
  try {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('uid', '==', uid),
      orderBy('lastViewedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startedAt: doc.data().startedAt,
      lastViewedAt: doc.data().lastViewedAt,
      completedAt: doc.data().completedAt || null
    }));
  } catch (error) {
    console.error('Error getting user progress:', error);
    return [];
  }
}

/**
 * Get progress for a specific material (all users)
 * @param {string} materialId - Material ID
 * @returns {Promise<Array>} Array of progress records for all users
 */
export async function getMaterialProgress(materialId) {
  try {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('materialId', '==', materialId),
      orderBy('lastViewedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting material progress:', error);
    return [];
  }
}

/**
 * Get all progress records (admin/trainer view)
 * @returns {Promise<Array>} All progress records
 */
export async function getAllProgress() {
  try {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      orderBy('lastViewedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all progress:', error);
    return [];
  }
}

/**
 * Get progress statistics for a user
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Statistics object
 */
export async function getUserStats(uid) {
  try {
    const progressRecords = await getUserProgress(uid);
    
    const totalStarted = progressRecords.length;
    const totalCompleted = progressRecords.filter(p => p.completed).length;
    const inProgress = totalStarted - totalCompleted;
    const averageCompletion = progressRecords.length > 0
      ? Math.round(
          progressRecords.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / progressRecords.length
        )
      : 0;
    
    return {
      totalStarted,
      totalCompleted,
      inProgress,
      averageCompletion,
      recentlyViewed: progressRecords.slice(0, 5)
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      totalStarted: 0,
      totalCompleted: 0,
      inProgress: 0,
      averageCompletion: 0,
      recentlyViewed: []
    };
  }
}

/**
 * Get overall platform statistics (trainer dashboard)
 * @returns {Promise<Object>} Platform statistics
 */
export async function getPlatformStats() {
  try {
    const allProgress = await getAllProgress();
    
    // Get unique users who have started any material
    const activeUsers = new Set(allProgress.map(p => p.uid)).size;
    
    // Count completed materials
    const completedMaterials = allProgress.filter(p => p.completed).length;
    
    // Calculate average completion rate
    const avgCompletionRate = allProgress.length > 0
      ? Math.round(
          allProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / allProgress.length
        )
      : 0;
    
    // Find most popular materials (most started)
    const materialCounts = {};
    allProgress.forEach(p => {
      materialCounts[p.materialId] = (materialCounts[p.materialId] || 0) + 1;
    });
    
    const popularMaterials = Object.entries(materialCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([materialId, count]) => {
        const progress = allProgress.find(p => p.materialId === materialId);
        return {
          materialId,
          materialName: progress?.materialName || 'Unknown',
          userCount: count
        };
      });
    
    return {
      activeUsers,
      totalStarted: allProgress.length,
      completedMaterials,
      avgCompletionRate,
      popularMaterials
    };
  } catch (error) {
    console.error('Error getting platform stats:', error);
    return {
      activeUsers: 0,
      totalStarted: 0,
      completedMaterials: 0,
      avgCompletionRate: 0,
      popularMaterials: []
    };
  }
}

/**
 * Check if a user has completed a specific material
 * @param {string} uid - User ID
 * @param {string} materialId - Material ID
 * @returns {Promise<boolean>} True if completed
 */
export async function isMaterialCompleted(uid, materialId) {
  try {
    const progressId = `${uid}_${materialId}`;
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      return progressDoc.data().completed || false;
    }
    return false;
  } catch (error) {
    console.error('Error checking material completion:', error);
    return false;
  }
}
