import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import { supabase } from '../lib/supabase';

export default function Dashboard({ session }: { session: Session }) {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Fetch current user profile
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!error && data) {
        setCurrentUser(data);
      }
    };
    fetchProfile();
  }, [session]);

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden font-sans">
      <Sidebar 
        session={session} 
        currentUser={currentUser} 
        activeChat={activeChat} 
        setActiveChat={setActiveChat} 
      />
      
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeChat ? (
          <ChatArea 
            chatId={activeChat} 
            currentUser={currentUser} 
            session={session} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-surface-500 bg-[#fafbfc]">
            <div className="w-28 h-28 mb-6 rounded-[2rem] bg-gradient-to-tr from-brand-100 to-indigo-100 flex items-center justify-center shadow-inner">
              <svg className="w-12 h-12 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Welcome to ConnectUp</h2>
            <p className="mt-2 font-medium">Select a conversation or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
