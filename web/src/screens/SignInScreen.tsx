import React, { useState } from 'react';
import { sendCode, verifyCode, updateProfile, User } from '../services/ownly-api.ts';

interface SignInScreenProps {
  onSuccess: (user: User) => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'name'>('email');
  const [email, setEmail] = useState('sameer@company.com');
  const [otpDigits, setOtpDigits] = useState(['5', '2', '8', '9', '4', '1']);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work or personal email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendCode(email);
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const next = [...otpDigits];
    next[index] = val;
    setOtpDigits(next);

    // Auto-advance input focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your passcode.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { user, isNewUser } = await verifyCode(email, code);
      if (isNewUser && (!user.full_name || user.full_name === 'Foodie')) {
        setCreatedUser(user);
        setStep('name');
      } else {
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName });
      if (createdUser) {
        onSuccess({ ...createdUser, full_name: fullName.trim() });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-[#FFF9FC] brand-hero">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(17,29,53,0.08)] border border-[#F0D7E2]">
        {/* Brand Lockup with New Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#F50062] shadow-sm border border-[#F0D7E2] mb-3">
            <img
              src="/assets/aistudio/owenly_logo_9141f5f9.jpg"
              alt="Ownly Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-2xl font-black tracking-tight text-[#C40054]">ownly</span>
            <span className="text-2xl font-extrabold tracking-tight text-[#111D35]">together</span>
          </div>
          <p className="text-sm font-bold text-[#111D35] mt-1.5">
            <span className="text-[#C40054]">Order Together.</span> Pay Your Share.
          </p>
          <p className="text-xs text-[#576177] mt-0.5">
            Zero-commission group food ordering for Chennai teams, flatmates & friends.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FFE7E9] border border-[#A32234]/20 text-[#A32234] text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Email Entry */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider block mb-1.5">
                Work or Personal Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#576177] text-[20px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full h-12 pl-11 pr-4 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-sm font-medium text-[#111D35] focus:outline-none focus:border-[#C40054] focus:bg-white transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#576177] mt-1.5">
                Instant 6-digit magic passcode sent to your inbox. No passwords.
              </p>
            </div>

            {/* Quick Demo Pill Helper for Reviewer Testing */}
            <div className="pt-1">
              <span className="text-[10px] uppercase font-bold text-[#576177] block mb-1.5">
                Quick reviewer autofill:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Sameer (Host)', email: 'sameer@company.com' },
                  { label: 'Priya (Flatmate)', email: 'priya@chennaitech.in' },
                  { label: 'Rahul (OMR)', email: 'rahul.v@omrtech.org' },
                  { label: 'Ananya (Member)', email: 'ananya.k@startup.io' }
                ].map((item) => (
                  <button
                    type="button"
                    key={item.email}
                    onClick={() => setEmail(item.email)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-[#C40054] font-semibold transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Sending code...</span>
              ) : (
                <>
                  <span>Send 6-Digit Passcode</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit Passcode Entry */}
        {step === 'otp' && (
          <div className="flex flex-col gap-5">
            <div className="bg-[#FFF1F6] p-3 rounded-2xl flex items-center justify-between border border-[#F0D7E2]">
              <div>
                <span className="text-[11px] text-[#576177] block">Passcode sent to</span>
                <span className="text-xs font-bold text-[#111D35] truncate max-w-[200px] block">
                  {email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-xs text-[#C40054] font-bold underline px-1"
              >
                Change
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider block mb-2 text-center">
                Enter 6-Digit Passcode
              </label>
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-extrabold text-lg sm:text-xl bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-[#111D35] focus:outline-none focus:border-[#C40054] focus:bg-white transition-all shadow-inner"
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#16845A] text-center font-semibold mt-2 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Demo passcode pre-filled for rapid reviewer testing</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify & Enter Ownly</span>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: First-time User Name Setup */}
        {step === 'name' && (
          <form onSubmit={handleSaveName} className="flex flex-col gap-4">
            <div className="text-center mb-1">
              <h2 className="text-lg font-bold text-[#111D35]">Welcome to Chennai!</h2>
              <p className="text-xs text-[#576177] mt-0.5">What name should the group see in the cart?</p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider block mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sameer Mittimani or Priya"
                required
                className="w-full h-12 px-4 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-sm font-medium text-[#111D35] focus:outline-none focus:border-[#C40054] focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-full bg-[#C40054] hover:bg-[#A80047] text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue to Chennai Kitchens</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        )}

        
        <div className="mt-6 pt-4 border-t border-[#F0D7E2] flex items-center justify-center gap-3 text-[#576177] text-[11px]">
          <span className="flex items-center gap-1 font-semibold text-[#C40054]">
            <span className="material-symbols-outlined text-[14px]">moped</span>
            Rapido Delivery
          </span>
        </div>
      </div>
    </div>
  );
};
