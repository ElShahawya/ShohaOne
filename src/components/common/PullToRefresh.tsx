// DevMeDoAnDrOiD
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  maxPull = 120,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const isAtTop = () => {
    if (typeof window === 'undefined') return true;
    return window.scrollY <= 2 || document.documentElement.scrollTop <= 2;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop()) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    hasTriggeredHaptic.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || startY.current === null || isRefreshing) return;

    if (!isAtTop()) {
      isDragging.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const rawDelta = currentY - startY.current;

    if (rawDelta > 0) {
      // Elastic rubber-band resistance formula
      const damped = Math.min(maxPull, Math.pow(rawDelta, 0.82) * 1.55);
      setPullDistance(damped);

      if (damped >= threshold && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.([15]);
          }
        } catch {}
      } else if (damped < threshold && hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = false;
      }

      // Prevent native overscroll browser reload if pulling down from top
      if (e.cancelable && rawDelta > 8) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  };

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(56);
    try {
      await onRefresh();
      setIsSuccess(true);
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([20, 40, 20]);
        }
      } catch {}
      setTimeout(() => {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }, 700);
    } catch {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    startY.current = null;

    if (pullDistance >= threshold && !isRefreshing) {
      void executeRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / threshold);
  const isPastThreshold = pullDistance >= threshold;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull indicator bar */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out select-none"
        style={{
          height: `${pullDistance}px`,
          transition: isDragging.current ? 'none' : 'height 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-lg border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
          {/* Circular interactive icon indicator */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* SVG Progress Arc */}
            {!isRefreshing && !isSuccess && (
              <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
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
                  className="stroke-emerald-600 dark:stroke-emerald-400 fill-none transition-all duration-75"
                  strokeWidth="3"
                  strokeDasharray={88}
                  strokeDashoffset={88 - 88 * progress}
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Inner dynamic icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isSuccess ? (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-scale-up" />
              ) : isRefreshing ? (
                <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
              ) : (
                <ArrowDown
                  className={`w-4 h-4 transition-transform duration-150 ${
                    isPastThreshold
                      ? 'rotate-180 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  style={{
                    transform: isPastThreshold ? 'rotate(180deg)' : `rotate(${progress * 180}deg)`
                  }}
                />
              )}
            </div>
          </div>

          {/* Interactive Status Text */}
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isSuccess
                ? 'تم التحديث بنجاح!'
                : isRefreshing
                ? 'جارٍ تحديث دليل وبيانات شها…'
                : isPastThreshold
                ? 'اترك للتحديث الآن'
                : 'اسحب للتحديث'}
            </p>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono">
              SHAHA ONE • Refresh
            </span>
          </div>
        </div>
      </div>

      {/* Main children content */}
      {children}
    </div>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.