// DevMeDoAnDrOiD
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, ShieldCheck, HeartHandshake, PhoneCall } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export function shouldShowSplashScreen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('shaha_splash_seen_v1') === '1') {
      return false;
    }

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      if (nav.type === 'reload' || nav.type === 'back_forward') {
        sessionStorage.setItem('shaha_splash_seen_v1', '1');
        return false;
      }
    }

    if (window.performance && window.performance.navigation) {
      const navType = window.performance.navigation.type;
      if (navType === 1 || navType === 2) {
        sessionStorage.setItem('shaha_splash_seen_v1', '1');
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 2400
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(12);

  const handleFinish = useCallback(() => {
    try {
      sessionStorage.setItem('shaha_splash_seen_v1', '1');
    } catch {}
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 450);
  }, [onComplete]);

  useEffect(() => {
    try {
      sessionStorage.setItem('shaha_splash_seen_v1', '1');
    } catch {}

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round(12 + (elapsed / minDurationMs) * 88));
      setProgress(pct);

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        handleFinish();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, handleFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="شاشة بدء منصة شها ون"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white select-none px-6 py-8 sm:py-12"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(10px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Ambient luminous glow auras */}
          <div
            className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none animate-pulse"
            style={{ animationDuration: '4s' }}
          />
          <div
            className="absolute bottom-1/4 -left-20 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none animate-pulse"
            style={{ animationDuration: '6s' }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.12)_0%,transparent_65%)] pointer-events-none" />

          {/* Top Header / Skip Button */}
          <div className="w-full max-w-md flex items-center justify-between z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-300 tracking-wider">قرية شها • المنصورة</span>
            </div>

            <button
              onClick={handleFinish}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-slate-200 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <span>تخطي</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Center Brand Identity Section */}
          <div className="flex flex-col items-center text-center my-auto z-10 max-w-sm">
            {/* Logo Emblem with dynamic radiant ring */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/30 blur-xl animate-pulse" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-2xl shadow-emerald-500/30">
                <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center p-3.5 border border-white/10">
                  <img
                    src="./brand-icon.svg"
                    alt="شعار شها ون"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.45)]"
                  />
                </div>
              </div>

              {/* Sub-badge micro emblem */}
              <div className="absolute -bottom-2 -left-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-[10px] font-black text-white shadow-lg border border-white/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>6.0</span>
              </div>
            </motion.div>

            {/* Typography */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="space-y-2"
            >
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
                شها ون <span className="text-emerald-400 font-extrabold tracking-normal text-2xl sm:text-3xl font-mono">| SHAHA ONE</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-300/90 leading-relaxed">
                المنصة الرقمية الموحدة لأهالي قرية شها
              </p>
            </motion.div>

            {/* Value Pillars Badges */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-5"
            >
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>دليل موثق</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300">
                <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                <span>طوارئ لحظية</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300">
                <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                <span>تكافل أهلي</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Progress Bar & Branding Signature */}
          <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10">
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                <span>جارٍ تشغيل المنصة…</span>
                <span className="font-mono text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.1 }}
                />
              </div>
            </div>

            {/* Subtle DevMeDoAnDrOiD Watermark Signature */}
            <div className="text-[10px] font-mono text-slate-500/70 tracking-widest pt-1 flex items-center gap-1.5">
              <span>DevMeDoAnDrOiD</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
              <span>Smart Platform</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.