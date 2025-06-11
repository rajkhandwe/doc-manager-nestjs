export interface StorageConfig {
  type: 'minio' | 's3';

  // MinIO Configuration
  minio?: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    useSSL: boolean;
  };

  // S3 Configuration
  s3?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  };
}

export const storageConfig = (): StorageConfig => ({
  type: (process.env.STORAGE_TYPE as 'minio' | 's3') || 'minio',

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'documents',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.S3_BUCKET_NAME || '',
  },
});
