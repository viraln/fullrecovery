import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { getRelativeTime } from '../../utils/dateUtils'

const defaultImages = [
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&fit=crop&w=800&q=60'
];

export default function NewArrivalsSection({ posts, hasMore, isLoadingMore, onLoadMore, totalNewPosts, displayCount, className }) {
  // Ensure posts are sorted by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return (
    <div className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-6 mb-4 sm:mb-8 ${className || ''}`}>
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xl sm:text-2xl">✨</span>
          <h2 className="text-base sm:text-xl font-bold text-gray-900">New Arrivals</h2>
          <span className="animate-pulse flex h-2 w-2 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 bg-green-500"></span>
          </span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-[10px] sm:text-sm text-gray-500 hidden sm:inline post-count">
            Showing {sortedPosts.length} of {totalNewPosts} articles
          </span>
          <Link href="/topics/latest" className="text-green-600 text-[10px] sm:text-sm hover:text-green-700 flex items-center">
            View all
            <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {sortedPosts.filter(post => post && post.slug).map((post, index) => (
          <NewArrivalCard key={`${post.slug}-${index}`} post={post} />
        ))}
      </div>
    </div>
  )
}

function NewArrivalCard({ post }) {
  const [relativeTime, setRelativeTime] = useState('')

  useEffect(() => {
    // Update relative time initially and every minute
    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(post.date))
    }
    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 60000)
    return () => clearInterval(interval)
  }, [post.date])

  return (
    <Link 
      href={`/posts/${post.slug}`}
      className="group relative bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative h-40 sm:h-48">
        <Image
          src={post.image || defaultImages[0]}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute top-2 right-2">
          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-500 text-white text-[10px] sm:text-xs rounded-full font-medium">
            New
          </span>
        </div>
      </div>
      <div className="p-2.5 sm:p-4">
        <h3 className="font-semibold text-xs sm:text-base text-gray-900 group-hover:text-green-600 transition-colors duration-200 line-clamp-2 mb-2 sm:mb-3">
          {post.title}
        </h3>
        <div className="flex items-center justify-between text-[10px] sm:text-sm">
          <span className="text-gray-500 flex items-center">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {relativeTime}
          </span>
          <span className="text-green-600 font-medium group-hover:text-green-700 text-[10px] sm:text-sm">Read →</span>
        </div>
      </div>
    </Link>
  )
} 