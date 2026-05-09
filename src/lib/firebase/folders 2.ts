import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import { ProjectFolder, ProjectFile, FolderPhase } from '@/types/documents';

/* ═══════════════════════════════════════════════════════
   Folders Service — Digital Filing Cabinet

   Every Project gets five folders on creation, one per deal phase.
   Files (PDFs, images, contracts) are stored in Firebase Storage;
   their metadata lives here in the `projectFiles` collection.

   Collections:
     projectFolders/{folderId}
     projectFiles/{fileId}
   ═══════════════════════════════════════════════════════ */

/** One folder is provisioned per phase when a project is created. */
const PHASE_FOLDERS: FolderPhase[] = [
  'Find & Fund',
  'Under Contract',
  'Rehab',
  'Listed',
  'Sold',
];

export const foldersService = {
  /**
   * provisionProjectFolders
   *
   * Called once by projectsService.createDeal.
   * Creates 5 phase-aligned folders in a single batch write so the filing
   * cabinet is ready the moment the project is saved.
   */
  async provisionProjectFolders(
    projectId: string,
    organizationId: string,
    ownerUid: string,
  ): Promise<void> {
    const batch = writeBatch(db);

    for (const phase of PHASE_FOLDERS) {
      const folderRef = doc(collection(db, 'projectFolders'));
      batch.set(folderRef, {
        projectId,
        organizationId,
        name: phase,
        phase,
        ownerUid,
        fileCount: 0,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  /**
   * subscribeToFolders
   *
   * Real-time listener for all folders belonging to a project.
   * Returns an unsubscribe function for cleanup.
   */
  subscribeToFolders(
    projectId: string,
    callback: (folders: ProjectFolder[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'projectFolders'),
      where('projectId', '==', projectId),
      orderBy('createdAt'),
    );

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFolder)));
    });
  },

  /**
   * subscribeToFiles
   *
   * Real-time listener for all files inside a specific folder, ordered newest-first.
   * Returns an unsubscribe function for cleanup.
   */
  subscribeToFiles(
    folderId: string,
    callback: (files: ProjectFile[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'projectFiles'),
      where('folderId', '==', folderId),
      orderBy('uploadedAt', 'desc'),
    );

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFile)));
    });
  },

  /**
   * addFile
   *
   * Saves a file metadata record to `projectFiles` and increments the
   * parent folder's denormalized `fileCount` in a single round-trip pair.
   * The actual bytes are uploaded to Firebase Storage separately before
   * calling this method — pass the resulting download URL as `storageUrl`.
   */
  async addFile(
    folderId: string,
    projectId: string,
    organizationId: string,
    file: Omit<ProjectFile, 'id' | 'folderId' | 'projectId' | 'organizationId' | 'uploadedAt'>,
  ): Promise<string> {
    const fileRef = doc(collection(db, 'projectFiles'));

    await setDoc(fileRef, {
      ...file,
      folderId,
      projectId,
      organizationId,
      isVerified: file.isVerified ?? false,
      uploadedAt: serverTimestamp(),
    });

    // Denormalized counter keeps folder card counts instant without sub-collection aggregation
    await updateDoc(doc(db, 'projectFolders', folderId), {
      fileCount: increment(1),
    });

    return fileRef.id;
  },

  /**
   * renameFolder
   *
   * Allows the account owner to give a folder a custom display name
   * while keeping the original `phase` field for workflow logic.
   */
  async renameFolder(folderId: string, name: string): Promise<void> {
    await updateDoc(doc(db, 'projectFolders', folderId), { name });
  },
};
