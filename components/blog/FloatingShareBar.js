import React from 'react';
import { FaTwitter, FaFacebook, FaLinkedin, FaLink } from 'react-icons/fa';

/**
 * A floating social share bar for articles
 */
export default function FloatingShareBar({ visible, url, title, onLinkCopy }) {
  if (!visible) return null;
  
  // Get the URL and title for sharing
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out this article';
  
  // Function to copy the current URL to clipboard
  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (onLinkCopy) onLinkCopy();
        else alert('Link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy link: ', err);
      });
    }
  };

  return (
    <div className="fixed left-4 top-1/3 hidden lg:flex flex-col space-y-3 bg-white shadow-lg rounded-full py-3 px-3 z-10 animate-fade-in">
      {/* Twitter */}
      <a 
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-400 transition-colors p-2"
        aria-label="Share on Twitter"
      >
        <FaTwitter className="w-5 h-5" />
      </a>
      
      {/* Facebook */}
      <a 
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-600 transition-colors p-2"
        aria-label="Share on Facebook"
      >
        <FaFacebook className="w-5 h-5" />
      </a>
      
      {/* LinkedIn */}
      <a 
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-700 transition-colors p-2"
        aria-label="Share on LinkedIn"
      >
        <FaLinkedin className="w-5 h-5" />
      </a>
      
      {/* Copy Link */}
      <button
        onClick={copyToClipboard}
        className="text-gray-600 hover:text-green-600 transition-colors p-2"
        aria-label="Copy link to clipboard"
      >
        <FaLink className="w-5 h-5" />
      </button>
    </div>
  );
} 