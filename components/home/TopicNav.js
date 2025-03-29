import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { topicCategories } from '../../data/topics'

// Create a flattened array of main categories and most popular subtopics
const mainCategories = [
  { id: 'featured', name: 'Featured', icon: '✨', isSpecial: true },
  { id: 'trending', name: 'Trending', icon: '🔥', isSpecial: true },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'ai', name: 'AI & ML', icon: '🤖' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'climate', name: 'Climate', icon: '🌍' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'innovation', name: 'Innovation', icon: '💡' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
]

// Predefined subcategories for main topics
const subTopics = {
  'tech': [
    { id: 'web-development', name: 'Web Dev', icon: '🌐' },
    { id: 'mobile', name: 'Mobile', icon: '📱' },
    { id: 'cloud', name: 'Cloud', icon: '☁️' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'data-science', name: 'Data Science', icon: '📊' },
  ],
  'ai': [
    { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
    { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
    { id: 'nlp', name: 'NLP', icon: '💬' },
    { id: 'computer-vision', name: 'Computer Vision', icon: '👁️' },
    { id: 'ai-ethics', name: 'AI Ethics', icon: '⚖️' },
  ],
  'science': [
    { id: 'physics', name: 'Physics', icon: '⚛️' },
    { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
    { id: 'biology', name: 'Biology', icon: '🧬' },
    { id: 'quantum', name: 'Quantum', icon: '🔄' },
    { id: 'medicine', name: 'Medicine', icon: '🩺' },
  ],
  'climate': [
    { id: 'renewable-energy', name: 'Renewable Energy', icon: '🌞' },
    { id: 'sustainability', name: 'Sustainability', icon: '♻️' },
    { id: 'climate-action', name: 'Climate Action', icon: '🌊' },
    { id: 'conservation', name: 'Conservation', icon: '🌱' },
  ],
  'business': [
    { id: 'startups', name: 'Startups', icon: '🚀' },
    { id: 'cryptocurrency', name: 'Crypto', icon: '₿' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'leadership', name: 'Leadership', icon: '👔' },
  ],
  'innovation': [
    { id: 'metaverse', name: 'Metaverse', icon: '🌐' },
    { id: 'web3', name: 'Web3', icon: '🔗' },
    { id: 'biotechnology', name: 'Biotech', icon: '🧪' },
    { id: 'space-tech', name: 'Space Tech', icon: '🚀' },
  ],
  'gaming': [
    { id: 'console-gaming', name: 'Console', icon: '🎮' },
    { id: 'pc-gaming', name: 'PC Gaming', icon: '🖥️' },
    { id: 'mobile-gaming', name: 'Mobile Gaming', icon: '📱' },
    { id: 'game-development', name: 'Game Dev', icon: '⚙️' },
  ],
  'lifestyle': [
    { id: 'health', name: 'Health', icon: '💪' },
    { id: 'food', name: 'Food', icon: '🍲' },
    { id: 'travel', name: 'Travel', icon: '✈️' },
    { id: 'fashion', name: 'Fashion', icon: '👕' },
  ],
}

export default function TopicNav({ className, onCategorySelect, selectedTopics = [] }) {
  const router = useRouter()
  const [scrollPosition, setScrollPosition] = useState(0)
  const navRef = useRef(null)

  // Handle scroll position for horizontal nav
  const handleScroll = (direction) => {
    const nav = navRef.current
    if (!nav) return
    
    const scrollAmount = 200 // pixels to scroll each time
    const currentScroll = nav.scrollLeft
    const maxScroll = nav.scrollWidth - nav.clientWidth
    
    if (direction === 'left') {
      nav.scrollTo({
        left: Math.max(0, currentScroll - scrollAmount),
        behavior: 'smooth'
      })
    } else {
      nav.scrollTo({
        left: Math.min(maxScroll, currentScroll + scrollAmount),
        behavior: 'smooth'
      })
    }
    
    // Update scroll position for UI updates
    setScrollPosition(nav.scrollLeft)
  }

  // Update scroll indicators when scrolling happens
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    
    const updateScrollPosition = () => {
      setScrollPosition(nav.scrollLeft)
    }
    
    nav.addEventListener('scroll', updateScrollPosition)
    return () => nav.removeEventListener('scroll', updateScrollPosition)
  }, [])

  // Handle category click - toggle selection
  const handleCategoryClick = (category) => {
    // If onCategorySelect prop is provided, use it for toggle behavior
    if (onCategorySelect) {
      // If the category is already selected, toggle it off
      if (selectedTopics.includes(category.id)) {
        // Tell parent to remove this topic
        const updatedTopics = selectedTopics.filter(id => id !== category.id)
        onCategorySelect({ 
          type: 'toggle',
          id: category.id,
          selected: false,
          updatedTopics
        })
      } else {
        // Otherwise add this category to selected topics
        const updatedTopics = [...selectedTopics, category.id]
        onCategorySelect({ 
          type: 'toggle',
          id: category.id,
          selected: true,
          updatedTopics
        })
      }
    } else if (!category.isSpecial) {
      // If no onCategorySelect provided, use default navigation behavior
      router.push(`/topics/${category.id}`)
    }
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Main categories navigation */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-2">
        <div className="relative">
          {/* Left scroll indicator */}
          {scrollPosition > 5 && (
            <button 
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md z-10 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Right scroll indicator */}
          <button 
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md z-10 hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Main categories */}
          <div 
            ref={navRef}
            className="flex overflow-x-auto scrollbar-hide pb-1 px-1 relative"
            style={{ scrollBehavior: 'smooth' }}
          >
            {mainCategories.map((category) => (
              <TopicButton 
                key={category.id}
                category={category}
                active={selectedTopics.includes(category.id)}
                onClick={() => handleCategoryClick(category)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TopicButton({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center whitespace-nowrap rounded-lg px-4 py-2 mr-2 
        transition-all duration-200 ease-in-out
        ${active 
          ? 'bg-indigo-600 text-white font-medium shadow-md transform scale-105' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
      `}
      aria-pressed={active}
    >
      <span className="text-base mr-1.5">{category.icon}</span>
      <span className="text-sm">{category.name}</span>
      
      {active && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}
