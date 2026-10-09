import { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as UserIcon, Camera, ArrowRight, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProfileSetup({ session, onComplete }: { session: User, onComplete: () => void }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if username is taken
      // (For simplicity in this Firebase rewrite, we'll just save it. 
      //  In a production app, you'd query Firestore to check for uniqueness first).

      const profileRef = doc(db, 'profiles', session.uid);
      await setDoc(profileRef, {
        username: username.toLowerCase(),
        display_name: displayName,
        phone_number: session.phoneNumber,
        created_at: serverTimestamp(),
      });

      toast.success('Profile created successfully!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-surface-100 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-gradient-to-br from-brand-100 to-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-gradient-to-tr from-brand-50 to-indigo-100 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-100 text-surface-400 mb-6 shadow-inner border-4 border-white relative group cursor-pointer hover:bg-brand-50 hover:text-brand-500 transition-colors">
            <Camera size={32} strokeWidth={2} />
            <div className="absolute bottom-0 right-0 bg-brand-500 text-white p-1.5 rounded-full shadow-md border-2 border-white">
               <Plus size={12} strokeWidth={4} />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-surface-900 tracking-tight mb-2">Complete Profile</h2>
          <p className="text-surface-500 font-medium">Set up your identity to start chatting</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-surface-700 mb-2">
              Display Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 font-medium placeholder-surface-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all outline-none"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-surface-700 mb-2">
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-surface-400 font-bold group-focus-within:text-brand-500 transition-colors">@</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="block w-full pl-11 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 font-medium placeholder-surface-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all outline-none"
                placeholder="johndoe"
                required
              />
            </div>
            <p className="mt-2 text-xs font-medium text-surface-500 ml-1">
              Only lowercase letters, numbers, and underscores
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !displayName}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const Plus = ({ size, strokeWidth }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
