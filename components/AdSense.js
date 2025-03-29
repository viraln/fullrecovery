import { useEffect, useRef } from 'react'

export default function AdSense({ slot, format = 'auto', responsive = true, style }) {
  const adRef = useRef(null)

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return
    
    // Check if AdSense library is loaded
    if (window.adsbygoogle) {
      try {
        // Try to push the ad
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (error) {
        console.error('AdSense error:', error)
      }
    } else {
      console.warn('AdSense not loaded')
    }
  }, [])

  // Default styles for the ad container
  const defaultStyle = {
    display: 'block',
    textAlign: 'center',
    padding: '15px 0',
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    margin: '1.5rem 0',
    minHeight: '250px',
    ...style
  }

  return (
    <div className="ad-container" style={defaultStyle}>
      {/* This is a placeholder for the AdSense ad. In a real implementation, 
          we would render the actual AdSense script. For now, we'll just show 
          a placeholder. */}
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-gray-400 text-sm mb-2">Advertisement</div>
        <div className="w-full h-[250px] bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500 text-center px-4">
            Ad placeholder - In production, this would display an actual advertisement
          </p>
        </div>
      </div>
    </div>
  )
} 