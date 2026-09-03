import type { FileStoragePort } from '../storage/file-storage-port.js';

/** Placeholder storage when Firebase credentials are absent (fail closed on use). */
export function createUnavailableFileStorage(message: string): FileStoragePort {
  const fail = async () => {
    throw new Error(message);
  };
  return {
    putObject: fail,
    deleteObject: fail,
    getSignedDownloadUrl: fail,
    objectExists: async () => false,
  };
}
