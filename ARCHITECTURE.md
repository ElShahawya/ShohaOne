# SHAHA ONE | شها ون — System Architecture & Engineering Blueprint

## 1. High-Level Architecture Overview

SHAHA ONE is a full-stack Progressive Web App built with React 18, Vite, Express.js (Node.js runtime), and Firebase Firestore + Auth.

```
[ Client Browser / Mobile PWA ]
        │
        ├── Client-Side State (DirectoryContext)
        ├── IndexedDB / LocalStorage Resilience Cache
        ├── Offline Queue & Sync Engine
        │
        ▼
[ Firebase Firestore Database ]
 (Collections: listings, categories, claims, suggestions, blood_donors, 
               humanitarian_requests, community_facebook_pages, reviews, 
               advertisements, verification_badges, feature_flags, audit_logs)
```

---

## 2. Directory Structure & Key Modules

- `/src/context/DirectoryContext.tsx`: Central state provider managing live Firestore snapshot listeners and CRUD methods.
- `/src/components/home/`: Hero search, quick actions, emergency banner, category grid.
- `/src/components/listings/`: Custom service profile components (`ProfileHeader`, `ProfileContactSection`, `ProfileHoursSection`, `ProfileReviewsSection`, `ProfileMobileBar`).
- `/src/components/modals/`: Interactive modals (`ClaimListingModal`, `CommunitySuggestionsModal`, `AddServiceModal`, `ReportModal`).
- `/src/components/admin/`: Admin panels (`ClaimsAdmin`, `CommunitySuggestionsAdmin`, `DataQualityAdmin`, `CSVDataImportAdmin`, `FeatureFlagsAdmin`, `CommunityPagesAdmin`).
- `/src/utils/`: Business logic utilities (`availability.ts`, `dataQuality.ts`, `search.ts`, `favorites.ts`, `navigation.ts`).
- `/src/lib/`: Infrastructure (`firebase.ts`, `security.ts`, `backupManager.ts`, `offlineQueue.ts`).

---

## 3. Security & Access Control (RBAC)

1. **Sovereign Owner Privilege**:
   - Strictly reserved for `devmedoandroid@gmail.com`.
   - Has exclusive control over feature flags, community Facebook pages management, and admin team members assignment.
2. **Firestore Security Rules**:
   - Deployed and enforced for all Firestore collections.
   - Prevents unauthorized writes to sensitive collections.
