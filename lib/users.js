import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, query, 
  orderBy, updateDoc, where 
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

/**
 * Get all users in the system
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllUsers() {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('lastLogin', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Get a specific user by UID
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUser(uid) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        uid: userDoc.id,
        ...userDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Update a user's role (trainer only operation)
 * @param {string} uid - User ID to update
 * @param {string} newRole - New role ('trainer' or 'trainee')
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserRole(uid, newRole) {
  try {
    // Validate role
    if (!['trainer', 'trainee'].includes(newRole)) {
      throw new Error('Invalid role. Must be "trainer" or "trainee"');
    }
    
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    await updateDoc(userRef, {
      role: newRole,
      roleUpdatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Get user statistics and activity
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User activity statistics
 */
export async function getUserActivity(uid) {
  try {
    const user = await getUser(uid);
    
    if (!user) {
      return null;
    }
    
    // Get user's progress from progress collection
    const progressQuery = query(
      collection(db, 'progress'),
      where('uid', '==', uid)
    );
    const progressSnapshot = await getDocs(progressQuery);
    const progressData = progressSnapshot.docs.map(doc => doc.data());
    
    // Get user's feedback
    const feedbackQuery = query(
      collection(db, 'feedback'),
      where('uid', '==', uid)
    );
    const feedbackSnapshot = await getDocs(feedbackQuery);
    const feedbackData = feedbackSnapshot.docs.map(doc => doc.data());
    
    return {
      user,
      materialsStarted: progressData.length,
      materialsCompleted: progressData.filter(p => p.completed).length,
      feedbackSubmitted: feedbackData.length,
      lastActive: user.lastLogin,
      averageCompletionRate: progressData.length > 0
        ? Math.round(
            progressData.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / progressData.length
          )
        : 0
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    return null;
  }
}

/**
 * Get users by role
 * @param {string} role - Role to filter by ('trainer' or 'trainee')
 * @returns {Promise<Array>} Array of users with specified role
 */
export async function getUsersByRole(role) {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role),
      orderBy('lastLogin', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting users by role:', error);
    return [];
  }
}

/**
 * Search users by name or email
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching users
 */
export async function searchUsers(searchTerm) {
  try {
    const allUsers = await getAllUsers();
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      return allUsers;
    }
    
    return allUsers.filter(user => 
      (user.displayName && user.displayName.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Get platform user statistics (for trainer dashboard)
 * @returns {Promise<Object>} Platform user statistics
 */
export async function getPlatformUserStats() {
  try {
    const allUsers = await getAllUsers();
    
    const totalUsers = allUsers.length;
    const trainers = allUsers.filter(u => u.role === 'trainer').length;
    const trainees = allUsers.filter(u => u.role === 'trainee').length;
    
    // Calculate active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = allUsers.filter(u => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      return lastLogin >= sevenDaysAgo;
    }).length;
    
    // Get recently joined users
    const recentlyJoined = allUsers
      .filter(u => u.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    return {
      totalUsers,
      trainers,
      trainees,
      activeUsers,
      recentlyJoined
    };
  } catch (error) {
    console.error('Error getting platform user stats:', error);
    return {
      totalUsers: 0,
      trainers: 0,
      trainees: 0,
      activeUsers: 0,
      recentlyJoined: []
    };
  }
}

/**
 * Bulk update user roles (for admin operations)
 * @param {Array<{uid: string, role: string}>} updates - Array of user updates
 * @returns {Promise<Object>} Results with successes and failures
 */
export async function bulkUpdateUserRoles(updates) {
  const results = {
    successful: [],
    failed: []
  };
  
  for (const update of updates) {
    try {
      await updateUserRole(update.uid, update.role);
      results.successful.push(update.uid);
    } catch (error) {
      results.failed.push({
        uid: update.uid,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Check if a user is an admin (based on email)
 * @param {string} email - User email
 * @returns {boolean} True if user is admin
 */
export function isAdminEmail(email) {
  const ADMIN_EMAIL = 'youssf.rehem@revibe.me';
  return email && email.toLowerCase() === ADMIN_EMAIL;
}

/**
 * Get user leaderboard (by completed materials)
 * @param {number} limit - Number of users to return (default: 10)
 * @returns {Promise<Array>} Array of top users with completion stats
 */
export async function getUserLeaderboard(limit = 10) {
  try {
    // Get all progress records
    const progressQuery = query(collection(db, 'progress'));
    const progressSnapshot = await getDocs(progressQuery);
    const progressData = progressSnapshot.docs.map(doc => doc.data());
    
    // Group by user
    const userCompletions = {};
    progressData.forEach(p => {
      if (!userCompletions[p.uid]) {
        userCompletions[p.uid] = {
          uid: p.uid,
          completed: 0,
          inProgress: 0,
          totalPages: 0
        };
      }
      if (p.completed) {
        userCompletions[p.uid].completed += 1;
      } else {
        userCompletions[p.uid].inProgress += 1;
      }
      userCompletions[p.uid].totalPages += (p.viewedPages?.length || 0);
    });
    
    // Get user details and merge
    const leaderboardPromises = Object.values(userCompletions).map(async (stats) => {
      const user = await getUser(stats.uid);
      return {
        ...stats,
        displayName: user?.displayName || 'Unknown User',
        email: user?.email || '',
        photoURL: user?.photoURL || '',
        role: user?.role || 'trainee'
      };
    });
    
    const leaderboard = await Promise.all(leaderboardPromises);
    
    // Sort by completed materials, then by total pages viewed
    return leaderboard
      .sort((a, b) => {
        if (b.completed !== a.completed) {
          return b.completed - a.completed;
        }
        return b.totalPages - a.totalPages;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting user leaderboard:', error);
    return [];
  }
}
