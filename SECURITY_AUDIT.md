# SHAHA ONE — Security Audit & Remediation Report

**Audit Standard:** OWASP Web Security Testing Guide (WSTG) & OWASP Top 10  
**Scope:** Cloud Firestore Rules (`firestore.rules`), Cloudflare Worker API (`cloudflare/worker.ts`), Frontend Auth & RBAC (`src/`), GitHub Repositories & Secrets, Dependencies (`npm audit`).

---

## 1. Executive Summary & Confirmed Vulnerabilities Fixed

| ID | Severity | Vulnerability / Gap | Root Cause | Remediation Implemented & Verified |
|---|---|---|---|---|
| **SEC-01** | **Critical** | Firestore Admin Privilege Escalation Risk | `isAdmin()` relied on `exists(/databases/.../admins/$(uid))` without checking `isActive`/`role`, and lacked a separate `isOwner()` primitive for sovereign collections. | **Fixed in `firestore.rules`:** Separated `isOwner()` (verified owner email only) from `isAdmin()` (`isActive == true && role in ['admin', 'moderator']`). Locked `admins/{adminId}` writes strictly to `isOwner()` and blocked assigning `'owner'` role via documents. Restricted `community_facebook_pages`, `verification_badges`, and `platform_credits` writes to `isOwner()`. Validated via `firebase_validate_security_rules` (`OK: No errors detected.`). |
| **SEC-02** | **High** | Stale Moderator Token / Delayed Revocation & Weak RBAC Enforcement | Worker verified HMAC signature without checking live `KV_MEMBERS` status or revocation timestamp, and some admin endpoints (`/api/admin/audit-logs`, `/api/admin/security-status`, `/api/admin/members`) lacked granular permission/owner gates. | **Fixed in `cloudflare/worker.ts`:** Added `resolveEffectiveAdmin()` checking `KV_REVOKED_BEFORE` (`iat < revokedBefore`) and live `KV_MEMBERS` (`isActive`, `permissions`), plus `POST /api/admin/sessions/revoke` and strict permission checks on `/api/admin/members` (owner), `/api/admin/audit-logs` (`manage_audit`/`manage_settings`), `/api/admin/security-status` & `/api/admin/sessions` (`manage_settings`). |
| **SEC-03** | **High** | Frontend RBAC Tab & Data Exposure | `AdminDashboard.tsx` left `overview`, `listings`, `categories`, `requests`, `reports`, `blood`, `charity`, `users`, `audit`, `settings`, and JSON backup export accessible without per-tab `hasPermission()` checks. | **Fixed in `AdminDashboard.tsx` & `src/types/index.ts`:** Added explicit `AdminPermission` gates on all 27 tabs and panels, auto-redirect to the first authorized tab (`allowedTabIds[0]`), and custom role presets (`ROLE_PRESETS`). |
| **SEC-04** | **High** | Public Google API Key Leak in Git History & `gh-pages` | Earlier commits (`0810cdd`) and `gh-pages` static builds inlined `AIzaSy...`. | **Fixed:** Purged Git history (`main` squashed clean), moved runtime Firebase config to encrypted Cloudflare Secret `FIREBASE_WEB_CONFIG` via `/api/firebase-config` (`0` `AIzaSy` in `main` and `gh-pages`), rotated to HTTP-referrer-restricted `API key 4`, deleted old key in Google Cloud Console, and closed GitHub Secret Scanning alert `#1` as `revoked`. |
| **SEC-05** | **Medium** | Hardcoded Owner Email & Dev Password in Client/Dev Code | Plaintext owner email in `src/` and `'551993'` fallback in `server.ts`. | **Fixed:** Replaced plaintext email checks in `src/` with SHA-256 hash verification (`isOwnerEmail` in `src/lib/security.ts` — `0` plaintext hits in `src/` and `dist/`), and replaced `'551993'` in `server.ts` with `crypto.randomBytes(12)`. |
| **SEC-06** | **Medium** | DDoS / Burst Abuse & `window.open` `opener` Exposure | Worker lacked global burst rate limit across routes; `MansouraEmergencySchedule.tsx` opened print popup without `opener = null`. | **Fixed:** Added global IP burst guard (`ddos_guard`: 60 write / 180 read req/min) with `429` + `Retry-After` + audit log in `cloudflare/worker.ts`, and `printWindow.opener = null` in `MansouraEmergencySchedule.tsx`. `QrCodeModal.tsx` and `MansouraEmergencySchedule.tsx` both sanitize dynamic strings with `escapeHtml()`. |
| **SEC-07** | **Medium** | Unprotected `main` Branch on Showcase Repo | `medoandroid/shaha-one` `main` lacked branch protection. | **Fixed via GitHub API:** Enabled branch protection on `medoandroid/shaha-one` `main` (`allow_force_pushes: false`, `allow_deletions: false`, `enforce_admins: true`, PR review required). |

---

## 2. Verification & Security Test Results (Observed After Final Edits)

- **Exploit & RBAC Verification Suite (`9/9` passed):**
  - Untrusted `Origin` CSRF (`POST /api/admin/login` from `https://attacker.evil`) → `403`
  - Forged/Tampered HMAC token on `/api/admin/audit-logs`, `/api/admin/security-status`, `/api/admin/members`, `/api/admin/sessions` → `401`
  - Unauthenticated write (`POST /api/community-pages/save`) → `401`
  - Public health endpoint (`GET /api/health`) → `200` (`"status":"healthy"`)
  - Local timing-safe HMAC verification rejects tampered `role: 'owner'` escalation payload and tokens issued before `revokedBefore` timestamp.
- **TypeScript Static Check (`npm run lint`):** `tsc --noEmit` exited with code `0`.
- **Firestore Rules Syntax Validation (`firebase_validate_security_rules`):** `OK: No errors detected.`

---

## 3. Remaining External / Environment Items (Transparent Gaps)

1. **Deploy Updated `firestore.rules` to Live Firebase Project (`educational-43907`):**
   - `firebase` CLI is not installed in this environment and the local `firebase-mcp-server` points to a different project (`chat-64862`). The hardened `firestore.rules` must be published in **Firebase Console → Firestore Database → Rules** (and tested against Firebase Emulator Suite if desired).
2. **`medoandroid/ShohaOne` Private Repo Branch Protection:**
   - GitHub API returned `403: Upgrade to GitHub Pro or make this repository public to enable this feature` for the private `ShohaOne` repo on the Free plan. (`medoandroid/shaha-one` public repo **has** branch protection enabled.)
3. **Transitive `npm audit` Advisories (`9 high`):**
   - `npm audit --omit=dev` reports transitive advisories in `@grpc/grpc-js <=1.13.5` (under `firebase`) and `picomatch` (under `vite`/`@vitejs/plugin-react`). `npm audit fix --force` proposes downgrading `firebase` to `9.14.0` (breaking change); monitor upstream `firebase` / `vite` minor updates rather than downgrading.
4. **Public Community Aid Feed (`humanitarian_requests`):**
   - Public read remains enabled so the community aid feed works; sensitive beneficiary contact details should be projected into a private admin-only subcollection if stricter privacy is required later.
