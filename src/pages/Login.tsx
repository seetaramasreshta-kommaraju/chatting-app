import { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Phone, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast.success('Successfully verified!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-surface-100 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-gradient-to-br from-brand-100 to-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-gradient-to-tr from-brand-50 to-indigo-100 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mb-6 shadow-sm border border-brand-100">
            <MessageSquare size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight mb-2">ConnectUp</h1>
          <p className="text-surface-500 font-medium">Experience real-time messaging</p>
        </div>

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-surface-700 mb-2">
                Mobile Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 font-medium placeholder-surface-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all outline-none"
                  placeholder="+1234567890"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-surface-700 mb-2">
                Verification Code
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 font-medium tracking-widest placeholder-surface-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all outline-none"
                  placeholder="123456"
                  required
                />
              </div>
              <p className="mt-3 text-sm font-medium text-surface-500 text-center">
                Code sent to <span className="text-surface-900 font-bold">{phone}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/30 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Verify & Login'
              )}
            </button>
            
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => setStep('PHONE')}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Change phone number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
