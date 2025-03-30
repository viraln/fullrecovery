import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/layout/Footer'
import { topicCategories, allTopicsFlat } from '../../data/topics'
import TopicNav from '../../components/home/TopicNav'

// Get article data
import { getAllPosts } from '../../utils/mdx'

// Helper functions - moved outside component to avoid initialization issues
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

export default function TopicPage({ topic, articlesData, relatedTopics }) {
  const router = useRouter()
  const { slug = '', subSlug = '' } = router.query || {}
  
  // Ensure articlesData is always an array
  const safeArticlesData = Array.isArray(articlesData) ? articlesData : []
  
  // Get subtopics - ensure this is done before it's referenced
  const subtopicsData = getSubtopics(typeof slug === 'string' ? slug : topic)
  const safeSubtopics = Array.isArray(subtopicsData) ? subtopicsData : []
  
  const [articles, setArticles] = useState(safeArticlesData)
  const [isLoading, setIsLoading] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  
  // Add defensive string handling
  const safeSlug = typeof slug === 'string' ? slug : typeof topic === 'string' ? topic : ''
  
  // Format the topic name for display with defensive checks
  const formattedName = safeSlug ? safeSlug.replace(/-/g, ' ') : ''
  const capitalizedName = formattedName ? formattedName.split(' ')
    .filter(word => typeof word === 'string' && word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') : 'Topic'
  
  const topicIcon = getTopicIcon(safeSlug)
  const topicDescription = getTopicDescription(safeSlug)
  
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
    
    // Filter the articles based on the selected filter with defensive checks
    let filteredArticles = [...safeArticlesData]
    
    if (filterId === 'trending') {
      filteredArticles = filteredArticles.filter(article => article && article.trending)
    } else if (filterId === 'latest') {
      filteredArticles.sort((a, b) => {
        // Defensive sort with date validation
        const dateA = a && a.date ? new Date(a.date) : new Date(0)
        const dateB = b && b.date ? new Date(b.date) : new Date(0)
        return dateB - dateA
      })
    } else if (filterId === 'popular') {
      filteredArticles.sort((a, b) => ((b && b.views) || 0) - ((a && a.views) || 0))
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
  
  // Filter topics that have content
  const activeSubtopics = safeSubtopics.filter(subtopic => subtopic && subtopic.hasContent)

  // Ensure any function that works with subtopics handles undefined values
  const getSubtopicUrl = (subtopic) => {
    if (!subtopic || !subtopic.slug || !safeSlug) return '#'
    return `/topics/${safeSlug}/${subtopic.slug}`
  }

  const getSubtopicName = (subtopic) => {
    if (!subtopic || typeof subtopic.name !== 'string') return 'Subtopic'
    return subtopic.name
  }
  
  return (
    <>
      <Head>
        <title>{capitalizedName || 'Topic'} Articles - Trendiingz</title>
        <meta name="description" content={`Explore the latest ${formattedName} articles, news, insights, and trends. Stay updated with our expert coverage on ${formattedName} developments.`} />
        <meta name="keywords" content={`${formattedName}, ${safeSlug}, technology, trends, news, articles`} />
        
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
                  {subSlug && (
                    <Link href={`/topics/${safeSlug}`} className="text-white/80 hover:text-white mr-2 font-medium text-sm sm:text-base">
                      {safeSlug.charAt(0).toUpperCase() + safeSlug.slice(1).replace(/-/g, ' ')}
                    </Link>
                  )}
                  {subSlug && <span className="text-white/60 mx-2">/</span>}
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
            {!subSlug && safeSubtopics && safeSubtopics.length > 0 && (
              <div className="py-3 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                <div className="flex space-x-2">
                  {safeSubtopics.map((subtopic) => (
                    <Link
                      key={subtopic.id}
                      href={getSubtopicUrl(subtopic)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 whitespace-nowrap transition-colors"
                    >
                      <span className="mr-1.5">{subtopic.icon}</span>
                      {getSubtopicName(subtopic)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Related Main Topics (only show on subtopic pages) */}
            {subSlug && mainTopics && mainTopics.length > 0 && (
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
          
          {/* Articles Section */}
          <div className="mb-6">
            {/* Filtering and View Controls */}
            <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
              {/* Filter Controls */}
              <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-1">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      currentFilter === filter.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition-colors whitespace-nowrap`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
              
              {/* View Mode Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleViewMode}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                >
                  {viewMode === 'grid' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* Articles Grid or List */}
            {articles && articles.length > 0 ? (
              <div className={`grid ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'grid-cols-1 gap-4'
              }`}>
                {articles.map((article, index) => (
                  <article 
                    key={index} 
                    className={`bg-white rounded-xl shadow-sm overflow-hidden transition-transform hover:-translate-y-1 ${
                      viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                    }`}
                  >
                    {article.image && (
                      <Link href={`/articles/${article.slug}`} className={`block ${viewMode === 'list' ? 'sm:w-1/3' : ''}`}>
                        <div className={`relative ${viewMode === 'grid' ? 'aspect-w-16 aspect-h-9' : 'aspect-w-4 aspect-h-3'}`}>
                          <Image 
                            src={article.image} 
                            alt={article.title} 
                            fill
                            className="object-cover transition-transform hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      </Link>
                    )}
                    
                    <div className={`p-4 ${viewMode === 'list' ? 'sm:w-2/3' : ''} flex flex-col h-full`}>
                      {article.category && (
                        <Link href={`/topics/${article.category}`} className="mb-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          {article.category.replace(/-/g, ' ')}
                        </Link>
                      )}
                      
                      <h2 className="text-lg font-bold mb-2 line-clamp-2">
                        <Link href={`/articles/${article.slug}`} className="hover:text-indigo-600 transition-colors">
                          {article.title}
                        </Link>
                      </h2>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                        <div>
                          {article.date && (
                            <time dateTime={article.date}>
                              {new Date(article.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </time>
                          )}
                        </div>
                        
                        <div className="flex items-center">
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {article.readingTime || '5 min'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No articles found</h3>
                <p className="text-gray-500 mb-6">
                  We couldn't find any articles matching your criteria. Please try a different filter or check back later.
                </p>
                <button
                  onClick={() => handleFilterChange('all')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Show all articles
                </button>
              </div>
            )}
            
            {/* Load More Button */}
            {articles && articles.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMoreArticles}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-full text-sm font-semibold ${
                    isLoading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } transition-colors flex items-center mx-auto`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
                      </svg>
                      Load more articles
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Suggested Topics */}
          {relatedTopics && relatedTopics.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold">Related Topics</h2>
                <p className="text-gray-500 text-sm mt-1">Explore more topics related to {capitalizedName}</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-4 sm:p-6">
                {relatedTopics.map((relTopic) => (
                  <Link
                    key={relTopic.slug}
                    href={`/topics/${relTopic.slug}`}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-center transition-colors"
                  >
                    <span className="text-2xl mb-1">{relTopic.icon || '📚'}</span>
                    <span className="text-sm font-medium">{relTopic.name}</span>
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

// Server-side data fetching
export async function getStaticPaths() {
  try {
    // Use the pre-flattened topics array
    if (!Array.isArray(allTopicsFlat) || allTopicsFlat.length === 0) {
      console.warn('Warning: allTopicsFlat array is empty or invalid. Using empty array for paths.');
      return {
        paths: [],
        fallback: 'blocking',
      };
    }
    
    // Generate paths from the flattened topics array
    const paths = allTopicsFlat.map((topic) => ({
      params: { slug: topic.slug },
    }));
    
    console.log(`Generated ${paths.length} topic paths for static generation`);
    
    return {
      paths,
      fallback: 'blocking',
    };
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    // Return a safe fallback in case of any error
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
}

export async function getStaticProps({ params }) {
  try {
    const { slug } = params || {}
    
    // Handle subtopic paths
    const slugParts = slug.split('/') 
    const mainTopic = slugParts[0]
    const subTopic = slugParts.length > 1 ? slugParts[1] : null
    
    // Get all posts
    const allPosts = await getAllPosts()
    
    // Filter posts for this topic or subtopic
    let postsForTopic = []
    
    if (allPosts && Array.isArray(allPosts)) {
      postsForTopic = allPosts.filter((post) => {
        // Check for main topic match
        const topicMatch = post.frontmatter && 
          (post.frontmatter.topic === mainTopic || 
           post.frontmatter.category === mainTopic || 
           post.frontmatter.tags?.includes(mainTopic) || 
           post.frontmatter.title?.toLowerCase().includes(mainTopic.replace(/-/g, ' ')))
        
        // If there's a subtopic specified, filter by that too
        if (subTopic && topicMatch) {
          return post.frontmatter.subtopic === subTopic || 
                 post.frontmatter.tags?.includes(subTopic) ||
                 post.frontmatter.title?.toLowerCase().includes(subTopic.replace(/-/g, ' '))
        }
        
        return topicMatch
      })
    }
    
    // Format the posts for display
    const articles = postsForTopic.map((post) => ({
      slug: post.slug,
      title: post.frontmatter.title || '',
      excerpt: post.frontmatter.excerpt || '',
      date: post.frontmatter.date || '',
      image: post.frontmatter.image || '/images/placeholder.jpg',
      readingTime: post.frontmatter.readingTime || '5 min',
      category: post.frontmatter.category || mainTopic,
      trending: post.frontmatter.trending || false,
      views: post.frontmatter.views || 0,
    }))
    
    // Use allTopicsFlat for related topics (exclude current topic)
    const relatedTopics = Array.isArray(allTopicsFlat) ? 
      allTopicsFlat
        .filter(topic => topic.slug !== mainTopic)
        .slice(0, 10)
        .map(topic => ({
          slug: topic.slug,
          name: topic.name,
          icon: topic.icon
        })) : [];
    
    return {
      props: {
        topic: mainTopic,
        articlesData: articles,
        relatedTopics,
      },
      revalidate: 3600, // Revalidate every hour
    }
  } catch (error) {
    console.error('Error in getStaticProps for topic page:', error)
    
    // Return minimal props in case of error
    return {
      props: {
        topic: params?.slug || '',
        articlesData: [],
        relatedTopics: [],
      },
      revalidate: 60, // Try again more quickly in case of error
    }
  }
} 