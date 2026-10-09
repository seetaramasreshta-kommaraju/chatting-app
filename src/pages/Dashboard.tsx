import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';

export default function Dashboard({ session }: { session: User }) {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', session.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentUser({ id: session.uid, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      <Sidebar 
        session={session} 
        currentUser={currentUser}
        activeChat={activeChat} 
        setActiveChat={setActiveChat} 
      />
      <main className="flex-1 min-w-0 bg-white relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10 flex flex-col">
        {activeChat ? (
          <ChatArea session={session} chatId={activeChat} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-surface-50/50">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-100">
               <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
               </svg>
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Welcome to ConnectUp</h2>
            <p className="text-surface-500 font-medium">Select a conversation or start a new one to begin</p>
          </div>
        )}
      </main>
    </div>
  );
}
