import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function WatchSection({ posts = [] }) {
  // If no posts are provided, use default placeholder data
  const videos = posts.length > 0 ? posts.slice(0, 4) : [
    {
      id: 1,
      title: 'Getting Started with Next.js 14',
      thumbnail: 'https://i.ytimg.com/vi/uQeidE2LA1s/mqdefault.jpg',
      duration: '12:34',
      author: 'TechExplorer',
      views: '24K',
      date: '2023-11-15'
    },
    {
      id: 2,
      title: 'ReactJS vs Vue: Which is Better in 2024?',
      thumbnail: 'https://i.ytimg.com/vi/x4HUj9BY63c/mqdefault.jpg',
      duration: '18:22',
      author: 'CodeMaster',
      views: '16K',
      date: '2023-12-01'
    },
    {
      id: 3,
      title: 'Advanced TypeScript Patterns for React',
      thumbnail: 'https://i.ytimg.com/vi/7o1P-SH3A1Y/mqdefault.jpg',
      duration: '22:15',
      author: 'DevInsights',
      views: '9.8K',
      date: '2023-12-10'
    },
    {
      id: 4,
      title: 'Building AI-Powered Apps with TensorFlow.js',
      thumbnail: 'https://i.ytimg.com/vi/EoYfa6mYOG4/mqdefault.jpg',
      duration: '32:47',
      author: 'AICodeLab',
      views: '18K',
      date: '2023-12-18'
    }
  ]

  return (
    <section className="bg-white rounded-xl p-4 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <span className="text-xl sm:text-2xl mr-2">📺</span>
          <h2 className="text-base sm:text-xl font-bold text-gray-900">Watch & Learn</h2>
        </div>
        <Link 
          href="/videos" 
          className="text-indigo-600 text-sm hover:text-indigo-800 flex items-center"
        >
          View all
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {videos.map(video => (
          <div key={video.id} className="group">
            <Link href={`/videos/${video.id}`} className="block">
              <div className="relative rounded-lg overflow-hidden aspect-video mb-2 group-hover:shadow-md transition-shadow">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {video.duration}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-12 w-12 rounded-full bg-indigo-600/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {video.title}
              </h3>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>{video.author}</span>
                <div className="flex items-center">
                  <span>{video.views} views</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
