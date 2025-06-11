import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService, UploadResult } from './storage.interface';
import { StorageConfig } from '../config/storage.config';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly config: StorageConfig) {
    this.bucketName = config.s3!.bucketName;

    this.client = new S3Client({
      region: config.s3!.region,
      credentials: {
        accessKeyId: config.s3!.accessKeyId,
        secretAccessKey: config.s3!.secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      const result = await this.client.send(command);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url: await this.getFileUrl(key),
        bucket: this.bucketName,
        etag: result.ETag,
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
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      const stream = response.Body as Readable;

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
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
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
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate file URL for ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
