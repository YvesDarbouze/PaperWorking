-- Rename User.firebaseUid → legacyFirebaseUid (Supabase Auth cutover).
-- Application identity is User.id === auth.users.id; this column is remap-only.

ALTER TABLE "User" RENAME COLUMN "firebaseUid" TO "legacyFirebaseUid";
ALTER INDEX IF EXISTS "User_firebaseUid_key" RENAME TO "User_legacyFirebaseUid_key";
