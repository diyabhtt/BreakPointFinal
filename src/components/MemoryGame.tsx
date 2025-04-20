
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './AuthProvider';

interface Card {
  id: number;
  emoji: string;
  emotion: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const emotions = [
  { emoji: '😄', emotion: 'happy' },
  { emoji: '😢', emotion: 'sad' },
  { emoji: '😠', emotion: 'angry' },
  { emoji: '😨', emotion: 'scared' },
  { emoji: '😌', emotion: 'peaceful' },
  { emoji: '🥰', emotion: 'loved' },
  { emoji: '🙄', emotion: 'annoyed' },
  { emoji: '😲', emotion: 'surprised' },
];

const MemoryGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  
  // Initialize the game
  useEffect(() => {
    startNewGame();
  }, []);
  
  const startNewGame = () => {
    // Create pairs of cards
    const cardPairs = [...emotions, ...emotions].map((item, index) => ({
      id: index,
      emoji: item.emoji,
      emotion: item.emotion,
      isFlipped: false,
      isMatched: false,
    }));
    
    // Shuffle the cards
    const shuffledCards = cardPairs.sort(() => Math.random() - 0.5);
    
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setGameOver(false);
    setStartTime(Date.now());
    setEndTime(null);
  };
  
  const updateStats = async () => {
    if (!user) return;
    
    try {
      // First check if user already has stats
      const { data: existingStats } = await supabase
        .from('Profile stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existingStats) {
        // Update existing stats
        await supabase
          .from('Profile stats')
          .update({
            'Minigames Played': (existingStats['Minigames Played'] || 0) + 1
          })
          .eq('user_id', user.id);
      } else {
        // Create new stats
        await supabase
          .from('Profile stats')
          .insert({
            user_id: user.id,
            'Minigames Played': 1,
            'Journal Entries': 0,
            'Therapist chat': 0,
            'Scenarios Escaped': 0,
            'First Step': new Date().toISOString(),
            'Opening Up': new Date().toISOString(),
            'Journal Journey': new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };
  
  const handleCardClick = (id: number) => {
    // Ignore click if game is over or if clicking an already flipped/matched card
    if (gameOver || cards[id].isFlipped || cards[id].isMatched) {
      return;
    }
    
    // Ignore if we already have 2 cards flipped
    if (flippedCards.length === 2) {
      return;
    }
    
    // Flip the card
    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);
    
    // Add card to flipped cards
    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);
    
    // If we have 2 cards flipped, check for a match
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      
      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = newCards[firstCardId];
      const secondCard = newCards[secondCardId];
      
      if (firstCard.emotion === secondCard.emotion) {
        // We have a match
        newCards[firstCardId].isMatched = true;
        newCards[secondCardId].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);
        setMatchedPairs(matchedPairs + 1);
        
        // Check if game is over
        if (matchedPairs + 1 === emotions.length) {
          setGameOver(true);
          setEndTime(Date.now());
          updateStats();
          toast.success("Congratulations! You matched all emotions!");
        }
      } else {
        // No match, flip the cards back after a short delay
        setTimeout(() => {
          newCards[firstCardId].isFlipped = false;
          newCards[secondCardId].isFlipped = false;
          setCards(newCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };
  
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const calculateScore = (): number => {
    if (!endTime || !startTime) return 0;
    
    const timeInSeconds = (endTime - startTime) / 1000;
    const baseScore = 1000;
    const timeDeduction = timeInSeconds * 5;
    const movesDeduction = moves * 10;
    
    return Math.max(Math.round(baseScore - timeDeduction - movesDeduction), 100);
  };

  return (
    <div className="flex flex-col h-screen bg-safe-light">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="text-therapy-dark hover:text-therapy"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">Match the Emotion</h1>
          <p className="text-xs text-muted-foreground">Memory Game</p>
        </div>
        <div className="w-6"></div> {/* Empty div for layout balance */}
      </div>
      
      {/* Game Stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-b border-gray-100">
        <div className="flex items-center">
          <Clock size={16} className="text-therapy mr-1" />
          <span className="text-sm">
            {endTime 
              ? formatTime(endTime - startTime!) 
              : startTime 
                ? formatTime(Date.now() - startTime) 
                : '0:00'}
          </span>
        </div>
        <div className="text-sm font-medium">
          Moves: {moves}
        </div>
        <div className="flex items-center">
          <Star size={16} className="text-yellow-400 mr-1" />
          <span className="text-sm">{gameOver ? calculateScore() : 0}</span>
        </div>
      </div>
      
      {/* Game Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-4 gap-2 h-full">
          {cards.map((card, index) => (
            <div
              key={index}
              className={`memory-card ${card.isMatched ? 'memory-card-matched animate-pulse-gentle' : ''}`}
              onClick={() => handleCardClick(index)}
            >
              {card.isFlipped || card.isMatched ? card.emoji : '?'}
            </div>
          ))}
        </div>
      </div>
      
      {/* Game Controls */}
      <div className="p-4 bg-white border-t">
        <button
          onClick={startNewGame}
          className="w-full btn-primary"
        >
          {gameOver ? 'Play Again' : 'Restart Game'}
        </button>
      </div>
    </div>
  );
};

export default MemoryGame;
