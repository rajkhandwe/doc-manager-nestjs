import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { StorageService, UploadResult } from './storage.interface';
import { StorageConfig } from '../config/storage.config';

@Injectable()
export class MinioStorageService implements StorageService {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: MinioClient;
  private readonly bucketName: string;

  constructor(private readonly config: StorageConfig) {
    this.bucketName = config.minio!.bucketName;

    this.client = new MinioClient({
      endPoint: config.minio!.endpoint,
      port: config.minio!.port,
      useSSL: config.minio!.useSSL,
      accessKey: config.minio!.accessKey,
      secretKey: config.minio!.secretKey,
    });

    void this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName);
        this.logger.log(`Created bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket already exists: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize bucket: ${(error as Error).message}`,
      );
      // Don't throw error during initialization to prevent app startup issues
      // This is especially important for test environments where MinIO might not be available
    }
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    try {
      const result = await this.client.putObject(
        this.bucketName,
        key,
        file,
        file.length,
        { 'Content-Type': contentType },
      );

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url: await this.getFileUrl(key),
        bucket: this.bucketName,
        etag: result.etag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, key);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(
        `Failed to download file ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, key);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(
        this.bucketName,
        key,
        expiresIn,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate file URL for ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, key);
      return true;
    } catch {
      return false;
    }
  }
}
