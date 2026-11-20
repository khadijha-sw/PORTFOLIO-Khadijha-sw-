'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function AgencyPortfolio() {
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }, []);

  const [selectedService, setSelectedService] = useState('AI Chatbot & DM Triage Integration');
  const [bookingData, setBookingData] = useState({ name: '', email: '', phone: '', date: '', time: '', notes: '' });
  const [loading, setLoading] = useState(false);

  // Auth modal & persistent Supabase session state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [user, setUser] = useState(null);

  // Persistent light/dark theme state synced with localStorage and <html>
  const [darkMode, setDarkMode] = useState(true);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const charCardRef = useRef(null);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme ? savedTheme === 'dark' : true;
      setDarkMode(isDark);
    } catch (e) {}
  }, []);

  // Apply theme changes to <html> and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      const root = document.documentElement;
      if (darkMode) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  }, [darkMode]);

  // Persistent Supabase auth session listener
  useEffect(() => {
    if (!supabase) return;

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        const currentUser = data?.session?.user || null;
        setUser(currentUser);
        if (currentUser?.email) {
          setBookingData((prev) => ({
            ...prev,
            email: prev.email || currentUser.email,
            name: prev.name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
          }));
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser?.email) {
        setBookingData((prev) => ({
          ...prev,
          email: prev.email || currentUser.email,
          name: prev.name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        }));
      }
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // Subtle hero tilt
  useEffect(() => {
    const handleMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;

      setTilt({
        rotateX: -normY * 8,
        rotateY: normX * 10,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleBooking = (e) => {
    e.preventDefault();
    setLoading(true);

    const waMsg =
      `✦ *NEW KHADIJHA.SW BOOKING* ✦%0A` +
      `*Client:* ${encodeURIComponent(bookingData.name)}%0A` +
      `*Email:* ${encodeURIComponent(bookingData.email)}%0A` +
      `*WhatsApp:* ${encodeURIComponent(bookingData.phone)}%0A` +
      `*Service:* ${encodeURIComponent(selectedService)}%0A` +
      `*Date:* ${bookingData.date} at ${bookingData.time}%0A` +
      `*Notes:* ${encodeURIComponent(bookingData.notes)}`;

    window.open(`https://wa.me/923332555610?text=${waMsg}`, '_blank');

    setTimeout(() => {
      alert('Booking confirmed! Opening your confirmation alert...');
      setLoading(false);
    }, 900);
  };

  const handleGoogleLogin = async () => {
    setAuthMessage('');
    if (!supabase) {
      setAuthMessage('Supabase configuration missing. Check environment variables.');
      return;
    }
    setAuthLoading(true);
    const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://portfolio-khadijha-sw.vercel.app';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectOrigin}/`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthMessage('');
    if (!supabase) {
      setAuthMessage('Supabase configuration missing. Check environment variables.');
      return;
    }
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://portfolio-khadijha-sw.vercel.app';
        const { data, error } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
          options: {
            emailRedirectTo: `${redirectOrigin}/`,
          },
        });
        if (error) {
          setAuthMessage(error.message);
        } else if (data?.session) {
          setAuthOpen(false);
          setEmailInput('');
          setPasswordInput('');
        } else {
          setAuthMessage('Account created! Please check your email to confirm if email verification is enabled.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (error) {
          setAuthMessage(error.message);
        } else {
          setAuthOpen(false);
          setEmailInput('');
          setPasswordInput('');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setAuthOpen(false);
  };

  const authLabel = user?.email ? user.email.split('@')[0] : 'Client Login';

  return (
    <main
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className={`min-h-screen transition-colors duration-300 relative overflow-x-clip p-4 md:p-10 ${
        darkMode ? 'bg-[#070412] text-slate-100' : 'bg-[#f4f2f8] text-slate-900'
      }`}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        h1, h2, h3, .brand-font {
          font-family: 'Montserrat', sans-serif;
          letter-spacing: 0.03em;
        }
        @keyframes floatChar {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-float { animation: floatChar 4s ease-in-out infinite; }
      `}</style>

      {darkMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[650px] h-[650px] rounded-full bg-purple-900/25 blur-[140px]"></div>
          <div className="absolute top-1/3 right-[-120px] w-[600px] h-[600px] rounded-full bg-indigo-800/20 blur-[150px]"></div>
          <div className="absolute bottom-[-150px] left-1/4 w-[700px] h-[500px] rounded-full bg-fuchsia-900/20 blur-[150px]"></div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Navbar */}
        <header
          className={`portfolio-card backdrop-blur-2xl border rounded-full px-6 py-3.5 flex justify-between items-center shadow-2xl mb-12 transition-colors duration-300 ${
            darkMode
              ? 'bg-[#120b29]/80 border-purple-400/25 text-white shadow-purple-950/50'
              : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/30">
              ✦
            </span>
            <div>
              <h2 className="brand-font font-extrabold text-base md:text-lg tracking-wider leading-none">
                KHADIJHA<span className={darkMode ? 'text-pink-400' : 'text-pink-600'}>.</span>SW
              </h2>
              <span className={`text-[11px] font-semibold tracking-widest uppercase ${darkMode ? 'text-cyan-300/80' : 'text-purple-700'}`}>
                STAREY WONDER
              </span>
            </div>
          </div>

          <nav className={`hidden md:flex gap-7 text-xs uppercase tracking-wider font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <a href="#about" className="hover:text-pink-500 transition">About Me</a>
            <a href="#projects" className="hover:text-pink-500 transition">Projects Case Studies</a>
            <a href="#services" className="hover:text-pink-500 transition">Services</a>
            <a href="#booking" className="hover:text-pink-500 transition">Book & Pay</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle Light and Dark Mode"
              className={`w-10 h-10 rounded-full border flex items-center justify-center text-base shadow-sm transition ${
                darkMode
                  ? 'bg-[#1a103c] border-purple-400/30 text-yellow-300 hover:border-cyan-400'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMessage('');
                setAuthOpen(true);
              }}
              className={`text-xs font-bold px-4 py-2.5 rounded-full shadow-sm transition border ${
                darkMode
                  ? 'bg-[#1a103c] border-purple-400/30 text-white hover:border-pink-400'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {user ? `● ${authLabel}` : 'Client Login'}
            </button>
            <a
              href="#booking"
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg shadow-purple-600/30 hover:opacity-95 transition"
            >
              Book Service ✦
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section id="about" className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-stretch">
          {/* Character Card */}
          <div
            ref={charCardRef}
            style={{
              transform: `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className={`portfolio-card lg:col-span-4 backdrop-blur-2xl border rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between relative ${
              darkMode
                ? 'bg-gradient-to-b from-[#170e36]/85 to-[#0d0722]/90 border-purple-400/30 shadow-purple-950/60'
                : 'bg-white border-slate-300 shadow-xl'
            }`}
          >
            {darkMode && (
              <div className="absolute top-12 w-56 h-56 rounded-full bg-gradient-to-tr from-pink-500/25 via-purple-500/25 to-cyan-400/25 blur-2xl pointer-events-none"></div>
            )}

            <div className="relative w-full flex-1 flex items-center justify-center pt-2 pb-3 animate-float">
              <div className="relative w-56 h-72 flex items-center justify-center drop-shadow-[0_20px_28px_rgba(168,85,247,0.35)]">
                <img
                  src="/Khadijha chrachter 2D.png"
                  alt="Khadijha.SW Character"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://api.dicebear.com/9.x/lorelei/svg?seed=KhadijhaSW';
                  }}
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              </div>
            </div>

            <div className="w-full text-center relative z-10 pt-2">
              <div
                className={`inline-block px-5 py-2.5 rounded-2xl border mb-3 ${
                  darkMode ? 'bg-[#0b061d]/80 border-purple-400/30' : 'bg-slate-100 border-slate-300'
                }`}
              >
                <h2
                  className={`brand-font font-extrabold text-sm md:text-base tracking-wide ${
                    darkMode
                      ? 'bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent'
                      : 'text-purple-800'
                  }`}
                >
                  Khadijha.SW
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full text-xs font-bold">
                <a
                  href="https://github.com/khadijha-sw"
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl border transition ${
                    darkMode
                      ? 'bg-[#170e36]/90 border-purple-400/25 text-slate-200 hover:border-cyan-400 hover:text-cyan-300'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-600'
                  }`}
                >
                  GitHub ↗
                </a>
                <a
                  href="https://www.linkedin.com/in/khadijha-habib-89533743b/"
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl border transition ${
                    darkMode
                      ? 'bg-[#170e36]/90 border-purple-400/25 text-slate-200 hover:border-cyan-400 hover:text-cyan-300'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-600'
                  }`}
                >
                  LinkedIn ↗
                </a>
                <a
                  href="https://www.instagram.com/khadijha_sw/"
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl border transition ${
                    darkMode
                      ? 'bg-[#170e36]/90 border-purple-400/25 text-slate-200 hover:border-pink-400 hover:text-pink-300'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-600'
                  }`}
                >
                  Instagram ↗
                </a>
                <a
                  href="https://x.com/Khadijha_sw"
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl border transition ${
                    darkMode
                      ? 'bg-[#170e36]/90 border-purple-400/25 text-slate-200 hover:border-pink-400 hover:text-pink-300'
                      : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-600'
                  }`}
                >
                  X (Twitter) ↗
                </a>
              </div>
            </div>
          </div>

          {/* Upgraded Intro Section */}
          <div
            className={`portfolio-card lg:col-span-8 backdrop-blur-2xl border rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col justify-between transition-colors duration-300 ${
              darkMode ? 'bg-[#120b29]/80 border-purple-400/25 shadow-purple-950/50 text-slate-100' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
            }`}
          >
            <div>
              <span
                className={`inline-flex items-center gap-2 text-[11px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-widest border ${
                  darkMode ? 'bg-purple-500/20 text-cyan-300 border-cyan-400/30' : 'bg-purple-100 text-purple-800 border-purple-300'
                }`}
              >
                ✦ AI AUTOMATION & BEYOND
              </span>

              <h1 className="brand-font text-2xl md:text-4xl font-black mt-4 mb-4 tracking-wide leading-tight">
                LET ME{' '}
                <span
                  className={
                    darkMode
                      ? 'bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent'
                      : 'text-purple-700'
                  }
                >
                  INTRODUCE MYSELF
                </span>
              </h1>

              <p className={`text-sm md:text-[15px] font-medium leading-relaxed mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Hi, I am <span className={darkMode ? 'text-pink-400 font-bold' : 'text-pink-600 font-bold'}>Khadijha Habib</span> — an 18-year-old systems architect born on August 25, 2008, based in{' '}
                <span className={darkMode ? 'text-cyan-300 font-bold' : 'text-cyan-700 font-bold'}>Karachi, Pakistan</span>. As the founder of{' '}
                <span className={darkMode ? 'font-bold text-purple-300' : 'font-bold text-purple-800'}>STAREY.WONDER</span>, I build practical AI automations and smart workflows that replace boring manual work with fast, self-running systems.
              </p>

              <div
                className={`space-y-3 text-xs md:text-sm leading-relaxed border-l-2 pl-4 mb-6 ${
                  darkMode ? 'border-purple-500/50 text-slate-300' : 'border-purple-600 text-slate-700'
                }`}
              >
                <p>
                  I follow one simple rule in my work: if a task takes 5 hours to do by hand, I build an automation that finishes it in 5 minutes. From e-commerce DM sorting bots to automated Stripe payment flows, my GitHub projects show how clean logic solves real business problems.
                </p>
                <p>
                  When you work with me, you save over 20 hours every week, reply to customers 24/7 without delays, and scale your business smoothly without hiring extra staff.
                </p>
              </div>

              {/* Tech Stack Pills */}
              <div className="mb-6">
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tools & Technologies I Build With:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['n8n Workflows', 'Make.com', 'Python', 'Next.js', 'OpenAI API', 'Stripe Webhooks', 'JSON Schema'].map((skill) => (
                    <span
                      key={skill}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                        darkMode
                          ? 'bg-[#1a103c] border-purple-400/30 text-cyan-300'
                          : 'bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Mini Impact Stats Bar */}
            <div className={`grid grid-cols-3 gap-3 pt-5 border-t ${darkMode ? 'border-purple-500/20' : 'border-slate-200'}`}>
              <div className={`p-3 rounded-2xl border text-center ${darkMode ? 'bg-[#0b061d]/70 border-purple-400/20' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`brand-font font-extrabold text-base md:text-lg ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>20+ Hrs</div>
                <div className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Saved Weekly</div>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${darkMode ? 'bg-[#0b061d]/70 border-purple-400/20' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`brand-font font-extrabold text-base md:text-lg ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>24 / 7</div>
                <div className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Active Systems</div>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${darkMode ? 'bg-[#0b061d]/70 border-purple-400/20' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`brand-font font-extrabold text-base md:text-lg ${darkMode ? 'text-purple-300' : 'text-indigo-700'}`}>100%</div>
                <div className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Custom Logic</div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Projects Case Studies */}
        <section id="projects" className="mb-16">
          <div className="mb-8">
            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>✦ PROOF OF WORK & CASE STUDIES</span>
            <h2 className="brand-font text-3xl font-extrabold mt-1">Inside My Automation Blueprints</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              The problem, the struggle, and the logic behind why I built these systems.
            </p>
          </div>

          <div className="space-y-10">
            {/* Project 1 */}
            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-8 shadow-2xl transition ${
                darkMode ? 'bg-[#120b29]/85 border-purple-400/30 shadow-purple-950/40' : 'bg-white border-slate-300 shadow-xl'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-2xl mr-2">🛍️</span>
                  <span className="brand-font text-xl md:text-2xl font-extrabold">starey-ecom-triage-n8n</span>
                </div>
                <span
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    darkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  ● Production Live
                </span>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Autonomous n8n workflow for instant e-commerce DM triage, AI intent scoring, and priority lead routing.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t text-xs ${darkMode ? 'border-purple-500/20' : 'border-slate-200'}`}>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>The Problem & Why I Built It</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Online stores lose potential buyers when customer messages sit unanswered for hours. I faced this exact bottleneck and built an automated sorting system to solve it.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>How It Works</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    A webhook catches incoming messages on social channels. An AI node checks what the customer wants, and hot leads are instantly sent to the team dashboard.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-purple-300' : 'text-indigo-700'}`}>Client Benefit</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    No customer waiting time, faster replies, and zero time wasted on spam or simple questions.
                  </p>
                </div>
              </div>

              <div className={`mt-6 flex justify-between items-center flex-wrap gap-4 pt-4 border-t ${darkMode ? 'border-purple-500/10' : 'border-slate-200'}`}>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-pink-500/20 text-pink-300 border-pink-400/30' : 'bg-pink-100 text-pink-800 border-pink-300'}`}>
                    n8n
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' : 'bg-cyan-100 text-cyan-800 border-cyan-300'}`}>
                    Webhooks
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                    AI Intent
                  </span>
                </div>
                <a
                  href="https://github.com/khadijha-sw/starey-ecom-triage-n8n"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-xs font-bold hover:underline ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}
                >
                  Inspect Repository on GitHub ↗
                </a>
              </div>
            </div>

            {/* Project 2 */}
            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-8 shadow-2xl transition ${
                darkMode ? 'bg-[#120b29]/85 border-purple-400/30 shadow-purple-950/40' : 'bg-white border-slate-300 shadow-xl'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-2xl mr-2">💳</span>
                  <span className="brand-font text-xl md:text-2xl font-extrabold">starey-stripe-invoice-flow</span>
                </div>
                <span
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    darkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  ● Production Live
                </span>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Automated Make.com scenario blueprint for real-time Stripe payment reconciliation and instant client onboarding.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t text-xs ${darkMode ? 'border-purple-500/20' : 'border-slate-200'}`}>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>The Problem & Why I Built It</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Checking payments manually and sending onboarding emails after a client pays takes too much time. I automated this entire flow to keep operations smooth.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>How It Works</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Stripe sends a secure payment confirmation event. Make.com captures the data, logs the transaction, and instantly triggers welcome emails to the client.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-purple-300' : 'text-indigo-700'}`}>Client Benefit</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Completely hands-free payment tracking and instant professional onboarding for every new buyer.
                  </p>
                </div>
              </div>

              <div className={`mt-6 flex justify-between items-center flex-wrap gap-4 pt-4 border-t ${darkMode ? 'border-purple-500/10' : 'border-slate-200'}`}>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-pink-500/20 text-pink-300 border-pink-400/30' : 'bg-pink-100 text-pink-800 border-pink-300'}`}>
                    Make.com
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' : 'bg-cyan-100 text-cyan-800 border-cyan-300'}`}>
                    Stripe API
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                    JSON
                  </span>
                </div>
                <a
                  href="https://github.com/khadijha-sw/starey-stripe-invoice-flow"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-xs font-bold hover:underline ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}
                >
                  Inspect Repository on GitHub ↗
                </a>
              </div>
            </div>

            {/* Project 3 */}
            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-8 shadow-2xl transition ${
                darkMode ? 'bg-[#120b29]/85 border-purple-400/30 shadow-purple-950/40' : 'bg-white border-slate-300 shadow-xl'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-2xl mr-2">🌐</span>
                  <span className="brand-font text-xl md:text-2xl font-extrabold">starey-omni-lead-enricher</span>
                </div>
                <span
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    darkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  ● Production Live
                </span>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Enterprise web scraping and multi-source lead prospecting pipeline with strict JSON schema validation.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t text-xs ${darkMode ? 'border-purple-500/20' : 'border-slate-200'}`}>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>The Problem & Why I Built It</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Finding clean B2B leads by hand is exhausting and often leads to messy data. I wanted a reliable script that cleans and verifies prospect lists automatically.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>How It Works</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    A Python script scrapes raw target data, runs it through strict JSON schema validators to filter out errors, and outputs clean, ready-to-use lead lists.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-purple-300' : 'text-indigo-700'}`}>Client Benefit</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    High-quality prospect data generated in seconds instead of spending days doing manual research.
                  </p>
                </div>
              </div>

              <div className={`mt-6 flex justify-between items-center flex-wrap gap-4 pt-4 border-t ${darkMode ? 'border-purple-500/10' : 'border-slate-200'}`}>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-pink-500/20 text-pink-300 border-pink-400/30' : 'bg-pink-100 text-pink-800 border-pink-300'}`}>
                    Python
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' : 'bg-cyan-100 text-cyan-800 border-cyan-300'}`}>
                    JSON Schema
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                    Scraping
                  </span>
                </div>
                <a
                  href="https://github.com/khadijha-sw/starey-omni-lead-enricher"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-xs font-bold hover:underline ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}
                >
                  Inspect Repository on GitHub ↗
                </a>
              </div>
            </div>

            {/* Project 4 */}
            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-8 shadow-2xl transition ${
                darkMode ? 'bg-[#120b29]/85 border-purple-400/30 shadow-purple-950/40' : 'bg-white border-slate-300 shadow-xl'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <span className="text-2xl mr-2">📢</span>
                  <span className="brand-font text-xl md:text-2xl font-extrabold">starey-social-autopilot-make</span>
                </div>
                <span
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    darkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  ● Production Live
                </span>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                AI-powered Make.com content repurposing and multi-platform scheduling engine for LinkedIn, X, and Instagram.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t text-xs ${darkMode ? 'border-purple-500/20' : 'border-slate-200'}`}>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>The Problem & Why I Built It</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Posting content across LinkedIn, Twitter, and Instagram every single day takes hours. I built this scheduler to handle content distribution automatically.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>How It Works</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    A Notion content database connects to Make.com. On scheduled dates, OpenAI formats the text specifically for each platform and publishes it automatically.
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold mb-1 uppercase tracking-wider ${darkMode ? 'text-purple-300' : 'text-indigo-700'}`}>Client Benefit</h4>
                  <p className={darkMode ? 'text-slate-300 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                    Keep an active social media presence and personal brand with zero daily manual effort.
                  </p>
                </div>
              </div>

              <div className={`mt-6 flex justify-between items-center flex-wrap gap-4 pt-4 border-t ${darkMode ? 'border-purple-500/10' : 'border-slate-200'}`}>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-pink-500/20 text-pink-300 border-pink-400/30' : 'bg-pink-100 text-pink-800 border-pink-300'}`}>
                    Make.com
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' : 'bg-cyan-100 text-cyan-800 border-cyan-300'}`}>
                    OpenAI
                  </span>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                    Notion
                  </span>
                </div>
                <a
                  href="https://github.com/khadijha-sw/starey-social-autopilot-make"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-xs font-bold hover:underline ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}
                >
                  Inspect Repository on GitHub ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Services & Pricing Section */}
        <section id="services" className="mb-16">
          <div className="mb-6">
            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>✦ SOLUTIONS & PACKAGES</span>
            <h2 className="brand-font text-2xl font-extrabold mt-1">Agency Services & Pricing</h2>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Production-ready automation systems tailored for your business growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-6 shadow-xl flex flex-col justify-between ${
                darkMode ? 'bg-[#120b29]/80 border-purple-400/25' : 'bg-white border-slate-300'
              }`}
            >
              <div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    darkMode ? 'text-pink-300 bg-pink-500/20 border-pink-400/30' : 'text-pink-700 bg-pink-100 border-pink-300'
                  }`}
                >
                  PKR 25,000 / $90
                </span>
                <h3 className="brand-font font-extrabold text-lg mt-4 mb-2">AI Chatbot & DM Triage</h3>
                <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Custom n8n workflow based on my <code>starey-ecom-triage-n8n</code> engine for 24/7 lead qualification, instant DM replies, and CRM routing.
                </p>
              </div>
              <a
                href="#booking"
                onClick={() => setSelectedService('AI Chatbot & DM Triage Integration')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold text-center shadow-md hover:opacity-95 transition"
              >
                Select Package ✦
              </a>
            </div>

            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-6 shadow-xl flex flex-col justify-between ${
                darkMode ? 'bg-[#120b29]/80 border-purple-400/25' : 'bg-white border-slate-300'
              }`}
            >
              <div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    darkMode ? 'text-purple-300 bg-purple-500/20 border-purple-400/30' : 'text-purple-800 bg-purple-100 border-purple-300'
                  }`}
                >
                  PKR 35,000 / $125
                </span>
                <h3 className="brand-font font-extrabold text-lg mt-4 mb-2">Payment & Onboarding Flow</h3>
                <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Automated Make.com & Stripe billing pipeline (<code>starey-stripe-invoice-flow</code>) for zero-touch invoicing and instant client welcome emails.
                </p>
              </div>
              <a
                href="#booking"
                onClick={() => setSelectedService('Payment & Onboarding Flow')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold text-center shadow-md hover:opacity-95 transition"
              >
                Select Package ✦
              </a>
            </div>

            <div
              className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-6 shadow-xl flex flex-col justify-between ${
                darkMode ? 'bg-[#120b29]/80 border-purple-400/25' : 'bg-white border-slate-300'
              }`}
            >
              <div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    darkMode ? 'text-cyan-300 bg-cyan-500/20 border-cyan-400/30' : 'text-cyan-800 bg-cyan-100 border-cyan-300'
                  }`}
                >
                  PKR 45,000 / $160
                </span>
                <h3 className="brand-font font-extrabold text-lg mt-4 mb-2">Full AI Pipeline Setup</h3>
                <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Complete enterprise automation combining web lead enrichment (<code>starey-omni-lead-enricher</code>) and multi-channel social autopilots.
                </p>
              </div>
              <a
                href="#booking"
                onClick={() => setSelectedService('Full AI Pipeline Setup')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold text-center shadow-md hover:opacity-95 transition"
              >
                Select Package ✦
              </a>
            </div>
          </div>
        </section>

        {/* Booking Section */}
        <section
          id="booking"
          className={`portfolio-card backdrop-blur-2xl border rounded-3xl p-8 shadow-2xl mb-12 transition-colors duration-300 ${
            darkMode ? 'bg-[#120b29]/90 border-purple-400/30' : 'bg-white border-slate-300 shadow-xl'
          }`}
        >
          <div className="max-w-2xl mx-auto text-center mb-8">
            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>✦ SECURE APPOINTMENT & CHECKOUT</span>
            <h2 className="brand-font text-2xl md:text-3xl font-extrabold mt-1">Book Your Automation Service</h2>
            <p className={`text-xs mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select your package, pick your calendar slot, and confirm your reservation instantly.
            </p>
          </div>

          <form onSubmit={handleBooking} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Select Service Package</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs font-semibold ${
                    darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="AI Chatbot & DM Triage Integration">AI Chatbot & DM Triage (PKR 25,000 / $90)</option>
                  <option value="Payment & Onboarding Flow">Payment & Onboarding Flow (PKR 35,000 / $125)</option>
                  <option value="Full AI Pipeline Setup">Full AI Pipeline Setup (PKR 45,000 / $160)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={bookingData.name}
                  onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs ${
                    darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  value={bookingData.email}
                  onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs ${
                    darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>WhatsApp Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={bookingData.phone}
                  onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs ${
                    darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Date Slot</label>
                  <input
                    type="date"
                    required
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    className={`w-full p-3 rounded-xl border text-xs ${
                      darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Time Slot</label>
                  <input
                    type="time"
                    required
                    value={bookingData.time}
                    onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                    className={`w-full p-3 rounded-xl border text-xs ${
                      darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>Project Details / Notes</label>
                <input
                  type="text"
                  placeholder="Briefly describe your requirements..."
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs ${
                    darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="brand-font w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-extrabold text-sm tracking-wider uppercase shadow-xl shadow-purple-600/30 hover:opacity-95 transition"
              >
                {loading ? 'Processing...' : 'Confirm ✦'}
              </button>
            </div>
          </form>
        </section>

        {/* Footer */}
        <footer className={`text-center text-xs pb-8 font-semibold ${darkMode ? 'text-purple-300/60' : 'text-slate-600'}`}>
          © 2026 KHADIJHA.SW • STAREY WONDER Architecture (<code className={darkMode ? 'text-cyan-300' : 'text-purple-700'}>khadijhasw.com</code>)
        </footer>
      </div>

      {/* Supabase Auth Modal (Real Google Account Picker + Email/Password) */}
      {authOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className={`backdrop-blur-2xl border rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-center ${
              darkMode ? 'bg-[#120b29] border-purple-400/40 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full font-bold ${
                darkMode ? 'bg-[#1a103c] text-pink-400' : 'bg-slate-200 text-pink-700'
              }`}
            >
              ✕
            </button>

            <span className={`text-xs font-extrabold uppercase tracking-widest ${darkMode ? 'text-cyan-300' : 'text-purple-700'}`}>
              ✦ SUPABASE CLIENT PORTAL
            </span>
            <h3 className="brand-font text-lg font-extrabold mt-1 mb-4">
              {user ? 'Account Connected' : authMode === 'signin' ? 'Sign In Instantly' : 'Create Client Account'}
            </h3>

            {user ? (
              <div className="space-y-4">
                <div className={`p-3.5 rounded-2xl border text-xs text-left ${darkMode ? 'bg-[#1a103c] border-purple-400/25' : 'bg-slate-100 border-slate-200'}`}>
                  <p className="font-bold">Signed in as:</p>
                  <p className="mt-1 break-all opacity-90">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm hover:bg-rose-700 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleLogin}
                  className={`w-full py-3 rounded-xl border text-xs font-bold shadow-sm transition text-center ${
                    darkMode
                      ? 'bg-[#1a103c] border-purple-400/30 text-white hover:border-cyan-400'
                      : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {authLoading ? 'Redirecting to Google...' : 'Continue with Google 🚀'}
                </button>

                <div className="flex items-center gap-2 py-1">
                  <div className={`h-px flex-1 ${darkMode ? 'bg-purple-400/20' : 'bg-slate-200'}`}></div>
                  <span className="text-[10px] font-bold uppercase opacity-60">or email</span>
                  <div className={`h-px flex-1 ${darkMode ? 'bg-purple-400/20' : 'bg-slate-200'}`}></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Password (min 6 chars)"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      darkMode ? 'bg-[#1a103c] border-purple-400/30 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition"
                  >
                    {authLoading
                      ? 'Please wait...'
                      : authMode === 'signin'
                        ? 'Sign In with Email'
                        : 'Sign Up with Email'}
                  </button>
                </form>

                {authMessage && (
                  <p className={`text-[11px] font-semibold p-2.5 rounded-xl ${darkMode ? 'bg-purple-950/80 text-cyan-200' : 'bg-slate-100 text-slate-800'}`}>
                    {authMessage}
                  </p>
                )}

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMessage('');
                      setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
                    }}
                    className={`text-[11px] font-bold underline ${darkMode ? 'text-pink-300' : 'text-purple-700'}`}
                  >
                    {authMode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}