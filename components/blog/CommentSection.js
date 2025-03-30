import React, { useState } from 'react';

const CommentSection = ({ slug }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !name.trim()) return;

    setIsSubmitting(true);

    try {
      // This is a placeholder for actual comment submission
      // In a real app, you would send this to your API
      console.log('Submitting comment for:', slug, { name, email, comment: newComment });
      
      // Simulate API response
      setTimeout(() => {
        const fakeComment = {
          id: Date.now(),
          name,
          comment: newComment,
          date: new Date().toISOString(),
          isApproved: false
        };
        
        setComments([...comments, fakeComment]);
        setNewComment('');
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('Error submitting comment:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="comments-section">
      <h3 className="section-title">Comments</h3>
      
      {comments.length > 0 ? (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <span className="commenter-name">{comment.name}</span>
                <span className="comment-date">
                  {new Date(comment.date).toLocaleDateString()}
                </span>
              </div>
              <p className="comment-content">{comment.comment}</p>
              {!comment.isApproved && (
                <div className="pending-badge">Pending approval</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
      )}

      <div className="comment-form-container">
        <h4 className="form-title">Leave a comment</h4>
        <form onSubmit={handleSubmit} className="comment-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email (optional)</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (not published)"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="comment">Comment *</label>
            <textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
              rows={4}
              placeholder="Share your thoughts..."
            />
          </div>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Post Comment'}
          </button>
          <p className="form-note">
            Comments are moderated and will appear after approval.
          </p>
        </form>
      </div>

      <style jsx>{`
        .comments-section {
          margin: 3rem 0;
          padding: 1.5rem;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .section-title {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          font-weight: 600;
        }
        .no-comments {
          color: #666;
          font-style: italic;
        }
        .comments-list {
          margin-bottom: 2rem;
        }
        .comment {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .comment-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .commenter-name {
          font-weight: 600;
        }
        .comment-date {
          color: #777;
          font-size: 0.875rem;
        }
        .comment-content {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .pending-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #ffebcd;
          color: #856404;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .comment-form-container {
          margin-top: 2rem;
        }
        .form-title {
          margin-bottom: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group {
          flex: 1;
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 1rem;
        }
        textarea {
          resize: vertical;
        }
        .submit-button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .submit-button:hover:not(:disabled) {
          background: #0060df;
        }
        .submit-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .form-note {
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #666;
        }
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>
    </section>
  );
};

export default CommentSection; 