import { createFirestoreVendorsReadRepository } from '../firestore/create-firestore-vendors-read-repository.js';
import { createFirestoreVendorPortalReadRepository } from '../firestore/create-firestore-vendor-portal-read-repository.js';
import { createFirestoreVendorPortalCommandRepository } from '../firestore/create-firestore-vendor-portal-command-repository.js';

export function createVendorsReadRepository() {
  return createFirestoreVendorsReadRepository();
}

export function createVendorPortalReadRepository() {
  return createFirestoreVendorPortalReadRepository();
}

export function createVendorPortalCommandRepository() {
  return createFirestoreVendorPortalCommandRepository();
}
