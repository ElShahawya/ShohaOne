// DevMeDoAnDrOiD
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, HeartHandshake, PhoneCall, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const SPLASH_SESSION_KEY = 'shaha_native_splash_v3';

export function shouldShowSplashScreen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
      return false;
    }

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      if (nav.type === 'reload' || nav.type === 'back_forward') {
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        return false;
      }
    }

    if (window.performance && window.performance.navigation) {
      const navType = window.performance.navigation.type;
      if (navType === 1 || navType === 2) {
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        return false;
      }
    }

    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1150
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {}

    const dismissTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, minDurationMs);

    const completeTimer = window.setTimeout(() => {
      onComplete?.();
    }, minDurationMs + 280);

    return () => {
      window.clearTimeout(dismissTimer);
      window.clearTimeout(completeTimer);
    };
  }, [minDurationMs, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="شاشة بدء منصة شها ون"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-[#030712] text-white select-none px-6 py-10 sm:py-14 will-change-transform"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.16) 0%, rgba(20, 184, 166, 0.06) 35%, transparent 70%)'
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 z-10"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-black text-emerald-300 tracking-wider">قرية شها • المنصورة</span>
          </motion.div>

          <div className="flex flex-col items-center text-center my-auto z-10 max-w-sm">
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-2xl shadow-emerald-500/30">
                <div className="w-full h-full rounded-[24px] bg-[#030712] flex items-center justify-center p-3.5 border border-white/10 overflow-hidden">
                  <img
                    src="./brand-icon.svg"
                    alt="شعار شها ون"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="absolute -bottom-2 -left-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-[10px] font-black text-white shadow-lg border border-white/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>6.0</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
                شها ون <span className="text-emerald-400 font-extrabold tracking-normal text-2xl sm:text-3xl font-mono">| SHAHA ONE</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-300/90 leading-relaxed">
                المنصة الرقمية الموحدة لأهالي قرية شها
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.16, duration: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-5"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>دليل موثق</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300">
                <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                <span>طوارئ لحظية</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300">
                <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                <span>تكافل أهلي</span>
              </div>
            </motion.div>
          </div>

          <div className="w-full max-w-xs flex flex-col items-center gap-2.5 z-10">
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                <span>جارٍ تشغيل المنصة…</span>
                <span className="font-mono text-emerald-400 font-bold">SHAHA ONE</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full w-full origin-right rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                  initial={{ scaleX: 0.1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: minDurationMs / 1000, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
