
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Brain } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './AuthProvider';

interface Message {
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const Therapist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        content: "Hi there, I'm Dr. Maya, your AI therapist. How are you feeling today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
            'Therapist chat': (existingStats['Therapist chat'] || 0) + 1,
            'Opening Up': existingStats['Opening Up'] || new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Create new stats
        await supabase
          .from('Profile stats')
          .insert({
            user_id: user.id,
            'Therapist chat': 1,
            'Journal Entries': 0,
            'Scenarios Escaped': 0,
            'Minigames Played': 0,
            'First Step': new Date().toISOString(),
            'Opening Up': new Date().toISOString(),
            'Journal Journey': new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      sender: 'user' as const,
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          scenario: 'therapist',
          concise: true
        }
      });

      if (error) throw error;

      // Add a slight delay to simulate typing
      setTimeout(() => {
        setIsTyping(false);
        
        const aiMessage = {
          sender: 'ai' as const,
          content: data.choices[0].message.content,
          timestamp: new Date(),
        };
        
        setMessages(prevMessages => [...prevMessages, aiMessage]);
        updateStats();
      }, 1500);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      toast.error("There was an error processing your message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-safe-light">
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="text-therapy-dark hover:text-therapy"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">Dr. Maya</h1>
          <p className="text-xs text-muted-foreground">AI Therapist</p>
        </div>
        <button 
          onClick={() => navigate('/memory-game')}
          className="text-therapy hover:text-therapy-dark"
        >
          <Brain size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`${
              message.sender === 'user' 
                ? 'chat-bubble-user ml-auto' 
                : 'chat-bubble-ai mr-auto'
            } max-w-[75%]`}
          >
            {message.content}
          </div>
        ))}
        
        {isTyping && (
          <div className="chat-bubble-ai mr-auto max-w-[75%] flex space-x-1">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white border-t">
        <div className="flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none outline-none border border-gray-200 rounded-full p-3 focus:border-therapy focus:ring-1 focus:ring-therapy"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className={`ml-2 p-3 rounded-full ${
              isLoading || !input.trim()
                ? 'bg-gray-100 text-gray-400'
                : 'bg-therapy text-white'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Therapist;
