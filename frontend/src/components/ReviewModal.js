import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Star, Send, Edit } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

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
      const response = await axios.get(`${API}/reviews/mine`);
      if (response.data) {
        setExistingReview(response.data);
        setRating(response.data.rating);
        setComment(response.data.comment);
      }
    } catch (error) {
      // No existing review
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
        await axios.put(`${API}/reviews`, { rating, comment });
        toast.success('Review updated!');
      } else {
        await axios.post(`${API}/reviews`, { rating, comment });
        toast.success('Thank you for your review!');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0a2e 0%, #1e1e4a 100%)',
        border: '2px solid #4a7dff',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '24px', 
              fontFamily: "Eros Book, sans-serif",
              fontWeight: '400',
              marginBottom: '4px'
            }}>
              {existingReview ? 'Edit Your Review' : 'Leave a Review'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Help other GMs discover Rookie Quest Keeper
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            <X size={20} color="#fff" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Star Rating */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                color: '#94a3b8', 
                marginBottom: '12px',
                fontSize: '14px'
              }}>
                How would you rate Rookie Quest Keeper?
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Star 
                      size={40} 
                      fill={(hoverRating || rating) >= star ? "#eab308" : "transparent"}
                      color={(hoverRating || rating) >= star ? "#eab308" : "#475569"}
                    />
                  </button>
                ))}
              </div>
              <p style={{ 
                textAlign: 'center', 
                color: rating >= 4 ? '#22c55e' : rating >= 2 ? '#f59e0b' : '#94a3b8',
                fontSize: '14px',
                marginTop: '8px',
                fontWeight: '400'
              }}>
                {rating === 5 && "Amazing! 🎉"}
                {rating === 4 && "Great!"}
                {rating === 3 && "Good"}
                {rating === 2 && "Could be better"}
                {rating === 1 && "Needs improvement"}
                {rating === 0 && "Click to rate"}
              </p>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                color: '#94a3b8', 
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                Tell us about your experience
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What do you love about Rookie Quest Keeper? How has it helped your campaigns?"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '2px solid #374151',
                  color: '#fff',
                  fontSize: '15px',
                  resize: 'vertical'
                }}
              />
              <p style={{ 
                color: '#64748b', 
                fontSize: '12px', 
                marginTop: '6px' 
              }}>
                {comment.length}/500 characters
              </p>
            </div>

            {/* Info about featuring */}
            {rating >= 4 && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '24px'
              }}>
                <p style={{ color: '#22c55e', fontSize: '13px' }}>
                  ⭐ Your review may be featured on our landing page to help other GMs discover Rookie Quest Keeper!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
              style={{ 
                width: '100%', 
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
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

export default ReviewModal;
