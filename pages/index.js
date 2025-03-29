import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Header from '../components/Header'
import TopicNav from '../components/home/TopicNav'
// import NewsletterSection from '../components/home/NewsletterSection'
import CommunitySection from '../components/home/CommunitySection'
// import WatchSection from '../components/home/WatchSection'
import NewArrivalsSection from '../components/home/NewArrivalsSection'
import InfiniteArticles from '../components/home/InfiniteArticles'
import { HotTakeSection, DailyDigestSection, MindblownSection, QuickBitesSection, TrendingDebatesSection, TechInsightsSection, AIFrontierSection, NicheTopicsSection, KnowledgeHubSection } from '../components/home/ViralSections'
import Footer from '../components/layout/Footer'
import CompactCard from '../components/CompactCard'
import { getArticleBySlug } from '../utils/articleUtils'
import { topicCategories } from '../data/topics'

// Subtopics data for each main topic - used for filtering
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
};

// Debug logging utility to prevent excessive console logs
const debugLog = (message, ...args) => {
  // Only log in development and limit frequency
  if (process.env.NODE_ENV !== 'development') return;
  
  // Use session storage to track when we last logged this message
  if (typeof window !== 'undefined') {
    const now = Date.now();
    const lastLogTime = parseInt(sessionStorage.getItem(`lastLog_${message}`) || '0');
    
    // Only log if more than 5 seconds have passed since last time
    if (now - lastLogTime > 5000) {
      console.log(message, ...args);
      sessionStorage.setItem(`lastLog_${message}`, now.toString());
    }
  }
};

// CategoryArticlesSection - Displays posts for a specific category
function CategoryArticlesSection({ posts, category, icon, description, limit = 6 }) {
  // Get posts that belong to this category
  const categoryPosts = posts.filter(post => {
    const categoryLower = category.toLowerCase();
    
    // Check in traditional topics/category fields
    if (post.topics?.includes(categoryLower) || 
        post.category?.toLowerCase() === categoryLower) {
      return true;
    }
    
    // Check in the new categories structure
    if (post.categories && Array.isArray(post.categories)) {
      // Extract category names from objects if needed
      const categoryNames = post.categories.map(cat => {
        return typeof cat === 'string' ? cat.toLowerCase() : 
               (cat.name ? cat.name.toLowerCase() : '');
      }).filter(Boolean);
      
      // Check if any category matches
      return categoryNames.includes(categoryLower) || 
             categoryNames.some(name => name.includes(categoryLower));
    }
    
    return false;
  })
  // Sort by date (newest first)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  // Then take the first 'limit' posts
  .slice(0, limit);

  if (categoryPosts.length === 0) return null;

  return (
    <section className="mb-12 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <span className="text-3xl mr-3">{icon}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h2>
        </div>
        <Link href={`/topics/${category.toLowerCase()}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
          View All 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      
      {description && (
        <p className="text-gray-600 mb-6 -mt-3">{description}</p>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryPosts.map(post => (
          <CompactCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}

// UserPreferencesSection - Allows users to set topic preferences
function UserPreferencesSection({ availableTopics, selectedTopics, onToggleTopic }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
      <h2 className="text-lg font-semibold mb-3">Customize Your Feed</h2>
      <p className="text-sm text-gray-600 mb-4">Select topics you're interested in to personalize your homepage</p>
      
      <div className="flex flex-wrap gap-3">
        {availableTopics.map(topic => (
          <button
            key={topic.id}
            onClick={() => onToggleTopic(topic.id)}
            className={`
              inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200 ease-in-out
              ${selectedTopics.includes(topic.id)
                ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
            aria-pressed={selectedTopics.includes(topic.id)}
            role="checkbox"
          >
            <span className="text-base mr-2">{topic.icon}</span>
            {topic.name}
            {selectedTopics.includes(topic.id) && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// DebugCategoriesInfo - A diagnostic component to show category information while debugging
function DebugCategoriesInfo({ posts, selectedTopics, expandedTopics = [], filteredPostsCount }) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="bg-gray-100 rounded-xl p-4 mb-8 border border-gray-300">
      <h3 className="text-lg font-semibold mb-3">Debug Information</h3>
      <div className="text-xs font-mono overflow-x-auto">
        <p>Selected Topics: {selectedTopics.join(', ') || 'None'}</p>
        <p>Expanded Topics: {expandedTopics.join(', ') || 'None'}</p>
        <p>Total Posts: {posts.length}</p>
        <p>Filtered Posts Count: {filteredPostsCount}</p>
        <p>Posts with categories: {posts.filter(p => p.categories && p.categories.length > 0).length}</p>
        
        <div className="mt-3">
          <p className="font-semibold">First 3 posts categories:</p>
          <div className="pl-2 mt-1">
            {posts.slice(0, 3).map((post, idx) => (
              <div key={idx} className="mb-2 pb-2 border-b border-gray-200">
                <p><b>"{post.title?.substring(0, 40)}..."</b></p>
                <p>Categories: {JSON.stringify(post.categories || [])}</p>
                <p>Topics: {JSON.stringify(post.topics || [])}</p>
                <p>Category: {post.category || 'none'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get subtopics for a category
function getSubtopicsForCategory(category) {
  const subtopicsMap = {
    'tech': [
      { id: 'web-development', name: 'Web Development', icon: '🌐' },
      { id: 'mobile', name: 'Mobile', icon: '📱' },
      { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
      { id: 'security', name: 'Cybersecurity', icon: '🔒' },
    ],
    'ai': [
      { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
      { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
      { id: 'nlp', name: 'NLP', icon: '💬' },
    ],
    'science': [
      { id: 'physics', name: 'Physics', icon: '⚛️' },
      { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
      { id: 'biology', name: 'Biology', icon: '🧬' },
    ],
  };
  
  return subtopicsMap[category.toLowerCase()] || [];
}

// Define available topics for the preferences selector
const availableTopics = [
  { id: 'featured', name: 'Featured', icon: '✨' },
  { id: 'trending', name: 'Trending', icon: '🔥' },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'ai', name: 'AI & ML', icon: '🤖' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'climate', name: 'Climate', icon: '🌍' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'innovation', name: 'Innovation', icon: '💡' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
];

export default function Home({ posts: serverPosts, hasMore, totalPosts }) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [posts, setPosts] = useState(serverPosts)
  const [isLoadingMoreNew, setIsLoadingMoreNew] = useState(false)
  const [newArrivalsPage, setNewArrivalsPage] = useState(1)
  const [infinitePosts, setInfinitePosts] = useState([])
  const [isLoadingInfinite, setIsLoadingInfinite] = useState(false)
  const [infinitePage, setInfinitePage] = useState(1)
  const [hasMorePosts, setHasMorePosts] = useState(hasMore)
  const [isClientSideReady, setIsClientSideReady] = useState(false)
  
  // User preferences state
  const [selectedTopics, setSelectedTopics] = useState([])
  const [showPreferences, setShowPreferences] = useState(false)
  const [filteredPostsCount, setFilteredPostsCount] = useState(0)
  const [expandedTopics, setExpandedTopics] = useState([]) // Track expanded topic families for better filtering

  // Load preferences from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPreferences = localStorage.getItem('userTopicPreferences')
        if (savedPreferences) {
          setSelectedTopics(JSON.parse(savedPreferences))
        }
      } catch (error) {
        console.error('Error loading preferences from localStorage:', error)
      }
    }
  }, [])

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTopics.length > 0) {
      try {
        localStorage.setItem('userTopicPreferences', JSON.stringify(selectedTopics))
      } catch (error) {
        console.error('Error saving preferences to localStorage:', error)
      }
    }
  }, [selectedTopics])

  // Handle topic selection from TopicNav or from preferences
  const handleToggleTopic = useCallback((topicData) => {
    if (typeof topicData === 'string') {
      // Legacy format - just a topic ID string from UserPreferencesSection
      setSelectedTopics(prev => {
        if (prev.includes(topicData)) {
          return prev.filter(id => id !== topicData)
        } else {
          return [...prev, topicData]
        }
      })
    } else if (typeof topicData === 'object') {
      // New enhanced format from TopicNav with more info
      if (topicData.type === 'toggle') {
        setSelectedTopics(topicData.updatedTopics)
      } else if (topicData.id) {
        // Backward compatibility with the old format
        setSelectedTopics(prev => {
          if (prev.includes(topicData.id)) {
            return prev.filter(id => id !== topicData.id)
          } else {
            return [...prev, topicData.id]
          }
        })
      }
    }
  }, [])

  // Get related topics for a given topic
  const getRelatedTopics = useCallback((topicId) => {
    // Define related topics mapping
    const relatedTopicsMap = {
      'tech': ['ai', 'innovation'],
      'ai': ['tech', 'science', 'innovation'],
      'science': ['ai', 'climate'],
      'climate': ['science', 'innovation'],
      'business': ['innovation', 'tech'],
      'innovation': ['tech', 'ai', 'business'],
      'gaming': ['tech', 'lifestyle'],
      'lifestyle': ['gaming', 'business']
    }
    
    return relatedTopicsMap[topicId] || []
  }, [])

  // Expand topics to include related ones if we don't have enough content
  useEffect(() => {
    const expandTopics = () => {
      if (selectedTopics.length === 0 || filteredPostsCount >= 100) return
      
      // Start with direct subtopics of selected topics
      let newExpandedTopics = []
      selectedTopics.forEach(topic => {
        // Add subtopics
        if (subTopics[topic]) {
          const subtopicIds = subTopics[topic].map(sub => sub.id)
          newExpandedTopics = [...newExpandedTopics, ...subtopicIds]
        }
      })
      
      // If we still need more content, add related topics
      if (filteredPostsCount < 80) {
        selectedTopics.forEach(topic => {
          const relatedTopics = getRelatedTopics(topic)
          newExpandedTopics = [...newExpandedTopics, ...relatedTopics]
        })
      }
      
      // Filter out already selected topics
      newExpandedTopics = newExpandedTopics.filter(t => !selectedTopics.includes(t))
      setExpandedTopics(newExpandedTopics)
    }
    
    expandTopics()
  }, [selectedTopics, filteredPostsCount, getRelatedTopics])

  // Filter posts based on user preferences if any are selected
  const filteredPosts = useMemo(() => {
    // Always sort posts by date, newest first, before any filtering
    const sortedPosts = [...posts].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    if (selectedTopics.length === 0) {
      return sortedPosts; // Show all posts sorted by date if no preferences selected
    }

    // Combine direct selected topics and expanded topics for better content coverage
    const allTopicsToConsider = [...selectedTopics, ...expandedTopics]
    
    const filtered = sortedPosts.filter(post => {
      // Handle the new categories structure which is an array of objects
      const postCategories = post.categories || [];
      
      // Extract all category names to an array for easier filtering
      const categoryNames = postCategories.map(cat => {
        return typeof cat === 'string' ? cat.toLowerCase() : 
               (cat.name ? cat.name.toLowerCase() : '');
      }).filter(Boolean);
      
      // Get all topics and subtopics from the post
      const postTopics = post.topics?.map(t => t.toLowerCase()) || [];
      const postSubtopics = post.subtopics?.map(t => t.toLowerCase()) || [];
      const postCategory = post.category?.toLowerCase() || '';
      
      // First check selected topics with higher priority
      const matchesSelectedTopics = selectedTopics.some(topic => {
        const topicLower = topic.toLowerCase();
        
        // Direct matches with topic name
        if (postTopics.includes(topicLower) || 
            postCategory === topicLower || 
            categoryNames.includes(topicLower) ||
            categoryNames.some(catName => catName.includes(topicLower))) {
          return true;
        }
        
        // Match subtopics for this topic from the topics.js data
        // This allows filtering to include all subtopics when a main topic is selected
        const topicSubtopics = subTopics[topic]?.map(sub => sub.id.toLowerCase()) || [];
        if (topicSubtopics.some(subTopic => postSubtopics.includes(subTopic))) {
          return true;
        }
        
        // Special cases for featured/trending
        if (topic === 'featured' && post.metadata?.featured) return true;
        if (topic === 'trending' && post.metadata?.trending) return true;
        
        return false;
      });
      
      // If matches directly selected topics, include it
      if (matchesSelectedTopics) return true;
      
      // If we have expanded topics (for content fullness) and need more content, check those as well
      // but with lower priority
      if (expandedTopics.length > 0) {
        return expandedTopics.some(topic => {
          const topicLower = topic.toLowerCase();
          
          // Same matching logic but for expanded topics
          if (postTopics.includes(topicLower) || 
              postCategory === topicLower || 
              categoryNames.includes(topicLower) ||
              categoryNames.some(catName => catName.includes(topicLower))) {
            return true;
          }
          
          // Match subtopics for expanded topics too
          const topicSubtopics = subTopics[topic]?.map(sub => sub.id.toLowerCase()) || [];
          return topicSubtopics.some(subTopic => postSubtopics.includes(subTopic));
        });
      }
      
      return false;
    });

    // Save the count for potential expansion logic
    setFilteredPostsCount(filtered.length);
    
    return filtered;
  }, [posts, selectedTopics, expandedTopics]);

  // Calculate new and trending posts from filtered posts
  const newPosts = filteredPosts.filter(post => {
    const postDate = new Date(post.date)
    const now = new Date()
    const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24)
    // Exclude the featured post (first post) from newPosts
    return daysDiff <= 7 && post.slug !== filteredPosts[0]?.slug;
  })

  // Create a balanced array of posts for the New Arrivals section
  // Target exactly 34 posts (or nearest even number possible)
  
  // Step 1: Start with all new posts
  let balancedNewPosts = [...newPosts];
  
  // Step 2: If we need more posts to reach 34, add older posts
  if (balancedNewPosts.length < 34) {
    // Find all eligible posts that aren't already in balancedNewPosts and aren't the featured post
    const eligibleExtraPosts = filteredPosts.filter(post => 
      !balancedNewPosts.includes(post) && 
      post.slug !== filteredPosts[0]?.slug
    );
    
    // Calculate how many we need to add to reach exactly 34
    const extraPostsNeeded = 34 - balancedNewPosts.length;
    
    // Add exactly the number needed to reach 34
    if (eligibleExtraPosts.length > 0) {
      balancedNewPosts = [
        ...balancedNewPosts,
        ...eligibleExtraPosts.slice(0, extraPostsNeeded)
      ];
    }
  }
  
  // Step 3: Handle the special case where we have 33 posts (after removing featured)
  // We want to try extra hard to get to 34 in this case
  if (balancedNewPosts.length === 33) {
    console.log('Special case: We have 33 posts, attempting to find one more to reach 34');
    
    // Try to find just one more post from any source that isn't featured
    // and isn't already in our balanced posts
    const oneMorePost = filteredPosts.find(post => 
      !balancedNewPosts.includes(post) && 
      post.slug !== filteredPosts[0]?.slug
    );
    
    if (oneMorePost) {
      balancedNewPosts.push(oneMorePost);
      console.log('Successfully added one more post to reach 34');
    }
  }
  // If we still have an odd number of posts, then make it even
  else if (balancedNewPosts.length % 2 !== 0) {
    // Always prefer to add one more rather than remove one
    const oneMorePost = filteredPosts.find(post => 
      !balancedNewPosts.includes(post) && 
      post.slug !== filteredPosts[0]?.slug
    );
    
    if (oneMorePost) {
      balancedNewPosts.push(oneMorePost);
    } 
    // Only as a last resort, if we can't find another post and we have more than 2, 
    // remove one to get to an even number
    else if (balancedNewPosts.length > 2) {
      balancedNewPosts.pop();
    }
  }
  
  // Final check: If we still don't have 34 posts but have more available, add them
  if (balancedNewPosts.length < 34) {
    const remainingPostsNeeded = 34 - balancedNewPosts.length;
    // We need to make sure we get posts we haven't used yet
    const moreEligiblePosts = filteredPosts.filter(post => 
      !balancedNewPosts.includes(post) && 
      post.slug !== filteredPosts[0]?.slug
    );
    
    // Only add if we have at least 2 more (to keep it even)
    if (moreEligiblePosts.length >= 2) {
      // Add posts in pairs to maintain even count
      const postsToAdd = Math.min(remainingPostsNeeded - (remainingPostsNeeded % 2), moreEligiblePosts.length - (moreEligiblePosts.length % 2));
      balancedNewPosts = [
        ...balancedNewPosts,
        ...moreEligiblePosts.slice(0, postsToAdd)
      ];
    }
  }

  // Add console logs for debugging
  debugLog('Posts stats', {
    total: posts.length,
    filtered: filteredPosts.length,
    new: newPosts.length,
    balanced: balancedNewPosts.length
  });

  // Get the slugs of new posts to exclude them from Latest Stories
  const newPostSlugs = new Set(newPosts.map(post => post.slug))
  
  const randomizedPosts = {
    trending: filteredPosts.filter(post => post.metadata?.trending).slice(0, 5),
  }

  useEffect(() => {
    // Enhance posts with client-side only data
    setPosts(serverPosts.map(post => enhancePost(post)))
    
    // Staggered loading of heavy components to prevent flickering
    // This helps prevent layout shifts and performance bottlenecks
    setIsClientSideReady(true)
  }, [serverPosts])

  // Progressive loading state for each section to prevent rendering everything at once
  const [loadedSections, setLoadedSections] = useState({
    hotTake: false,
    dailyDigest: false,
    mindblown: false,
    quickBites: false,
    trendingDebates: false,
    techInsights: false,
    aiFrontier: false,
    nicheTopics: false,
    knowledgeHub: false
  })

  useEffect(() => {
    if (isClientSideReady) {
      // Stagger the loading of heavy components
      const timeouts = [
        setTimeout(() => setLoadedSections(prev => ({ ...prev, hotTake: true })), 150),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, dailyDigest: true })), 350),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, mindblown: true })), 550),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, quickBites: true })), 750),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, trendingDebates: true })), 1000),
        // Add longer delays for the problematic components
        setTimeout(() => setLoadedSections(prev => ({ ...prev, techInsights: true })), 1300),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, aiFrontier: true })), 1600),
        setTimeout(() => setLoadedSections(prev => ({ ...prev, nicheTopics: true })), 1900),
      ]
      
      return () => timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [isClientSideReady])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Initialize infinite posts with first 2 pages worth of posts
    // but exclude the featured post and any posts already shown in New Arrivals
    const featuredSlug = filteredPosts[0]?.slug;
    const filteredInfinitePosts = filteredPosts.filter(post => post.slug !== featuredSlug);
    
    // Make sure we start with an even number of posts for grid layouts if possible
    // But don't subtract if we only have 1 post to avoid empty arrays
    let count = Math.min(filteredInfinitePosts.length, 60);
    if (count > 1 && count % 2 !== 0) {
      count -= 1; // Reduce by one to get an even number
    }
    
    setInfinitePosts(filteredInfinitePosts.slice(0, count));
  }, [filteredPosts]);

  const loadMoreNewArrivals = async () => {
    if (isLoadingMoreNew) return

    setIsLoadingMoreNew(true)
    try {
      const nextPage = newArrivalsPage + 1
      // Request one extra post to compensate for potential featured post exclusion
      
      // Try Netlify function directly since we're using static export
      let res;
      try {
        // Try the Netlify Functions path first - this will work in production
        res = await fetch(`/.netlify/functions/posts?page=${nextPage}&limit=11`);
      } catch (fetchError) {
        console.error('Network error fetching from Netlify function:', fetchError);
        // Fallback to API route for local development
        res = await fetch(`/api/posts?page=${nextPage}&limit=11`);
      }
      
      const data = await res.json()
      
      if (data.posts?.length) {
        // Filter out the featured post before adding new posts
        const filteredPosts = data.posts.filter(post => post.slug !== posts[0]?.slug);
        const enhancedPosts = filteredPosts.map(post => enhancePost(post))
        
        // Update posts state
        setPosts(prevPosts => {
          const updatedPosts = [...prevPosts, ...enhancedPosts];
          // The calculation for balanced new posts will happen automatically when posts state updates
          return updatedPosts;
        })
        
        setNewArrivalsPage(nextPage)
      }
    } catch (error) {
      console.error('Error loading more new posts:', error)
    } finally {
      setIsLoadingMoreNew(false)
    }
  }

  const loadMoreInfinite = useCallback(async () => {
    if (isLoadingInfinite) return

    setIsLoadingInfinite(true)
    try {
      const nextPage = infinitePage + 1
      console.log(`Fetching more posts from page ${nextPage}`)
      
      // Try to fetch from Netlify function first (this works in production with static export)
      let res;
      try {
        // Start with Netlify Functions path - will work in production
        res = await fetch(`/.netlify/functions/posts?page=${nextPage}`);
      } catch (fetchError) {
        console.error('Network error fetching from Netlify function:', fetchError);
        // Fall back to API route for local development
        console.log('Trying API route path...');
        res = await fetch(`/api/posts?page=${nextPage}`);
      }
      
      if (!res.ok) {
        console.error(`API request failed with status ${res.status}`);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      const data = await res.json()
      console.log(`Received data for page ${nextPage}:`, { 
        postsCount: data.posts?.length, 
        hasMore: data.hasMore,
        totalPostsFromAPI: data.totalPosts
      })
      
      // If no posts returned or empty array, mark as no more posts
      if (!data.posts || !Array.isArray(data.posts) || data.posts.length === 0) {
        console.log('No more posts returned from API, marking hasMorePosts=false')
        setHasMorePosts(false)
        return
      }

      // Get all already displayed post slugs to filter against
      const featuredSlug = posts[0]?.slug;
      const displayedSlugs = new Set([
        featuredSlug, 
        ...newPosts.map(p => p.slug),
        ...infinitePosts.map(p => p.slug)
      ]);

      // Filter to only show posts that haven't been displayed yet
      const filteredPosts = data.posts.filter(post => !displayedSlugs.has(post.slug));
      console.log(`Filtered posts: ${filteredPosts.length}/${data.posts.length} are new`)
      
      const enhancedPosts = filteredPosts.map(post => enhancePost(post));
      
      setInfinitePosts(prevPosts => [...prevPosts, ...enhancedPosts]);
      setInfinitePage(nextPage);
      
      // Update hasMorePosts based on what API returns
      setHasMorePosts(data.hasMore === true);
    } catch (error) {
      console.error('Error loading more infinite posts:', error)
      
      // Fallback: Generate some mock posts if API fails completely
      if (infinitePage < 5) { // Only do this for a few pages to avoid infinite loops
        console.log('Using fallback posts data');
        
        // Generate mock posts as fallback
        const mockPosts = Array.from({ length: 10 }, (_, i) => ({
          slug: `mock-post-${infinitePage}-${i}`,
          title: `Example Post ${infinitePage}-${i} (Fallback)`,
          excerpt: 'This is a fallback post when the API is unavailable.',
          date: new Date().toISOString(),
          image: '/images/Trendiingz-logo.jpg',
          readingTime: 3,
          category: 'Tech',
          metadata: {
            featured: false,
            trending: i < 2
          }
        }));
        
        // Define the next page variable
        const nextPage = infinitePage + 1;
        
        setInfinitePosts(prevPosts => [...prevPosts, ...mockPosts]);
        setInfinitePage(nextPage);
        setHasMorePosts(nextPage < 4); // Only show a few pages of fallback content
      } else {
        // After a few attempts, give up
        setHasMorePosts(false);
        alert('Error loading more posts. Please try again later.');
      }
    } finally {
      setIsLoadingInfinite(false)
    }
  }, [infinitePage, isLoadingInfinite, posts, newPosts, infinitePosts]);

  const siteTitle = 'Trendiingz - Latest Tech & Lifestyle Trends'
  const siteDescription = 'Explore the cutting-edge of technology, digital lifestyle, and cultural innovations at Trendiingz. Get expert analysis, in-depth coverage, and actionable insights on emerging trends.'

  useEffect(() => {
    const handleConnectionChange = () => {
      const isSlowConnection = navigator.connection && 
        (navigator.connection.saveData || 
        (navigator.connection.effectiveType || '').includes('2g'));
      
      // If on a slow connection, maybe we could reduce image quality
      if (isSlowConnection) {
        document.documentElement.classList.add('slow-connection');
      } else {
        document.documentElement.classList.remove('slow-connection');
      }
    };
    
    // Add listener if supported
    if (navigator.connection && navigator.connection.addEventListener) {
      navigator.connection.addEventListener('change', handleConnectionChange);
      handleConnectionChange(); // Initial check
      
      return () => {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);

  // Pre-slice the posts for each viral section to avoid repeated calculations
  const viralSectionSlices = useMemo(() => {
    // Don't try to slice if filteredPosts is empty or undefined
    if (!filteredPosts || filteredPosts.length === 0) {
      return {
        hotTake: [],
        dailyDigest: [],
        mindblown: [],
        quickBites: [],
        trending: [],
        techInsights: [],
        aiFrontier: [],
        nicheTopics: [],
        knowledgeHub: []
      };
    }
    
    return {
      hotTake: filteredPosts.slice(0, 3),
      dailyDigest: filteredPosts.slice(3, 8),
      mindblown: filteredPosts.slice(8, 11),
      quickBites: filteredPosts.slice(11, 15),
      trending: filteredPosts.slice(15, 18),
      techInsights: filteredPosts.slice(18, 21),
      aiFrontier: filteredPosts.slice(21, 24),
      nicheTopics: filteredPosts.slice(24, 28),
      knowledgeHub: filteredPosts.slice(28, 31)
    }
  }, [filteredPosts])

  // Prefetch popular articles when component mounts
  const prefetchPopularArticles = async (articles) => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    debugLog('Prefetching', { articleCount: articles.length });
    
    // Use requestIdleCallback to not block the main thread
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        prefetchBatch(articles);
      });
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => {
        prefetchBatch(articles);
      }, 1);
    }
  };
  
  // Prefetch a batch of articles
  const prefetchBatch = async (articles) => {
    // Limit to first 8 articles and split into batches
    const batch1 = articles.slice(0, 3);
    const batch2 = articles.slice(3, 6);
    const batch3 = articles.slice(6, 8);
    
    // Process first batch immediately
    Promise.all(
      batch1.map(async (article) => {
        try {
          // Prefetch the page
          if (window.next && window.next.router) {
            window.next.router.prefetch(`/posts/${article.slug}`);
          }
          
          // Prefetch the data using our API endpoint
          try {
            const response = await fetch(`/api/articles/${article.slug}`);
            if (response.ok) {
              debugLog('Prefetch success', article.slug);
            }
          } catch (error) {
            // Silently fail - this is just prefetching
            debugLog('Prefetch warning', `Non-critical prefetch error for ${article.slug}: ${error.message}`);
          }
        } catch (err) {
          // Ignore errors during prefetching
          debugLog('Prefetch error', `Error prefetching ${article.slug}: ${err}`);
        }
      })
    );
    
    // Process second batch after a delay
    setTimeout(() => {
      Promise.all(
        batch2.map(async (article) => {
          try {
            // Prefetch the page
            if (window.next && window.next.router) {
              window.next.router.prefetch(`/posts/${article.slug}`);
            }
            
            // Prefetch the data using our API endpoint
            try {
              const response = await fetch(`/api/articles/${article.slug}`);
              if (response.ok) {
                debugLog('Prefetch success', article.slug);
              }
            } catch (error) {
              // Silently fail - this is just prefetching
              debugLog('Prefetch warning', `Non-critical prefetch error for ${article.slug}: ${error.message}`);
            }
          } catch (err) {
            // Ignore errors during prefetching
            debugLog('Prefetch error', `Error prefetching ${article.slug}: ${err}`);
          }
        })
      );
    }, 1000); // 1 second delay
    
    // Process third batch after a longer delay
    setTimeout(() => {
      Promise.all(
        batch3.map(async (article) => {
          try {
            // Prefetch the page
            if (window.next && window.next.router) {
              window.next.router.prefetch(`/posts/${article.slug}`);
            }
            
            // Prefetch the data using our API endpoint
            try {
              const response = await fetch(`/api/articles/${article.slug}`);
              if (response.ok) {
                debugLog('Prefetch success', article.slug);
              }
            } catch (error) {
              // Silently fail - this is just prefetching
              debugLog('Prefetch warning', `Non-critical prefetch error for ${article.slug}: ${error.message}`);
            }
          } catch (err) {
            // Ignore errors during prefetching
            debugLog('Prefetch error', `Error prefetching ${article.slug}: ${err}`);
          }
        })
      );
    }, 2000); // 2 second delay
  };

  // Use in your component
  useEffect(() => {
    // Only prefetch if client-side ready and trending posts are available
    if (isClientSideReady && randomizedPosts.trending) {
      // Prefetch trending articles
      const articlesToFetch = [...randomizedPosts.trending];
      // Add some of the top new posts too (avoiding duplicates)
      const newPostsToFetch = newPosts.slice(0, 5).filter(
        newPost => !articlesToFetch.some(p => p.slug === newPost.slug)
      );
      
      articlesToFetch.push(...newPostsToFetch);
      prefetchPopularArticles(articlesToFetch);
    }
  }, [isClientSideReady, randomizedPosts.trending, newPosts]);

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="keywords" content="tech trends, lifestyle, culture, technology news, trending topics, digital trends, AI innovations, metaverse, web3, cryptocurrency" />
        
        {/* Open Graph */}
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
        <meta property="og:site_name" content="Trendiingz" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
        
        {/* Additional SEO */}
        <link rel="canonical" href="https://trendiingz.com" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Trendiingz",
            "description": siteDescription,
            "url": "https://trendiingz.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://trendiingz.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
        
        {/* Organization Schema with Logo */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Trendiingz",
            "url": "https://trendiingz.com",
            "logo": "https://trendiingz.com/images/Trendiingz-logo.jpg",
            "sameAs": [
              "https://twitter.com/trendiingz",
              "https://facebook.com/trendiingz",
              "https://instagram.com/TrendiingzMedia"
            ]
          })}
        </script>
        <style>{`
          .no-flicker {
            opacity: 0;
            transition: opacity 0.05s ease-in;
          }
          .no-flicker.ready {
            opacity: 1;
          }
          /* Prevent layout shifts with images */
          .image-container {
            position: relative;
            overflow: hidden;
          }
          .image-container::before {
            content: '';
            display: block;
            padding-top: 56.25%; /* 16:9 aspect ratio */
          }
          
          /* Content-aware height reservations to prevent layout shifts */
          .content-block {
            contain: content;
            content-visibility: auto;
          }
          
          /* Performance optimizations */
          .will-change-transform {
            will-change: transform;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Avoid layout shifts with progressive loading */
          .staggered-content {
            min-height: 200px;
            opacity: 0;
            animation: fadeIn 0.25s ease forwards;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          /* Optimize for GPU rendering - more targeted to avoid color issues */
          .gpu-accelerated {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Improve paint performance - more targeted scope */
          .viral-section .bg-gradient-to-br, 
          .viral-section .bg-gradient-to-r {
            will-change: background-position;
          }
          
          /* Reduce image flickering */
          .content-block img {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Preserve original colors for header and community section */
          header, 
          .community-section,
          .logo-container {
            transform: none !important;
            backface-visibility: visible !important;
            will-change: auto !important;
            filter: none !important;
          }

          /* Enhanced responsive typography improvements */
          @media (max-width: 640px) {
            h1 { font-size: 1.75rem !important; line-height: 1.25 !important; }
            h2 { font-size: 1.25rem !important; }
            
            /* Improve touch targets on mobile */
            button, 
            a.btn,
            .card-link {
              min-height: 44px;
              padding-top: 0.5rem;
              padding-bottom: 0.5rem;
            }
            
            /* Fix 100vh issues on mobile */
            .h-screen, .min-h-screen {
              height: calc(var(--vh, 1vh) * 100);
            }

            /* Hide elements on very small screens */
            .hidden-xs {
              display: none !important;
            }
            .sm-only {
              display: none !important;
            }
            
            /* Mobile optimizations for InfiniteArticles section */
            .border-t.border-gray-200 {
              border-top-width: 1px;
            }
            
            /* Optimize article cards for mobile */
            .grid-cols-1 > a.group {
              margin-bottom: 0.75rem;
            }
            
            /* Improve mobile loading experience */
            .animate-pulse-fast {
              animation-duration: 0.8s;
            }
            
            /* Custom xs breakpoint for very small mobile screens */
            @media (max-width: 380px) {
              .hidden.xs\\:inline {
                display: none !important;
              }
            }
            
            @media (min-width: 381px) {
              .hidden.xs\\:inline {
                display: inline !important;
              }
            }
            
            @media (min-width: 480px) {
              .hidden-xs {
                display: initial;
              }
              .hidden-xs.flex {
                display: flex;
              }
              .hidden-xs.inline {
                display: inline;
              }
              .hidden-xs.inline-block {
                display: inline-block;
              }
            }
            @media (min-width: 640px) {
              .sm-only {
                display: initial !important;
              }
              .sm-only.flex {
                display: flex !important;
              }
              .sm-only.inline {
                display: inline !important;
              }
              .sm-only.inline-block {
                display: inline-block !important;
              }
            }
          }
          
          /* Optimize scrolling performance */
          @media (pointer: coarse) {
            * {
              -webkit-overflow-scrolling: touch;
            }
            
            /* Prevent overscroll bounce on iOS */
            html, body {
              overscroll-behavior-y: none;
            }
            
            /* Larger hit targets for touch */
            .touch-target {
              min-height: 44px;
              min-width: 44px;
            }
          }
          
          /* Optimize responsive loading for performance */
          @media (prefers-reduced-data: reduce) {
            img {
              image-rendering: auto;
            }
          }
          
          /* Better handling for slow connections */
          .slow-connection img:not(.critical-image) {
            image-rendering: auto;
            filter: blur(0);
          }
          
          /* Responsive card layouts */
          @media (max-width: 640px) {
            .card-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            
            .card-compact {
              display: grid;
              grid-template-columns: 80px 1fr;
              gap: 0.75rem;
              align-items: center;
              padding: 0.75rem;
              border-radius: 0.5rem;
              background-color: white;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            
            .card-compact:active {
              background-color: rgba(0, 0, 0, 0.02);
            }
            
            /* Improved text truncation */
            .line-clamp-1 {
              display: -webkit-box;
              -webkit-line-clamp: 1;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .line-clamp-3 {
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          }
          
          /* Touch feedback improvements */
          @media (hover: none) {
            .hover-effect {
              -webkit-tap-highlight-color: transparent;
            }
            
            .hover-effect:active {
              transform: scale(0.98);
              transition: transform 0.1s ease;
            }
          }

          /* Hide post count on mobile */
          @media (max-width: 640px) {
            .post-count-mobile-hidden .post-count {
              display: none;
            }
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        <TopicNav 
          className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-6" 
          selectedTopics={selectedTopics} 
          onCategorySelect={handleToggleTopic}
        />

        {/* Preferences Toggle Button */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4">
          <button 
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {showPreferences ? 'Hide Preferences' : 'Customize My Feed'}
          </button>
        </div>

        {/* Preferences UI */}
        {showPreferences && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6">
            <UserPreferencesSection 
              availableTopics={availableTopics}
              selectedTopics={selectedTopics}
              onToggleTopic={handleToggleTopic}
            />
            
            {/* Debug Information - Shows expanded topics for content fullness */}
            <DebugCategoriesInfo 
              posts={posts}
              selectedTopics={selectedTopics}
              expandedTopics={expandedTopics}
              filteredPostsCount={filteredPostsCount}
            />
          </div>
        )}

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Primary H1 heading for the website - hidden visually but available for SEO */}
          <h1 className="sr-only">Trendiingz - Your Hub for the Latest Technology and Lifestyle Trends</h1>
          
          {/* SEO optimized intro paragraph - hidden visually but available for search engines */}
          <div className="sr-only">
            <p>Welcome to Trendiingz, your premier destination for cutting-edge technology news, lifestyle innovations, and digital culture trends. Our platform offers expert analysis, in-depth coverage, and actionable insights on emerging technologies and their impact on daily life.</p>
            <p>Explore the latest in AI, Web3, Metaverse, cryptocurrency, digital transformation, tech startups, and future technologies. Our curated content helps you stay ahead of rapidly evolving digital landscapes with trusted reporting and forward-thinking perspectives.</p>
          </div>
          
          {/* User preference indicator - updated to show expanded topics */}
          {selectedTopics.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-3 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-800 font-medium">
                    Showing content for: {selectedTopics.map(topic => {
                      const topicObj = availableTopics.find(t => t.id === topic);
                      return topicObj ? topicObj.name : topic;
                    }).join(', ')}
                  </p>
                  <p className="text-sm text-indigo-600">
                    {filteredPosts.length} articles match your interests
                    {expandedTopics.length > 0 && (
                      <span className="text-xs ml-1">
                        (including related topics for better content coverage)
                      </span>
                    )}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedTopics([])}
                  className="text-sm text-indigo-700 hover:text-indigo-900"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
            <div className="md:col-span-2 space-y-6 sm:space-y-8 order-1">
              {filteredPosts[0] && (
                <FeaturedPost post={filteredPosts[0]} />
              )}

              {/* New Arrivals Section - excluding the featured post to avoid duplication */}
              {balancedNewPosts.length > 0 && (
                <NewArrivalsSection 
                  posts={balancedNewPosts}
                  hasMore={false}
                  isLoadingMore={isLoadingMoreNew}
                  onLoadMore={loadMoreNewArrivals}
                  totalNewPosts={totalPosts}
                  displayCount={balancedNewPosts.length}
                  className="post-count-mobile-hidden"
                />
              )}

              {/* Trending Section */}
              {randomizedPosts.trending.length > 0 && (
                <TrendingSection posts={randomizedPosts.trending} />
              )}
            </div>

            <div className="space-y-6 sm:space-y-8 order-2">
              {/* <NewsletterSection /> */}
              <CommunitySection />
              {/* Progressive loading of heavy components to reduce initial render load */}
              {isClientSideReady && (
                <>
                  {loadedSections.hotTake && viralSectionSlices.hotTake.length > 0 && (
                    <div className="staggered-content content-block viral-section">
                      <HotTakeSection posts={viralSectionSlices.hotTake} />
                    </div>
                  )}
                  {loadedSections.dailyDigest && viralSectionSlices.dailyDigest.length > 0 && (
                    <div className="staggered-content content-block viral-section">
                      <DailyDigestSection posts={viralSectionSlices.dailyDigest} />
                    </div>
                  )}
                  {loadedSections.mindblown && viralSectionSlices.mindblown.length > 0 && (
                    <div className="staggered-content content-block viral-section">
                      <MindblownSection posts={viralSectionSlices.mindblown} />
                    </div>
                  )}
                  {loadedSections.quickBites && viralSectionSlices.quickBites.length > 0 && (
                    <div className="staggered-content content-block viral-section">
                      <QuickBitesSection posts={viralSectionSlices.quickBites} />
                    </div>
                  )}
                  {loadedSections.trendingDebates && viralSectionSlices.trending.length > 0 && (
                    <div className="staggered-content content-block viral-section">
                      <TrendingDebatesSection posts={viralSectionSlices.trending} />
                    </div>
                  )}
                  {loadedSections.techInsights && viralSectionSlices.techInsights.length > 0 && (
                    <div className="staggered-content content-block gpu-accelerated viral-section">
                      <TechInsightsSection posts={viralSectionSlices.techInsights} />
                    </div>
                  )}
                  {loadedSections.aiFrontier && viralSectionSlices.aiFrontier.length > 0 && (
                    <div className="staggered-content content-block gpu-accelerated viral-section">
                      <AIFrontierSection posts={viralSectionSlices.aiFrontier} />
                    </div>
                  )}
                  {loadedSections.nicheTopics && viralSectionSlices.nicheTopics.length > 0 && (
                    <div className="staggered-content content-block gpu-accelerated viral-section">
                      <NicheTopicsSection posts={viralSectionSlices.nicheTopics} />
                    </div>
                  )}
                  {/* {loadedSections.knowledgeHub && viralSectionSlices.knowledgeHub.length > 0 && <KnowledgeHubSection posts={viralSectionSlices.knowledgeHub} />} */}
                </>
              )}
            </div>
          </div>

          {/* InfiniteArticles section - displays unique posts not shown in other sections */}
          <div className="mt-6 sm:mt-8 md:mt-12">
            <InfiniteArticles 
              posts={infinitePosts}
              hasMore={hasMorePosts}
              isLoadingMore={isLoadingInfinite}
              onLoadMore={loadMoreInfinite}
            />
          </div>

          {/* Category-specific sections - only show if we have articles in those categories */}
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
            {/* Only show category sections if no specific topics are selected, or if that topic is selected */}
            {(selectedTopics.length === 0 || selectedTopics.includes('tech')) && (
              <CategoryArticlesSection 
                posts={filteredPosts} 
                category="Tech" 
                icon="💻" 
                description="Latest technology news and innovations from around the world."
              />
            )}
            
            {(selectedTopics.length === 0 || selectedTopics.includes('ai')) && (
              <CategoryArticlesSection 
                posts={filteredPosts} 
                category="AI" 
                icon="🤖" 
                description="Advancements in artificial intelligence and machine learning."
              />
            )}
            
            {(selectedTopics.length === 0 || selectedTopics.includes('science')) && (
              <CategoryArticlesSection 
                posts={filteredPosts} 
                category="Science" 
                icon="🔬" 
                description="Scientific discoveries and breakthroughs across disciplines."
              />
            )}
            
            {(selectedTopics.length === 0 || selectedTopics.includes('business')) && (
              <CategoryArticlesSection 
                posts={filteredPosts} 
                category="Business" 
                icon="💼" 
                description="Business news, market trends, and entrepreneurship insights."
              />
            )}
            
            {(selectedTopics.length === 0 || selectedTopics.includes('innovation')) && (
              <CategoryArticlesSection 
                posts={filteredPosts} 
                category="Innovation" 
                icon="💡" 
                description="Groundbreaking ideas and innovations shaping the future."
              />
            )}
          </div>
        </main>

        {/* Bottom CTA */}
        <BottomCTA />

        <Footer />

        {/* Scroll to top button - more mobile friendly positioning */}
        {showScrollTop && (
          <ScrollToTopButton />
        )}
      </div>
    </>
  )
}

function FeaturedPost({ post }) {
  // Check if the post is less than 7 days old to also highlight it as "new"
  const isNew = () => {
    const postDate = new Date(post.date);
    const now = new Date();
    const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  return (
    <Link href={`/posts/${post.slug}`} className="group block rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="relative h-[220px] sm:h-[300px] md:h-[350px] lg:h-[400px] overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 66vw"
          className="object-cover transform group-hover:scale-105 transition-transform duration-700"
          loading="eager"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all duration-300" />
        <div className="absolute bottom-0 p-3 sm:p-4 md:p-6 transform group-hover:translate-y-[-4px] sm:group-hover:translate-y-[-8px] transition-transform duration-300 w-full">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
            <span className="inline-flex items-center px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-indigo-600 text-white">
              Featured
            </span>
            {isNew() && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-500 text-white">
                New
              </span>
            )}
            <span className="hidden sm:inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
              Must Read
            </span>
          </div>
          <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 md:mb-4 group-hover:text-indigo-200 transition-colors duration-200 line-clamp-2 md:line-clamp-2">
            {post.title}
          </h2>
          <div className="flex items-center text-white/80 text-[10px] sm:text-xs">
            <span className="flex items-center">
              <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {post.readingTime} min read
            </span>
            <span className="mx-1.5 sm:mx-2">•</span>
            {post.views && (
              <span className="hidden sm:flex items-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.views} views
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function TrendingSection({ posts }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold text-gray-900">Trending Now</h2>
        <span className="flex items-center text-[10px] sm:text-sm text-indigo-600">
          <span className="relative flex h-2 w-2 mr-1.5 sm:mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="hidden sm:inline">Live Updates</span>
        </span>
      </div>
      <div className="space-y-2 sm:space-y-4">
        {posts.map((post, index) => (
          <Link
            href={`/posts/${post.slug}`}
            key={post.slug}
            className="group flex items-start gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors hover-effect"
          >
            <div className="flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 relative rounded-md overflow-hidden">
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 56px, 80px"
                className="object-cover"
                loading={index < 2 ? "eager" : "lazy"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {post.title}
              </p>
              <div className="flex items-center mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500">
                <span>{post.readingTime} min read</span>
                <span className="mx-1">•</span>
                <span className="hidden sm:inline">{post.views} views</span>
              </div>
            </div>
            <span className="text-base sm:text-lg font-bold text-indigo-600 flex-shrink-0">{index + 1}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BottomCTA() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 mt-6 sm:mt-16 relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='20' height='20' fill='none'/%3E%3Crect width='1' height='20' fill='white' fill-opacity='0.1'/%3E%3Crect width='20' height='1' fill='white' fill-opacity='0.1'/%3E%3C/svg%3E")`,
        opacity: 0.1
      }}></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 text-center relative">
        <h2 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4">Want more? Trendiingz always has more</h2>
        <div className="mt-3 sm:mt-4">
        </div>
      </div>
    </div>
  )
}

function ScrollToTopButton() {
  const scrollToTop = () => {
    // Use a smoother scroll with easing for better mobile experience
    const scrollToTop = () => {
      const c = document.documentElement.scrollTop || document.body.scrollTop;
      if (c > 0) {
        window.requestAnimationFrame(scrollToTop);
        // Smoother easing for scrolling
        window.scrollTo(0, c - c / 8);
      }
    };
    scrollToTop();
  };

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transform hover:scale-110 transition-all duration-200 z-50 w-12 h-12 flex items-center justify-center"
      aria-label="Scroll to top"
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  )
}

// Client-side post enhancement with stable values
function enhancePost(post) {
  // Use a more deterministic approach to avoid unnecessary re-renders
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };
  
  const slug = post.slug || '';
  const hashValue = hashCode(slug);
  
  return {
    ...post,
    trending: (hashValue % 10) > 7, // 30% chance of trending
    views: 100 + (hashValue % 1000) // Views between 100-1099
  }
}

export async function getStaticProps() {
  try {
    // Dynamic import the getAllPosts function
    const { getAllPosts } = await import('../utils/mdx');
    const { getAllArticles } = await import('../utils/articleUtils');
    
    // Use pagination to limit initial data size
    const INITIAL_PAGE_SIZE = 50; // Reduced from 150 to 50
    
    // Get posts with pagination
    const result = await getAllArticles({
      paginate: true, 
      page: 1, 
      limit: INITIAL_PAGE_SIZE
    });
    
    const { articles: paginatedPosts, pagination } = result;
    
    // If we don't have posts yet, return placeholder data
    if (!paginatedPosts || paginatedPosts.length === 0) {
      console.warn('No posts found, returning placeholder data');
      return {
        props: {
          posts: generatePlaceholderPosts(50), // Reduced from 150 to 50
          hasMore: false,
          totalPosts: 50, // Reduced from 150 to 50
          currentPage: 1,
          totalPages: 1
        },
        // Revalidate every hour in production
        revalidate: 3600
      };
    }

    // Map posts to include only essential data
    const trimmedPosts = paginatedPosts.map(post => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
      image: post.image,
      readingTime: post.readingTime,
      category: post.category,
      categories: post.categories || [],
      topics: post.topics || [],
      subtopics: post.subtopics || [],
      // Only include essential metadata
      metadata: {
        featured: post.metadata?.featured || false,
        trending: post.metadata?.trending || false
      }
    }));
    
    // Ensure posts are sorted by date (newest first)
    trimmedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      props: { 
        posts: trimmedPosts,
        hasMore: pagination.hasMore,
        totalPosts: pagination.total,
        currentPage: pagination.page,
        totalPages: pagination.totalPages
      },
      // Revalidate every hour in production
      revalidate: 3600
    }
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    
    // Return placeholder data on error with fewer posts
    return {
      props: {
        posts: generatePlaceholderPosts(50), // Reduced from 150 to 50
        hasMore: false,
        totalPosts: 50, // Reduced from 150 to 50
        currentPage: 1,
        totalPages: 1
      },
      // Revalidate quickly on error
      revalidate: 300
    };
  }
}

// Generate placeholder posts for empty state or error fallback
function generatePlaceholderPosts(count = 150) { // Default increased to 150
  // Create a variety of categories and topics for better filtering testing
  const categories = ['Tech', 'AI', 'Science', 'Business', 'Lifestyle', 'Gaming', 'Climate', 'Innovation'];
  const topics = [
    ['tech', 'web-development', 'mobile'], 
    ['ai', 'machine-learning', 'nlp'],
    ['science', 'biology', 'physics'],
    ['business', 'startups', 'finance'],
    ['lifestyle', 'health', 'food'],
    ['gaming', 'console-gaming', 'pc-gaming'],
    ['climate', 'sustainability', 'renewable-energy'],
    ['innovation', 'metaverse', 'biotechnology']
  ];

  return Array.from({ length: count }, (_, i) => {
    // Assign categories and topics in a distributed manner
    const categoryIndex = i % categories.length;
    const category = categories[categoryIndex];
    const topicSet = topics[categoryIndex];
    
    // Add structured categories for testing the new format
    const structuredCategories = [
      { type: 'main', name: category },
      { type: 'sub', name: topicSet[1] }
    ];

    return {
      title: `${category} Post ${i + 1}`,
      slug: `${category.toLowerCase()}-post-${i + 1}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      image: `https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60`,
      excerpt: `This is a sample ${category} post about ${topicSet[1]} that serves as a placeholder.`,
      readingTime: 3 + (i % 5),
      category: category,
      categories: structuredCategories,
      topics: [topicSet[0]],
      subtopics: [topicSet[1], topicSet[2]],
      isNew: i < 10,
      status: i < 10 ? 'new' : 'published',
      metadata: {
        featured: i === 0,
        trending: i < 15
      }
    };
  });
} 