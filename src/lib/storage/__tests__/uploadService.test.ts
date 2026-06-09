import { uploadFile } from '../uploadService';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

jest.mock('firebase/storage', () => {
  const actual = jest.requireActual('firebase/storage');
  return {
    ...actual,
    ref: jest.fn(),
    uploadBytesResumable: jest.fn(),
    getDownloadURL: jest.fn(),
  };
});

describe('Firebase Storage uploadService', () => {
  const mockFile = new File(['hello'], 'hello-world!.png', { type: 'image/png' });
  const projectId = 'proj-123';
  const path = 'photography';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if projectId is missing', async () => {
    await expect(uploadFile({ file: mockFile, path, projectId: '' }))
      .rejects.toThrow('Project ID is required for uploads.');
  });

  it('should throw an error if path is missing', async () => {
    await expect(uploadFile({ file: mockFile, path: '', projectId }))
      .rejects.toThrow('Upload path directory is required.');
  });

  it('should construct the storage path with clean file name and upload successfully', async () => {
    const mockRef = { fullPath: 'mock-path' };
    (ref as jest.Mock).mockReturnValue(mockRef);

    const mockUploadTask = {
      on: jest.fn().mockImplementation((event, next, error, complete) => {
        // Trigger completion callback immediately
        setTimeout(() => {
          complete();
        }, 10);
      }),
      snapshot: { ref: mockRef },
    };
    (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
    (getDownloadURL as jest.Mock).mockResolvedValue('https://firebase.storage/file-url');

    const result = await uploadFile({ file: mockFile, path, projectId });

    expect(ref).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^projects\/proj-123\/photography\/\d+_hello-world_\.png$/));
    expect(uploadBytesResumable).toHaveBeenCalledWith(mockRef, mockFile);
    expect(getDownloadURL).toHaveBeenCalledWith(mockRef);

    expect(result).toEqual({
      downloadUrl: 'https://firebase.storage/file-url',
      storagePath: expect.stringMatching(/^projects\/proj-123\/photography\/\d+_hello-world_\.png$/),
      contentType: 'image/png',
      size: 5,
    });
  });

  it('should report progress updates through onProgress callback', async () => {
    const mockRef = { fullPath: 'mock-path' };
    (ref as jest.Mock).mockReturnValue(mockRef);

    const onProgress = jest.fn();

    const mockUploadTask = {
      on: jest.fn().mockImplementation((event, next, error, complete) => {
        // Simulate progress reports
        next({ bytesTransferred: 50, totalBytes: 100 });
        next({ bytesTransferred: 100, totalBytes: 100 });
        complete();
      }),
      snapshot: { ref: mockRef },
    };
    (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
    (getDownloadURL as jest.Mock).mockResolvedValue('https://firebase.storage/file-url');

    await uploadFile({ file: mockFile, path, projectId, onProgress });

    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('should throw upload errors', async () => {
    const mockRef = { fullPath: 'mock-path' };
    (ref as jest.Mock).mockReturnValue(mockRef);

    const mockError = new Error('Permission denied');
    const mockUploadTask = {
      on: jest.fn().mockImplementation((event, next, error, complete) => {
        // Trigger error callback
        error(mockError);
      }),
      snapshot: { ref: mockRef },
    };
    (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);

    await expect(uploadFile({ file: mockFile, path, projectId }))
      .rejects.toThrow('Permission denied');
  });
});
