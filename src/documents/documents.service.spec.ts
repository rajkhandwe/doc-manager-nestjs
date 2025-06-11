import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import {
  Document,
  DocumentCategory,
  DocumentStatus,
} from '../entities/document.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
} from '../dto/document.dto';
import { Readable } from 'stream';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: Repository<Document>;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument: Document = {
    id: 1,
    title: 'Test Document',
    description: 'Test description',
    filename: 'test.txt',
    originalName: 'test.txt',
    mimeType: 'text/plain',
    size: 100,
    storageKey: 'documents/test.txt',
    tags: [],
    category: DocumentCategory.GENERAL,
    status: DocumentStatus.DRAFT,
    version: 1,
    isActive: true,
    downloadCount: 0,
    uploadedBy: mockUser,
    uploadedById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 100,
    destination: '/uploads',
    filename: 'test.txt',
    path: '/uploads/test.txt',
    buffer: Buffer.from('test content'),
    stream: new Readable(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockDocument], 1]),
    getCount: jest.fn().mockResolvedValue(1),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest
      .fn()
      .mockResolvedValue([
        { category: 'general', count: '1', total_size: '100' },
      ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: 'STORAGE_SERVICE',
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({
              key: 'documents/test.txt',
              url: 'http://localhost:9000/documents/test.txt',
              bucket: 'documents',
              etag: 'test-etag',
            }),
            downloadFile: jest
              .fn()
              .mockResolvedValue(Buffer.from('test content')),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            getFileUrl: jest
              .fn()
              .mockResolvedValue('http://localhost:9000/documents/test.txt'),
            fileExists: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentRepository = module.get<Repository<Document>>(
      getRepositoryToken(Document),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a document successfully', async () => {
      const createDocumentDto: CreateDocumentDto = {
        title: 'Test Document',
        description: 'Test description',
        category: DocumentCategory.GENERAL,
        tags: ['test'],
      };

      const userSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser);
      const createSpy = jest
        .spyOn(documentRepository, 'create')
        .mockReturnValue(mockDocument);
      const saveSpy = jest
        .spyOn(documentRepository, 'save')
        .mockResolvedValue(mockDocument);

      const result = await service.create(createDocumentDto, mockFile, 1);

      expect(userSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDocumentDto.title,
          description: createDocumentDto.description,
          category: createDocumentDto.category,
        }),
      );
      expect(result).toEqual(mockDocument);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const createDocumentDto: CreateDocumentDto = {
        title: 'Test Document',
        description: 'Test description',
        category: DocumentCategory.GENERAL,
        tags: ['test'],
      };

      const invalidFile = { ...mockFile, mimetype: 'application/exe' };

      await expect(
        service.create(
          createDocumentDto,
          invalidFile as Express.Multer.File,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      const createDocumentDto: CreateDocumentDto = {
        title: 'Test Document',
        description: 'Test description',
        category: DocumentCategory.GENERAL,
        tags: ['test'],
      };

      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 }; // 11MB

      await expect(
        service.create(createDocumentDto, largeFile as Express.Multer.File, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const createDocumentDto: CreateDocumentDto = {
        title: 'Test Document',
        description: 'Test description',
        category: DocumentCategory.GENERAL,
        tags: ['test'],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.create(createDocumentDto, mockFile, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      const createQueryBuilderSpy = jest
        .spyOn(documentRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<Document>,
        );

      const query: DocumentQueryDto = {};
      const result = await service.findAll(query);

      expect(createQueryBuilderSpy).toHaveBeenCalledWith('document');
      expect(result).toEqual({
        documents: expect.arrayContaining([
          expect.objectContaining({}),
        ]) as Document[],
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const findOneSpy = jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValue(mockDocument);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        relations: ['uploadedBy'],
      });
      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException when document is not found', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a document successfully as owner', async () => {
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Title',
      };

      const findOneSpy = jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValue(mockDocument);
      const updateSpy = jest
        .spyOn(documentRepository, 'update')
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      const result = await service.update(
        1,
        updateDocumentDto,
        1,
        UserRole.USER,
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        relations: ['uploadedBy'],
      });
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: updateDocumentDto.title,
        }),
      );
      expect(result).toEqual(mockDocument);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Title',
      };

      const otherDocument = { ...mockDocument, uploadedById: 2 };
      jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValue(otherDocument);

      await expect(
        service.update(1, updateDocumentDto, 1, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any document', async () => {
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Title',
      };

      const otherDocument = { ...mockDocument, uploadedById: 2 };
      const findOneSpy = jest
        .spyOn(documentRepository, 'findOne')
        .mockResolvedValue(otherDocument);
      const updateSpy = jest
        .spyOn(documentRepository, 'update')
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      const result = await service.update(
        1,
        updateDocumentDto,
        1,
        UserRole.ADMIN,
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
        relations: ['uploadedBy'],
      });
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: updateDocumentDto.title,
        }),
      );
      expect(result).toEqual(otherDocument);
    });
  });

  describe('remove', () => {
    it('should soft delete a document as owner', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockDocument);
      const updateSpy = jest
        .spyOn(documentRepository, 'update')
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      await service.remove(1, 1, UserRole.USER);

      expect(findOneSpy).toHaveBeenCalledWith(1, 1, UserRole.USER);
      expect(updateSpy).toHaveBeenCalledWith(1, {
        isActive: false,
      });
    });

    it('should allow admin to delete any document', async () => {
      const otherDocument = { ...mockDocument, uploadedById: 2 };
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(otherDocument);
      const updateSpy = jest
        .spyOn(documentRepository, 'update')
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      await service.remove(1, 1, UserRole.ADMIN);

      expect(findOneSpy).toHaveBeenCalledWith(1, 1, UserRole.ADMIN);
      expect(updateSpy).toHaveBeenCalledWith(1, {
        isActive: false,
      });
    });

    it('should throw ForbiddenException when user tries to delete others document', async () => {
      const otherDocument = { ...mockDocument, uploadedById: 2 };
      jest.spyOn(service, 'findOne').mockResolvedValue(otherDocument);

      await expect(service.remove(1, 1, UserRole.USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return document statistics', async () => {
      const mockDocuments = [
        {
          ...mockDocument,
          category: DocumentCategory.GENERAL,
          status: DocumentStatus.DRAFT,
          size: 100,
          downloadCount: 5,
        },
        {
          ...mockDocument,
          id: 2,
          category: DocumentCategory.TECHNICAL,
          status: DocumentStatus.PUBLISHED,
          size: 200,
          downloadCount: 10,
        },
        {
          ...mockDocument,
          id: 3,
          category: DocumentCategory.GENERAL,
          status: DocumentStatus.PUBLISHED,
          size: 150,
          downloadCount: 3,
        },
      ];

      const findSpy = jest
        .spyOn(documentRepository, 'find')
        .mockResolvedValue(mockDocuments as Document[]);

      const result = await service.getStatistics();

      expect(findSpy).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result).toEqual({
        totalDocuments: 3,
        documentsByCategory: {
          general: 2,
          technical: 1,
        },
        documentsByStatus: {
          draft: 1,
          published: 2,
        },
        totalSize: 450,
        totalDownloads: 18,
      });
    });
  });
});
