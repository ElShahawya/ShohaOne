// DevMeDoAnDrOiD
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, Check, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 72,
  maxPull = 124,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const isDragging = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const isAtTop = () => {
    if (typeof window === 'undefined') return true;
    return window.scrollY <= 2 || document.documentElement.scrollTop <= 2;
  };

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(64);
    pullRef.current = 64;
    try {
      await onRefresh();
      setIsSuccess(true);
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([18, 35, 18]);
        }
      } catch {}
      window.setTimeout(() => {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
        pullRef.current = 0;
      }, 650);
    } catch {
      setIsRefreshing(false);
      setPullDistance(0);
      pullRef.current = 0;
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing || !isAtTop()) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      hasTriggeredHaptic.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || startY.current === null || isRefreshing) return;

      if (!isAtTop()) {
        isDragging.current = false;
        pullRef.current = 0;
        setPullDistance(0);
        return;
      }

      const rawDelta = e.touches[0].clientY - startY.current;
      if (rawDelta > 0) {
        const damped = Math.min(maxPull, Math.pow(rawDelta, 0.82) * 1.55);
        pullRef.current = damped;
        setPullDistance(damped);

        if (damped >= threshold && !hasTriggeredHaptic.current) {
          hasTriggeredHaptic.current = true;
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate?.([12]);
            }
          } catch {}
        } else if (damped < threshold && hasTriggeredHaptic.current) {
          hasTriggeredHaptic.current = false;
        }

        if (e.cancelable && rawDelta > 10) {
          e.preventDefault();
        }
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      startY.current = null;

      if (pullRef.current >= threshold && !isRefreshing) {
        void executeRefresh();
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, isRefreshing, maxPull, threshold, executeRefresh]);

  const progress = Math.min(1, pullDistance / threshold);
  const isPastThreshold = pullDistance >= threshold;
  const ringCircumference = 88;
  const pillScale = isRefreshing || isSuccess ? 1 : 0.84 + progress * 0.16;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="w-full flex items-center justify-center overflow-hidden select-none"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 4 || isRefreshing || isSuccess ? Math.min(1, pullDistance / 36) : 0,
          transition: isDragging.current
            ? 'none'
            : 'height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease'
        }}
        aria-hidden="true"
      >
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg transition-colors duration-200 ${
            isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 shadow-emerald-500/20'
              : isPastThreshold || isRefreshing
                ? 'bg-white dark:bg-slate-900 border-emerald-400/70 dark:border-emerald-500/60 shadow-emerald-500/15'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80 shadow-slate-900/10'
          }`}
          style={{
            transform: `scale(${pillScale})`,
            transition: isDragging.current ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            {!isRefreshing && !isSuccess && (
              <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="ptrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  className="stroke-slate-200 dark:stroke-slate-800 fill-none"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  stroke="url(#ptrGrad)"
                  className="fill-none"
                  strokeWidth="3"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference - ringCircumference * progress}
                  strokeLinecap="round"
                />
              </svg>
            )}

            {isRefreshing && !isSuccess && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-500/25 border-t-emerald-500 animate-spin" />
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              {isSuccess ? (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
              ) : isRefreshing ? (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
              ) : (
                <ArrowDown
                  className={`w-3.5 h-3.5 transition-colors duration-150 ${
                    isPastThreshold
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  style={{
                    transform: isPastThreshold ? 'rotate(180deg)' : `rotate(${progress * 180}deg)`
                  }}
                />
              )}
            </div>
          </div>

          <div className="text-right leading-tight">
            <p className="text-xs font-black text-slate-800 dark:text-slate-100">
              {isSuccess
                ? 'تم التحديث بنجاح!'
                : isRefreshing
                  ? 'جارٍ تحديث البيانات…'
                  : isPastThreshold
                    ? 'أفلت للتحديث الفوري'
                    : 'اسحب للأسفل للتحديث'}
            </p>
            <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80 font-mono">
              {isSuccess ? 'مزامنة مكتملة' : isRefreshing ? 'SHAHA ONE Sync' : `${Math.round(progress * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
