import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { IngestionJob } from '../entities/ingestion-job.entity';
import { User } from '../entities/user.entity';
import { Document } from '../entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IngestionJob, User, Document])],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
