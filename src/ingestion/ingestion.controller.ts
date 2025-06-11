import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { IngestionService } from './ingestion.service';
import {
  CreateIngestionJobDto,
  UpdateIngestionJobDto,
  IngestionQueryDto,
  TriggerIngestionDto,
  IngestionResponseDto,
} from '../dto/ingestion.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Ingestion')
@Controller('ingestion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('jobs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new ingestion job (Admin/Editor only)' })
  @ApiResponse({
    status: 201,
    description: 'Ingestion job created successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Editor access required',
  })
  create(
    @Body() createIngestionJobDto: CreateIngestionJobDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.ingestionService.create(createIngestionJobDto, req.user.userId);
  }

  @Post('trigger')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Trigger immediate ingestion (Admin/Editor only)' })
  @ApiResponse({
    status: 201,
    description: 'Ingestion triggered successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Editor access required',
  })
  triggerIngestion(
    @Body() triggerDto: TriggerIngestionDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.ingestionService.triggerIngestion(triggerDto, req.user.userId);
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Get all ingestion jobs with filtering and pagination',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['document_upload', 'batch_import', 'api_trigger', 'scheduled'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestion jobs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: { $ref: '#/components/schemas/IngestionResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findAll(@Query() query: IngestionQueryDto) {
    return this.ingestionService.findAll(query);
  }

  @Get('jobs/my-jobs')
  @ApiOperation({ summary: "Get current user's ingestion jobs" })
  @ApiResponse({
    status: 200,
    description: 'User ingestion jobs retrieved successfully',
    type: [IngestionResponseDto],
  })
  getUserJobs(@Request() req: { user: { userId: number } }) {
    return this.ingestionService.getUserJobs(req.user.userId);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get ingestion statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalJobs: { type: 'number' },
        jobsByStatus: { type: 'object' },
        jobsByType: { type: 'object' },
        averageDuration: { type: 'number' },
        successRate: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  getStatistics() {
    return this.ingestionService.getJobStatistics();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get ingestion job by ID' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job retrieved successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ingestion job not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ingestionService.findOne(id);
  }

  @Patch('jobs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update ingestion job (Admin/Editor only)' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job updated successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Editor access required',
  })
  @ApiResponse({ status: 404, description: 'Ingestion job not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateIngestionJobDto: UpdateIngestionJobDto,
  ) {
    return this.ingestionService.update(id, updateIngestionJobDto);
  }

  @Post('jobs/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Cancel ingestion job (Admin/Editor only)' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job cancelled successfully',
    type: IngestionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel job that is not pending or processing',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Editor access required',
  })
  @ApiResponse({ status: 404, description: 'Ingestion job not found' })
  cancelJob(@Param('id', ParseIntPipe) id: number) {
    return this.ingestionService.cancelJob(id);
  }

  @Delete('jobs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete ingestion job (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete active ingestion job',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Ingestion job not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ingestionService.remove(id);
    return { message: 'Ingestion job deleted successfully' };
  }
}
