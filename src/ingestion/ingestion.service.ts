import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IngestionJob,
  IngestionStatus,
  IngestionType,
} from '../entities/ingestion-job.entity';
import { User } from '../entities/user.entity';
import { Document } from '../entities/document.entity';
import {
  CreateIngestionJobDto,
  UpdateIngestionJobDto,
  IngestionQueryDto,
  TriggerIngestionDto,
} from '../dto/ingestion.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(IngestionJob)
    private ingestionRepository: Repository<IngestionJob>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async create(
    createIngestionJobDto: CreateIngestionJobDto,
    userId: number,
  ): Promise<IngestionJob> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let relatedDocument: Document | null = null;
    if (createIngestionJobDto.relatedDocumentId) {
      relatedDocument = await this.documentRepository.findOne({
        where: { id: createIngestionJobDto.relatedDocumentId },
      });

      if (!relatedDocument) {
        throw new NotFoundException('Related document not found');
      }
    }

    const ingestionJob = this.ingestionRepository.create({
      jobName: createIngestionJobDto.jobName,
      type: createIngestionJobDto.type,
      description: createIngestionJobDto.description,
      parameters: createIngestionJobDto.parameters,
      totalItems: createIngestionJobDto.totalItems,
      estimatedDuration: createIngestionJobDto.estimatedDuration,
      triggeredBy: user,
      triggeredById: userId,
      ...(relatedDocument && { relatedDocument }),
      ...(createIngestionJobDto.relatedDocumentId && {
        relatedDocumentId: createIngestionJobDto.relatedDocumentId,
      }),
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
    });

    await this.ingestionRepository.save(ingestionJob);
    return new IngestionJob(ingestionJob);
  }

  async findAll(query: IngestionQueryDto): Promise<{
    jobs: IngestionJob[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      status,
      type,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.ingestionRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.triggeredBy', 'triggeredBy')
      .leftJoinAndSelect('job.relatedDocument', 'relatedDocument');

    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('job.type = :type', { type });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sorting
    const validSortFields = [
      'jobName',
      'status',
      'type',
      'createdAt',
      'updatedAt',
      'startedAt',
      'completedAt',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`job.${sortField}`, sortOrder);

    const [jobs, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Calculate progress for each job
    const jobsWithProgress = jobs.map((job) => {
      const jobWithProgress = new IngestionJob(job);
      if (job.totalItems && job.totalItems > 0) {
        jobWithProgress['progress'] = Math.round(
          (job.processedItems / job.totalItems) * 100,
        );
      } else {
        jobWithProgress['progress'] =
          job.status === IngestionStatus.COMPLETED ? 100 : 0;
      }
      return jobWithProgress;
    });

    return {
      jobs: jobsWithProgress,
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: number): Promise<IngestionJob> {
    const job = await this.ingestionRepository.findOne({
      where: { id },
      relations: ['triggeredBy', 'relatedDocument'],
    });

    if (!job) {
      throw new NotFoundException(`Ingestion job with ID ${id} not found`);
    }

    const jobWithProgress = new IngestionJob(job);
    if (job.totalItems && job.totalItems > 0) {
      jobWithProgress['progress'] = Math.round(
        (job.processedItems / job.totalItems) * 100,
      );
    } else {
      jobWithProgress['progress'] =
        job.status === IngestionStatus.COMPLETED ? 100 : 0;
    }

    return jobWithProgress;
  }

  async update(
    id: number,
    updateIngestionJobDto: UpdateIngestionJobDto,
  ): Promise<IngestionJob> {
    const job = await this.findOne(id);

    // Handle status transitions
    if (updateIngestionJobDto.status) {
      const now = new Date();

      if (
        updateIngestionJobDto.status === IngestionStatus.PROCESSING &&
        !job.startedAt
      ) {
        updateIngestionJobDto['startedAt'] = now;
      }

      if (
        (updateIngestionJobDto.status === IngestionStatus.COMPLETED ||
          updateIngestionJobDto.status === IngestionStatus.FAILED ||
          updateIngestionJobDto.status === IngestionStatus.CANCELLED) &&
        !job.completedAt
      ) {
        updateIngestionJobDto['completedAt'] = now;

        // Calculate actual duration
        if (job.startedAt) {
          const duration = Math.round(
            (now.getTime() - job.startedAt.getTime()) / 1000,
          );
          updateIngestionJobDto['actualDuration'] = duration;
        }
      }
    }

    await this.ingestionRepository.update(id, updateIngestionJobDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const job = await this.findOne(id);

    // Only allow deletion of completed, failed, or cancelled jobs
    if (
      ![
        IngestionStatus.COMPLETED,
        IngestionStatus.FAILED,
        IngestionStatus.CANCELLED,
      ].includes(job.status)
    ) {
      throw new BadRequestException('Cannot delete active ingestion job');
    }

    await this.ingestionRepository.remove(job);
  }

  async triggerIngestion(
    triggerDto: TriggerIngestionDto,
    userId: number,
  ): Promise<IngestionJob> {
    // Create a new ingestion job
    const createDto: CreateIngestionJobDto = {
      jobName: triggerDto.jobName,
      type: IngestionType.API_TRIGGER,
      description: triggerDto.description,
      parameters: {
        documentIds: triggerDto.documentIds,
        options: triggerDto.options,
      },
      totalItems: triggerDto.documentIds?.length || 0,
      estimatedDuration: (triggerDto.documentIds?.length || 1) * 30, // 30 seconds per document
    };

    const job = await this.create(createDto, userId);

    // Simulate starting the job immediately
    await this.update(job.id, {
      status: IngestionStatus.PROCESSING,
    });

    // In a real implementation, this would trigger an external Python service
    // For now, we'll simulate the processing
    this.simulateProcessing(job.id);

    return this.findOne(job.id);
  }

  async cancelJob(id: number): Promise<IngestionJob> {
    const job = await this.findOne(id);

    if (
      ![IngestionStatus.PENDING, IngestionStatus.PROCESSING].includes(
        job.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot cancel job that is not pending or processing',
      );
    }

    return this.update(id, {
      status: IngestionStatus.CANCELLED,
      errorMessage: 'Job cancelled by user',
    });
  }

  async getJobStatistics(): Promise<{
    totalJobs: number;
    jobsByStatus: Record<string, number>;
    jobsByType: Record<string, number>;
    averageDuration: number;
    successRate: number;
  }> {
    const jobs = await this.ingestionRepository.find();

    const totalJobs = jobs.length;
    const jobsByStatus: Record<string, number> = {};
    const jobsByType: Record<string, number> = {};
    let totalDuration = 0;
    let completedJobs = 0;
    let successfulJobs = 0;

    jobs.forEach((job) => {
      // Status stats
      jobsByStatus[job.status] = (jobsByStatus[job.status] || 0) + 1;

      // Type stats
      jobsByType[job.type] = (jobsByType[job.type] || 0) + 1;

      // Duration and success stats
      if (job.actualDuration) {
        totalDuration += job.actualDuration;
        completedJobs++;
      }

      if (job.status === IngestionStatus.COMPLETED) {
        successfulJobs++;
      }
    });

    const averageDuration =
      completedJobs > 0 ? Math.round(totalDuration / completedJobs) : 0;
    const successRate =
      totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 100) : 0;

    return {
      totalJobs,
      jobsByStatus,
      jobsByType,
      averageDuration,
      successRate,
    };
  }

  async getUserJobs(userId: number): Promise<IngestionJob[]> {
    const jobs = await this.ingestionRepository.find({
      where: { triggeredById: userId },
      relations: ['triggeredBy', 'relatedDocument'],
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => {
      const jobWithProgress = new IngestionJob(job);
      if (job.totalItems && job.totalItems > 0) {
        jobWithProgress['progress'] = Math.round(
          (job.processedItems / job.totalItems) * 100,
        );
      } else {
        jobWithProgress['progress'] =
          job.status === IngestionStatus.COMPLETED ? 100 : 0;
      }
      return jobWithProgress;
    });
  }

  private simulateProcessing(jobId: number): void {
    // This simulates processing in the background
    // In a real implementation, this would be handled by a separate microservice
    setTimeout(() => {
      void (async () => {
        try {
          // Check if the job still exists before processing
          const job = await this.ingestionRepository.findOne({
            where: { id: jobId },
          });

          if (!job) {
            // Job was deleted (likely during test cleanup), exit gracefully
            return;
          }

          const totalItems = job.totalItems || 1;

          // Simulate progressive updates
          for (let i = 1; i <= totalItems; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

            // Check if job still exists before each update
            const currentJob = await this.ingestionRepository.findOne({
              where: { id: jobId },
            });

            if (!currentJob) {
              // Job was deleted, exit gracefully
              return;
            }

            await this.update(jobId, {
              processedItems: i,
              successfulItems: i, // Assume all successful for simulation
              failedItems: 0,
            });
          }

          // Mark as completed
          await this.update(jobId, {
            status: IngestionStatus.COMPLETED,
            result: {
              message: 'Ingestion completed successfully',
              processedCount: totalItems,
            },
          });
        } catch (error) {
          // Only update if the job still exists
          try {
            const job = await this.ingestionRepository.findOne({
              where: { id: jobId },
            });

            if (job) {
              await this.update(jobId, {
                status: IngestionStatus.FAILED,
                errorMessage:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
              });
            }
          } catch {
            // If update fails, the job was likely deleted - ignore error
            this.logger.warn(
              `Failed to update job ${jobId} status: Job may have been deleted`,
            );
          }
        }
      })();
    }, 100); // Start after 100ms
  }
}
