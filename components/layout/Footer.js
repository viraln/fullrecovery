import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Trendiingz</h3>
            <p className="text-gray-600 mb-4">
              AI-powered insights on the latest tech trends and innovations.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/all-topics" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
                  All Topics
                </Link>
              </li>
              {/* <li>
                <Link href="/generate-article" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
                  Generate Article
                </Link>
              </li> */}
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Connect</h4>
            <div className="space-y-4">
              <p className="text-gray-600">
                Stay updated with the latest tech trends and insights.
              </p>
              <div className="flex space-x-4">
                <a href="https://twitter.com/trendiingz" target="_blank" className="text-gray-400 hover:text-indigo-600 transition-colors duration-200">
                  Twitter
                </a>
                {/* <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors duration-200">
                  LinkedIn
                </a>
                <a href="#" className="text-gray-400 hover:text-indigo-600 transition-colors duration-200">
                  GitHub
                </a> */}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Trendiingz. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <ul className="flex space-x-6">
              {/* <li>
                <a href="#" className="text-gray-500 text-sm hover:text-indigo-600 transition-colors duration-200">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-500 text-sm hover:text-indigo-600 transition-colors duration-200">
                  Terms of Service
                </a>
              </li> */}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}