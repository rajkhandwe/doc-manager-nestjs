import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import {
  IngestionJob,
  IngestionStatus,
  IngestionType,
} from '../entities/ingestion-job.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  Document,
  DocumentCategory,
  DocumentStatus,
} from '../entities/document.entity';
import {
  CreateIngestionJobDto,
  TriggerIngestionDto,
} from '../dto/ingestion.dto';

// This is only for reference - not used in tests

describe('IngestionService', () => {
  let service: IngestionService;
  let ingestionRepository: Repository<IngestionJob>;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
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

  const mockIngestionJob: IngestionJob = {
    id: 1,
    jobName: 'Test Job',
    type: IngestionType.API_TRIGGER,
    status: IngestionStatus.PENDING,
    description: 'Test description',
    parameters: {},
    result: {},
    errorMessage: '',
    totalItems: 1,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    startedAt: new Date(),
    completedAt: new Date(),
    estimatedDuration: 30,
    actualDuration: 0,
    triggeredBy: mockUser,
    triggeredById: 1,
    relatedDocument: mockDocument,
    relatedDocumentId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(IngestionJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getManyAndCount: jest
                .fn()
                .mockResolvedValue([[mockIngestionJob], 1]),
            })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ingestionRepository = module.get<Repository<IngestionJob>>(
      getRepositoryToken(IngestionJob),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an ingestion job successfully', async () => {
      const createDto: CreateIngestionJobDto = {
        jobName: 'Test Job',
        type: IngestionType.API_TRIGGER,
        description: 'Test description',
        parameters: {},
        totalItems: 1,
        estimatedDuration: 30,
      };

      const findOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser);
      const createSpy = jest
        .spyOn(ingestionRepository, 'create')
        .mockReturnValue(mockIngestionJob);
      const saveSpy = jest
        .spyOn(ingestionRepository, 'save')
        .mockResolvedValue(mockIngestionJob);

      const result = await service.create(createDto, 1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(mockIngestionJob);
      expect(result).toEqual(mockIngestionJob);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const createDto: CreateIngestionJobDto = {
        jobName: 'Test Job',
        type: IngestionType.API_TRIGGER,
        description: 'Test description',
        parameters: {},
        totalItems: 1,
        estimatedDuration: 30,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated ingestion jobs', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockIngestionJob], 1]),
      };

      jest
        .spyOn(ingestionRepository, 'createQueryBuilder')
        .mockReturnValue(
          queryBuilder as unknown as SelectQueryBuilder<IngestionJob>,
        );

      const result = await service.findAll({});

      expect(result).toEqual({
        jobs: expect.arrayContaining([
          expect.objectContaining({}),
        ]) as IngestionJob[],
        total: 1,
        page: 1,
        totalPages: 1,
      });
      expect(result.jobs).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an ingestion job by id', async () => {
      const findOneSpy = jest
        .spyOn(ingestionRepository, 'findOne')
        .mockResolvedValue(mockIngestionJob);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['triggeredBy', 'relatedDocument'],
      });
      // Check that the result has the expected properties including the dynamic progress
      expect(result).toMatchObject(mockIngestionJob);
      expect(result).toHaveProperty('progress');
      expect((result as IngestionJob & { progress: number }).progress).toBe(0); // processedItems/totalItems = 0/0 = 0
    });

    it('should throw NotFoundException when job is not found', async () => {
      jest.spyOn(ingestionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an ingestion job', async () => {
      const mockFoundJob = { ...mockIngestionJob };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockFoundJob);
      const updateSpy = jest
        .spyOn(ingestionRepository, 'update')
        .mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      const updateDto = { status: IngestionStatus.PROCESSING };
      await service.update(1, updateDto);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: IngestionStatus.PROCESSING,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a completed ingestion job', async () => {
      const completedJob = {
        ...mockIngestionJob,
        status: IngestionStatus.COMPLETED,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(completedJob);
      const removeSpy = jest
        .spyOn(ingestionRepository, 'remove')
        .mockResolvedValue(completedJob);

      await service.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(completedJob);
    });

    it('should throw BadRequestException when trying to remove active job', async () => {
      const activeJob = {
        ...mockIngestionJob,
        status: IngestionStatus.PROCESSING,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(activeJob);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('triggerIngestion', () => {
    it('should trigger an ingestion job', async () => {
      const triggerDto: TriggerIngestionDto = {
        jobName: 'Test Trigger',
        description: 'Test trigger description',
        documentIds: [1],
        options: { priority: 'normal' },
      };

      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockIngestionJob);
      jest.spyOn(service, 'update').mockResolvedValue(mockIngestionJob);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockIngestionJob);

      const result = await service.triggerIngestion(triggerDto, 1);

      expect(createSpy).toHaveBeenCalled();
      expect(result).toEqual(mockIngestionJob);
    });
  });

  describe('getJobStatistics', () => {
    it('should return job statistics', async () => {
      const jobs = [
        {
          ...mockIngestionJob,
          status: IngestionStatus.COMPLETED,
          actualDuration: 60,
        },
        {
          ...mockIngestionJob,
          id: 2,
          status: IngestionStatus.FAILED,
          actualDuration: 30,
        },
      ];

      jest.spyOn(ingestionRepository, 'find').mockResolvedValue(jobs);

      const result = await service.getJobStatistics();

      expect(result).toEqual({
        totalJobs: 2,
        jobsByStatus: { completed: 1, failed: 1 },
        jobsByType: { api_trigger: 2 },
        averageDuration: 45,
        successRate: 50,
      });
    });

    it('should handle empty job list', async () => {
      jest.spyOn(ingestionRepository, 'find').mockResolvedValue([]);

      const result = await service.getJobStatistics();

      expect(result).toEqual({
        totalJobs: 0,
        jobsByStatus: {},
        jobsByType: {},
        averageDuration: 0,
        successRate: 0,
      });
    });
  });

  describe('getUserJobs', () => {
    it('should return jobs for a specific user', async () => {
      const findSpy = jest
        .spyOn(ingestionRepository, 'find')
        .mockResolvedValue([mockIngestionJob]);

      const result = await service.getUserJobs(1);

      expect(findSpy).toHaveBeenCalledWith({
        where: { triggeredById: 1 },
        relations: ['triggeredBy', 'relatedDocument'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      // Check that the result has the expected properties including the dynamic progress
      expect(result[0]).toMatchObject(mockIngestionJob);
      expect(result[0]).toHaveProperty('progress');
      expect((result[0] as IngestionJob & { progress: number }).progress).toBe(
        0,
      ); // processedItems/totalItems = 0/0 = 0
    });
  });
});
