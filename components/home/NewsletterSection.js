import { useState } from 'react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError('')
      
      // In a real implementation, we would make an API call to a subscriber service
      // For now, we'll just simulate a successful subscription
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIsSuccess(true)
      setEmail('')
    } catch (err) {
      setError('Failed to subscribe. Please try again.')
      console.error('Newsletter subscription error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-4 sm:p-8 my-8 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="md:max-w-md mb-6 md:mb-0 md:mr-8">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📮</span>
              <h2 className="text-xl sm:text-2xl font-bold">Stay in the loop</h2>
            </div>
            <p className="text-indigo-100 mb-4">
              Get the latest articles, tutorials, and tech news delivered straight to your inbox.
              No spam, unsubscribe anytime.
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-indigo-100">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-indigo-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Weekly updates</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-indigo-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Zero spam</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:max-w-md">
            {isSuccess ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Thank you for subscribing!</h3>
                <p className="text-indigo-100 text-sm">
                  You're now on our list. Look out for our next newsletter in your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Your email address"
                    className="w-full px-4 py-3 rounded-lg text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {error && <p className="mt-1 text-red-200 text-sm">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-800 hover:bg-indigo-900 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>Subscribe</>
                  )}
                </button>
              </form>
            )}
            <p className="text-xs text-center mt-3 text-indigo-200">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
