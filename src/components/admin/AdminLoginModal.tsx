// DevMeDoAnDrOiD
import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  ArrowRight,
  Download,
  Sparkles,
  Zap,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDirectory } from '../../context/DirectoryContext';
import { useAppInstallState } from '../../hooks/useAppInstallState';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (mustChangePassword?: boolean) => void;
  variant?: 'modal' | 'page';
}

const GoogleMark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  variant = 'modal'
}) => {
  const {
    adminLogin,
    signInWithGoogle,
    currentUser,
    isOnline,
    isInstallable,
    installApp,
    theme,
    toggleTheme
  } = useDirectory();

  const { isStandalone, isInstalled, prefersReducedMotion } = useAppInstallState();
  const isAppMode = isStandalone;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorPulseKey, setErrorPulseKey] = useState(0);

  useEffect(() => {
    if (!isOpen || variant !== 'modal') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !isGoogleLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, variant, isLoading, isGoogleLoading, onClose]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setErrorPulseKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      triggerError('يرجى كتابة كلمة المرور الإدارية');
      return;
    }

    setIsLoading(true);
    const result = await adminLogin(password);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess(result.mustChangePassword);
      onClose();
      setPassword('');
    } else {
      triggerError(result.error || 'كلمة المرور غير صحيحة');
    }
  };

  const handleGoogleAdmin = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.redirected) {
        return;
      }

      if (!result.user) {
        setIsGoogleLoading(false);
        triggerError('لم يكتمل تسجيل الدخول. حاول مرة أخرى.');
        return;
      }

      if (!result.isAdmin) {
        setIsGoogleLoading(false);
        triggerError(
          'تم تسجيل الدخول بحساب Google، لكن هذا الحساب لا يملك صلاحية إدارية. استخدم حساب المشرف المعتمد أو كلمة المرور.'
        );
        return;
      }

      setIsGoogleLoading(false);
      onLoginSuccess(false);
      onClose();
    } catch (err) {
      setIsGoogleLoading(false);
      triggerError(
        err instanceof Error && err.message ? err.message : 'فشل تسجيل الدخول بحساب Google'
      );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: 0.06, delayChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0.01 }
        : { type: 'spring' as const, stiffness: 320, damping: 28 }
    }
  };

  const busy = isLoading || isGoogleLoading;

  const showcaseFeatures = [
    {
      icon: ShieldCheck,
      title: 'حماية RBAC من الخادم',
      desc: 'تحقق فوري من الصلاحيات والأدوار عبر الخادم دون كشف أي بيانات حساسة.'
    },
    {
      icon: Zap,
      title: 'مزامنة لحظية فائقة',
      desc: 'إدارة كاملة للخدمات والتوثيق والبلاغات مع حفظ تلقائي ومرونة عالية.'
    },
    {
      icon: Smartphone,
      title: isAppMode ? 'وضع التطبيق الأصلي نشط' : 'تجربة App-Like متكاملة',
      desc: isAppMode
        ? 'تم التعرف على التطبيق المثبت وتفعيل واجهة الدخول السريع المتوافقة.'
        : 'تصميم متجاوب بالكامل للهاتف والتابلت والكمبيوتر مع دعم التثبيت.'
    }
  ];

  const outerWrapperClass =
    variant === 'page'
      ? 'relative min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      : 'fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex flex-col justify-between bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-slate-100';

  return (
    <AnimatePresence>
      <motion.div
        dir="rtl"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={outerWrapperClass}
      >
        {/* Ambient Animated Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '28px 28px'
            }}
          />

          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    x: [0, 35, -20, 0],
                    y: [0, -25, 20, 0],
                    scale: [1, 1.08, 0.96, 1]
                  }
            }
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-28 -right-24 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-blue-500/18 dark:bg-blue-500/20 blur-3xl"
          />
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    x: [0, -30, 25, 0],
                    y: [0, 30, -20, 0],
                    scale: [1, 0.94, 1.06, 1]
                  }
            }
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-32 -left-24 w-80 h-80 sm:w-[30rem] sm:h-[30rem] rounded-full bg-amber-500/14 dark:bg-amber-500/12 blur-3xl"
          />
        </div>

        {/* Top App / Navigation Bar */}
        <header
          className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between gap-3"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {variant === 'page' ? (
                <>
                  <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>العودة للرئيسية</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-slate-500" />
                  <span>إغلاق</span>
                </>
              )}
            </button>

            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border backdrop-blur-md ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'متصل بالخادم' : 'وضع عدم الاتصال'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Detected App Mode Pill */}
            {isAppMode ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 dark:bg-blue-500/15 border border-blue-600/25 dark:border-blue-400/25 text-[11px] font-extrabold text-blue-700 dark:text-blue-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
                </span>
                <Smartphone className="w-3.5 h-3.5" />
                <span>وضع التطبيق المثبت</span>
              </div>
            ) : isInstallable && !isInstalled ? (
              <button
                type="button"
                onClick={installApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت التطبيق</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
              className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-700" />}
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex items-center justify-center">
          <div
            className={`w-full grid gap-6 lg:gap-10 items-center ${
              isAppMode
                ? 'max-w-md mx-auto grid-cols-1'
                : 'grid-cols-1 lg:grid-cols-12 max-w-md sm:max-w-lg lg:max-w-none'
            }`}
          >
            {/* Desktop Brand Showcase Panel (hidden in compact App-Like standalone mode on desktop too, or shown on web desktop) */}
            {!isAppMode && (
              <motion.section
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex lg:col-span-6 flex-col justify-between p-8 xl:p-10 rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 text-white shadow-2xl border border-blue-800/40 relative overflow-hidden min-h-[540px]"
              >
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.35) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}
                />
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-blue-100">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>بوابة الإدارة المعتمدة • SHAHA ONE</span>
                    </div>
                  </div>

                  {/* Animated Orbital Emblem */}
                  <div className="flex items-center gap-4 pt-2">
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <motion.div
                        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 rounded-3xl border border-dashed border-blue-300/40"
                      />
                      <motion.div
                        animate={prefersReducedMotion ? undefined : { rotate: -360 }}
                        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-1.5 rounded-2xl border border-amber-300/30"
                      />
                      <div className="relative w-14 h-14 rounded-2xl bg-white/12 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-xl overflow-hidden">
                        <img
                          src="./brand-icon.svg"
                          alt="شها ون"
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight text-white">
                        منصة شها ون
                      </h1>
                      <p className="text-sm text-blue-100/80 mt-1 font-medium">
                        المنصة الرقمية المتكاملة لخدمات أهالي قرية شها
                      </p>
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="space-y-3 pt-4">
                    {showcaseFeatures.map((feat, idx) => {
                      const Icon = feat.icon;
                      return (
                        <motion.div
                          key={feat.title}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + idx * 0.08, duration: 0.4 }}
                          className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/12 backdrop-blur-md transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-500/25 border border-blue-300/30 text-blue-200 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-white">{feat.title}</h3>
                            <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                              {feat.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/75">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>نظام صلاحيات متعدد الطبقات</span>
                  </span>
                  <span className="font-mono opacity-60 tracking-wider">DevMeDoAnDrOiD</span>
                </div>
              </motion.section>
            )}

            {/* Login Form Card (Adapts to App-Like Standalone & Responsive Breakpoints) */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`w-full ${isAppMode ? '' : 'lg:col-span-6 lg:max-w-lg lg:mx-auto'}`}
            >
              <div
                className={`relative overflow-hidden border backdrop-blur-2xl shadow-2xl transition-all ${
                  isAppMode
                    ? 'rounded-3xl sm:rounded-[2rem] bg-white/92 dark:bg-slate-900/92 border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-8'
                    : 'rounded-3xl sm:rounded-[2rem] bg-white/88 dark:bg-slate-900/88 border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-8 xl:p-9'
                }`}
              >
                {/* Top Subtle Accent Line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500" />

                {/* Mobile / App-Mode Brand Crest */}
                <motion.div
                  variants={itemVariants}
                  className={`flex flex-col items-center text-center ${
                    isAppMode ? 'mb-6' : 'lg:items-start lg:text-right mb-6'
                  }`}
                >
                  <div
                    className={`relative mb-4 ${
                      isAppMode ? 'w-20 h-20' : 'w-16 h-16 lg:hidden'
                    } flex items-center justify-center`}
                  >
                    <motion.div
                      animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-3xl border-2 border-dashed border-blue-500/35 dark:border-blue-400/35"
                    />
                    <motion.div
                      initial={prefersReducedMotion ? false : { scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                      className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-700/25 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src="./brand-icon.svg"
                        alt="شها ون"
                        className="w-9 h-9 object-contain"
                      />
                    </motion.div>
                  </div>

                  <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAppMode ? 'دخول التطبيق الآمن' : 'تحقق أمني مشفر'}</span>
                  </div>

                  <h2 className="text-2xl sm:text-[1.65rem] font-black text-slate-900 dark:text-white tracking-tight">
                    تسجيل دخول الإدارة
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {isAppMode
                      ? 'أهلاً بك في تطبيق شها ون — سجّل دخولك للوصول إلى لوحة التحكم'
                      : 'لوحة الإدارة والتحكم الشاملة في خدمات ومحتوى منصة شها ون'}
                  </p>
                </motion.div>

                {/* Animated Error Alert */}
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div
                      key={errorPulseKey}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6, x: 0 }}
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, y: 0, x: [0, -7, 7, -4, 4, 0] }
                      }
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35 }}
                      className="p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-2.5 shadow-xs"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password Form */}
                <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="shaha-admin-password"
                        className="block text-xs font-extrabold text-slate-700 dark:text-slate-300"
                      >
                        كلمة مرور المشرف
                      </label>
                      {capsLockOn && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                          تنبيه: Caps Lock مفعل
                        </span>
                      )}
                    </div>

                    <div className="relative group">
                      <input
                        id="shaha-admin-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        autoComplete="current-password"
                        value={password}
                        onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="أدخل كلمة المرور الإدارية..."
                        className="w-full min-h-[50px] px-4 py-3 pl-20 rounded-2xl text-sm bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-600/12 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute left-10 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <KeyRound className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={busy}
                    whileHover={prefersReducedMotion || busy ? undefined : { scale: 1.01 }}
                    whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.985 }}
                    className="relative overflow-hidden group w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-teal-700 hover:from-blue-800 hover:to-teal-800 text-white font-extrabold text-sm shadow-lg shadow-blue-700/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق الآمن...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>دخول لوحة التحكم</span>
                      </>
                    )}
                  </motion.button>
                </motion.form>

                {/* Divider */}
                <motion.div variants={itemVariants} className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold rounded-full">
                      أو الدخول السريع بحساب المشرف
                    </span>
                  </div>
                </motion.div>

                {/* Google Admin Login */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={handleGoogleAdmin}
                    disabled={busy}
                    whileHover={prefersReducedMotion || busy ? undefined : { scale: 1.01 }}
                    whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.985 }}
                    className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <GoogleMark className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {isGoogleLoading
                        ? 'جاري المصادقة عبر Google...'
                        : currentUser?.email
                          ? `الدخول بالحساب الحالي (${currentUser.email})`
                          : 'الدخول بواسطة Google للمشرف المعتمد'}
                    </span>
                  </motion.button>
                </motion.div>

                {/* App Install Callout on Mobile/Tablet Web Browser when not yet installed */}
                {!isAppMode && isInstallable && !isInstalled && (
                  <motion.div
                    variants={itemVariants}
                    className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-amber-50/70 dark:from-blue-950/50 dark:to-amber-950/30 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          ثبّت تطبيق شها ون
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          تجربة أسرع بنمط App-Like ودخول فوري
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={installApp}
                      className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                    >
                      تثبيت
                    </button>
                  </motion.div>
                )}

                {/* Security Footer */}
                <motion.div
                  variants={itemVariants}
                  className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1.5 text-center"
                >
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    يتم التحقق من الصلاحيات الإدارية من جهة الخادم وفق أعلى معايير الأمان وتشفير الجلسات
                  </p>
                  <span className="text-[10px] font-mono text-slate-300 dark:text-slate-700 select-none">
                    DevMeDoAnDrOiD
                  </span>
                </motion.div>
              </div>
            </motion.section>
          </div>
        </main>

        {/* Safe Area Bottom Padding */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </motion.div>
    </AnimatePresence>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
