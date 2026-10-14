import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Shield, 
  Briefcase, 
  Clock,
  Sparkles,
  Layers,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const budgetsystemLogo = "/src/assets/images/budgetsystem_logo_1781360364801.jpg";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'stores'));
        const storeNames = snapshot.docs.map(doc => doc.data().name).filter(Boolean);
        setStores(storeNames);
      } catch (err) {
        console.error("Failed to load stores:", err);
      }
    };
    fetchStores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('Please select a Store or Admin');
      return;
    }
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: true 
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Elegantly styled ambient visual details (light slate instead of dark) */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[120px] -z-10 pointer-events-none"></div>
      
      {/* Decorative clean pattern lines */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] -z-10 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Top-Centered Logo & Title Group */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <div className="relative group animate-fade-in">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-slate-900 rounded-2xl blur opacity-25 group-hover:opacity-45 transition duration-300"></div>
            <img 
              src={budgetsystemLogo} 
              alt="BudgetSystem Logo" 
              className="relative w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-[0.15em] font-display uppercase">
              BUDGET - SYSTEM
            </h1>
            <p className="text-slate-600 text-sm font-medium pt-1">
              Sign in to manage your stores, sales, and staff members
            </p>
          </div>
        </motion.div>

        {/* Form panel card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100 relative"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Error notifications */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2.5 items-center">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Account Selector Input */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Store ID or Admin Role
              </label>
              <div className="relative rounded-xl group transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                </div>
                
                <select
                  id="username"
                  name="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 placeholder-slate-400 appearance-none transition-all cursor-pointer font-medium"
                >
                  <option value="" disabled>Choose account...</option>
                  <option value="admin" className="text-amber-600 font-semibold font-sans">★ Administrator</option>
                  {stores.map((store, idx) => (
                    <option key={idx} value={store}>
                      🎒 Store - {store}
                    </option>
                  ))}
                </select>

                {/* Custom Arrow Selector */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password input panel */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Secure Password
              </label>
              <div className="relative rounded-xl group transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 placeholder-slate-300 transition-all font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit block */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group cursor-pointer inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 border border-transparent shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>Enter Control Center</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer info (Desktop & Mobile combined clean layout) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-3.5 pt-6 border-t-2 border-slate-200/60 w-full"
        >
          {/* Active Date and Time Panel with vibrant colors */}
          <div className="inline-flex justify-center items-center gap-2.5 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 shadow-sm text-xs font-semibold text-slate-800">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span className="font-mono text-slate-900">{formattedTime}</span>
            <span className="text-slate-300">|</span>
            <span>{formattedDate}</span>
          </div>

          {/* Developer Attribute Badge details with premium contrast & amber accents */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-xs">
            <span className="text-slate-700 font-semibold mb-0.5 sm:mb-0">System Developer:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-950 border border-amber-500/30 font-bold shadow-sm">
              Waleed Al-Qadasi
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold shadow-sm">
              📞 0503189758
            </span>
          </div>

          {/* Elegant Clear Copyright Text */}
          <p className="text-[11px] text-slate-700 font-medium font-sans">
            &copy; 2026 <span className="font-extrabold text-slate-950 tracking-tight">Waleed Al-Qadasi BudgetSystem</span>. All rights reserved.
          </p>
        </motion.div>
        
      </div>
    </div>
  );
}

