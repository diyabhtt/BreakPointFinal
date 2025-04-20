import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Heart } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './AuthProvider';

interface Message {
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

type ScenarioType = 'boyfriend-level-1' | 'boyfriend-level-2' | 'coworker-level-1' | 'parent-level-1';

interface ScenarioInfo {
  title: string;
  subtitle: string;
  initialMessage: string;
  character: string;
}

const scenarioData: Record<ScenarioType, ScenarioInfo> = {
  'boyfriend-level-1': {
    title: 'Boyfriend Scenario',
    subtitle: 'Level 1: Insecurity & Control',
    initialMessage: "Hey babe, I just saw you're going out tonight? Who are you going with? I thought we agreed you'd spend more time with me.",
    character: 'Insecure and Controlling Boyfriend'
  },
  'boyfriend-level-2': {
    title: 'Boyfriend Scenario',
    subtitle: 'Level 2: Gaslighting',
    initialMessage: "I never said you couldn't go out with your friends. You're always twisting my words. Why do you always make me the bad guy?",
    character: 'Manipulative Boyfriend'
  },
  'coworker-level-1': {
    title: 'Coworker Scenario',
    subtitle: 'Level 1: Workplace Bullying',
    initialMessage: "I noticed you got credit for that project. Did you actually do any real work on it?",
    character: 'Toxic Coworker'
  },
  'parent-level-1': {
    title: 'Parent Scenario',
    subtitle: 'Level 1: Unrealistic Expectations',
    initialMessage: "Why did you only get a B+ on that test? Your cousin always gets straight As.",
    character: 'Critical Parent'
  }
};

const ScenarioGame = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [health, setHealth] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>('boyfriend-level-1');
  const [isTyping, setIsTyping] = useState(false);
  const [scenarioCompleted, setScenarioCompleted] = useState(false);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    resetScenario(currentScenario);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const resetScenario = (scenario: ScenarioType) => {
    setMessages([
      {
        sender: 'ai',
        content: scenarioData[scenario].initialMessage,
        timestamp: new Date(),
      },
    ]);
    setHealth(100);
    setScenarioCompleted(false);
    setReason(undefined);
  };

  const updateStats = async (escaped: boolean) => {
    if (!user) return;
    try {
      const { data: existingStats } = await supabase
        .from('Profile stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingStats) {
        await supabase
          .from('Profile stats')
          .update({
            'Scenarios Escaped': escaped ? (existingStats['Scenarios Escaped'] || 0) + 1 : existingStats['Scenarios Escaped'] || 0,
            'First Step': existingStats['First Step'] || new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('Profile stats')
          .insert({
            user_id: user.id,
            'Scenarios Escaped': escaped ? 1 : 0,
            'Journal Entries': 0,
            'Therapist chat': 0,
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

  const finishScenario = (success: boolean, reason?: string) => {
    setScenarioCompleted(true);
    setShowAnalysisPopup(true); // Show the analysis pop-up
    setReason(reason);

    if (success) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        content: "You handled the situation well. Great job maintaining boundaries!",
        timestamp: new Date()
      }]);
      updateStats(true);
      toast.success("You Win! Scenario completed successfully!");
    } else {
      setMessages(prev => [...prev, {
        sender: 'ai',
        content: reason || "Your emotional health has been depleted. Reflect on what went wrong.",
        timestamp: new Date()
      }]);
      updateStats(false);
      toast.error("You Lose! " + (reason || "Emotional health depleted."));
    }
  };

  const renderEndScreen = () => {
    if (!scenarioCompleted) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white dark:bg-[#1A1F2C] text-[#4a4b90] dark:text-[#dcd6f7] rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">
            {health > 0 ? "You Win!" : "You Lose!"}
          </h2>
          <p className="text-sm mb-6">
            {health > 0
              ? "You successfully navigated the scenario by setting boundaries or finding a compromise."
              : "Your emotional health was depleted. Reflect on the scenario and consider strategies for improvement."}
          </p>
          <button
            className="bg-[#8B5CF6] text-white py-2 px-4 rounded-lg hover:bg-[#7c4ddf] transition-all"
            onClick={() => setShowAnalysisPopup(true)}
          >
            View Analysis
          </button>
        </div>
      </div>
    );
  };

  const closeAnalysisPopup = () => {
    setShowAnalysisPopup(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || scenarioCompleted) return;
    const userMessage = {
      sender: 'user' as const,
      content: input,
      timestamp: new Date()
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
          scenario: currentScenario,
          character: scenarioData[currentScenario].character
        }
      });

      if (error) throw error;

      setTimeout(() => {
        setIsTyping(false);
        const aiMessage = {
          sender: 'ai' as const,
          content: data.choices[0].message.content,
          timestamp: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);

        // Check for escape or submissive behavior
        if (messages.length > 5) {
          const didEscape = aiMessage.content.toLowerCase().includes('understand') ||
            aiMessage.content.toLowerCase().includes('sorry') ||
            aiMessage.content.toLowerCase().includes("you're right");
          if (didEscape) {
            finishScenario(true);
            return;
          }

          const submissivePhrases = ['okay', 'fine', 'you are right', 'i will do it', 'whatever you want'];
          const isSubmissive = submissivePhrases.some(phrase =>
            userMessage.content.toLowerCase().includes(phrase)
          );

          if (isSubmissive) {
            finishScenario(false, "You were too submissive, allowing the boyfriend to control the situation.");
            return;
          }
        }

        // Check for toxic responses
        const toxicPhrases = ['you always', 'never', 'should have', 'your fault', 'whatever'];
        const isToxicResponse = toxicPhrases.some(phrase =>
          aiMessage.content.toLowerCase().includes(phrase)
        );

        const healthChange = isToxicResponse ? -15 : -5;
        const newHealth = Math.max(0, health + healthChange);
        setHealth(newHealth);

        if (newHealth <= 0) {
          finishScenario(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      toast.error("There was an error processing your response");
    } finally {
      setIsLoading(false);
    }
  };

  const changeScenario = (scenario: ScenarioType) => {
    setCurrentScenario(scenario);
    resetScenario(scenario);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-safe-light">
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">{scenarioData[currentScenario].title}</h1>
          <p className="text-xs text-muted-foreground">{scenarioData[currentScenario].subtitle}</p>
        </div>
        <div className="flex items-center">
          <Heart size={20} className="text-red-500 mr-1" />
          <span>{health}</span>
        </div>
      </div>

      <div className="flex overflow-x-auto p-2 space-x-2 bg-white border-b">
        {Object.entries(scenarioData).map(([key, data]) => (
          <button
            key={key}
            onClick={() => changeScenario(key as ScenarioType)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
              currentScenario === key
                ? 'bg-therapy text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {data.title.split(' ')[0]}: {data.subtitle.split(':')[1].trim()}
          </button>
        ))}
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

      {renderEndScreen()}

      {showAnalysisPopup && (
        <div className="popup-container">
          <div className="popup">
            <h2 className="popup-header">Scenario Analysis</h2>
            <div className="popup-content">
              <p><strong>Scenario:</strong> {scenarioData[currentScenario].title}</p>
              <p><strong>Character:</strong> {scenarioData[currentScenario].character}</p>
              <p><strong>Analysis:</strong> {health > 0
                ? "You demonstrated resilience and effective communication. You stood up for yourself and maintained boundaries, which is key to healthy relationships."
                : reason === "You were too submissive, allowing the boyfriend to control the situation."
                  ? "You were too submissive in this scenario. Submissive behavior can reinforce controlling tendencies in others. It's important to assert your needs and boundaries."
                  : "The scenario highlighted areas for growth. Consider practicing assertiveness and self-care to navigate similar situations in the future."}
              </p>
              <p><strong>Critique:</strong> {reason === "You were too submissive, allowing the boyfriend to control the situation."
                ? "You agreed too easily or avoided conflict, which allowed the boyfriend to maintain control. This behavior can lead to unhealthy dynamics where your needs are ignored."
                : "You may have struggled to communicate effectively or maintain boundaries. Reflect on how you could have responded differently to achieve a better outcome."}
              </p>
              <p><strong>Boyfriend's Behavior:</strong> The boyfriend displayed controlling and manipulative tendencies, likely stemming from insecurity or past experiences. While this doesn't excuse his behavior, understanding the root cause can help you approach the situation with empathy while maintaining firm boundaries.</p>
              <p><strong>Suggestions:</strong> {reason === "You were too submissive, allowing the boyfriend to control the situation."
                ? "Practice assertiveness by calmly expressing your needs and standing firm when faced with controlling behavior. Use 'I' statements to communicate how you feel without escalating the situation."
                : "Continue reflecting on your responses and consider seeking support from a therapist or trusted individual to build confidence in handling similar scenarios."}
              </p>
            </div>
            <div className="popup-actions">
              <button className="popup-button popup-button-close" onClick={() => navigate('/')}>Close</button>
              <button className="popup-button popup-button-analyze" onClick={() => navigate('/therapist')}>Analyze Further</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center p-4 border-t bg-white">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={scenarioCompleted ? "Scenario completed" : "Type your response..."}
          className="flex-1 resize-none outline-none border border-gray-200 rounded-full p-3 focus:border-therapy focus:ring-1 focus:ring-therapy"
          rows={1}
          disabled={scenarioCompleted}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim() || scenarioCompleted}
          className={`ml-2 p-3 rounded-full ${
            isLoading || !input.trim() || scenarioCompleted
              ? 'bg-gray-100 text-gray-400'
              : 'bg-therapy text-white'
          }`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ScenarioGame;
