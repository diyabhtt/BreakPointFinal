
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './AuthProvider';

interface JournalEntry {
  id: number;
  date: Date;
  mood: number;
  content: string;
}

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState<string>('');
  const [mood, setMood] = useState<number>(3);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      loadJournalEntries();
      setupRealtimeJournalUpdates();
    }
  }, [user]);

  const setupRealtimeJournalUpdates = () => {
    if (!user) return;
    
    const channel = supabase
      .channel('journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Journal',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadJournalEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };
  
  const loadJournalEntries = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('Journal')
        .select('Entries')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading journal entries:', error);
        toast.error('Failed to load journal entries');
        return;
      }
      
      if (data && data.Entries) {
        const parsedEntries = JSON.parse(data.Entries);
        setEntries(parsedEntries.map((entry: any) => ({
          ...entry,
          date: new Date(entry.date)
        })));
      }
    } catch (error) {
      console.error('Error parsing journal entries:', error);
      toast.error('Failed to parse journal entries');
    } finally {
      setLoading(false);
    }
  };
  
  const updateJournalStats = async () => {
    if (!user) return;
    
    try {
      // Check if user already has stats
      const { data: existingStats, error: statsError } = await supabase
        .from('Profile stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (statsError) {
        console.error('Error fetching stats:', statsError);
        return;
      }
      
      if (existingStats) {
        // Update existing stats
        await supabase
          .from('Profile stats')
          .update({
            'Journal Entries': (existingStats['Journal Entries'] || 0) + 1,
            'Journal Journey': existingStats['Journal Journey'] || new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Create new stats
        await supabase
          .from('Profile stats')
          .insert({
            user_id: user.id,
            'Scenarios Escaped': 0,
            'Journal Entries': 1,
            'Therapist chat': 0,
            'Minigames Played': 0,
            'First Step': new Date().toISOString(),
            'Opening Up': new Date().toISOString(),
            'Journal Journey': new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating journal stats:', error);
    }
  };
  
  const getMoodEmoji = (moodValue: number) => {
    switch (moodValue) {
      case 1: return '😢';
      case 2: return '😔';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😄';
      default: return '😐';
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const handleSaveEntry = async () => {
    if (!newEntry.trim() || !user) {
      toast.error("Please write something in your journal");
      return;
    }
    
    const newJournalEntry: JournalEntry = {
      id: Date.now(),
      date: new Date(),
      mood: mood,
      content: newEntry
    };
    
    const updatedEntries = [newJournalEntry, ...entries];
    
    try {
      // Save to database
      const { data, error } = await supabase
        .from('Journal')
        .upsert({ 
          user_id: user.id,
          Entries: JSON.stringify(updatedEntries)
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      setEntries(updatedEntries);
      setNewEntry('');
      setMood(3);
      toast.success("Journal entry saved");
      
      // Update profile stats
      updateJournalStats();
      
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error("Failed to save journal entry");
    }
  };
  
  const handleViewEntry = (entry: JournalEntry) => {
    setViewingEntry(entry);
  };
  
  const handleBackToList = () => {
    setViewingEntry(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-arcade-dark">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1A1F2C] border-b-2 border-[#8B5CF6]">
        <button 
          onClick={() => navigate('/')}
          className="text-[#8B5CF6] hover:text-[#0EA5E9]"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold arcade-text">Journal</h1>
          <p className="text-xs text-[#E5DEFF]/60">Reflect and Process</p>
        </div>
        <div className="w-6"></div> {/* Empty div for layout balance */}
      </div>
      
      {viewingEntry ? (
        /* Single Entry View */
        <div className="flex-1 p-4">
          <button 
            onClick={handleBackToList}
            className="flex items-center text-[#8B5CF6] mb-4"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to entries</span>
          </button>
          
          <div className="arcade-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-[#E5DEFF]/60 flex items-center">
                <Calendar size={14} className="mr-1" />
                {formatDate(viewingEntry.date)}
              </div>
              <div className="text-2xl">{getMoodEmoji(viewingEntry.mood)}</div>
            </div>
            
            <p className="whitespace-pre-wrap">{viewingEntry.content}</p>
          </div>
        </div>
      ) : (
        /* Journal List and New Entry View */
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-[#E5DEFF]">Loading journal entries...</p>
            </div>
          ) : (
            <>
              {/* New Entry */}
              <div className="arcade-card mb-6">
                <h3 className="text-lg font-bold mb-3 text-[#0EA5E9]">How are you feeling today?</h3>
                
                <div className="flex justify-between items-center mb-4">
                  <button 
                    onClick={() => setMood(1)}
                    className={`text-3xl transition-transform ${mood === 1 ? 'transform scale-125' : ''}`}
                  >
                    😢
                  </button>
                  <button 
                    onClick={() => setMood(2)}
                    className={`text-3xl transition-transform ${mood === 2 ? 'transform scale-125' : ''}`}
                  >
                    😔
                  </button>
                  <button 
                    onClick={() => setMood(3)}
                    className={`text-3xl transition-transform ${mood === 3 ? 'transform scale-125' : ''}`}
                  >
                    😐
                  </button>
                  <button 
                    onClick={() => setMood(4)}
                    className={`text-3xl transition-transform ${mood === 4 ? 'transform scale-125' : ''}`}
                  >
                    🙂
                  </button>
                  <button 
                    onClick={() => setMood(5)}
                    className={`text-3xl transition-transform ${mood === 5 ? 'transform scale-125' : ''}`}
                  >
                    😄
                  </button>
                </div>
                
                <textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="What's on your mind today?"
                  className="w-full p-3 bg-[#2A2F3C] text-white border border-[#8B5CF6] rounded-lg focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] resize-none"
                  rows={5}
                />
                
                <button
                  onClick={handleSaveEntry}
                  className="arcade-button w-full mt-3 flex items-center justify-center"
                  disabled={!newEntry.trim()}
                >
                  <Save size={18} className="mr-2" />
                  Save Entry
                </button>
              </div>
              
              {/* Previous Entries */}
              <h3 className="text-lg font-bold mb-3 text-[#F97316]">Previous Entries</h3>
              {entries.length > 0 ? (
                <div className="space-y-3">
                  {entries.map(entry => (
                    <div 
                      key={entry.id}
                      className="arcade-card cursor-pointer hover:border-[#F97316] transition-colors"
                      onClick={() => handleViewEntry(entry)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-[#E5DEFF]/60">
                          {formatDate(entry.date)}
                        </div>
                        <div className="text-2xl">{getMoodEmoji(entry.mood)}</div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#E5DEFF]/60 py-4 bg-[#1A1F2C] rounded-lg border border-[#8B5CF6]">
                  No journal entries yet. Start writing!
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Journal;
