import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Camera, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [statusText, setStatusText] = useState('Available');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    if (!username || !displayName) {
      toast.error('Username and Display Name are required');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      toast.error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          status_text: statusText,
        })
        .eq('id', session.user.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Username is already taken');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Profile setup complete!');
      onComplete();
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900 tracking-tight flex justify-center items-center gap-3">
          Your Profile <Sparkles className="text-brand-500" size={28} />
        </h2>
        <p className="mt-3 text-center text-surface-500 font-medium">
          Let's make it yours. Tell us how you'd like to appear.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up animate-delay-100">
        <div className="glass py-8 px-6 sm:rounded-3xl sm:px-10">
          
          <div className="mb-8 flex justify-center animate-fade-in">
            <div className="relative group">
              <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-brand-100 to-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg transition-transform transform group-hover:scale-105">
                 <span className="text-4xl font-bold text-brand-400">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                 </span>
                 <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                    <Camera className="h-8 w-8 text-white mb-1" />
                    <span className="text-[10px] text-white font-semibold tracking-wider">UPLOAD</span>
                 </div>
              </div>
            </div>
          </div>

          <form className="space-y-5 animate-fade-in animate-delay-200" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-surface-700">
                Display Name
              </label>
              <div className="mt-1.5">
                <input
                  id="displayName"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-surface-700">
                Username
              </label>
              <div className="mt-1.5 relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-surface-400 font-medium">
                  @
                </span>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="block w-full pl-9 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-surface-700">
                Status Message <span className="text-surface-400 font-normal">(Optional)</span>
              </label>
              <div className="mt-1.5">
                <input
                  id="status"
                  type="text"
                  placeholder="Hey there! I am using ConnectUp."
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  className="block w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
              >
                {loading ? 'Saving Profile...' : 'Jump In!'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
