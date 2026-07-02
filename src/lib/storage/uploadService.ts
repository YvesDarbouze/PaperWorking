import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadFileResult {
  downloadUrl: string;
  storagePath: string;
  contentType: string;
  size: number;
}

export interface UploadFileOptions {
  file: File;
  path: string; // e.g., 'inspection_docs', 'photography', 'gc_bids'
  projectId: string;
  onProgress?: (progress: number) => void;
}

/**
 * Uploads a file to Firebase Storage under a project-scoped path.
 * The path is constructed as: projects/{projectId}/{path}/{timestamp}_{fileName}
 * This ensures compatibility with Storage security rules.
 */
export async function uploadFile({
  file,
  path,
  projectId,
  onProgress,
}: UploadFileOptions): Promise<UploadFileResult> {
  if (!projectId) {
    throw new Error('Project ID is required for uploads.');
  }
  if (!path) {
    throw new Error('Upload path directory is required.');
  }

  // Sanitize the file name to avoid issues with special characters
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `projects/${projectId}/${path}/${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<UploadFileResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
            contentType: file.type,
            size: file.size,
          });
        } catch (urlError) {
          reject(urlError);
        }
      }
    );
  });
}
