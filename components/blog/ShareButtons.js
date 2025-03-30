import React from 'react';
import { FaTwitter, FaFacebook, FaLinkedin, FaLink } from 'react-icons/fa';

const ShareButtons = ({ url, title, description }) => {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out this article';
  const shareDescription = description || 'I found this interesting article';

  const shareData = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
  };

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          alert('Link copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy link: ', err);
        });
    }
  };

  return (
    <div className="share-buttons-container">
      <div className="share-title">Share this article</div>
      <div className="share-buttons">
        <a 
          href={shareData.twitter} 
          target="_blank" 
          rel="noopener noreferrer"
          className="share-button twitter"
          aria-label="Share on Twitter"
        >
          <FaTwitter /> Twitter
        </a>
        <a 
          href={shareData.facebook} 
          target="_blank" 
          rel="noopener noreferrer"
          className="share-button facebook"
          aria-label="Share on Facebook"
        >
          <FaFacebook /> Facebook
        </a>
        <a 
          href={shareData.linkedin} 
          target="_blank" 
          rel="noopener noreferrer"
          className="share-button linkedin"
          aria-label="Share on LinkedIn"
        >
          <FaLinkedin /> LinkedIn
        </a>
        <button 
          onClick={copyToClipboard}
          className="share-button copy"
          aria-label="Copy link"
        >
          <FaLink /> Copy Link
        </button>
      </div>
      <style jsx>{`
        .share-buttons-container {
          margin: 2rem 0;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .share-title {
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .share-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .share-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .share-button:hover {
          opacity: 0.85;
        }
        .twitter {
          background-color: #1DA1F2;
        }
        .facebook {
          background-color: #4267B2;
        }
        .linkedin {
          background-color: #0077B5;
        }
        .copy {
          background-color: #6c757d;
          border: none;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ShareButtons; 