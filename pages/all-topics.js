import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/layout/Footer'
import { topicCategories } from '../data/topics'

export default function AllTopics() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef(null)
  const hasInitialized = useRef(false)

  // Get all topics from all categories
  const allTopics = Object.entries(topicCategories).reduce((acc, [category, topics]) => {
    return [...acc, ...topics.map(topic => ({ ...topic, category }))]
  }, [])

  // Filter topics based on search and category
  const filteredTopics = allTopics.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Optimized mouse move handler with throttling
  const handleMouseMove = (e) => {
    if (!heroRef.current || !isLoaded) return;
    
    // Throttle the mouse move updates to prevent too many re-renders
    if (!hasInitialized.current) {
      const rect = heroRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      requestAnimationFrame(() => {
        setMousePosition({ x, y });
        hasInitialized.current = false;
      });
      
      hasInitialized.current = true;
    }
  };

  // Animation effect on load
  useEffect(() => {
    // Set loaded state after a short delay to prevent initial flickering
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
      
      // Show content with a slight delay for smoother transitions
      const contentTimer = setTimeout(() => {
        setIsContentVisible(true);
      }, 100);
      
      return () => clearTimeout(contentTimer);
    }, 50);
    
    return () => clearTimeout(loadTimer);
  }, []);
  
  // Initialize particles in a separate effect to avoid blocking main render
  useEffect(() => {
    if (!isLoaded) return;
    
    // Initialize particles with fewer elements for better performance
    const initParticles = () => {
      if (typeof window === 'undefined' || document.getElementById('particles-js-script')) return;
      
      const script = document.createElement('script');
      script.id = 'particles-js-script';
      script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
      script.async = true;
      script.onload = () => {
        if (window.particlesJS) {
          window.particlesJS('particles-js', {
            particles: {
              number: { value: 30, density: { enable: true, value_area: 1200 } }, // Further reduced
              color: { value: '#6366f1' },
              shape: { type: 'circle' },
              opacity: { value: 0.08, random: true }, // Reduced opacity
              size: { value: 3, random: true },
              line_linked: { enable: true, distance: 150, color: '#6366f1', opacity: 0.05, width: 1 }, // Reduced opacity
              move: { enable: true, speed: 0.5, direction: 'none', random: true, straight: false, out_mode: 'out' } // Further slowed
            },
            interactivity: {
              detect_on: 'canvas',
              events: {
                onhover: { enable: false }, // Disabled for better performance
                onclick: { enable: false }
              }
            },
            retina_detect: false
          });
        }
      };
      document.body.appendChild(script);
    };
    
    // Delay particle initialization to prioritize UI rendering
    const particleTimer = setTimeout(() => {
      initParticles();
    }, 800);
    
    return () => {
      clearTimeout(particleTimer);
      const script = document.getElementById('particles-js-script');
      if (script) script.remove();
    };
  }, [isLoaded]);

  return (
    <>
      <Head>
        <title>All Topics - Trendiingz</title>
        <meta name="description" content="Explore all topics and trends across technology, lifestyle, and culture on Trendiingz." />
        <style>{`
          /* Preload critical rendering */
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #f9fafb;
            z-index: -1;
          }
          
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          @keyframes gradientAnimation {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .bg-animated-gradient {
            background: linear-gradient(-45deg, #6366f1, #8b5cf6, #3b82f6, #4f46e5);
            background-size: 400% 400%;
            animation: gradientAnimation 20s ease infinite;
            will-change: background-position;
          }
          .text-gradient {
            background: linear-gradient(to right, #6366f1, #d946ef);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          
          /* Optimized glass card with reduced visual effects for better performance */
          .glass-card {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transform: translateZ(0);
            will-change: transform, opacity;
          }
          
          /* Only apply backdrop blur on larger screens where it performs better */
          @media (min-width: 1024px) {
            .glass-card {
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
            }
          }
          
          .card-hover-effect {
            transition: all 0.3s ease;
            will-change: transform, box-shadow;
          }
          .card-hover-effect:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.1), 0 10px 10px -5px rgba(99, 102, 241, 0.04);
          }
          
          /* Optimized animations */
          .animate-float {
            animation: float 8s ease-in-out infinite;
            will-change: transform;
          }
          
          /* Improved category button styling for better color transitions */
          .category-btn {
            position: relative;
            z-index: 1;
            overflow: hidden;
          }
          .category-btn span {
            position: relative;
            z-index: 2;
            transition: color 0.3s ease;
          }
          .category-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, #6366f1, #8b5cf6);
            z-index: 1;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
            transform: translateZ(0);
          }
          .category-btn.active::before {
            opacity: 1;
          }
          .category-btn.active span {
            color: white;
          }
          
          /* Optimized fade-in animations */
          .fade-in-up {
            opacity: 0;
            transform: translateY(15px);
            transition: opacity 0.6s ease, transform 0.6s ease;
            will-change: opacity, transform;
          }
          .fade-in-up.loaded {
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Optimized gradient overlay for consistent performance */
          .gradient-overlay {
            background: linear-gradient(to bottom right, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
            position: absolute;
            inset: 0;
            z-index: -1;
            border-radius: inherit;
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden relative">
        {/* Particles Background */}
        <div id="particles-js" className="absolute inset-0 z-0 opacity-40 pointer-events-none"></div>
        
        <Header />

        {/* Conditionally render content after basic layout is in place to reduce flickering */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          {/* Hero Section */}
          <div 
            ref={heroRef}
            onMouseMove={handleMouseMove}
            className={`relative overflow-hidden rounded-3xl bg-animated-gradient px-8 py-12 lg:px-10 lg:py-16 mb-12 lg:mb-16 shadow-xl fade-in-up ${isLoaded ? 'loaded' : ''}`}
          >
            <div className="relative z-10">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 lg:mb-6 tracking-tight">
                Explore <span className="relative inline-block">
                  Topics
                  <span className="absolute inset-x-0 bottom-0 h-2 bg-white opacity-30 rounded-full transform translate-y-2"></span>
                </span>
              </h1>
              <p className="text-indigo-100 max-w-2xl text-lg lg:text-xl leading-relaxed">
                Discover trends and insights across technology, lifestyle, culture, and more. Find what inspires you.
              </p>
              
              <div className="mt-6 lg:mt-8 flex flex-wrap gap-4">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative px-5 sm:px-7 py-3 bg-white rounded-lg leading-none flex items-center text-indigo-600 font-medium">
                    <span>Get Started</span>
                    <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
                
              </div>
            </div>
            
            {/* Simplified floating elements with conditional rendering */}
            {isContentVisible && (
              <>
                <div 
                  className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md animate-float"
                  style={{
                    transform: `translate(${mousePosition.x/80}px, ${mousePosition.y/80}px)`,
                    animationDelay: '0.5s'
                  }}
                ></div>
                <div 
                  className="absolute bottom-10 left-[30%] w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-md animate-float"
                  style={{
                    transform: `translate(${mousePosition.x/100}px, ${mousePosition.y/100}px)`,
                    animationDelay: '0s'
                  }}
                ></div>
              </>
            )}

            {/* Abstract Shapes */}
            <svg className="absolute bottom-0 left-0 w-full h-24 text-white/5" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
          </div>

          {/* Only render the rest when content visibility is ready */}
          {isContentVisible && (
            <>
              {/* Search and Filter Section */}
              <div className={`mb-12 lg:mb-16 space-y-6 lg:space-y-8 fade-in-up ${isLoaded ? 'loaded' : ''}`} style={{ transitionDelay: '0.1s' }}>
                <div className="max-w-lg mx-auto">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative bg-white rounded-xl border border-gray-200">
                      <input
                        type="text"
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-4 py-4 rounded-xl focus:ring-0 focus:outline-none bg-transparent text-gray-700 placeholder-gray-400"
                      />
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center">
                        <svg className="h-6 w-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="relative">
                  <div className="gradient-overlay rounded-3xl"></div>
                  <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`category-btn px-4 py-3 lg:py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                        activeCategory === 'all'
                          ? 'active shadow-lg'
                          : 'bg-white text-gray-700 hover:text-indigo-600 shadow-sm'
                      }`}
                    >
                      <span>All Topics</span>
                    </button>
                    {Object.keys(topicCategories).map((category, index) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`category-btn px-4 py-3 lg:py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                          activeCategory === category
                            ? 'active shadow-lg'
                            : 'bg-white text-gray-700 hover:text-indigo-600 shadow-sm'
                        }`}
                        style={{ 
                          transitionDelay: `${Math.min(index * 20, 200)}ms` 
                        }}
                      >
                        <span>{category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topics Grid */}
              <div 
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 fade-in-up ${isLoaded ? 'loaded' : ''}`}
                style={{ transitionDelay: '0.2s' }}
              >
                {filteredTopics.map((topic, index) => (
                  <Link
                    key={`${topic.category}-${topic.name}`}
                    href={`/topics/${topic.name.toLowerCase()}`}
                    className="group relative bg-white rounded-2xl overflow-hidden card-hover-effect shadow-sm border border-gray-100"
                    style={{ 
                      transitionDelay: `${Math.min(index * 25, 300)}ms` 
                    }}
                  >
                    <div className="p-6 lg:p-8 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-4 lg:space-x-5 pr-2">
                          <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-indigo-100 opacity-50"></div>
                            <span className="relative text-3xl lg:text-4xl z-10">{topic.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300 text-lg truncate">
                              {topic.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{topic.count} articles</p>
                          </div>
                        </div>
                        {topic.hot && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm flex-shrink-0 whitespace-nowrap">
                            Hot 🔥
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        <div className="h-px w-full bg-gray-100 mb-4"></div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 flex items-center truncate mr-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-2 flex-shrink-0"></span>
                            <span className="truncate">{topic.category}</span>
                          </p>
                          <span className="text-indigo-500 group-hover:text-indigo-600 transition-colors flex items-center text-sm whitespace-nowrap">
                            <span className="mr-1">Explore</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* No Results */}
              {filteredTopics.length === 0 && (
                <div className={`text-center py-16 lg:py-20 rounded-3xl overflow-hidden relative bg-white shadow-sm border border-gray-100 fade-in-up ${isLoaded ? 'loaded' : ''}`} style={{ transitionDelay: '0.2s' }}>
                  <div className="relative">
                    <div className="inline-block text-6xl lg:text-7xl mb-6 animate-float">🔍</div>
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">No topics found</h3>
                    <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search or filter criteria to find what you're looking for</p>
                    <button 
                      onClick={() => {setSearchQuery(''); setActiveCategory('all');}}
                      className="mt-6 px-6 py-3 rounded-xl text-white font-medium relative group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 group-hover:scale-105"></div>
                      <span className="relative">Clear filters</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Footer CTA Section */}
              {filteredTopics.length > 0 && (
                <div className={`mt-16 lg:mt-20 text-center relative overflow-hidden rounded-3xl bg-animated-gradient px-6 lg:px-8 py-12 lg:py-16 shadow-xl fade-in-up ${isLoaded ? 'loaded' : ''}`} style={{ transitionDelay: '0.3s' }}>
                  <div className="relative z-10">
                    <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Ready to dive deeper?</h2>
                    <p className="text-indigo-100 max-w-2xl mx-auto mb-8">
                      Explore our premium content and stay ahead of the trends with personalized insights.
                    </p>

                  </div>
                  
                  {/* Decorative Elements - simplified */}
                  <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-white opacity-10 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white opacity-10 blur-2xl"></div>
                </div>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
} 