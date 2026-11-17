# SHAHA ONE | شها ون — Universal Production Deployment Guide

يهدف هذا الدليل لتوضيح خطوات نشر وتشغيل مشروع **شها ون** على مختلف البيئات السحابية ومنصات الاستضافة المعتمدة عالمياً.

---

## الفهرس
1. [المعمارية ومتطلبات التشغيل](#1-المعمارية-ومتطلبات-التشغيل)
2. [التشغيل المحلي وFirebase Emulators](#2-التشغيل-المحلي-وfirebase-emulators)
3. [النشر على Google Cloud Run / Docker (الخيار الموصى به للخادم الكامل)](#3-النشر-على-google-cloud-run--docker)
4. [النشر على Firebase Hosting](#4-النشر-على-firebase-hosting)
5. [النشر على Vercel](#5-النشر-على-vercel)
6. [النشر على Netlify](#6-النشر-على-netlify)
7. [النشر على Cloudflare Pages](#7-النشر-على-cloudflare-pages)
8. [النشر على VPS التقليدي باستخدام PM2 وNginx](#8-النشر-على-vps-التقليدي-باستخدام-pm2-وnginx)
9. [مصفوفة المتغيرات البيئية للإنتاج](#9-مصفوفة-المتغيرات-البيئية-للإنتاج)

---

## 1. المعمارية ومتطلبات التشغيل

يتبع المشروع معمارية **Full-Stack Hybrid Resilience**:
- **الواجهة الأمامية (Client)**: تطبيق React 19 SPA مبني بواسطة Vite 8 مع Tailwind CSS v4، يتم تجميعه كأصول ثابتة عالية الأداء داخل مجلد `dist`.
- **الخادم الخلفي (Backend Server)**: خادم Express مبني بـ TypeScript ومجمع عبر `esbuild` إلى `dist/server.js`. يوفر مسارات أمان مشفرة، تدقيق إداري، وحفظ بيانات مزدوج (Dual-Persistence).
- **قاعدة البيانات والمصادقة**: Google Cloud Firestore & Firebase Auth.

---

## 2. التشغيل المحلي وFirebase Emulators

```bash
# تثبيت الحزم
npm install

# بناء المشروع محلياً
npm run build

# تشغيل خادم الإنتاج محلياً
npm start

# (اختياري) تشغيل محاكي فايربيز المحلي Firebase Emulator Suite
firebase emulators:start
```

---

## 3. النشر على Google Cloud Run / Docker

يتميز المشروع بوجود `Dockerfile` متعدد المراحل (Multi-stage) عالي الأمان يعمل بمستخدم غير جذري `appuser`.

```bash
# 1. بناء صورة الدوكر
docker build -t shaha-one:latest .

# 2. تشغيل الحاوية محلياً للاختبار
docker run -p 3000:3000 -e NODE_ENV=production -e APP_URL=http://localhost:3000 shaha-one:latest

# 3. النشر المباشر على Google Cloud Run
gcloud run deploy shaha-one \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production,OWNER_EMAIL=devmedoandroid@gmail.com
```

---

## 4. النشر على Firebase Hosting

تم ضبط ملف `firebase.json` و `firestore.indexes.json` مسبقاً.

```bash
# 1. تسجيل الدخول إلى Firebase
firebase login

# 2. بناء الأصول الثابتة
npm run build

# 3. نشر القواعد والفهارس والأصول
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

---

## 5. النشر على Vercel

تم إعداد ملف `vercel.json` لتوفير مسارات SPA التلقائية وترويسات الأمان.
1. اربط مستودع GitHub بحسابك على Vercel.
2. اختر Framework: **Vite**.
3. أمر البناء: `npm run build`.
4. مجلد المخرجات: `dist`.
5. أضف المتغيرات البيئية من `.env.example`.

---

## 6. النشر على Netlify

تم إعداد `netlify.toml` و `public/_redirects`.
1. اربط المستودع في Netlify.
2. أمر البناء: `npm run build`.
3. مجلد النشر: `dist`.
4. تفعيل ترويسات الأمان تلقائياً عبر `public/_headers`.

---

## 7. النشر على Cloudflare Pages

تم إعداد `public/_routes.json` لتجاوز استدعاءات الأصول الثابتة وتوجيه مسارات الـ SPA.
- Build command: `npm run build`
- Output directory: `dist`

---

## 8. النشر على VPS التقليدي باستخدام PM2 وNginx

```bash
# 1. البناء على الخادم
npm ci
npm run build

# 2. تشغيل الخادم عبر PM2
pm2 start dist/server.js --name "shaha-one" -i max

# 3. ضبط إعدادات Nginx العكسية (Reverse Proxy)
# /etc/nginx/sites-available/shaha-one
server {
    server_name shaha-one.eg;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9. مصفوفة المتغيرات البيئية للإنتاج

| المتغير | الحساسية | الغرض | القيمة الافتراضية |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | عام | تحديد نمط التشغيل | `production` |
| `PORT` | عام | منفذ الخادم | `3000` |
| `APP_URL` | عام | رابط الموقع الرسمي للـ SEO والروابط | `https://shaha-one.eg` |
| `SESSION_SECRET` | سري جداً | توقيع جلسات المشرف وتوليد الرموز | يُنشأ عشوائياً إذا لم يحدد |
| `ENCRYPTION_MASTER_KEY` | سري جداً | مفتاح التشفير المتماثل AES-256 للبيانات الحساسة | مفتاح 32 بايت (64 hex) |
| `OWNER_EMAIL` | حساس | البريد السيادي للمالك والمطور | `devmedoandroid@gmail.com` |
| `VITE_FIREBASE_*` | عام | معلمات اتصال Firebase الخاصة بالمتصفح | مأخوذة من لوحة Firebase |
