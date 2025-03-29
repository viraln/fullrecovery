import React from 'react';
import Image from 'next/image';

/**
 * Displays author information at the end of an article
 */
export default function AuthorBox({ author }) {
  // Default author information if none provided
  const defaultAuthor = {
    name: 'Editorial Team',
    bio: 'Our team of experts and enthusiasts dedicated to providing the latest insights and analysis.',
    avatar: '/images/default-avatar.jpg',
    twitter: null,
    linkedin: null
  };
  
  // Use provided author or default
  const { name, bio, avatar, twitter, linkedin } = author || defaultAuthor;

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Author Avatar */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
          <Image 
            src={avatar || '/images/default-avatar.jpg'} 
            alt={name}
            layout="fill"
            objectFit="cover"
            className="rounded-full"
          />
        </div>
        
        {/* Author Info */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-gray-600 mt-1 text-sm">{bio}</p>
          
          {/* Social Links */}
          {(twitter || linkedin) && (
            <div className="mt-3 flex justify-center sm:justify-start space-x-3">
              {twitter && (
                <a 
                  href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  Twitter
                </a>
              )}
              
              {linkedin && (
                <a 
                  href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-800"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 