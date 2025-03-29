import React from 'react';
import { 
  FaTwitter, 
  FaFacebook, 
  FaLinkedin, 
  FaReddit,
  FaLink
} from 'react-icons/fa';

/**
 * Social sharing component for blog posts
 */
export default function SocialShare({ url, title }) {
  // Use window.location.href if no URL is provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out this article';
  
  // Function to copy the current URL to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };

  return (
    <div className="flex space-x-2 items-center">
      {/* Twitter */}
      <a 
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-400 transition-colors"
        aria-label="Share on Twitter"
      >
        <FaTwitter className="w-5 h-5" />
      </a>
      
      {/* Facebook */}
      <a 
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-600 transition-colors"
        aria-label="Share on Facebook"
      >
        <FaFacebook className="w-5 h-5" />
      </a>
      
      {/* LinkedIn */}
      <a 
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-blue-700 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <FaLinkedin className="w-5 h-5" />
      </a>
      
      {/* Reddit */}
      <a 
        href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-orange-600 transition-colors"
        aria-label="Share on Reddit"
      >
        <FaReddit className="w-5 h-5" />
      </a>
      
      {/* Copy Link */}
      <button
        onClick={copyToClipboard}
        className="text-gray-600 hover:text-green-600 transition-colors"
        aria-label="Copy link to clipboard"
      >
        <FaLink className="w-5 h-5" />
      </button>
    </div>
  );
} 