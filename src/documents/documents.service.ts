import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from '../dto/document.dto';
import { StorageService } from '../storage/storage.interface';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject('STORAGE_SERVICE')
    private storageService: StorageService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: number,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPEG, PNG, GIF',
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Generate unique storage key
    const fileExtension = path.extname(file.originalname);
    const storageKey = `documents/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;

    try {
      // Upload file to storage
      const uploadResult = await this.storageService.uploadFile(
        file.buffer,
        storageKey,
        file.mimetype,
      );

      // Get uploader user
      const uploader = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!uploader) {
        throw new NotFoundException('User not found');
      }

      // Create document record
      const document = this.documentRepository.create({
        ...createDocumentDto,
        filename: uploadResult.key.split('/').pop() || uploadResult.key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: uploadResult.key,
        uploadedBy: uploader,
        uploadedById: userId,
        version: 1,
        isActive: true,
        downloadCount: 0,
      });

      await this.documentRepository.save(document);
      return new Document(document);
    } catch (error) {
      // Clean up uploaded file if database save fails
      try {
        await this.storageService.deleteFile(storageKey);
      } catch (cleanupError) {
        // Log cleanup error but don't throw
        this.logger.error('Failed to cleanup file after error:', cleanupError);
      }
      throw error;
    }
  }

  async findAll(query: DocumentQueryDto): Promise<{
    documents: Document[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      category,
      status,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
      .where('document.isActive = :isActive', { isActive: true });

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere('document.category = :category', { category });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());
      queryBuilder.andWhere('document.tags && :tags', { tags: tagArray });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sorting
    const validSortFields = [
      'title',
      'createdAt',
      'updatedAt',
      'size',
      'downloadCount',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`document.${sortField}`, sortOrder);

    const [documents, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      documents: documents.map((doc) => new Document(doc)),
      total,
      page,
      totalPages,
    };
  }

  async findOne(
    id: number,
    userId?: number,
    userRole?: UserRole,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, isActive: true },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Check permissions for non-admin users
    if (userRole !== UserRole.ADMIN && userId !== document.uploadedById) {
      // For now, allow all authenticated users to view documents
      // This can be enhanced with more granular permissions
    }

    return new Document(document);
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Document> {
    const document = await this.findOne(id, userId, userRole);

    // Check permissions
    if (userRole !== UserRole.ADMIN && userId !== document.uploadedById) {
      throw new ForbiddenException('You can only update your own documents');
    }

    // Increment version if content changes
    const contentChanged =
      updateDocumentDto.title || updateDocumentDto.description;
    if (contentChanged) {
      updateDocumentDto['version'] = document.version + 1;
    }

    await this.documentRepository.update(id, updateDocumentDto);
    return this.findOne(id, userId, userRole);
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const document = await this.findOne(id, userId, userRole);

    // Check permissions
    if (userRole !== UserRole.ADMIN && userId !== document.uploadedById) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    // Delete file from storage
    try {
      await this.storageService.deleteFile(document.storageKey);
    } catch (error) {
      this.logger.error('Failed to delete file from storage:', error);
      // Continue with soft delete even if file deletion fails
    }

    // Soft delete
    await this.documentRepository.update(id, { isActive: false });
  }

  async downloadFile(
    id: number,
    userId?: number,
    userRole?: UserRole,
  ): Promise<{ fileBuffer: Buffer; filename: string; mimeType: string }> {
    const document = await this.findOne(id, userId, userRole);

    // Check if file exists in storage
    const fileExists = await this.storageService.fileExists(
      document.storageKey,
    );
    if (!fileExists) {
      throw new NotFoundException('File not found in storage');
    }

    // Download file from storage
    const fileBuffer = await this.storageService.downloadFile(
      document.storageKey,
    );

    // Increment download count
    await this.documentRepository.update(id, {
      downloadCount: document.downloadCount + 1,
    });

    return {
      fileBuffer,
      filename: document.originalName,
      mimeType: document.mimeType,
    };
  }

  async getStatistics(): Promise<{
    totalDocuments: number;
    documentsByCategory: Record<string, number>;
    documentsByStatus: Record<string, number>;
    totalSize: number;
    totalDownloads: number;
  }> {
    const documents = await this.documentRepository.find({
      where: { isActive: true },
    });

    const totalDocuments = documents.length;
    const documentsByCategory: Record<string, number> = {};
    const documentsByStatus: Record<string, number> = {};
    let totalSize = 0;
    let totalDownloads = 0;

    documents.forEach((doc) => {
      // Category stats
      documentsByCategory[doc.category] =
        (documentsByCategory[doc.category] || 0) + 1;

      // Status stats
      documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;

      // Size and downloads
      totalSize += Number(doc.size);
      totalDownloads += doc.downloadCount || 0;
    });

    return {
      totalDocuments,
      documentsByCategory,
      documentsByStatus,
      totalSize,
      totalDownloads,
    };
  }

  async searchByTags(tags: string[]): Promise<Document[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
      .where('document.isActive = :isActive', { isActive: true })
      .andWhere('document.tags && :tags', { tags })
      .orderBy('document.createdAt', 'DESC')
      .getMany();

    return documents.map((doc) => new Document(doc));
  }

  async getUserDocuments(userId: number): Promise<Document[]> {
    const documents = await this.documentRepository.find({
      where: { uploadedById: userId, isActive: true },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });

    return documents.map((doc) => new Document(doc));
  }
}
