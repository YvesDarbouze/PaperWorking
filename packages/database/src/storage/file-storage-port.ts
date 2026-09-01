/** Framework-independent blob storage port (Firebase adapter in @paperworking/database). */
export type FileStoragePort = {
  putObject(input: { key: string; data: Buffer; contentType: string }): Promise<void>;
  deleteObject(input: { key: string }): Promise<void>;
  getSignedDownloadUrl(input: { key: string; ttlSec?: number }): Promise<string>;
  objectExists(input: { key: string }): Promise<boolean>;
};
