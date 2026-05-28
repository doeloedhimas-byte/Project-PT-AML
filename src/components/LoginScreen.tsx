import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Truck, Key, User, ArrowRight, ClipboardCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import amlLogo from '../assets/images/aml_logo_1779260489801.png';

interface LoginScreenProps {
  onLogin: (role: UserRole, username: string, fullName: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('STAFF_AML');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [forgotError, setForgotError] = useState('');

  // Setup accounts with specific role permissions
  const users = [
    {
      username: 'DhimasAML',
      password: 'Ducati@123',
      fullName: 'Dhimas Gunadi Setiawan',
      allowedRoles: ['STAFF_AML', 'DELIVERY_AML'] as UserRole[]
    },
    {
      username: 'DocumentAML',
      password: 'Honda@123',
      fullName: 'Staff Document',
      allowedRoles: ['STAFF_AML'] as UserRole[]
    },
    {
      username: 'DeliveryAML',
      password: 'Yamaha@123',
      fullName: 'Delivery Staff AML',
      allowedRoles: ['DELIVERY_AML'] as UserRole[]
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetUsername = username.trim();
    if (!targetUsername || !password) {
      setError('Username dan password harus diisi');
      return;
    }

    const foundUser = users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());

    if (!foundUser) {
      setError('Username tidak terdaftar.');
      return;
    }

    if (foundUser.password !== password) {
      setError('Password salah.');
      return;
    }

    // Role access enforcement
    if (!foundUser.allowedRoles.includes(selectedRole)) {
      if (selectedRole === 'DELIVERY_AML') {
        setError(`Akun ${foundUser.username} hanya bisa mengakses fitur pada staff PT AML saja tidak bisa login di fitur staff delivery`);
      } else {
        setError(`Akun ${foundUser.username} hanya bisa mengakses fitur pada staff delivery saja tidak bisa login di fitur staff PT AML`);
      }
      return;
    }

    onLogin(selectedRole, foundUser.username, foundUser.fullName);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotUsername.trim()) {
      setForgotError('Username wajib diisi');
      return;
    }
    
    setForgotStatus('loading');
    setTimeout(() => {
      setForgotStatus('success');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointers-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-8"
      >
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-5 flex items-center justify-center max-w-[320px] transition-all">
            <img 
              src={amlLogo} 
              alt="PT Agung Makmur Logistik Logo" 
              className="h-24 w-auto object-contain transition-transform duration-305 hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">
            PT Agung Makmur Logistik
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Portal for PIB and PEB Document Records and Delivery Plans
          </p>
        </div>

        {/* Tab Role selection */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('STAFF_AML');
              setUsername('');
              setPassword('');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              selectedRole === 'STAFF_AML'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Staff Document
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('DELIVERY_AML');
              setUsername('');
              setPassword('');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              selectedRole === 'DELIVERY_AML'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Staff Delivery
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-widest mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Username"
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-widest">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-10 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-500"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rose-400 text-xs text-center font-medium bg-rose-550/10 p-2.5 rounded-lg border border-rose-500/20"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-505 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-950 font-semibold py-3 rounded-xl shadow-lg shadow-teal-500/10 transition-all text-sm mt-6 cursor-pointer"
          >
            Login
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </form>
      </motion.div>

      {/* Forgot Password Modal Overlay */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-6"
          >
            {forgotStatus === 'idle' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl shrink-0 mt-0.5">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-bold text-white font-sans">
                      Lupa Password?
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Masukkan username akun Anda untuk menerima instruksi & link reset password di email Anda.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300 uppercase tracking-widest text-left">
                    Username Akun
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="Masukkan username Anda"
                      className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder:text-slate-500"
                    />
                  </div>
                  {forgotError && (
                    <p className="text-rose-400 text-xs mt-1 text-left">{forgotError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotUsername('');
                      setForgotError('');
                      setForgotStatus('idle');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-650 text-slate-200 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer shadow-md shadow-teal-500/15"
                  >
                    Kirim Link
                  </button>
                </div>
              </form>
            )}

            {forgotStatus === 'loading' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-300">Memproses permintaan reset password...</p>
              </div>
            )}

            {forgotStatus === 'success' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-emerald-550/15 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white font-sans">
                    Link Reset Terkirim!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-[340px] mx-auto text-center">
                    Link reset password untuk user <span className="font-bold text-teal-300">"{forgotUsername}"</span> telah dikirim secara aman.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 text-center">
                    Silakan periksa kotak masuk atau spam pada alamat email tujuan berikut:
                  </p>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 font-mono text-sm text-teal-400 break-all select-all inline-block px-4">
                    dhimas.agungmakmur@gmail.com
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotUsername('');
                    setForgotError('');
                    setForgotStatus('idle');
                  }}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer mt-4 shadow-md shadow-teal-500/10"
                >
                  Kembali ke Login
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
