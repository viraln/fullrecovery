import { useState } from 'react'

export default function ArticleReactions({ postSlug }) {
  const [reactions, setReactions] = useState({
    like: { count: 24, active: false },
    brilliant: { count: 18, active: false },
    love: { count: 12, active: false },
    thoughtful: { count: 7, active: false }
  })

  const handleReaction = (type) => {
    setReactions(prev => {
      const wasPreviouslyActive = prev[type].active
      
      // Create a copy of the current state
      const newState = { ...prev }
      
      // Toggle the active state
      newState[type] = {
        count: prev[type].count + (wasPreviouslyActive ? -1 : 1),
        active: !wasPreviouslyActive
      }
      
      return newState
    })
  }

  return (
    <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-4 py-4 border-t border-b border-gray-200 my-8">
      <div className="text-sm text-gray-600 self-center mb-2 sm:mb-0">What did you think?</div>
      
      <div className="flex space-x-3 justify-center sm:justify-start">
        <ReactionButton 
          emoji="👍" 
          label="Helpful" 
          count={reactions.like.count}
          active={reactions.like.active}
          onClick={() => handleReaction('like')}
        />
        
        <ReactionButton 
          emoji="💡" 
          label="Brilliant" 
          count={reactions.brilliant.count}
          active={reactions.brilliant.active}
          onClick={() => handleReaction('brilliant')}
        />
        
        <ReactionButton 
          emoji="❤️" 
          label="Love" 
          count={reactions.love.count}
          active={reactions.love.active}
          onClick={() => handleReaction('love')}
        />
        
        <ReactionButton 
          emoji="🤔" 
          label="Thoughtful" 
          count={reactions.thoughtful.count}
          active={reactions.thoughtful.active}
          onClick={() => handleReaction('thoughtful')}
        />
      </div>
    </div>
  )
}

function ReactionButton({ emoji, label, count, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center group ${active ? 'scale-110' : ''}`}
    >
      <span className={`text-xl sm:text-2xl transition-transform transform group-hover:scale-125 ${active ? 'animate-pulse' : ''}`}>
        {emoji}
      </span>
      <span className={`text-xs mt-1 ${active ? 'font-bold text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
        {count}
      </span>
    </button>
  )
} 