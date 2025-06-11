// src/api/ai-chat.ts
// This file should be created to handle the API route in your React app

import { supabase } from '../integrations/supabase/client';

export const handleChatAPI = async (message: string, userState: any, conversationHistory: any[]) => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        userState,
        conversationHistory
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Alternative: Direct API call if not using Supabase client
export const handleDirectChatAPI = async (message: string, userState: any, conversationHistory: any[]) => {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      userState,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
