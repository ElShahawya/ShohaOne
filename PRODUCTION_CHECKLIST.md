# SHAHA ONE | شها ون — Production Go-Live Checklist

قائمة التدقيق الشاملة لجاهزية الإنطلاق والتشغيل النهائي لمنصة **شها ون (SHAHA ONE)**.

---

## 📋 1. تدقيق الشفرة والبناء (Build & Compilation)
- [x] **Zero Build Errors**: نجاح بناء حزمة الويب وحزمة الخادم `npm run build` بنسبة 100%.
- [x] **Zero TypeScript Errors**: نجاح فحص الأنواع الصارم `npm run lint` (`tsc --noEmit`) دون أي أخطاء.
- [x] **Bundle Optimization**: تقسيم حزم الويب (Manual Chunks) لعزل `react`, `firebase`, و `ui-misc` لمنع البطء والملفات الضخمة.
- [x] **SPA Rewrites**: تهيئة `_redirects` و `vercel.json` و `netlify.toml` و `firebase.json` لمنع ظهور أخطاء 404 عند تحديث الصفحات الفرعية.

---

## 🔒 2. تدقيق الأمان وحماية الأسرار (Security & Secrets)
- [x] **Zero Secrets in Git**: استبعاد ملفات التخزين والمفاتيح والشهادات عبر `.gitignore` المحكم.
- [x] **No Plaintext Passwords**: تشفير كلمات مرور الإدارة عبر PBKDF2-SHA512 مع 100 ألف دورة.
- [x] **AES-256-GCM Encryption**: توفير محرك تشفير حقلي للبيانات الحساسة في `src/lib/encryption.ts`.
- [x] **Brute-Force Rate Limiting**: قفل محاولات تسجيل الدخول الخاطئة بعد 5 محاولات لمدة 15 دقيقة.
- [x] **Security Headers**: تفعيل HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy في جميع الاستجابات.

---

## 🔥 3. تدقيق Firebase و Firestore
- [x] **Default-Deny Catch-All**: إغلاق كافة المسارات غير المصرح بها في `firestore.rules`.
- [x] **Least Privilege Validation**: تدقيق أنواع وأحجام المدخلات لجميع المجموعات لمنع هجمات Denial of Wallet.
- [x] **PII Isolation**: حظر قراءة رسائل المواطنين الخاصة وطلبات الملكية على غير أصحابها والمشرفين.
- [x] **Safe Property Evaluation**: فحص وجود الحقول (`'field' in resource.data`) لمنع أخطاء الانهيار غير المقصودة.
- [x] **Composite Indexes**: تزويد `firestore.indexes.json` لضمان سرعة الاستعلامات المتعددة الحقول.
- [x] **Connection Testing**: فحص الاتصال التلقائي عبر `testConnection()` في `src/lib/firebase.ts`.

---

## 🚀 4. تدقيق النشر العالمي (Universal Deployment)
- [x] **Docker Multi-stage**: توفير `Dockerfile` و `.dockerignore` مع تشغيل بمستخدم غير جذري.
- [x] **Firebase Hosting**: توفير `firebase.json` مع إعدادات التخزين المؤقت `Cache-Control`.
- [x] **Vercel**: توفير `vercel.json` مع قواعد إعادة التوجيه.
- [x] **Netlify**: توفير `netlify.toml` و `public/_redirects`.
- [x] **Cloudflare Pages**: توفير `public/_routes.json` و `public/_headers`.
- [x] **CI/CD Automation**: أتمتة الفحص والبناء والنشر عبر `.github/workflows/ci.yml` و `.github/workflows/cd.yml`.

---

## 💾 5. تدقيق النسخ الاحتياطي والتعافي (Backup & DR)
- [x] **Automated Backup Tool**: أداة `scripts/backup-restore.mjs` للأرشفة الفورية.
- [x] **SHA-256 Integrity Verification**: فحص ومطابقة الهاش الرقمي لكل ملف في حزمة النسخ الاحتياطي.
- [x] **Documented Runbook**: توثيق كامل لخطوات استعادة النظام في `BACKUP_RESTORE.md`.

---

## 🎨 6. سياسة عدم التغيير وتجربة المستخدم (Zero Change Policy)
- [x] الحفاظ الكامل على الهوية البصرية الحالية وتصميم الواجهة.
- [x] الحفاظ على جميع الأقسام (أطباء، صيدليات، معلمين، محلات، طوارئ، بنك دم، مساعدات إنسانية، أخبار القرية).
- [x] الحفاظ على دعم اللغة العربية واتجاه RTL والتوافق المتجاوب مع الهواتف والتابلت والكمبيوتر.
