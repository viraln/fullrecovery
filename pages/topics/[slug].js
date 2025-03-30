import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/layout/Footer'
import { topicCategories } from '../../data/topics'
import TopicNav from '../../components/home/TopicNav'

// Get article data
import { getAllPosts } from '../../utils/mdx'

export default function TopicPage({ topic, articlesData, relatedTopics }) {
  const router = useRouter()
  const { slug, subSlug } = router.query
  
  const [articles, setArticles] = useState(articlesData || [])
  const [isLoading, setIsLoading] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  
  // Determine if we're viewing a main topic or subtopic
  const isSubTopic = !!subSlug
  const displayName = subSlug || slug
  const formattedName = displayName?.replace(/-/g, ' ')
  const capitalizedName = formattedName?.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  const topicIcon = getTopicIcon(slug)
  const topicDescription = getTopicDescription(slug)
  
  // Get possible subtopics for this main topic
  const subtopics = getSubtopics(slug)
  
  // Filter options for articles
  const filterOptions = [
    { id: 'all', name: 'All Articles' },
    { id: 'trending', name: 'Trending' },
    { id: 'latest', name: 'Latest' },
    { id: 'popular', name: 'Most Read' }
  ]
  
  // Get relevant main topics if we're on a subtopic page
  const mainTopics = getMainTopicsForSubtopic(subSlug)
  
  // Handle filter change
  const handleFilterChange = (filterId) => {
    setCurrentFilter(filterId)
    
    // Filter the articles based on the selected filter
    let filteredArticles = [...articlesData]
    
    if (filterId === 'trending') {
      filteredArticles = filteredArticles.filter(article => article.trending)
    } else if (filterId === 'latest') {
      filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (filterId === 'popular') {
      filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0))
    }
    
    setArticles(filteredArticles)
  }
  
  // Switch between grid and list view modes
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }
  
  // Handle loading more articles
  const loadMoreArticles = async () => {
    try {
      setIsLoading(true)
      // In a real implementation, this would fetch more articles from an API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For now, just simulate by duplicating current articles
      // In a real app, you'd fetch the next page of articles
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading more articles:', error)
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Head>
        <title>{capitalizedName || 'Topic'} Articles - Trendiingz</title>
        <meta name="description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="keywords" content={`${formattedName}, ${slug}, technology, trends, news, articles`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${capitalizedName} - Trendiingz`} />
        <meta property="og:description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
        <meta property="og:site_name" content="Trendiingz" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${capitalizedName} - Trendiingz`} />
        <meta name="twitter:description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="twitter:image" content="https://trendiingz.com/images/Trendiingz-logo.jpg" />
      </Head>

      <div className="bg-gray-50 min-h-screen">
        <Header />
        <TopicNav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-6" />
        
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          {/* Topic Header Section */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="relative bg-gradient-to-r from-indigo-700 to-purple-700 h-32 sm:h-48">
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              
              {/* Topic Info */}
              <div className="absolute bottom-0 left-0 p-4 sm:p-6 text-white">
                <div className="flex items-center">
                  {isSubTopic && (
                    <Link href={`/topics/${slug}`} className="text-white/80 hover:text-white mr-2 font-medium text-sm sm:text-base">
                      {slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')}
                    </Link>
                  )}
                  {isSubTopic && <span className="text-white/60 mx-2">/</span>}
                  <h1 className="text-xl sm:text-3xl font-bold">{capitalizedName}</h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base mt-1 max-w-2xl">
                  {topicDescription}
                </p>
              </div>
              
              {/* Icon */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-2xl sm:text-4xl">
                {topicIcon}
              </div>
            </div>
            
            {/* Subtopics Navigation (only show on main topic pages) */}
            {!isSubTopic && subtopics && subtopics.length > 0 && (
              <div className="py-3 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                <div className="flex space-x-2">
                  {subtopics.map((subtopic) => (
                    <Link
                      key={subtopic.id}
                      href={`/topics/${slug}/${subtopic.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 whitespace-nowrap transition-colors"
                    >
                      <span className="mr-1.5">{subtopic.icon}</span>
                      {subtopic.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Related Main Topics (only show on subtopic pages) */}
            {isSubTopic && mainTopics && mainTopics.length > 0 && (
              <div className="py-3 px-4 sm:px-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 pt-1.5">Related:</span>
                  {mainTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span className="mr-1.5">{topic.icon}</span>
                      {topic.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Filters and View Mode Controls */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Filter Options */}
              <div className="flex flex-wrap gap-2 sm:gap-0">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id)}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-full sm:rounded-none
                      transition-colors
                      ${currentFilter === filter.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                      ${filter.id !== filterOptions[filterOptions.length - 1].id 
                        ? 'sm:rounded-l-md' 
                        : ''}
                      ${filter.id !== filterOptions[0].id 
                        ? 'sm:rounded-r-md' 
                        : ''}
                    `}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-gray-100 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                  aria-label="Grid view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                  aria-label="List view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Articles Section */}
          {articles.length > 0 ? (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-6'
              }>
                {articles.map((article) => (
                  viewMode === 'grid' 
                    ? <GridArticleCard key={article.slug} article={article} /> 
                    : <ListArticleCard key={article.slug} article={article} />
                ))}
              </div>
              
              {/* Load More Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={loadMoreArticles}
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Load More Articles'
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any articles for this topic yet. Check back soon as we're constantly adding new content.
                </p>
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Back to Home
                </Link>
              </div>
            </div>
          )}
          
          {/* Related Topics Section */}
          {relatedTopics && relatedTopics.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Related Topics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {relatedTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/topics/${topic.id}`}
                    className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
                  >
                    <span className="text-3xl mb-2">{topic.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{topic.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </>
  )
}

// Grid Article Card Component
function GridArticleCard({ article }) {
  return (
    <Link href={`/posts/${article.slug}`} className="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-48">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {article.trending && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            Trending
          </div>
        )}
      </div>
      <div className="p-4 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h2>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
          <span>{article.date ? new Date(article.date).toLocaleDateString() : 'No date'}</span>
          <span>{article.readingTime} min read</span>
        </div>
      </div>
    </Link>
  )
}

// List Article Card Component
function ListArticleCard({ article }) {
  return (
    <Link href={`/posts/${article.slug}`} className="flex bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative w-32 sm:w-48">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 128px, 192px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {article.trending && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
            Trending
          </div>
        )}
      </div>
      <div className="p-4 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h2>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{article.date ? new Date(article.date).toLocaleDateString() : 'No date'}</span>
          <div className="flex items-center">
            <span className="mr-3">{article.readingTime} min read</span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.views || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Helper functions
function getTopicIcon(slug) {
  const iconMap = {
    'tech': '💻',
    'ai': '🤖',
    'science': '🔬',
    'climate': '🌍',
    'business': '💼',
    'innovation': '💡',
    'gaming': '🎮',
    'lifestyle': '✨',
    'food': '🍳',
    'politics': '🏛️',
    'entertainment': '🎭',
  }
  
  return iconMap[slug] || '📚'
}

function getTopicDescription(slug) {
  const descriptionMap = {
    'tech': 'Explore the latest in technology trends, innovations, and insights from leading tech companies and startups.',
    'ai': 'Discover breakthroughs in artificial intelligence, machine learning, deep learning, and neural networks.',
    'science': 'Stay updated with the newest scientific discoveries, research findings, and advancements across disciplines.',
    'climate': 'Follow climate change developments, environmental policies, sustainability initiatives, and green technologies.',
    'business': 'Track business trends, market movements, entrepreneurship stories, and corporate innovations.',
    'innovation': 'Learn about groundbreaking ideas, disruptive technologies, and creative solutions changing our world.',
    'gaming': 'Get the latest on video games, esports, gaming hardware, and industry developments.',
    'lifestyle': 'Find inspiration for better living through wellness, personal development, home, and relationships.',
  }
  
  return descriptionMap[slug] || `Explore our latest articles and insights about ${slug}.`
}

function getSubtopics(slug) {
  // This would typically come from the data source
  const subtopicsMap = {
    'tech': [
      { id: 'web-development', name: 'Web Development', icon: '🌐' },
      { id: 'mobile', name: 'Mobile', icon: '📱' },
      { id: 'cloud', name: 'Cloud Computing', icon: '☁️' },
      { id: 'security', name: 'Cybersecurity', icon: '🔒' },
      { id: 'data-science', name: 'Data Science', icon: '📊' },
    ],
    'ai': [
      { id: 'machine-learning', name: 'Machine Learning', icon: '🧠' },
      { id: 'generative-ai', name: 'Generative AI', icon: '🎨' },
      { id: 'nlp', name: 'Natural Language Processing', icon: '💬' },
      { id: 'computer-vision', name: 'Computer Vision', icon: '👁️' },
      { id: 'ai-ethics', name: 'AI Ethics', icon: '⚖️' },
    ],
    'science': [
      { id: 'physics', name: 'Physics', icon: '⚛️' },
      { id: 'astronomy', name: 'Astronomy', icon: '🔭' },
      { id: 'biology', name: 'Biology', icon: '🧬' },
      { id: 'quantum', name: 'Quantum Science', icon: '🔄' },
      { id: 'medicine', name: 'Medicine', icon: '🩺' },
    ],
  }
  
  return subtopicsMap[slug] || []
}

function getMainTopicsForSubtopic(subSlug) {
  // In a real implementation, this would come from a database or API
  // For now, we'll return some example related topics
  return [
    { id: 'tech', name: 'Technology', icon: '💻' },
    { id: 'ai', name: 'AI & ML', icon: '🤖' },
    { id: 'innovation', name: 'Innovation', icon: '💡' },
    { id: 'business', name: 'Business', icon: '💼' },
  ]
}

// Server-side data fetching
export async function getStaticProps({ params }) {
  const { slug } = params
  
  try {
    // Get all posts from MDX utility
    const allPosts = await getAllPosts()
    
    // Ensure allPosts is an array before proceeding
    const postsArray = Array.isArray(allPosts) ? allPosts : 
                      (allPosts && allPosts.posts && Array.isArray(allPosts.posts)) ? allPosts.posts : [];
    
    if (!postsArray || postsArray.length === 0) {
      return {
        props: {
          topic: slug,
          articlesData: [],
          relatedTopics: []
        }
      }
    }
    
    // More accurate filtering using the topics field
    const filteredArticles = postsArray.filter(post => {
      // First check if this post has the topic in its topics array (most accurate)
      if (post.topics && Array.isArray(post.topics)) {
        return post.topics.some(topic => topic.toLowerCase() === slug.toLowerCase());
      }
      
      // Next check categories
      if (post.categories && Array.isArray(post.categories)) {
        return post.categories.some(category => {
          return category.toLowerCase() === slug.toLowerCase() ||
                 category.toLowerCase().includes(slug.toLowerCase());
        });
      }
      
      // Finally check if the main category matches
      if (post.category) {
        return post.category.toLowerCase() === slug.toLowerCase() ||
               post.category.toLowerCase().includes(slug.toLowerCase());
      }
      
      // Also check if the title or excerpt contains the topic as a fallback
      const titleMatch = post.title && post.title.toLowerCase().includes(slug.toLowerCase());
      const excerptMatch = post.excerpt && post.excerpt.toLowerCase().includes(slug.toLowerCase());
      
      return titleMatch || excerptMatch;
    });
    
    // Get related topics based on this topic
    // Get articles that have different main topics
    const relatedTopicsMap = new Map();
    filteredArticles.forEach(article => {
      if (article.topics && Array.isArray(article.topics)) {
        article.topics.forEach(topic => {
          if (topic.toLowerCase() !== slug.toLowerCase()) {
            // Track topics and their frequency
            relatedTopicsMap.set(topic, (relatedTopicsMap.get(topic) || 0) + 1);
          }
        });
      }
    });
    
    // Get the top 6 related topics by frequency
    const sortedRelatedTopics = [...relatedTopicsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => {
        const iconMap = {
          'tech': { id: 'tech', name: 'Technology', icon: '💻' },
          'ai': { id: 'ai', name: 'AI', icon: '🤖' },
          'science': { id: 'science', name: 'Science', icon: '🔬' },
          'climate': { id: 'climate', name: 'Climate', icon: '🌍' },
          'business': { id: 'business', name: 'Business', icon: '💼' },
          'innovation': { id: 'innovation', name: 'Innovation', icon: '💡' },
          'gaming': { id: 'gaming', name: 'Gaming', icon: '🎮' },
          'lifestyle': { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
        };
        
        return iconMap[topic.toLowerCase()] || { 
          id: topic.toLowerCase(), 
          name: topic.charAt(0).toUpperCase() + topic.slice(1), 
          icon: '📚' 
        };
      });
    
    // If we don't have enough related topics, add some default ones
    const defaultTopics = [
      { id: 'tech', name: 'Technology', icon: '💻' },
      { id: 'ai', name: 'AI', icon: '🤖' },
      { id: 'innovation', name: 'Innovation', icon: '💡' },
      { id: 'science', name: 'Science', icon: '🔬' },
      { id: 'business', name: 'Business', icon: '💼' },
      { id: 'climate', name: 'Climate', icon: '🌍' },
    ].filter(topic => topic.id !== slug);
    
    const relatedTopics = sortedRelatedTopics.length > 0 
      ? sortedRelatedTopics 
      : defaultTopics.slice(0, 6);
    
    return {
      props: {
        topic: slug,
        articlesData: filteredArticles.map(post => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          date: post.date,
          image: post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=60',
          readingTime: post.readingTime || 3,
          category: post.category || 'General',
          trending: post.metadata?.trending || Math.random() > 0.7, // Use metadata if available, otherwise random
          views: Math.floor(Math.random() * 1000) + 100, // Random view count for demo
        })),
        relatedTopics
      }
    }
  } catch (error) {
    console.error('Error in getStaticProps for topic page:', error)
    
    return {
      props: {
        topic: slug,
        articlesData: [],
        relatedTopics: []
      }
    }
  }
}

// Generate static paths for common topics
export async function getStaticPaths() {
  const commonTopics = [
    'tech', 'ai', 'science', 'business', 'innovation', 'gaming', 'climate', 'lifestyle'
  ]
  
  const paths = commonTopics.map(topic => ({
    params: { slug: topic }
  }))
  
  return {
    paths,
    fallback: 'blocking' // Generate pages for other topics on-demand
  }
} 