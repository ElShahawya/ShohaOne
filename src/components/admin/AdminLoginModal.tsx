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
  Loader2,
  UserPlus,
  LogIn,
  Mail,
  User
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

type AuthTab = 'signin' | 'signup';

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
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    currentUser,
    isOnline,
    isInstallable,
    installApp,
    theme,
    toggleTheme
  } = useDirectory();

  const { isStandalone, isInstalled, prefersReducedMotion } = useAppInstallState();
  const isAppMode = isStandalone;

  const [activeTab, setActiveTab] = useState<AuthTab>('signin');

  // Form states
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
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

  const handleUserSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!userEmail.trim()) {
      triggerError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!userPassword) {
      triggerError('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    const result = await signInWithEmail(userEmail, userPassword);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess(false);
      onClose();
      setUserPassword('');
    } else {
      triggerError(result.error || 'فشل تسجيل الدخول. تحقق من بياناتك.');
    }
  };

  const handleUserSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!userName.trim() || userName.trim().length < 2) {
      triggerError('يرجى إدخال اسمك الكريم (حرفين على الأقل)');
      return;
    }
    if (!userEmail.trim() || !userEmail.includes('@')) {
      triggerError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    if (!userPassword || userPassword.length < 6) {
      triggerError('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (userPassword !== confirmPassword) {
      triggerError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail(userEmail, userPassword, userName);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess(false);
      onClose();
      setUserPassword('');
      setConfirmPassword('');
    } else {
      triggerError(result.error || 'فشل إنشاء الحساب. حاول مجدداً.');
    }
  };

  const handleGoogleAuth = async () => {
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
        : { staggerChildren: 0.05, delayChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 },
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
      title: 'حماية وحسابات موثقة',
      desc: 'تسجيل دخول آمن للمواطنين والمشرفين مع حفظ بياناتك ومفضلتك.'
    },
    {
      icon: Zap,
      title: 'مزامنة لحظية فائقة',
      desc: 'إمكانية إضافة أرقامك وخدماتك والتفاعل مع إعلانات وأخبار القرية.'
    },
    {
      icon: Smartphone,
      title: isAppMode ? 'وضع التطبيق الأصلي نشط' : 'تجربة Native سريعة',
      desc: isAppMode
        ? 'تم التعرف على التطبيق وتفعيل الدخول السريع المتوافق.'
        : 'متجاوب بالكامل مع الهواتف والشاشات اللوحية والكمبيوتر.'
    }
  ];

  const outerWrapperClass =
    variant === 'page'
      ? 'relative min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      : 'fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex flex-col justify-between bg-slate-50/98 dark:bg-slate-950/98 text-slate-900 dark:text-slate-100';

  return (
    <AnimatePresence>
      <motion.div
        dir="rtl"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={outerWrapperClass}
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '28px 28px'
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.12) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(20, 184, 166, 0.1) 0%, transparent 45%)'
            }}
          />
        </div>

        {/* Top Header */}
        <header
          className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 sm:pt-6 flex items-center justify-between gap-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {variant === 'page' ? (
                <>
                  <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
            {isAppMode ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/10 dark:bg-emerald-500/15 border border-emerald-600/25 dark:border-emerald-400/25 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
                </span>
                <Smartphone className="w-3.5 h-3.5" />
                <span>وضع التطبيق</span>
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
              onClick={(e) => toggleTheme(e)}
              aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
              className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition-all active:scale-90 cursor-pointer overflow-hidden"
            >
              <Sun className={`w-4 h-4 text-amber-400 absolute transition-all duration-300 ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
              <Moon className={`w-4 h-4 text-emerald-700 absolute transition-all duration-300 ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex items-center justify-center">
          <div
            className={`w-full grid gap-6 lg:gap-10 items-center ${
              isAppMode
                ? 'max-w-md mx-auto grid-cols-1'
                : 'grid-cols-1 lg:grid-cols-12 max-w-md sm:max-w-lg lg:max-w-none'
            }`}
          >
            {/* Desktop Brand Showcase Panel */}
            {!isAppMode && (
              <motion.section
                initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex lg:col-span-6 flex-col justify-between p-8 xl:p-10 rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-2xl border border-emerald-800/30 relative overflow-hidden min-h-[560px]"
              >
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}
                />
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-bold text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>بوابة الهوية والخدمات • SHAHA ONE</span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <motion.div
                        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 rounded-3xl border border-dashed border-emerald-400/40"
                      />
                      <div className="relative w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl overflow-hidden">
                        <img src="./brand-icon.svg" alt="شها ون" className="w-10 h-10 object-contain" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight text-white">منصة شها ون</h1>
                      <p className="text-sm text-emerald-100/80 mt-1 font-medium">
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
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 + idx * 0.07, duration: 0.35 }}
                          className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-white">{feat.title}</h3>
                            <p className="text-xs text-slate-300/80 mt-0.5 leading-relaxed">{feat.desc}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/75">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>منظومة متكاملة لحسابات الأهالي والإدارة</span>
                  </span>
                  <span className="font-mono opacity-60 tracking-wider">SHAHA ONE</span>
                </div>
              </motion.section>
            )}

            {/* Login & Registration Form Card */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`w-full ${isAppMode ? '' : 'lg:col-span-6 lg:max-w-lg lg:mx-auto'}`}
            >
              <div
                className={`relative overflow-hidden border shadow-2xl transition-all ${
                  isAppMode
                    ? 'rounded-3xl sm:rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-7'
                    : 'rounded-3xl sm:rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-7 xl:p-8'
                }`}
              >
                {/* Top Radiant Accent Line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

                {/* Mobile Emblem */}
                <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-5">
                  <div className="relative mb-3 w-14 h-14 lg:hidden flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/25 flex items-center justify-center overflow-hidden">
                      <img src="./brand-icon.svg" alt="شها ون" className="w-8 h-8 object-contain" />
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeTab === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeTab === 'signin'
                      ? 'أهلاً بك مجدداً في منصة شها ون'
                      : 'انضم الآن لمجتمع أهالي شها واستفد من كافة الخدمات'}
                  </p>
                </motion.div>

                {/* Segmented Control / Tabs */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-1.5 p-1 mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'signin'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'signup'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>حساب جديد</span>
                  </button>
                </motion.div>

                {/* Animated Error Alert */}
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div
                      key={errorPulseKey}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="p-3 mb-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-2 shadow-xs"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick 1-Tap Google Sign-In */}
                <motion.div variants={itemVariants} className="space-y-3 mb-4">
                  <motion.button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={busy}
                    whileHover={prefersReducedMotion || busy ? undefined : { scale: 1.01 }}
                    whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.985 }}
                    className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <GoogleMark className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {isGoogleLoading
                        ? 'جاري المصادقة عبر Google...'
                        : currentUser?.email
                          ? `المتابعة بحساب (${currentUser.email})`
                          : 'المتابعة السريعة بواسطة Google'}
                    </span>
                  </motion.button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold rounded-full">
                        أو بالبريد الإلكتروني
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* TAB 1: User Sign In Form */}
                {activeTab === 'signin' && (
                  <motion.form variants={itemVariants} onSubmit={handleUserSignIn} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          dir="ltr"
                          value={userEmail}
                          onChange={(e) => {
                            setUserEmail(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="name@example.com"
                          className="w-full min-h-[46px] px-3.5 py-2 pl-10 rounded-2xl text-xs sm:text-sm bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={userPassword}
                          onChange={(e) => {
                            setUserPassword(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="أدخل كلمة المرور..."
                          className="w-full min-h-[46px] px-3.5 py-2 pl-16 rounded-2xl text-xs sm:text-sm bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute left-9 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={busy}
                      whileHover={prefersReducedMotion || busy ? undefined : { scale: 1.01 }}
                      whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.985 }}
                      className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-700/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري تسجيل الدخول...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>تسجيل الدخول</span>
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* TAB 2: User Sign Up Form */}
                {activeTab === 'signup' && (
                  <motion.form variants={itemVariants} onSubmit={handleUserSignUp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الاسم الكريم
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={userName}
                          onChange={(e) => {
                            setUserName(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="الاسم ثلاثي أو اللقب"
                          className="w-full min-h-[44px] px-3.5 py-2 pl-10 rounded-2xl text-xs sm:text-sm bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          dir="ltr"
                          value={userEmail}
                          onChange={(e) => {
                            setUserEmail(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="name@example.com"
                          className="w-full min-h-[44px] px-3.5 py-2 pl-10 rounded-2xl text-xs sm:text-sm bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          كلمة المرور
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={userPassword}
                            onChange={(e) => {
                              setUserPassword(e.target.value);
                              if (errorMessage) setErrorMessage('');
                            }}
                            placeholder="6 خانات فأكثر"
                            className="w-full min-h-[44px] px-3 py-2 pl-9 rounded-2xl text-xs bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          تأكيد كلمة المرور
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="أعد إدخالها"
                          className="w-full min-h-[44px] px-3 py-2 rounded-2xl text-xs bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={busy}
                      whileHover={prefersReducedMotion || busy ? undefined : { scale: 1.01 }}
                      whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.985 }}
                      className="w-full min-h-[48px] mt-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-700/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري إنشاء الحساب...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>إنشاء حسابي مجاناً</span>
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* Footer Security Note */}
                <motion.div variants={itemVariants} className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1 text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    نظام حماية وتشفير متكامل معتمد لمنصة قرية شها الرقمية
                  </p>
                </motion.div>
              </div>
            </motion.section>
          </div>
        </main>

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </motion.div>
    </AnimatePresence>
  );
};

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.