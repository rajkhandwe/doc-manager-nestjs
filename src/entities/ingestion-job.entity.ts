import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum IngestionType {
  DOCUMENT_UPLOAD = 'document_upload',
  BATCH_IMPORT = 'batch_import',
  API_TRIGGER = 'api_trigger',
  SCHEDULED = 'scheduled',
}

@Entity('ingestion_jobs')
export class IngestionJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobName: string;

  @Column({
    type: 'enum',
    enum: IngestionType,
  })
  type: IngestionType;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING,
  })
  status: IngestionStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  parameters: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  totalItems: number;

  @Column({ default: 0 })
  processedItems: number;

  @Column({ default: 0 })
  successfulItems: number;

  @Column({ default: 0 })
  failedItems: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  estimatedDuration: number; // in seconds

  @Column({ nullable: true })
  actualDuration: number; // in seconds

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'triggeredById' })
  triggeredBy: User;

  @Column()
  triggeredById: number;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'relatedDocumentId' })
  relatedDocument: Document;

  @Column({ nullable: true })
  relatedDocumentId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<IngestionJob>) {
    Object.assign(this, partial);
  }
}
