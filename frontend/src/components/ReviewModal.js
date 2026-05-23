import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Star, Send, Edit } from 'lucide-react';
import apiClient from '@/lib/apiClient';

function ReviewModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMyReview();
    }
  }, [isOpen]);

  const fetchMyReview = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reviews/mine');
      if (response.data) {
        setExistingReview(response.data);
        setRating(response.data.rating);
        setComment(response.data.comment);
      }
    } catch (error) {
      setExistingReview(null);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Please write a longer comment (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    try {
      if (existingReview) {
        await apiClient.put('/reviews', { rating, comment });
        toast.success('Review updated!');
      } else {
        await apiClient.post('/reviews', { rating, comment });
        toast.success('Thank you for your review!');
      }
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to submit review');
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>
              {existingReview ? 'Edit Your Review' : 'Leave a Review'}
            </h2>
            <p style={subTextStyle}>Help other GMs discover Rookie Quest Keeper</p>
          </div>
          <button onClick={onClose} aria-label="Close review modal" style={closeButtonStyle}>
            <X size={20} color="var(--rq-text-primary, #FFFFFF)" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--rq-text-muted, #A0A0A0)' }}>
            Loading...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>How would you rate Rookie Quest Keeper?</label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={starButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.12)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Star
                      size={38}
                      fill={(hoverRating || rating) >= star ? 'var(--rq-accent-primary, #C1121F)' : 'transparent'}
                      color={(hoverRating || rating) >= star ? 'var(--rq-accent-primary, #C1121F)' : 'var(--rq-border-strong, #4A4A4A)'}
                    />
                  </button>
                ))}
              </div>
              <p style={ratingTextStyle(rating)}>
                {rating === 5 && 'Amazing! 🎉'}
                {rating === 4 && 'Great!'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Could be better'}
                {rating === 1 && 'Needs improvement'}
                {rating === 0 && 'Click to rate'}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Tell us about your experience</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="What do you love about Rookie Quest Keeper? How has it helped your campaigns?"
                style={textareaStyle}
              />
              <p style={{ color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '12px', marginTop: '6px' }}>
                {comment.length}/500 characters
              </p>
            </div>

            {rating >= 4 && (
              <div style={featuredNoticeStyle}>
                <p style={{ color: 'var(--rq-text-primary, #FFFFFF)', fontSize: '13px', margin: 0 }}>
                  ⭐ Your review may be featured on our landing page to help other GMs discover Rookie Quest Keeper.
                </p>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={submitButtonStyle}>
              {submitting ? 'Submitting...' : (
                <>
                  {existingReview ? <Edit size={18} /> : <Send size={18} />}
                  {existingReview ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.82)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '20px'
};

const modalStyle = {
  background: 'var(--rq-bg-panel, #242424)',
  border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderRadius: 'var(--rq-radius-md, 6px)',
  padding: '32px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: 'var(--rq-shadow-heavy, 0 10px 28px rgba(0,0,0,0.32))'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  gap: '16px'
};

const titleStyle = {
  color: 'var(--rq-text-primary, #FFFFFF)',
  fontSize: '24px',
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 900,
  margin: '0 0 4px 0'
};

const subTextStyle = { color: 'var(--rq-text-muted, #A0A0A0)', fontSize: '14px', margin: 0 };

const closeButtonStyle = {
  background: 'var(--rq-bg-elevated, #323232)',
  border: '1px solid var(--rq-border-default, #3A3A3A)',
  borderRadius: 'var(--rq-radius-sm, 4px)',
  padding: '8px',
  cursor: 'pointer'
};

const labelStyle = {
  display: 'block',
  color: 'var(--rq-text-secondary, #D6D6D6)',
  marginBottom: '12px',
  fontSize: '14px'
};

const starButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  transition: 'transform 0.15s ease'
};

const ratingTextStyle = (rating) => ({
  textAlign: 'center',
  color: rating >= 4 ? 'var(--rq-accent-hover, #D62839)' : rating >= 2 ? 'var(--rq-warning, #F2A900)' : 'var(--rq-text-muted, #A0A0A0)',
  fontSize: '14px',
  marginTop: '8px',
  fontWeight: 800
});

const textareaStyle = {
  width: '100%',
  minHeight: '120px',
  padding: '14px',
  borderRadius: 'var(--rq-radius-sm, 4px)',
  background: 'var(--rq-bg-input, #1F1F1F)',
  border: '1px solid var(--rq-border-default, #3A3A3A)',
  color: 'var(--rq-text-primary, #FFFFFF)',
  fontSize: '15px',
  resize: 'vertical'
};

const featuredNoticeStyle = {
  background: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  border: '1px solid var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderRadius: 'var(--rq-radius-sm, 4px)',
  padding: '12px 16px',
  marginBottom: '24px'
};

const submitButtonStyle = {
  width: '100%',
  padding: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: 'var(--rq-radius-sm, 4px)'
};

export default ReviewModal;
