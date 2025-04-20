
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, MessageCircle, User, Brain, BookOpen } from 'lucide-react';

const HomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-arcade-dark p-4">
      <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
        <div className="mt-12 mb-8 text-center">
          <h1 className="text-5xl font-bold arcade-text mb-2 neon-border p-4">
            BreakPoint
          </h1>
          <p className="text-[#FFFFFF] font-medium">Play. Learn. Escape.</p>
        </div>

        <div className="w-full space-y-4 mt-8">
          <button 
            onClick={() => navigate('/scenario')}
            className="arcade-button w-full flex items-center justify-center space-x-2"
          >
            <Rocket size={20} />
            <span>Start New Scenario</span>
          </button>
          
          <button 
            onClick={() => navigate('/therapist')}
            className="arcade-button w-full flex items-center justify-center space-x-2"
          >
            <MessageCircle size={20} />
            <span>Talk to Therapist</span>
          </button>
          
          <button 
            onClick={() => navigate('/profile')}
            className="arcade-button w-full flex items-center justify-center space-x-2"
          >
            <User size={20} />
            <span>View Profile</span>
          </button>
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={() => navigate('/memory-game')}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <Brain size={18} />
            <span>Memory Game</span>
          </button>
          
          <button 
            onClick={() => navigate('/journal')}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <BookOpen size={18} />
            <span>Journal</span>
          </button>
        </div>
      </div>
      
      
    </div>
  );
};

export default HomeScreen;
