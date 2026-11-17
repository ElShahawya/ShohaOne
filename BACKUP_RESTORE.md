# SHAHA ONE | شها ون — Backup, Verification & Disaster Recovery (DR)

دليل النسخ الاحتياطي والتحقق من سلامة البيانات وخطة التعافي من الكوارث لمنصة **شها ون (SHAHA ONE)**.

---

## 1. منظومة النسخ الاحتياطي الآلي (Automated Backup)

يحتوي المشروع على أداة آلية مستقلة في `scripts/backup-restore.mjs` تقوم بإنشاء حزم نسخ احتياطي متكاملة ومؤرخة داخل مجلد `backups/backup-{timestamp}/`.

### محتويات حزمة النسخ الاحتياطي:
- **بيانات الخدمات والمتاجر**: `.listings_store.json`
- **حسابات المستخدمين والمشرفين**: `.users.json`, `.admin_members.json`, `.admin_auth.json`
- **سجلات التدقيق الإداري**: `.audit_logs.json`
- **قواعد وفهارس الأمان**: `firestore.rules`, `firestore.indexes.json`
- **مخطط الكيانات**: `firebase-blueprint.json`
- **وثيقة الفحص المشفرة (Manifest)**: `manifest.json` متضمنة بصمة **SHA-256** لكل ملف وعدد السجلات.

---

## 2. أوامر التشغيل السريعة

```bash
# 1. إنشاء نسخة احتياطية جديدة
npm run backup

# 2. فحص وتدقيق سلامة آخر نسخة احتياطية ومطابقة التوقيعات الرقمية
npm run backup:verify

# 3. عرض قائمة كافة النسخ الاحتياطية المتوفرة
node scripts/backup-restore.mjs list
```

---

## 3. النسخ الاحتياطي السحابي لـ Google Cloud Firestore

للنسخ الاحتياطي على مستوى السحابة والتخزين طويل المدى (Cold Storage):

```bash
# تصدير كامل قاعدة بيانات Firestore إلى Google Cloud Storage Bucket
gcloud firestore export gs://shaha-one-backups-2026/firestore-$(date +%Y%m%d) \
  --project=educational-43907 \
  --database=ai-studio-shahadirectory-a212d1a4-d3dd-497c-bafc-ceb2a371d505

# استيراد واستعادة قاعدة البيانات عند الطوارئ
gcloud firestore import gs://shaha-one-backups-2026/firestore-20261107 \
  --project=educational-43907 \
  --database=ai-studio-shahadirectory-a212d1a4-d3dd-497c-bafc-ceb2a371d505
```

---

## 4. خطة التعافي من الكوارث (Disaster Recovery Runbook)

عند حدوث تلف أو فقدان بيانات مفاجئ:

1. **الخطوة الأولى (عزل النظام)**: تحويل حركة المرور إلى صفحة الصيانة المؤقتة لمنع الكتابات المتضاربة.
2. **الخطوة الثانية (اختيار وتدقيق النسخة)**: تشغيل `npm run backup:verify` للتأكد من تطابق الهاش وسلامة النسخة المختارة 100%.
3. **الخطوة الثالثة (الاستعادة)**: نسخ الملفات من مجلد النسخة الاحتياطية إلى جذر المشروع.
4. **الخطوة الرابعة (فحص وتدقيق القواعد)**: إعادة نشر قواعد الأمان `npm run deploy` أو `deploy_firebase`.
5. **الخطوة الخامسة (إعادة تشغيل الخادم)**: تشغيل `npm run build && npm start` وفحص نقطة الفحص الصحي `/api/health`.
