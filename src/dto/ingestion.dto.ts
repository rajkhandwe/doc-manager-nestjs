import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  MinLength,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IngestionType,
  IngestionStatus,
} from '../entities/ingestion-job.entity';

export class CreateIngestionJobDto {
  @ApiProperty({ example: 'Bulk Document Import Job' })
  @IsString()
  @MinLength(3)
  jobName: string;

  @ApiProperty({
    enum: IngestionType,
    example: IngestionType.BATCH_IMPORT,
  })
  @IsEnum(IngestionType)
  type: IngestionType;

  @ApiProperty({
    example: 'Import documents from external API',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: {
      sourceUrl: 'https://api.example.com/documents',
      batchSize: 10,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  totalItems?: number;

  @ApiProperty({
    example: 1800,
    required: false,
    description: 'Estimated duration in seconds',
  })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Related document ID',
  })
  @IsOptional()
  @IsNumber()
  relatedDocumentId?: number;
}

export class UpdateIngestionJobDto {
  @ApiProperty({ example: 'Updated Job Name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  jobName?: string;

  @ApiProperty({
    enum: IngestionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(IngestionStatus)
  status?: IngestionStatus;

  @ApiProperty({
    example: 'Updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: { updatedParam: 'value' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiProperty({
    example: { message: 'Job completed successfully' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  result?: Record<string, any>;

  @ApiProperty({ example: 'Error processing item 5', required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  processedItems?: number;

  @ApiProperty({ example: 45, required: false })
  @IsOptional()
  @IsNumber()
  successfulItems?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  failedItems?: number;
}

export class IngestionQueryDto {
  @ApiProperty({
    enum: IngestionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(IngestionStatus)
  status?: IngestionStatus;

  @ApiProperty({
    enum: IngestionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(IngestionType)
  type?: IngestionType;

  @ApiProperty({ required: false, example: '1', description: 'Page number' })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    required: false,
    example: '10',
    description: 'Items per page',
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    example: 'createdAt',
    description: 'Sort by field',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, example: 'DESC', description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class TriggerIngestionDto {
  @ApiProperty({ example: 'Urgent Document Processing' })
  @IsString()
  @MinLength(3)
  jobName: string;

  @ApiProperty({
    example: 'Process urgent documents uploaded today',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [1, 2, 3],
    required: false,
    description: 'Array of document IDs to process',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  documentIds?: number[];

  @ApiProperty({
    example: { priority: 'high', notify: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class IngestionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  jobName: string;

  @ApiProperty({ enum: IngestionType })
  type: IngestionType;

  @ApiProperty({ enum: IngestionStatus })
  status: IngestionStatus;

  @ApiProperty()
  description: string;

  @ApiProperty()
  parameters: Record<string, any>;

  @ApiProperty()
  result: Record<string, any>;

  @ApiProperty()
  errorMessage: string;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  processedItems: number;

  @ApiProperty()
  successfulItems: number;

  @ApiProperty()
  failedItems: number;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty()
  completedAt: Date;

  @ApiProperty()
  estimatedDuration: number;

  @ApiProperty()
  actualDuration: number;

  @ApiProperty()
  triggeredBy: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  relatedDocument: {
    id: number;
    title: string;
    filename: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;
}
