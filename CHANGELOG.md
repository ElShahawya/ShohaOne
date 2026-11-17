# سجل التغييرات والترقيات المعمارية | CHANGELOG — SHAHA ONE (شها ون)

## [7.0.0] - نوفمبر 2026 — Production Hardening & Universal Deployment

### 🛡️ الأمن والحماية والتحصين المتقدم (DevSecOps Hardening)
- **قواعد أمان Firebase المحدثة (`firestore.rules`):**
  - فحص مدخلات وأحجام جميع المجموعات (الرسائل، الاقتراحات، المساعدات، الشكاوى) لمنع هجمات Denial of Wallet.
  - فحص أمان وجود الخصائص قبل القراءة (`'field' in resource.data`) لمنع أخطاء الانهيار غير المقصودة.
  - حماية بيانات PII والرسائل الإدارية وطلبات التوثيق وحصرها على المشرفين وأصحابها المعتمدين.
  - نشر القواعد فوراً عبر `deploy_firebase`.
- **فهارس Firestore المتعددة (`firestore.indexes.json`):**
  - بناء وتوفير فهارس الفرز والاستعلامات المركبة على المجموعات النشطة لتسريع الاستجابة.
- **محرك التشفير المتماثل AES-256-GCM (`src/lib/encryption.ts`):**
  - تشفير حقلي بالمعايير القياسية مع توقيع مصادقة 128-bit وعزل مفاتيح التشفير عن العميل.
  - دوال تنقية وإخفاء الهوية وسجلات التدقيق (Masking & Redaction) لأرقام الهواتف والبيانات الشخصية.
- **تحصين ملفات الأسرار وتجاهل الرفع (`.gitignore` & `.dockerignore`):**
  - حظر رفع ملفات التخزين المحلية والشهادات والنسخ الاحتياطية وملفات البيئة.

### 🌐 جاهزية النشر العالمي (Universal Deployment Architecture)
- **تهيئة بيئات الاستضافة المتعددة:**
  - `firebase.json`: توجيهات الـ SPA، ترويسات الأمان، وتكوين محاكي Firebase المحلي.
  - `vercel.json`: إعداد النشر على Vercel مع معالجة المسارات والترويسات.
  - `netlify.toml` و `public/_redirects`: إعداد النشر على Netlify وCloudflare Pages.
  - `public/_routes.json` و `public/_headers`: ترويسات التخزين المؤقت وحماية المسارات على Cloudflare.
  - `Dockerfile` & `.dockerignore`: حاوية متعددة المراحل تعمل بمستخدم غير جذري لـ Cloud Run وDocker وVPS.
- **أتمتة خطوط التكامل والنشر (Automated CI/CD Workflows):**
  - `.github/workflows/ci.yml`: التحقق الآلي من الكود، فحص الأنواع الصارم، والبناء، وفحص الحزم الأمنية.
  - `.github/workflows/cd.yml`: أتمتة النشر المتحكم به للإنتاج وبيئات المعاينة.

### 💾 النسخ الاحتياطي والتعافي من الكوارث (Backup & Recovery)
- **أداة الأرشفة والتدقيق الآلي (`scripts/backup-restore.mjs`):**
  - إنشاء حزم نسخ احتياطي مؤرخة ومحمية مع فحص تطابق توقيعات SHA-256 الرقمية.
  - أوامر سريعة في `package.json` (`npm run backup`, `npm run backup:verify`).

### 📚 التوثيق الهندسي الشامل
- إنشاء وتحديث 7 ملفات توثيق هندسية متكاملة (`README.md`, `.env.example`, `DEPLOYMENT_GUIDE.md`, `SECURITY.md`, `FIREBASE_SECURITY.md`, `ENCRYPTION_STRATEGY.md`, `BACKUP_RESTORE.md`, `PRODUCTION_CHECKLIST.md`).

## [6.0.0] - نوفمبر 2026

### 🚀 ترقية الهوية البصرية والعلامة التجارية
- **تحديث الاسم والشعار الرسمي:** تغيير الاسم الشامل والموحد إلى **«SHAHA ONE | شها ون»** عبر كافة الصفحات والترويسة، القوائم، المودالات، الروابط، وملفات الإعدادات (`index.html` و`metadata.json`).

### 🌟 المميزات والأنظمة الجديدة المتقدمة (Next-Gen Expansion)
1. **Smart Availability Engine (`src/utils/availability.ts`):**
   - محرك ذكي لحساب ومناظرة مواعيد وساعات الاستقبال وتحديد حالة التوفر في الوقت الفعلي (`مفتوح الآن`، `مغلق الآن`، `متاح 24 ساعة`، `يستقبل استفسارات`).
2. **Claim Listing System (`ClaimListingModal.tsx` & `ClaimsAdmin.tsx`):**
   - تمكين أصحاب المحلات والعيادات والحرفيين من تقديم طلب استلام وتوثيق ملكية بروفايلاتهم مع رفع إثباتات الهلية ومراجعتها إدارياً.
3. **Data Quality Engine & Duplicate Detector (`src/utils/dataQuality.ts` & `DataQualityAdmin.tsx`):**
   - محرك تلقائي لحساب نسبة اكتمال وجودة كل ملف خدمة (0-100%) وتحديد العناوين أو الأرقام المفقودة.
   - كاشف ذكي للسجلات المكررة يقدم خيار الدمج الآمن بنقرة واحدة ونقل إحصائيات الاتصال والزيارات.
4. **Community Suggestions & Voting System (`CommunitySuggestionsModal.tsx` & `CommunitySuggestionsAdmin.tsx`):**
   - منصة تصويت مجتمعية تتيح لأهالي شها اقتراح أقسام أو خدمات جديدة والتصويت عليها.
5. **CSV Batch Data Import Center (`CSVDataImportAdmin.tsx`):**
   - إمكانية استيراد مئات الخدمات والأرقام دفعة واحدة من ملفات Excel/CSV مع معاينة البيانات وفحص أرقام الهواتف قبل الحفظ النهائي في Firestore.
6. **Feature Flags Controller (`FeatureFlagsAdmin.tsx`):**
   - لوحة حصرية للمالك السيادي للتحكم الفوري في تفعيل وتعطيل الميزات المتقدمة دون الحاجة لتعديل الكود.
7. **Spotlight Universal Search (`SpotlightSearchModal.tsx`):**
   - محرك بحث شامل وسريع يدعم الاختصار العالمي `Ctrl+K` / `Cmd+K`.
8. **Recently Viewed Services Carousel (`RecentlyViewedBar.tsx`):**
   - شريط ذكي يحفظ في الذاكرة المحلية لآخر الخدمات والأطباء الذين تمت زيارتهم.
9. **Real-time Network Offline / Online Banner (`NetworkStatusBanner.tsx`):**
   - مؤشر لحظي لحالة الاتصال بالإنترنت مع دعم استمرارية العمل في وضع عدم الاتصال (Offline Mode).

### 🔒 الحماية والأمان والحصرية السيادية
- **حصرية المالك السيادي (`ownerOnly: true`):** قصر صلاحيات إدارة مفاتيح الخصائص، صفحات فيسبوك الرسمية، وإدارة المشرفين على المالك السيادي فقط (`devmedoandroid@gmail.com`).
- **تأمين Firestore Rules:** إضافة قواعد الحماية لمجموعات `claims` و`suggestions` و`notifications`.
