import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 7) {
      toast.error('Please enter a valid phone number with country code');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      
      toast.success('OTP sent successfully!');
      setStep('OTP');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error('Please enter a valid OTP');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      // Authentication successful, App.tsx will handle redirection
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-gradient-to-tr from-brand-600 to-indigo-500 p-3 rounded-2xl shadow-lg shadow-brand-500/30 text-white">
            <MessageSquare size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-center text-4xl font-extrabold text-gray-900 tracking-tight">
            Connect<span className="text-gradient">Up</span>
          </h2>
        </div>
        <p className="mt-4 text-center text-surface-500 font-medium">
          Instant messaging, reimagined for you.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up animate-delay-100">
        <div className="glass py-10 px-6 sm:rounded-3xl sm:px-10">
          
          {step === 'PHONE' ? (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                Welcome back 👋
              </h3>
              <form className="space-y-6" onSubmit={handleSendOtp}>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-surface-700">
                    Phone Number
                  </label>
                  <div className="mt-2 relative rounded-xl shadow-sm">
                    <input
                      id="phone"
                      type="tel"
                      required
                      placeholder="+1 (234) 567-8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full px-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-surface-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {loading ? 'Sending code...' : (
                    <>Continue <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="text-brand-500" /> Verify it's you
              </h3>
              <p className="text-sm text-surface-500 mb-6">
                We sent a code to <span className="font-semibold text-surface-800">{phone}</span>
              </p>
              
              <form className="space-y-6" onSubmit={handleVerifyOtp}>
                <div>
                  <label htmlFor="otp" className="block text-sm font-semibold text-surface-700">
                    6-digit Code
                  </label>
                  <div className="mt-2">
                    <input
                      id="otp"
                      type="text"
                      required
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="block w-full px-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono text-surface-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-surface-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {loading ? 'Verifying...' : 'Secure Login'}
                </button>
                
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => setStep('PHONE')}
                    className="text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
                  >
                    Wrong number? Go back
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
