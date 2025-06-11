import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { DocumentCategory, DocumentStatus } from '../entities/document.entity';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Project Specification Document' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example: 'Detailed specification for the new project requirements',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: DocumentCategory,
    default: DocumentCategory.GENERAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiProperty({
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({
    example: ['project', 'specification', 'requirements'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }): string[] => {
    if (typeof value === 'string') {
      return value.split(',').map((tag) => tag.trim());
    }
    return Array.isArray(value) ? value : [];
  })
  tags?: string[];
}

export class UpdateDocumentDto {
  @ApiProperty({ example: 'Updated Project Specification', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiProperty({
    example: 'Updated description for the document',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: DocumentCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiProperty({
    enum: DocumentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({
    example: ['updated', 'project', 'specification'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }): string[] => {
    if (typeof value === 'string') {
      return value.split(',').map((tag) => tag.trim());
    }
    return Array.isArray(value) ? value : [];
  })
  tags?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DocumentQueryDto {
  @ApiProperty({ required: false, example: 'project' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    enum: DocumentCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiProperty({
    enum: DocumentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({ required: false, example: 'project,specification' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ required: false, example: '1', description: 'Page number' })
  @IsOptional()
  @Transform(({ value }): number => parseInt(String(value), 10))
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    required: false,
    example: '10',
    description: 'Items per page',
  })
  @IsOptional()
  @Transform(({ value }): number => parseInt(String(value), 10))
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    example: 'title',
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

export class DocumentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ enum: DocumentCategory })
  category: DocumentCategory;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  downloadCount: number;

  @ApiProperty()
  uploadedBy: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
