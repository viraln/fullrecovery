import Link from 'next/link'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/layout/Footer'

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page Not Found - Trendiingz</title>
        <meta name="description" content="Sorry, we couldn't find the page you're looking for. Explore our homepage to discover the latest technology trends and innovations." />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <h1 className="text-6xl font-extrabold text-indigo-600 mb-6">404</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
            <p className="text-gray-500 mb-8">Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.</p>
            
            <div className="space-y-3">
              <Link href="/" className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 transition">
                Return to Homepage
              </Link>
              <Link href="/topics/latest" className="block w-full bg-white text-indigo-600 border border-indigo-600 py-3 px-4 rounded-md font-medium hover:bg-indigo-50 transition">
                Browse Latest Topics
              </Link>
            </div>
            
            <div className="mt-10">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Popular Sections</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/topics/ai" className="bg-white p-3 rounded-md shadow-sm hover:shadow transition">
                  <span className="text-xl">🤖</span>
                  <p className="font-medium mt-1">AI</p>
                </Link>
                <Link href="/topics/tech" className="bg-white p-3 rounded-md shadow-sm hover:shadow transition">
                  <span className="text-xl">💻</span>
                  <p className="font-medium mt-1">Tech</p>
                </Link>
                <Link href="/topics/gaming" className="bg-white p-3 rounded-md shadow-sm hover:shadow transition">
                  <span className="text-xl">🎮</span>
                  <p className="font-medium mt-1">Gaming</p>
                </Link>
                <Link href="/topics/business" className="bg-white p-3 rounded-md shadow-sm hover:shadow transition">
                  <span className="text-xl">💼</span>
                  <p className="font-medium mt-1">Business</p>
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
} 