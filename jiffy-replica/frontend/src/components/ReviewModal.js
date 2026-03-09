'use client';

import { useState } from 'react';
import { X, Star, Loader2, Camera } from 'lucide-react';
import { reviewsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ReviewModal({ booking, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewsAPI.create({
        booking_id: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success('Review submitted successfully!');
      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit review';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Leave a Review</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5">
          <p className="text-sm font-semibold text-gray-900">{booking.service_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.scheduled_date
              ? new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How was your experience?
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= displayRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {displayRating > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {ratingLabels[displayRating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tell us more (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the service? Was the pro on time? Would you recommend them?"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {comment.length}/1000
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="px-5 py-2 text-sm font-semibold bg-[#0E7480] text-white rounded-lg hover:bg-[#2570d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
