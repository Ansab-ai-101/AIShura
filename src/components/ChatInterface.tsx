import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trophy, Target, BookOpen, Briefcase, User, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  xpGained?: number;
  tokensGained?: number;
  badge?: string;
  questUnlocked?: string;
  actionItems?: ActionItem[];
}

interface ActionItem {
  type: 'job' | 'course' | 'skill' | 'networking' | 'event';
  title: string;
  url: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface UserState {
  trustScore: number;
  xp: number;
  tokens: number;
  level: number;
  currentQuest?: string;
  badges: string[];
  isTyping: boolean;
  lastActivity: Date;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Welcome to your career journey! I'm AIShura, your emotionally intelligent career guide. I'm here to transform your career challenges into a story of growth. What's on your mind today? 🌟",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userState, setUserState] = useState<UserState>({
    trustScore: 45,
    xp: 250,
    tokens: 15,
    level: 3,
    badges: ['First Steps', 'Resume Builder'],
    isTyping: false,
    lastActivity: new Date(),
  });
  
  const [hesitationTimer, setHesitationTimer] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Hesitation detection
  useEffect(() => {
    if (userState.isTyping && inputValue.length > 0) {
      if (hesitationTimer) clearTimeout(hesitationTimer);
      
      const timer = setTimeout(() => {
        if (inputValue.length > 0) {
          handleHesitationDetected();
        }
      }, 8000); // 8 seconds of typing without sending
      
      setHesitationTimer(timer);
    }
    
    return () => {
      if (hesitationTimer) clearTimeout(hesitationTimer);
    };
  }, [inputValue, userState.isTyping]);

  const handleHesitationDetected = () => {
    const encouragementMessages = [
      "It's okay to be confused. We're in this together. 💙",
      "Finding the right words can be tough. No pressure, I'm here to help when you're ready.",
      "Take your time. Sometimes the best insights come when we pause to reflect.",
      "I sense you might be processing something important. I'm here whenever you're ready to share."
    ];
    
    const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    
    const hesitationMessage: Message = {
      id: Date.now().toString(),
      content: randomMessage,
      sender: 'ai',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, hesitationMessage]);
    toast.info("AIShura noticed you might need some encouragement");
  };

  const generateActionItems = (userMessage: string, aiResponse: string): ActionItem[] => {
    const actionItems: ActionItem[] = [];
    
    // Job-related keywords
    if (userMessage.toLowerCase().includes('job') || userMessage.toLowerCase().includes('career') || userMessage.toLowerCase().includes('work')) {
      actionItems.push({
        type: 'job',
        title: 'Explore Remote Opportunities',
        url: 'https://remoteok.io/remote-jobs',
        description: 'Browse 50,000+ remote job opportunities',
        priority: 'high'
      });
      
      actionItems.push({
        type: 'networking',
        title: 'Join Professional Networks',
        url: 'https://www.linkedin.com/groups/',
        description: 'Connect with industry professionals',
        priority: 'medium'
      });
    }
    
    // Skills and learning
    if (userMessage.toLowerCase().includes('skill') || userMessage.toLowerCase().includes('learn') || userMessage.toLowerCase().includes('course')) {
      actionItems.push({
        type: 'course',
        title: 'Free Programming Courses',
        url: 'https://www.freecodecamp.org/',
        description: 'Learn coding skills with hands-on projects',
        priority: 'high'
      });
      
      actionItems.push({
        type: 'course',
        title: 'Professional Development',
        url: 'https://www.coursera.org/browse/personal-development',
        description: 'Enhance your professional skills',
        priority: 'medium'
      });
    }
    
    // Resume and interview
    if (userMessage.toLowerCase().includes('resume') || userMessage.toLowerCase().includes('cv') || userMessage.toLowerCase().includes('interview')) {
      actionItems.push({
        type: 'skill',
        title: 'Resume Builder Tool',
        url: 'https://www.canva.com/resumes/templates/',
        description: 'Create a professional resume in minutes',
        priority: 'high'
      });
    }
    
    return actionItems;
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setUserState(prev => ({ ...prev, isTyping: false }));

    try {
      // Using Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: inputValue,
          userState: userState,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
        }
      });

      if (error) {
        throw new Error('Failed to get AI response: ' + error.message);
      }
      
      const actionItems = generateActionItems(inputValue, data.response);
      
      // Calculate rewards
      const xpGained = Math.floor(Math.random() * 30) + 10;
      const tokensGained = Math.floor(Math.random() * 5) + 1;
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
        xpGained,
        tokensGained,
        actionItems,
        badge: data.badgeUnlocked,
        questUnlocked: data.questUnlocked,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update user state
      setUserState(prev => ({
        ...prev,
        xp: prev.xp + xpGained,
        tokens: prev.tokens + tokensGained,
        level: Math.floor((prev.xp + xpGained) / 100) + 1,
        trustScore: Math.min(prev.trustScore + 2, 100),
        lastActivity: new Date(),
      }));

      // Show reward notification
      if (xpGained > 0) {
        toast.success(`You gained ${xpGained} XP and ${tokensGained} tokens!`);
      }
      
      if (data.badgeUnlocked) {
        toast.success(`🏆 New badge unlocked: ${data.badgeUnlocked}!`);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Something went wrong. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble connecting right now. Let me try to help you in a different way. What specific career challenge are you facing?",
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setUserState(prev => ({ ...prev, isTyping: true, lastActivity: new Date() }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getTrustScoreTone = (score: number) => {
    if (score <= 30) return { tone: 'Cheerful', color: 'bg-green-500', message: "Let's try again together today!" };
    if (score <= 70) return { tone: 'Practical', color: 'bg-yellow-500', message: "Your focus time was short yesterday. Want a new routine?" };
    return { tone: 'Strategic', color: 'bg-blue-500', message: "Let's strengthen your networking this week. I'll build you a plan." };
  };

  const trustInfo = getTrustScoreTone(userState.trustScore);

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4 space-y-4">
      {/* User Progress Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 border-2 border-white">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Level {userState.level} Career Explorer</CardTitle>
                <p className="text-sm opacity-90">Trust Score: {userState.trustScore}/100 ({trustInfo.tone})</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-1">
                <Trophy className="h-4 w-4" />
                <span>{userState.xp} XP</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>{userState.tokens} tokens</span>
              </div>
            </div>
          </div>
          <Progress value={(userState.xp % 100)} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-lg p-4 ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white shadow-md border'
            }`}>
              <div className="flex items-start space-x-2">
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Rewards Display */}
                  {(message.xpGained || message.tokensGained) && (
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200">
                      {message.xpGained && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          +{message.xpGained} XP
                        </Badge>
                      )}
                      {message.tokensGained && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          +{message.tokensGained} tokens
                        </Badge>
                      )}
                      {message.badge && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          🏆 {message.badge}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Action Items */}
                  {message.actionItems && message.actionItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <Separator />
                      <p className="text-sm font-semibold text-gray-700">🚀 Recommended Actions:</p>
                      {message.actionItems.map((action, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex items-center space-x-2">
                            {action.type === 'job' && <Briefcase className="h-4 w-4 text-green-600" />}
                            {action.type === 'course' && <BookOpen className="h-4 w-4 text-blue-600" />}
                            {action.type === 'networking' && <User className="h-4 w-4 text-purple-600" />}
                            <div>
                              <p className="text-sm font-medium">{action.title}</p>
                              <p className="text-xs text-gray-600">{action.description}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={action.priority === 'high' ? 'default' : 'outline'}
                            onClick={() => window.open(action.url, '_blank')}
                          >
                            Take Action
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-blue-600 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-md border rounded-lg p-4 max-w-xs">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-purple-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">AIShura is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center space-x-2 p-4 bg-white rounded-lg border shadow-sm">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Share your career thoughts, goals, or challenges..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          onClick={sendMessage} 
          disabled={!inputValue.trim() || isLoading}
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
