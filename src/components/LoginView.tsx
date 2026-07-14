import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Eye, EyeOff, Key, TrendingUp, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginUser, registerUser, resetPassword } = useApp();

  // Mode: 'login' | 'register' | 'reset'
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'General Manager' | 'RCM Manager' | 'RM' | 'LM' | 'User(Production)' | 'HR'>('User(Production)');
  
  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFormFeedbacks = () => {
    setError(null);
    setSuccess(null);
  };

  const handleModeChange = (newMode: 'login' | 'register' | 'reset') => {
    resetFormFeedbacks();
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedbacks();

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const res = await registerUser(username.trim(), password, selectedRole);
      if (res.success) {
        setSuccess(res.message);
      } else {
        setError(res.message);
      }
    } else if (mode === 'login') {
      const res = await loginUser(username.trim(), password);
      if (res.success) {
        setSuccess(res.message);
      } else {
        setError(res.message);
      }
    } else if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const res = await resetPassword(username.trim(), password);
      if (res.success) {
        setSuccess(res.message);
        // Switch back to login after short delay
        setTimeout(() => {
          handleModeChange('login');
        }, 1800);
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="login_container">
      {/* Decorative premium ambient glow background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
      
      {/* Subtile grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[460px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10"
        id="login_card"
      >
        {/* Glowing top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114]" />

        <div className="p-8 md:p-10 flex flex-col items-center">
          
          {/* Logo element with matching orange design */}
          <div className="w-14 h-14 rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-[#f2ab35] to-[#cf5114] flex items-center justify-center text-white shrink-0 shadow-lg font-black text-2xl select-none mb-6 animate-pulse">
            P
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase leading-none font-mono">
              Performance
            </h1>
            <h2 className="text-lg md:text-xl font-bold text-slate-300 tracking-tight uppercase mt-1">
              Management System
            </h2>
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-wider mt-2 font-mono">
              Performance Tracker Portal
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest mb-4">
                {mode === 'login' && 'Account Authentication'}
                {mode === 'register' && 'Create Operator Account'}
                {mode === 'reset' && 'Password Restoration'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4" id="auth_form">
                {/* Username Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950/60 text-slate-100 placeholder-slate-600 text-xs rounded-xl pl-10 pr-4 py-3 border border-slate-800 focus:border-amber-500 focus:bg-slate-950 transition-all focus:outline-none font-medium shadow-inner"
                      id="input_username"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={mode === 'reset' ? 'Enter new password' : 'Enter password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/60 text-slate-100 placeholder-slate-600 text-xs rounded-xl pl-10 pr-10 py-3 border border-slate-800 focus:border-amber-500 focus:bg-slate-950 transition-all focus:outline-none font-medium shadow-inner"
                      id="input_password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input (Register and Reset modes only) */}
                {(mode === 'register' || mode === 'reset') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950/60 text-slate-100 placeholder-slate-600 text-xs rounded-xl pl-10 pr-4 py-3 border border-slate-800 focus:border-amber-500 focus:bg-slate-950 transition-all focus:outline-none font-medium shadow-inner"
                        id="input_confirm_password"
                      />
                    </div>
                  </div>
                )}

                {/* Role dropdown for register mode only */}
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                      Assigned Portal Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                      className="w-full bg-slate-950/60 text-slate-200 text-xs rounded-xl px-3.5 py-3 border border-slate-800 focus:border-amber-500 focus:bg-slate-950 transition-all focus:outline-none font-medium shadow-inner cursor-pointer"
                      id="input_register_role"
                    >
                      <option value="Admin">Admin (Full Access)</option>
                      <option value="General Manager">General Manager (Full Access)</option>
                      <option value="RCM Manager">RCM Manager (View Only)</option>
                      <option value="RM">Reporting Manager / RM (View Only)</option>
                      <option value="LM">Line Manager / LM (View Only)</option>
                      <option value="User(Production)">User(Production) (View Only)</option>
                      <option value="HR">HR (View Only)</option>
                    </select>
                  </div>
                )}

                {/* Error/Success callouts */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2.5 leading-relaxed font-sans"
                      id="auth_error_box"
                    >
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-start gap-2.5 leading-relaxed font-sans"
                      id="auth_success_box"
                    >
                      <CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-500" />
                      <span>{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] hover:from-[#fcae26] hover:to-[#df540f] text-white py-3.5 px-4 rounded-xl font-extrabold uppercase text-xs tracking-wider font-mono shadow-md transition-all duration-300 transform active:scale-[0.98] hover:shadow-lg cursor-pointer"
                  id="btn_submit_auth"
                >
                  {mode === 'login' && 'Sign In to Tracker'}
                  {mode === 'register' && 'Register Operator'}
                  {mode === 'reset' && 'Reset Password'}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Links for mode changes */}
          <div className="flex flex-col gap-2.5 items-center mt-8 w-full border-t border-slate-800/60 pt-6">
            {mode === 'login' && (
              <>
                <div className="flex justify-between w-full text-xs text-slate-500 font-semibold font-mono">
                  <button
                    onClick={() => handleModeChange('reset')}
                    className="hover:text-amber-500 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                  <button
                    onClick={() => handleModeChange('register')}
                    className="hover:text-amber-500 transition-colors cursor-pointer text-amber-500 font-bold flex items-center gap-1"
                  >
                    <UserPlus size={13} />
                    Create Account
                  </button>
                </div>

                {/* Quick Access Tip Box */}
                <div className="w-full p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center font-mono mt-2 select-none">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">
                    Demo Profiles (Password: password)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 mt-2 text-left">
                    <div>🔑 <strong className="text-amber-500 font-bold">admin</strong> (Admin)</div>
                    <div>💼 <strong className="text-amber-500 font-bold">manager</strong> (GM)</div>
                    <div>📊 <strong className="text-amber-500 font-bold">rcm_mgr</strong> (RCM)</div>
                    <div>👥 <strong className="text-amber-500 font-bold">supervisor</strong> (RM)</div>
                    <div>🛡️ <strong className="text-amber-500 font-bold">lead</strong> (LM)</div>
                    <div>🎨 <strong className="text-amber-500 font-bold">hr_user</strong> (HR)</div>
                    <div>💻 <strong className="text-amber-500 font-bold">agent</strong> (Agent)</div>
                  </div>
                </div>
              </>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <button
                onClick={() => handleModeChange('login')}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-semibold font-mono flex items-center gap-1.5"
              >
                ← Back to Login
              </button>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};
