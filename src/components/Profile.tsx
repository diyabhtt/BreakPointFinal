
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Heart, Star, BookOpen, MessageCircle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

interface UserProfileData {
  username: string;
  points: number;
  scenariosPlayed: number;
  scenariosEscaped: number;
  therapistChats: number;
  journalEntries: number;
  minigamesPlayed: number;
  achievements: {
    id: number;
    name: string;
    description: string;
    date: string;
    icon: string;
  }[];
  level: number;
  nextLevelPoints: number;
  streakDays: number;
  lastActive: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData>({
    username: user?.email?.split('@')[0] || 'User',
    points: 0,
    scenariosPlayed: 0,
    scenariosEscaped: 0,
    therapistChats: 0,
    journalEntries: 0,
    minigamesPlayed: 0,
    achievements: [],
    level: 1,
    nextLevelPoints: 100,
    streakDays: 0,
    lastActive: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
      setupRealtimeUpdates();
    }
  }, [user]);

  const setupRealtimeUpdates = () => {
    if (!user) return;
    
    const channel = supabase
      .channel('profile-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Profile stats',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('Profile stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user stats:', error);
        return;
      }

      if (data) {
        // Calculate points based on activities
        const points = (data['Scenarios Escaped'] * 50) + 
                      (data['Therapist chat'] * 10) + 
                      (data['Journal Entries'] * 20) + 
                      (data['Minigames Played'] * 15);

        const level = Math.floor(points / 100) + 1;
        const nextLevelPoints = level * 100;

        // Build achievements array
        const achievements = [];
        
        if (data['First Step'] && new Date(data['First Step']) instanceof Date) {
          achievements.push({
            id: 1,
            name: 'First Step',
            description: 'Completed your first scenario',
            date: new Date(data['First Step']).toISOString().split('T')[0],
            icon: 'trophy'
          });
        }
        
        if (data['Opening Up'] && new Date(data['Opening Up']) instanceof Date) {
          achievements.push({
            id: 2,
            name: 'Opening Up',
            description: 'First chat with the therapist',
            date: new Date(data['Opening Up']).toISOString().split('T')[0],
            icon: 'message-circle'
          });
        }
        
        if (data['Journal Journey'] && new Date(data['Journal Journey']) instanceof Date) {
          achievements.push({
            id: 3,
            name: 'Journal Journey',
            description: 'Wrote your first journal entry',
            date: new Date(data['Journal Journey']).toISOString().split('T')[0],
            icon: 'book-open'
          });
        }

        setProfileData({
          username: user?.email?.split('@')[0] || 'User',
          points: points,
          scenariosPlayed: data['Scenarios Escaped'] > 0 ? data['Scenarios Escaped'] + 1 : 0,
          scenariosEscaped: data['Scenarios Escaped'] || 0,
          therapistChats: data['Therapist chat'] || 0,
          journalEntries: data['Journal Entries'] || 0,
          minigamesPlayed: data['Minigames Played'] || 0,
          achievements: achievements,
          level: level,
          nextLevelPoints: nextLevelPoints,
          streakDays: calculateStreakDays(data),
          lastActive: new Date().toISOString().split('T')[0]
        });
      } else {
        // Create empty profile stats if none exist
        await supabase
          .from('Profile stats')
          .insert({
            user_id: user.id,
            'Scenarios Escaped': 0,
            'Journal Entries': 0,
            'Therapist chat': 0,
            'Minigames Played': 0,
            'First Step': null,
            'Opening Up': null,
            'Journal Journey': null
          });
      }
    } catch (error) {
      console.error('Error in loadUserStats:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStreakDays = (data) => {
    // Simple streak calculation logic
    const today = new Date();
    let streakCount = 0;
    
    // Calculate streak based on most recent activity
    const dates = [
      data['First Step'], 
      data['Opening Up'], 
      data['Journal Journey']
    ].filter(date => date);
    
    if (dates.length === 0) return 0;
    
    // Sort dates in descending order (most recent first)
    const sortedDates = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const mostRecentDate = new Date(sortedDates[0]);
    
    // If most recent activity was today or yesterday, count it as streak
    const dayDiff = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff <= 1) {
      streakCount = 1;
    }
    
    return streakCount;
  };
  
  const calculateLevelProgress = () => {
    const pointsForCurrentLevel = (profileData.level - 1) * 100;
    const currentLevelPoints = profileData.points - pointsForCurrentLevel;
    return Math.min(100, (currentLevelPoints / 100) * 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arcade-dark">
        <p className="text-[#FFFFF] text-lg">Loading profile...</p>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold arcade-text">Your Profile</h1>
          <p className="text-xs text-[#E5DEFF]/60">Progress & Achievements</p>
        </div>
        <div className="w-6"></div> {/* Empty div for layout balance */}
      </div>
      
      {/* User Info */}
      <div className="p-4">
        <div className="arcade-card">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#8B5CF6] to-[#0EA5E9] rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.email?.substring(0, 1).toUpperCase() || "U"}
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-bold text-white">{user?.email?.split('@')[0] || "User"}</h2>
              <div className="flex items-center">
                <Star size={16} className="text-yellow-400 mr-1" />
                <span className="text-sm text-[#E5DEFF]">{profileData.points} points</span>
              </div>
              <p className="text-xs text-[#E5DEFF]/60">Level {profileData.level}</p>
            </div>
          </div>
          
          {/* Level Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1 text-[#E5DEFF]">
              <span>Level {profileData.level}</span>
              <span>{profileData.points}/{profileData.nextLevelPoints} XP</span>
            </div>
            <div className="h-3 bg-[#2A2F3C] rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#0EA5E9]"
                style={{ width: `${calculateLevelProgress()}%` }}
              ></div>
            </div>
          </div>
          
          {/* Streak */}
          <div className="flex items-center justify-center p-2 bg-[#2A2F3C] rounded-lg mb-4">
            <p className="text-sm text-[#E5DEFF]">
              <span className="font-medium">{profileData.streakDays} day streak!</span> Last active: Today
            </p>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-bold mb-2 text-[#FFFFFF]">Your Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="arcade-card flex items-center">
            <Heart size={20} className="text-[#ea384c] mr-2" />
            <div>
              <p className="text-sm font-medium text-white">{profileData.scenariosEscaped}/{profileData.scenariosPlayed}</p>
              <p className="text-xs text-[#E5DEFF]/60">Scenarios Escaped</p>
            </div>
          </div>
          
          <div className="arcade-card flex items-center">
            <MessageCircle size={20} className="text-[#8B5CF6] mr-2" />
            <div>
              <p className="text-sm font-medium text-white">{profileData.therapistChats}</p>
              <p className="text-xs text-[#E5DEFF]/60">Therapist Chats</p>
            </div>
          </div>
          
          <div className="arcade-card flex items-center">
            <BookOpen size={20} className="text-[#8B5CF6] mr-2" />
            <div>
              <p className="text-sm font-medium text-white">{profileData.journalEntries}</p>
              <p className="text-xs text-[#E5DEFF]/60">Journal Entries</p>
            </div>
          </div>
          
          <div className="arcade-card flex items-center">
            <Brain size={20} className="text-[#8B5CF6] mr-2" />
            <div>
              <p className="text-sm font-medium text-white">{profileData.minigamesPlayed}</p>
              <p className="text-xs text-[#E5DEFF]/60">Minigames Played</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Achievements */}
      <div className="px-4 pb-8 flex-1">
        <h3 className="text-lg font-bold mb-2 text-[#0EA5E9]">Achievements</h3>
        {profileData.achievements.length > 0 ? (
          <div className="space-y-3">
            {profileData.achievements.map(achievement => (
              <div key={achievement.id} className="arcade-card flex items-start">
                <div className="w-10 h-10 bg-[#2A2F3C] rounded-full flex items-center justify-center text-[#F97316] mr-3">
                  {achievement.icon === 'trophy' && <Trophy size={20} />}
                  {achievement.icon === 'message-circle' && <MessageCircle size={20} />}
                  {achievement.icon === 'book-open' && <BookOpen size={20} />}
                </div>
                <div>
                  <p className="font-bold text-white">{achievement.name}</p>
                  <p className="text-sm text-[#E5DEFF]">{achievement.description}</p>
                  <p className="text-xs text-[#E5DEFF]/60">Earned on {achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[#E5DEFF]/60 py-4 bg-[#1A1F2C] rounded-lg border border-[#8B5CF6]">
            No achievements yet. Start playing scenarios, chatting with the therapist, or writing journal entries!
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
