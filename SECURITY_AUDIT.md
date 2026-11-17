# تدقيق الأمان السيادي | SECURITY AUDIT — SHAHA ONE

**الإصدار:** 6.0.0  
**تاريخ التدقيق:** 12 نوفمبر 2026  
**النطاق:** `server.ts`، `firestore.rules`، `src/context/DirectoryContext.tsx`، رؤوس HTTP، إعدادات النشر، أسرار البيئة.  
**منهجية:** مراجعة كود + اختبار حي على خادم إنتاج محلي (`NODE_ENV=production`, المنفذ 3100) + تحليل قواعد Firestore.  
**الحالة:** الإصلاحات الحرجة مطبقة ومختبرة. توجد مخاطر متبقية موثقة في القسم 8، وأهمها خصوصية بيانات المستفيدين في Firestore.

---

## 1. الملخص التنفيذي

| التصنيف | قبل الإصلاح | بعد الإصلاح |
| :--- | :--- | :--- |
| انتحال هوية المالك عبر بريد مرسل من العميل | ممكن (Critical) | ممنوع — يتطلب Firebase ID Token موثقاً (Fixed) |
| إضافة/تعديل خدمات بدون تسجيل دخول | ممكن (High) | ممنوع — 401 (Fixed) |
| تزوير جلسة مشرف | ممكن عند ضعف/تسريب السر (High) | توقيع HMAC + مقارنة زمنية ثابتة (Mitigated) |
| كشف سجلات مخفية في `/api/listings` | ممكن (Medium) | يتم ترشيح `status === 'hidden'` (Fixed) |
| تخمين كلمة مرور الإدارة | غير محدود (High) | قفل 15 دقيقة بعد 5 محاولات + Rate Limit (Fixed) |
| رؤوس أمان/CSP | غائبة (Medium) | مطبقة في الإنتاج (Fixed) |
| خصوصية المستفيدين في Firestore | قراءة عامة للحقول الحساسة (High) | **لم تُحل بعد** — تحتاج Projection Collection (Open) |

> **ملاحظة صدق:** لم يتم التحقق من نشر `firestore.rules` على مشروع Firebase الفعلي لعدم توفر صلاحيات Firebase CLI في بيئة العمل. الملف محدّث ومُراجع، لكن النشر والاختبار على المحاكي مهمة مطلوبة قبل الإطلاق.

---

## 2. نموذج التهديد

### الأصول المحمية
- جلسة مشرف النظام وصلاحيات RBAC.
- بيانات الخدمات والأرقام وهواتف أصحابها.
- بيانات المستفيدين من المساعدات (اسم، هاتف، مستندات).
- بيانات المتبرعين وحالاتهم.
- سجلات التدقيق `audit_logs` ورسائل الإدارة.
- أسرار الخادم (`SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `INITIAL_ADMIN_PASSWORD`).

### الجهات المهاجمة المفترضة
- زائر مجهول يحاول الكتابة أو انتحال الهوية.
- مستخدم مسجل يحاول تصعيد الصلاحيات أو تعديل خدمة ليست ملكه.
- موقع خارجي يحاول إرسال طلبات POST/PUT/DELETE نيابة عن المستخدم.
- مهاجم يحاول تخمين كلمة مرور الإدارة أو إغراق النماذج.
- مستخدم يقرأ Firestore مباشرة عبر SDK لتجاوز واجهة الموقع.

### حدود الثقة
1. **المتصفح غير موثوق:** أي `email` أو `uid` أو `role` قادم من العميل يُعتبر ادعاءً حتى يُتحقق منه خادمياً.
2. **Firebase ID Token موثوق بعد التحقق:** يُتحقق من التوقيع والجمهور والمُصدر والانتهاء عبر Google.
3. **جلسة المشرف موثوقة بعد التحقق من HMAC:** التوقيع سريع لكنه يعتمد على سرية `SESSION_SECRET`.
4. **Firestore Rules هي خط الدفاع الأخير:** أي كتابة مباشرة من SDK لا تمر عبر Express ولا Rate Limiter.

---

## 3. المصادقة والتفويض

### 3.1 جلسة المشرف (Admin Session)
- كلمة المرور تُخزن كـ PBKDF2-SHA512 (100,000 دورة، ملح 16 بايت، مفتاح 64 بايت) وليست نصاً صريحاً.
- المقارنة تتم عبر `crypto.timingSafeEqual` لمنع Timing Attacks.
- التوكن: `base64url(payload).HMAC-SHA256(payload, SESSION_SECRET)`، صلاحية 24 ساعة.
- `requireAdmin` يتحقق من التوقيع والانتهاء، ثم `requirePermission` يتحقق من الصلاحية، و`requireOwner` يحصر عمليات معينة بالمالك.
- لا توجد كوكيز جلسة، لذا لا يوجد CSRF تقليدي؛ ومع ذلك أُضيف حارس Same-Origin للطلبات المغيّرة للحالة.
- في الإنتاج: لا توجد كلمة مرور افتراضية. عند غياب `INITIAL_ADMIN_PASSWORD` يُولَّد سر عشوائي ويُطبع مرة واحدة، مع تحذير صريح.
- في التطوير فقط: كلمة المرور الافتراضية `551993` مع تحذير، ولا تُستخدم في الإنتاج.

### 3.2 هوية المواطن (Firebase ID Token)
- العميل يرسل `X-Firebase-Id-Token` (أو `Authorization: Bearer <JWT>` ثلاثي الأجزاء).
- الخادم يتحقق عبر `https://oauth2.googleapis.com/tokeninfo` من:
  - `aud` يساوي `projectId` أو `oAuthClientId`.
  - `iss` يساوي `accounts.google.com` أو `https://accounts.google.com`.
  - `email_verified === true`.
  - `exp` لم ينتهِ.
  - وجود `uid` و`email`.
- النتيجة تُخزن مؤقتاً 5 دقائق بحد أقصى 500 توكن، ثم تُمسح بالكامل عند التجاوز.
- **لا يُقبل البريد أو المعرف المرسل في جسم الطلب كدليل هوية.**

### 3.3 حفظ الخدمات
- `POST /api/listings/save` يقبل:
  - توكن مشرف صالح (`Bearer` ثنائي الأجزاء)، أو
  - Firebase ID Token موثق.
- بدون أي منهما: **401**.
- إذا كان المستخدم مالكاً وليس مشرفاً:
  - لا يستطيع تعديل خدمة لا يملكها (`ownerUserId` مختلف) → **403**.
  - لا يستطيع تصعيد `isVerified` أو `status` أو `claimStatus` أو `ownerUserId` أو حقول التوثيق.
- التحقق من المدخلات: `id` بنمط `^[a-zA-Z0-9_-]{1,128}$`، واسم بطول 2–150 حرفاً.

### 3.4 مصفوفة نقاط النهاية

| المسار | الطريقة | الحماية | حد المعدل |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | عام | — |
| `/api/admin/login` | POST | كلمة مرور + قفل IP | 5 محاولات/15 دقيقة |
| `/api/admin/google-verify` | POST | Firebase ID Token موثق | 30/15 دقيقة |
| `/api/admin/session` | GET | `requireAdmin` | — |
| `/api/admin/change-password` | POST | `requireAdmin` | — |
| `/api/users/sync` | POST | Firebase ID Token موثق | 60/15 دقيقة |
| `/api/users/check-status` | GET | Firebase ID Token موثق | — |
| `/api/admin/users` | GET | `requireAdmin` + `manage_users` | — |
| `/api/admin/users/ban` | POST | `requireAdmin` + `manage_users` | — |
| `/api/admin/users/unban` | POST | `requireAdmin` + `manage_users` | — |
| `/api/admin/members` | GET | `requireAdmin` | — |
| `/api/admin/members` | POST | `requireAdmin` + `requireOwner` | — |
| `/api/admin/members/:id` | PUT/DELETE | `requireAdmin` + `requireOwner` | — |
| `/api/admin/audit-logs` | GET | `requireAdmin` | — |
| `/api/admin/log-action` | POST | `requireAdmin` | — |
| `/api/admin/security-status` | GET | `requireAdmin` | — |
| `/api/listings` | GET | عام، مع ترشيح المخفي | — |
| `/api/listings/save` | POST | مشرف أو مالك موثق | 120/15 دقيقة |
| `/api/listings/:id` | DELETE | `requireAdmin` | — |
| أي مسار `/api/*` غير معروف | أي | 404 JSON | — |

---

## 4. رؤوس النقل والحماية

تُطبَّق على كل استجابة:

| الرأس | القيمة | الغرض |
| :--- | :--- | :--- |
| `X-Content-Type-Options` | `nosniff` | منع تخمين MIME |
| `X-Frame-Options` | `SAMEORIGIN` | منع Clickjacking |
| `X-XSS-Protection` | `1; mode=block` | توافق قديم (ليس خط الدفاع الأساسي) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | فرض HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | تقليل تسريب الروابط |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | تعطيل الأذونات غير المستخدمة |
| `X-Permitted-Cross-Domain-Policies` | `none` | منع cross-domain policy |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | عزل النوافذ مع السماح بـ Google Sign-In |
| `Cross-Origin-Resource-Policy` | `same-origin` | منع تضمين الموارد |
| `Content-Security-Policy` | انظر أدناه | تقييد مصادر التنفيذ |

### CSP الإنتاج
```text
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self';
frame-ancestors 'self';
script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' data: https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.googleapis.com https://*.googleusercontent.com
  https://*.firebaseio.com wss://*.firebaseio.com
  https://identitytoolkit.googleapis.com https://securetoken.googleapis.com
  https://firestore.googleapis.com;
frame-src 'self' https://*.firebaseapp.com https://accounts.google.com;
worker-src 'self' blob:
```

**ملاحظة:** `'unsafe-inline'` في `script-src` مطلوب حالياً بسبب سكربت الثيم الأولي وJSON-LD داخل `index.html`. يمكن لاحقاً استبداله بـ `nonce` أو `hash` لتقوية CSP.

### حارس Same-Origin
كل `POST/PUT/PATCH/DELETE` يبدأ بـ `/api/` ويتحقق من `Origin` إن وُجد:
- مسموح إذا طابق `Host`.
- أو طابق قائمة `ALLOWED_ORIGINS`.
- غير ذلك → **403**.

هذا لا يغني عن التحقق من التوكن؛ فهو طبقة دفاع إضافية فقط.

---

## 5. التحقق من المدخلات وحدود المعدل

- `express.json({ limit: '5mb' })` يحدّ حجم الطلب.
- JSON المشوه يعيد **400** عبر معالج الأخطاء المركزي.
- Rate Limiter عام بنافذة ثابتة، مفتاحه IP + بادئة المسار، وينظف نفسه دورياً.
- قفل تسجيل الدخول: 5 محاولات فاشلة → حجب 15 دقيقة لنفس IP.
- حدود endpoints الحساسة: `google-verify` 30/15د، `users-sync` 60/15د، `listings-save` 120/15د.
- الـ Rate Limiter في الذاكرة، لذا:
  - يعمل بشكل صحيح على عملية واحدة.
  - لا يُشارك الحالة بين عدة instances.
  - يُصفَّر عند إعادة التشغيل.
  - يحتاج Redis أو خدمة Edge عند التوسع الأفقي.

---

## 6. قواعد Firestore (`firestore.rules`)

### المبادئ
- **Default deny** في بداية الملف: `allow read, write: if false` لكل ما لم يُذكر صراحة.
- تحقق من صحة المعرفات عبر `isValidId`.
- تحقق من الحقول والأنواع والحدود قبل الكتابة.
- المالك `devmedoandroid@gmail.com` يتطلب `email_verified == true`.
- المشرفون يُعرَّفون عبر مستند `admins/{uid}`.

### جدول المجموعات

| المجموعة | القراءة | الكتابة | ملاحظات |
| :--- | :--- | :--- | :--- |
| `admins` | مشرف | لا شيء | إدارة الأعضاء عبر الخادم فقط |
| `categories` | عام | مشرف | تحقق كامل |
| `listings` | عام | مشرف/مالك | عدادات عامة محدودة؛ منع تصعيد التوثيق |
| `blood_donors` | عام | إنشاء عام + إدارة | يتطلب `consentGiven` |
| `blood_requests` | عام | إنشاء عام + إدارة | الهاتف عام بحكم طبيعة النداء |
| `service_requests` | مشرف | إنشاء عام | لا تُقرأ عاماً |
| `reports` | مشرف | إنشاء عام | `status == pending` |
| `reviews` | عام | إنشاء عام + إدارة | تُنشأ بحالة pending من الواجهة |
| `charity_initiatives` | عام | مشرف | — |
| `emergency_numbers` | عام | مشرف | — |
| `advertisements` | عام | مشرف + عدادات | عدادات فقط للعامة |
| `verification_badges` | عام | مشرف | — |
| `humanitarian_requests` | **عام** | إنشاء عام (`new`) + إدارة | ⚠️ يكشف حقول المستفيد |
| `donors_directory` | **عام** | إنشاء عام + إدارة | ⚠️ يكشف مدخلات private/anonymous |
| `admin_messages` | مشرف/صاحب الرسالة | إنشاء عام + إدارة | لا حد معدل على الكتابة المباشرة |
| `community_facebook_pages` | عام | مشرف | — |
| `claims` | مشرف/مقدم الطلب | إنشاء عام + إدارة | `pending` فقط |
| `suggestions` | عام | إنشاء عام + تصويت موثق | تحقق من قائمة المصوتين |
| `notifications` | عام | مشرف | راجع محتوى الإشعارات |
| `village_news` | عام | مشرف | — |
| `platform_credits` | عام | مشرف | — |
| `mansoura_schedule` | عام | مشرف | — |
| `audit_logs` | مشرف | مشرف (إنشاء فقط) | لا تعديل/حذف |

### ملاحظة على قاعدة التصويت
قاعدة `suggestions` تستخدم `incoming().get('votedUsers', [])` و`hasAll`. الصياغة متوافقة مع Firestore Rules، لكن **يجب التحقق منها على Firebase Emulator** قبل النشر لأن أخطاء قواعد Firestore لا تظهر في `tsc`.

---

## 7. الاختبارات المنفذة والنتائج

بيئة الاختبار: خادم إنتاج محلي على `http://127.0.0.1:3100`، `NODE_ENV=production`، بعد `npm run build`.

| # | الاختبار | الأمر/الطلب | النتيجة المتوقعة | النتيجة الفعلية |
| :-- | :--- | :--- | :--- | :--- |
| 1 | الصفحة الرئيسية | `GET /` | 200 | ✅ 200 |
| 2 | مسار API غير معروف | `GET /api/does-not-exist` | 404 JSON | ✅ 404 |
| 3 | حفظ خدمة بدون توكن | `POST /api/listings/save` | 401 | ✅ 401 |
| 4 | انتحال بريد المالك | `POST /api/admin/google-verify` ببريد المالك فقط | 401 | ✅ 401 |
| 5 | JWT مزيف | نفس المسار + `X-Firebase-Id-Token: fake.jwt.token` | 401 | ✅ 401 |
| 6 | فحص حالة مستخدم بدون توكن | `GET /api/users/check-status` | 401 | ✅ 401 |
| 7 | طلب من أصل خارجي | `POST` مع `Origin: https://evil.example` | 403 | ✅ 403 |
| 8 | JSON مشوه | `POST` بجسم `{bad` | 400 | ✅ 400 |
| 9 | قفل تسجيل الدخول | 5 محاولات فاشلة متتالية | 429 بعد الحد | ✅ 429 (سابقاً) |
| 10 | رؤوس الأمان | `GET /` مع `-D -` | CSP + الرؤوس | ✅ موجودة |
| 11 | بناء الإنتاج | `npm run build` | نجاح | ✅ نجاح |
| 12 | فحص الأنواع | `npm run lint` | صفر أخطاء | ✅ صفر أخطاء |

> اختبار القفل (9) نُفذ في جولة سابقة. بعد القفل، أي اختبار دخول صحيح من نفس IP قد يُرفض حتى انتهاء النافذة أو إعادة تشغيل الخادم؛ لذلك لم يُعاد تنفيذه في الجولة الأخيرة.

---

## 8. المخاطر المتبقية (Residual Risks)

### P0 — يجب معالجتها قبل الإطلاق العام
1. **خصوصية `humanitarian_requests`:**
   - القاعدة تسمح بقراءة عامة لكل الحقول، بما فيها `beneficiaryName` و`contactPhone` وأي مستندات.
   - الواجهة تخفيها بصرياً فقط، لكن أي شخص يملك إعداد Firebase (وهو عام) يستطيع قراءتها عبر SDK.
   - **الحل المقترح:** مجموعة عامة `humanitarian_public/{id}` تحتوي حقولاً مُنقّاة فقط (عنوان، فئة، وصف، تقدم، إلخ)، ومجموعة خاصة `humanitarian_private/{id}` للمشرفين. أو نقل القراءة إلى API خادمي يرشّح الحقول.
   - **الحالة:** مفتوح.

2. **خصوصية `donors_directory`:**
   - القراءة عامة لكل المستندات، بينما الواجهة تدعم `private` و`anonymous`.
   - **الحل:** إما منع إنشاء `private` مباشرة من العميل ونقلها لـ API، أو فصل الحقول الحساسة، أو تقييد القراءة بالمشرف للمستندات غير العامة.
   - **الحالة:** مفتوح.

### P1 — عالية الأهمية
3. **الكتابة المباشرة إلى Firestore تتجاوز Rate Limiting الخادم:**
   - `reviews`, `admin_messages`, `suggestions`, `donors_directory`, `humanitarian_requests` تُنشأ من SDK.
   - القواعد تتحقق من الشكل والطول، لكنها لا تمنع الإغراق.
   - **الحل:** Firebase App Check + قواعد إضافية + نقل الكتابات الحساسة إلى API.
4. **`notifications` قراءة عامة:** تأكد من عدم احتوائها بيانات إدارية أو شخصية.
5. **`SESSION_SECRET` غير مثبت:** إذا لم يُضبط في الإنتاج، تُولَّد قيمة عشوائية وتبطل الجلسات عند كل إعادة تشغيل. يجب ضبطه في بيئة الإنتاج.
6. **`ENCRYPTION_MASTER_KEY`:** التشفير في `src/lib/encryption.ts` يعمل على العميل؛ إذا كان المفتاح ضمن حزمة العميل فهو ليس سراً. يجب توضيح ذلك أو نقل التشفير للخادم.
7. **الـ Rate Limiter في الذاكرة:** لا يعمل عبر عدة instances.
8. **الاعتماد على `tokeninfo`:** كل تحقق جديد يتطلب اتصالاً بـ Google؛ الكاش 5 دقائق يخفف لكنه لا يلغي الاعتماد الخارجي.

### P2 — متوسطة/منخفضة
9. **CSP تحتوي `'unsafe-inline'`** لسكربتات `index.html`.
10. **`X-XSS-Protection` قديم** ولا يُعتمد عليه.
11. **HSTS يُرسل حتى في التطوير المحلي** فوق HTTP؛ المتصفح يتجاهله، لكن يُفضّل قصره على الإنتاج.
12. **ملفات الحالة المحلية** (`.admin_auth.json`, `.users.json`, `.audit_logs.json`, `.listings_store.json`) تُكتب على القرص. في بيئة serverless قد تُفقد أو تتعارض بين instances. الحل طويل الأمد: قاعدة بيانات مركزية.
13. **لا يوجد App Check مفعّل** (المفتاح موجود في `.env.example` لكنه فارغ).
14. **لا يوجد اختبار آلي أمني مستمر** (CI)؛ الاختبارات أعلاه يدوية.

---

## 9. إدارة الأسرار

| السر | إلزامي في الإنتاج | ملاحظات |
| :--- | :---: | :--- |
| `SESSION_SECRET` | ✅ | 32+ بايت عشوائي؛ بدونه تُبطل الجلسات عند إعادة التشغيل |
| `INITIAL_ADMIN_PASSWORD` | ✅ (أول تشغيل) | 8+ أحرف؛ غيّرها بعد أول دخول |
| `ENCRYPTION_MASTER_KEY` | ✅ إن استُخدم التشفير | 64 hex / 32 بايت |
| `OWNER_EMAIL` | مستحسن | القيمة الافتراضية موجودة في الكود |
| `FIREBASE_PROJECT_ID` | مستحسن | افتراضي من إعداد Firebase |
| `ALLOWED_ORIGINS` | عند وجود دومين خارجي | قائمة مفصولة بفواصل |
| `GEMINI_API_KEY` | اختياري | لا يُرسل للعميل |

**قواعد:**
- لا تُرفع `.env` أو ملفات الحالة إلى المستودع (موجودة في `.gitignore` و`.dockerignore`).
- لا تضع أسراراً في `VITE_*`؛ أي متغير بهذا البادئة يُحزم في المتصفح.
- `firebase-applet-config.json` يحتوي مفاتيح عميل عامة (API key / appId)، وهذا متوقع وآمن بحد ذاته، لكنه لا يغني عن قواعد Firestore.

---

## 10. قائمة تحقق أمنية قبل النشر

- [ ] ضبط `NODE_ENV=production`.
- [ ] ضبط `SESSION_SECRET` عشوائي 64 حرفاً.
- [ ] ضبط `INITIAL_ADMIN_PASSWORD` ثم تغييره بعد أول دخول.
- [ ] ضبط `APP_URL` و`ALLOWED_ORIGINS`.
- [ ] نشر `firestore.rules` عبر Firebase CLI واختبارها على Emulator.
- [ ] تفعيل Firebase App Check.
- [ ] مراجعة قواعد `humanitarian_requests` و`donors_directory` (P0).
- [ ] التأكد من أن الاستضافة تشغّل Express (`dist/server.js`) وليس static-only.
- [ ] تفعيل HTTPS وHSTS على الدومين النهائي.
- [ ] إعداد نسخ احتياطي لملفات الحالة أو ترحيلها لقاعدة بيانات.
- [ ] إعداد مراقبة للأخطاء و429/401/403.
- [ ] اختبار الدخول بـ Google من الدومين النهائي (Popup/Redirect).
- [ ] اختبار أن `sw.js` لا يخزن `/api` (مطبّق في الكود).

---

## 11. ملفات الأمان المعدلة

| الملف | التغيير |
| :--- | :--- |
| `server.ts` | رؤوس أمان، CSP، Same-Origin، Rate Limiting، تحقق Firebase، تأمين endpoints، معالجة أخطاء، إصلاح مسار static |
| `firestore.rules` | Default deny، تحقق حقول، حماية التصويت/الطلبات/المتبرعين، منع تصعيد التوثيق |
| `src/context/DirectoryContext.tsx` | إرسال `X-Firebase-Id-Token`، معالجة الحظر، توكن Firebase عند حفظ الخدمات |
| `public/sw.js` | تجاوز `/api` وFirebase وGoogle APIs |
| `public/_headers`, `netlify.toml`, `vercel.json` | رؤوس أمان وCSP وتخزين مؤقت |
| `.env.example` | توضيح الأسرار والحدود |
| `.gitignore`, `.dockerignore` | استبعاد ملفات الحالة والأسرار |

---

## 12. الخلاصة

تم إغلاق الثغرات الحرجة المتعلقة بانتحال الهوية والكتابة غير المصرح بها، وتقوية رؤوس HTTP وحدود المعدل وقواعد Firestore. المنصة أصبحت أكثر أماناً بدرجة جوهرية، لكنها **ليست خالية من المخاطر**: خصوصية بيانات المستفيدين والمتبرعين في Firestore تحتاج قراراً معمارياً (Projection/API) قبل الإطلاق العام، ونشر القواعد وتفعيل App Check لم يُتحقق منهما في هذه البيئة.
