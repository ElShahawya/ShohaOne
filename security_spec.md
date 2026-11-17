# Security Specification: Shaha Directory (دليل أرقام شها)

## 1. Data Invariants
1. **Public Readability with Defensive Constraints**:
   - Listings, Categories, Emergency Numbers, Charity Initiatives, and Advertisements are public resources meant to be read by all residents of Shaha and visitors without requiring authentication.
   - However, they can only be modified, created, or deleted by authorized administrators or via verified backend operations.
2. **Citizen Submissions (Service Requests & Reports)**:
   - Any resident can submit a new service request or report an incorrect number.
   - Requests and reports have an initial status of `"pending"` and must strictly obey size limits.
   - Submissions cannot be updated or deleted by regular users once submitted; only admins can triage, accept, or reject them.
3. **Blood Donor Privacy & Verification**:
   - Only blood donors with `consentGiven == true` and `isAvailable == true` may be read publicly.
   - Creating a blood donor requires explicit consent and valid phone format.
   - Direct personal deletions/updates can only be done by the owner or administrator.
4. **Blood Emergency Requests**:
   - Must have valid urgency status (`urgent`, `fulfilled`, `closed`) and legitimate hospital contact info.
5. **Review Integrity**:
   - Reviews require positive ratings between 1 and 5 and comments under 500 characters.
   - Review manipulation or spoofing of other users' submissions is prohibited.
6. **Immutable Fields**:
   - `id`, `createdAt`, `listingId` cannot be mutated on updates.

---

## 2. The "Dirty Dozen" Malicious Payloads
1. **Payload 1 (Ghost Field Injection / Shadow Update in Listings)**:
   Attempting to inject `isAdmin: true` or `isVerified: true` into a listing without administrative privileges.
2. **Payload 2 (Listing Takeover)**:
   An unauthenticated or unauthorized user attempting to overwrite a verified doctor's phone number with a scammer's number.
3. **Payload 3 (Denial of Wallet - Bloated Description)**:
   Attempting to write a 1MB payload into `service_requests.notes` to trigger extreme bandwidth and document store costs.
4. **Payload 4 (Status Escalation on Service Request)**:
   A public user submitting a `service_request` with `status: "approved"` to bypass administrative moderation and publish directly to the main directory.
5. **Payload 5 (Unconsented Blood Donor Data Dump)**:
   Attempting to query or scrape blood donor records where `consentGiven == false` or privacy is unconfirmed.
6. **Payload 6 (Path ID Poisoning)**:
   Submitting document IDs containing forbidden path characters, unicode exploits, or strings exceeding 128 chars (e.g. `../../root` or `%00`).
7. **Payload 7 (Fake Star Rating Tampering)**:
   Submitting a review with `rating: 100` or `rating: -5` to corrupt the community rating average.
8. **Payload 8 (Admins Document Impersonation)**:
   Attempting to write a record directly to `/admins/{uid}` to self-promote the user to system administrator.
9. **Payload 9 (Audit Log Deletion)**:
   Attempting to delete audit trail records in `/audit_logs` to conceal unauthorized changes.
10. **Payload 10 (Emergency Contact Hijacking)**:
    Attempting to modify the ambulance or civil defense emergency phone number to an unauthorized toll line.
11. **Payload 11 (Timestamp Falsification)**:
    Injecting a backdated timestamp `createdAt: "1990-01-01"` rather than conforming to valid request time.
12. **Payload 12 (Charity Misappropriation)**:
    Modifying a charity initiative's contact phone number to redirect donations to an illegitimate account.

---

## 3. Test Runner Definition
All 12 attacks are guaranteed to yield `PERMISSION_DENIED` under the ABAC and zero-trust security rules defined in `firestore.rules`.
