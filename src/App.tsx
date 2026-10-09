import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        checkProfile(session.user.id);
      }
      else {
        setProfileComplete(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setProfileComplete(!!data?.username);
    } catch (error) {
      console.error('Error checking profile:', error);
      setProfileComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={profileComplete ? "/dashboard" : "/profile-setup"} />} 
        />
        <Route 
          path="/profile-setup" 
          element={session && profileComplete === false ? <ProfileSetup onComplete={() => setProfileComplete(true)} /> : <Navigate to={session ? "/dashboard" : "/login"} />} 
        />
        <Route 
          path="/dashboard/*" 
          element={session && profileComplete ? <Dashboard session={session} /> : <Navigate to={session ? "/profile-setup" : "/login"} />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={session ? (profileComplete ? "/dashboard" : "/profile-setup") : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
