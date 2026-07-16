'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProgress, getUserStats } from '@/lib/progress';
import { getUserFeedback } from '@/lib/feedback';
import { getBadgeProgress, generateCertificateData } from '@/lib/achievements';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import BadgesDisplay from '@/components/BadgesDisplay';
import Certificate from '@/components/Certificate';
import './my-learning.css';

export default function MyLearningPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [progressList, setProgressList] = useState([]);
  const [stats, setStats] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [badges, setBadges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('in-progress'); // 'in-progress', 'completed', 'all', 'badges'
  const [certificateData, setCertificateData] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const [progress, userStats, feedback, badgeProgress] = await Promise.all([
        getUserProgress(user.uid),
        getUserStats(user.uid),
        getUserFeedback(user.uid),
        getBadgeProgress(user.uid)
      ]);

      setProgressList(progress);
      setStats(userStats);
      setFeedbackList(feedback);
      setBadges(badgeProgress);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    setIsLoading(false);
  };

  const filteredProgress = progressList.filter(p => {
    if (activeTab === 'completed') return p.completed;
    if (activeTab === 'in-progress') return !p.completed;
    if (activeTab === 'badges') return false; // Show badges view
    return true; // 'all'
  });

  const handleViewCertificate = (progress) => {
    if (!progress.completed) return;
    
    const certData = generateCertificateData(
      user,
      progress.materialName,
      progress.completedAt
    );
    setCertificateData(certData);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeSpent = (startedAt, lastViewedAt) => {
    if (!startedAt || !lastViewedAt) return 'N/A';
    const start = new Date(startedAt);
    const last = new Date(lastViewedAt);
    const diffMs = last - start;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return '< 1h';
  };

  if (loading || !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-white)' }}>
        <i className="material-icons animate-spin" style={{ fontSize: '48px', color: 'var(--accent-pink)' }}>refresh</i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-white">
      <Navbar title="My Learning" />

      <main className="my-learning-content">
        {/* Profile Header */}
        <div className="learning-profile-header">
          <div className="profile-avatar-section">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={user.displayName} className="profile-avatar-large" />
            ) : (
              <div className="profile-avatar-placeholder-large">
                <i className="material-icons">person</i>
              </div>
            )}
            <div className="profile-info">
              <h1 className="profile-name">{user.displayName}</h1>
              <p className="profile-email">{user.email}</p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="stats-cards-grid">
              <div className="stat-card-large">
                <div className="stat-icon-wrapper started">
                  <i className="material-icons">play_circle</i>
                </div>
                <div className="stat-details">
                  <div className="stat-value-large">{stats.totalStarted}</div>
                  <div className="stat-label-large">Materials Started</div>
                </div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon-wrapper completed">
                  <i className="material-icons">check_circle</i>
                </div>
                <div className="stat-details">
                  <div className="stat-value-large">{stats.totalCompleted}</div>
                  <div className="stat-label-large">Completed</div>
                </div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon-wrapper progress">
                  <i className="material-icons">trending_up</i>
                </div>
                <div className="stat-details">
                  <div className="stat-value-large">{stats.inProgress}</div>
                  <div className="stat-label-large">In Progress</div>
                </div>
              </div>

              <div className="stat-card-large">
                <div className="stat-icon-wrapper average">
                  <i className="material-icons">analytics</i>
                </div>
                <div className="stat-details">
                  <div className="stat-value-large">{stats.averageCompletion}%</div>
                  <div className="stat-label-large">Avg Completion</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="learning-tabs">
          <button
            className={`learning-tab ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-progress')}
          >
            <i className="material-icons">schedule</i>
            In Progress ({stats?.inProgress || 0})
          </button>
          <button
            className={`learning-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <i className="material-icons">check_circle</i>
            Completed ({stats?.totalCompleted || 0})
          </button>
          <button
            className={`learning-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <i className="material-icons">view_list</i>
            All ({stats?.totalStarted || 0})
          </button>
          <button
            className={`learning-tab ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <i className="material-icons">workspace_premium</i>
            Badges ({badges.filter(b => b.isEarned).length})
          </button>
        </div>

        {/* Materials List or Badges */}
        {isLoading ? (
          <div className="learning-loading">
            <i className="material-icons animate-spin text-accent-pink" style={{ fontSize: '48px' }}>refresh</i>
            <p>Loading your learning journey...</p>
          </div>
        ) : activeTab === 'badges' ? (
          <BadgesDisplay badges={badges} showProgress={true} />
        ) : filteredProgress.length === 0 ? (
          <div className="learning-empty">
            <div className="learning-empty-icon" aria-hidden="true">
              <i className="material-icons">school</i>
            </div>
            <h3>
              {activeTab === 'completed' && 'No completed materials yet'}
              {activeTab === 'in-progress' && 'No materials in progress'}
              {activeTab === 'all' && 'Start your learning journey'}
            </h3>
            <p>
              {activeTab === 'completed' && 'Keep learning to earn your first completion.'}
              {activeTab === 'in-progress' && 'Head to the dashboard to pick up a new material.'}
              {activeTab === 'all' && 'Browse available training materials on the dashboard.'}
            </p>
            <button
              className="learning-empty-cta"
              onClick={() => router.push('/dashboard')}
            >
              <i className="material-icons">explore</i>
              <span>Browse materials</span>
              <i className="material-icons learning-empty-cta-arrow">arrow_forward</i>
            </button>
          </div>
        ) : (
          <div className="learning-materials-list">
            {filteredProgress.map((progress) => {
              const userFeedback = feedbackList.find(f => f.materialId === progress.materialId);
              
              return (
                <div key={progress.id} className="learning-material-card">
                  <div className="learning-material-header">
                    <div className="learning-material-title-section">
                      <h3 className="learning-material-title">{progress.materialName}</h3>
                      {progress.completed && (
                        <span className="completion-badge">
                          <i className="material-icons">verified</i>
                          Completed
                        </span>
                      )}
                    </div>
                    
                    <button
                      className="btn btn-gradient btn-sm"
                      onClick={() => router.push(`/viewer?id=${progress.materialId}`)}
                    >
                      <i className="material-icons" style={{ fontSize: '16px' }}>
                        {progress.completed ? 'replay' : 'play_arrow'}
                      </i>
                      {progress.completed ? 'Review' : 'Continue'}
                    </button>
                    
                    {progress.completed && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleViewCertificate(progress)}
                        title="View Certificate"
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>workspace_premium</i>
                        Certificate
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <ProgressBar
                      viewedPages={progress.viewedPages?.length || 0}
                      totalPages={progress.totalPages}
                      size="md"
                      showLabel={true}
                    />
                  </div>

                  {/* Material Stats */}
                  <div className="learning-material-stats">
                    <div className="learning-material-stat">
                      <i className="material-icons">event</i>
                      <span>Started: {formatDate(progress.startedAt)}</span>
                    </div>
                    
                    {progress.completed && progress.completedAt && (
                      <div className="learning-material-stat">
                        <i className="material-icons">check</i>
                        <span>Completed: {formatDate(progress.completedAt)}</span>
                      </div>
                    )}
                    
                    <div className="learning-material-stat">
                      <i className="material-icons">access_time</i>
                      <span>Time: {getTimeSpent(progress.startedAt, progress.lastViewedAt)}</span>
                    </div>

                    <div className="learning-material-stat">
                      <i className="material-icons">visibility</i>
                      <span>Last viewed: {formatDate(progress.lastViewedAt)}</span>
                    </div>
                  </div>

                  {/* Rating if given */}
                  {userFeedback && (
                    <div className="learning-material-feedback">
                      <div className="feedback-rating-display">
                        <span className="feedback-label-small">Your rating:</span>
                        <div className="stars-display">
                          {[1, 2, 3, 4, 5].map(star => (
                            <i
                              key={star}
                              className="material-icons"
                              style={{
                                fontSize: '18px',
                                color: star <= userFeedback.rating ? '#FFB800' : '#CBD5E1'
                              }}
                            >
                              {star <= userFeedback.rating ? 'star' : 'star_border'}
                            </i>
                          ))}
                        </div>
                      </div>
                      {userFeedback.comment && (
                        <p className="feedback-comment-small">"{userFeedback.comment}"</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Certificate Modal */}
      {certificateData && (
        <Certificate
          certificateData={certificateData}
          onClose={() => setCertificateData(null)}
        />
      )}
    </div>
  );
}
