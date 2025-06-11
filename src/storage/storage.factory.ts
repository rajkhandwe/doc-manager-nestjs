import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from './storage.interface';
import { MinioStorageService } from './minio-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageConfig, storageConfig } from '../config/storage.config';

@Injectable()
export class StorageFactory {
  private readonly logger = new Logger(StorageFactory.name);
  private readonly config: StorageConfig;

  constructor() {
    this.config = storageConfig();
  }

  createStorageService(): StorageService {
    this.logger.log(`Initializing storage service: ${this.config.type}`);

    if (this.config.type === 'minio') {
      return new MinioStorageService(this.config);
    } else if (this.config.type === 's3') {
      return new S3StorageService(this.config);
    } else {
      throw new Error(
        `Unsupported storage type: ${this.config.type as string}`,
      );
    }
  }
}
