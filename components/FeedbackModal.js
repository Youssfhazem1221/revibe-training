'use client';

import { useState, useEffect } from 'react';
import { submitFeedback, getUserMaterialFeedback } from '@/lib/feedback';
import { useAuth } from '@/contexts/AuthContext';

/**
 * FeedbackModal - Appears when user completes a course
 * Allows rating (1-5 stars) and optional comment
 */
export default function FeedbackModal({ materialId, materialName, isOpen, onClose, onSubmitSuccess }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Load existing feedback if any
  useEffect(() => {
    if (isOpen && user && materialId) {
      getUserMaterialFeedback(user.uid, materialId)
        .then(feedback => {
          if (feedback) {
            setExistingFeedback(feedback);
            setRating(feedback.rating);
            setComment(feedback.comment || '');
          }
        })
        .catch(err => console.error('Error loading existing feedback:', err));
    }
  }, [isOpen, user, materialId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        if (!existingFeedback) {
          setRating(0);
          setComment('');
        }
        setError('');
        setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen, existingFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await submitFeedback(
        user.uid,
        materialId,
        rating,
        comment,
        {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        },
        materialName
      );

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={handleSkip}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <div className="feedback-modal-icon">
            <i className="material-icons">celebration</i>
          </div>
          <h2 className="feedback-modal-title">
            {existingFeedback ? 'Update Your Feedback' : 'Congratulations! 🎉'}
          </h2>
          <p className="feedback-modal-subtitle">
            {existingFeedback 
              ? `Update your rating and feedback for "${materialName}"`
              : `You've completed "${materialName}". Help us improve by sharing your experience!`
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="feedback-modal-form">
          {/* Star Rating */}
          <div className="feedback-rating-section">
            <label className="feedback-label">How would you rate this material?</label>
            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`feedback-star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <i className="material-icons">
                    {star <= (hoverRating || rating) ? 'star' : 'star_border'}
                  </i>
                </button>
              ))}
            </div>
            <div className="feedback-rating-text">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </div>
          </div>

          {/* Comment */}
          <div className="feedback-comment-section">
            <label htmlFor="feedback-comment" className="feedback-label">
              Share your thoughts (optional)
            </label>
            <textarea
              id="feedback-comment"
              className="feedback-textarea"
              placeholder="What did you like? What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="feedback-char-count">
              {comment.length}/500 characters
            </div>
          </div>

          {error && (
            <div className="feedback-error">
              <i className="material-icons">error</i>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="feedback-modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              {existingFeedback ? 'Cancel' : 'Skip for now'}
            </button>
            <button
              type="submit"
              className="btn btn-gradient"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <>
                  <i className="material-icons animate-spin" style={{ fontSize: '18px' }}>refresh</i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="material-icons" style={{ fontSize: '18px' }}>send</i>
                  {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Close button */}
        <button
          type="button"
          className="feedback-modal-close"
          onClick={handleSkip}
          aria-label="Close"
        >
          <i className="material-icons">close</i>
        </button>
      </div>

      <style jsx>{`
        .feedback-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .feedback-modal {
          background: var(--bg-white);
          border-radius: 24px;
          padding: 40px;
          max-width: 560px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .feedback-modal-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .feedback-modal-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: var(--gradient-hero);
          border-radius: 50%;
          margin-bottom: 16px;
        }

        .feedback-modal-icon i {
          font-size: 40px;
          color: white;
        }

        .feedback-modal-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
          font-family: 'Poppins', sans-serif;
        }

        .feedback-modal-subtitle {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .feedback-modal-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .feedback-rating-section,
        .feedback-comment-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feedback-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .feedback-stars {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .feedback-star {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.2s ease;
        }

        .feedback-star:hover {
          transform: scale(1.2);
        }

        .feedback-star i {
          font-size: 48px;
          color: #CBD5E1;
          transition: color 0.2s ease;
        }

        .feedback-star.active i {
          color: #FFB800;
        }

        .feedback-rating-text {
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-pink);
          min-height: 21px;
        }

        .feedback-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s ease;
        }

        .feedback-textarea:focus {
          outline: none;
          border-color: var(--accent-pink);
          box-shadow: 0 0 0 3px rgba(255, 46, 99, 0.1);
        }

        .feedback-char-count {
          font-size: 12px;
          color: var(--text-muted);
          text-align: right;
        }

        .feedback-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #FEE2E2;
          border-radius: 8px;
          color: #DC2626;
          font-size: 14px;
        }

        .feedback-error i {
          font-size: 20px;
        }

        .feedback-modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .feedback-modal-actions .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .feedback-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .feedback-modal-close:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .feedback-modal-close i {
          font-size: 24px;
          color: var(--text-muted);
        }

        @media (max-width: 640px) {
          .feedback-modal {
            padding: 24px;
            border-radius: 16px;
          }

          .feedback-modal-title {
            font-size: 24px;
          }

          .feedback-star i {
            font-size: 40px;
          }

          .feedback-modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
