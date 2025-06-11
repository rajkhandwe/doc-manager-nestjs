export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

export interface StorageService {
  uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string, expiresIn?: number): Promise<string>;
  fileExists(key: string): Promise<boolean>;
}
