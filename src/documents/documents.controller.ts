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
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
  DocumentResponseDto,
} from '../dto/document.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
          example: 'Project Specification',
        },
        description: {
          type: 'string',
          example: 'Detailed project requirements',
        },
        category: {
          type: 'string',
          enum: [
            'general',
            'technical',
            'legal',
            'financial',
            'marketing',
            'research',
          ],
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
        },
        tags: {
          type: 'string',
          example: 'project,specification,requirements',
        },
      },
      required: ['file', 'title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or data',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.documentsService.create(
      createDocumentDto,
      file,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with filtering and pagination' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title and description',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'general',
      'technical',
      'legal',
      'financial',
      'marketing',
      'research',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'published', 'archived'],
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Comma-separated tags',
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
    description: 'Documents retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: { $ref: '#/components/schemas/DocumentResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get('my-documents')
  @ApiOperation({ summary: "Get current user's documents" })
  @ApiResponse({
    status: 200,
    description: 'User documents retrieved successfully',
    type: [DocumentResponseDto],
  })
  getUserDocuments(@Request() req: { user: { userId: number } }) {
    return this.documentsService.getUserDocuments(req.user.userId);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get document statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalDocuments: { type: 'number' },
        documentsByCategory: { type: 'object' },
        documentsByStatus: { type: 'object' },
        totalSize: { type: 'number' },
        totalDownloads: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  getStatistics() {
    return this.documentsService.getStatistics();
  }

  @Get('search/tags')
  @ApiOperation({ summary: 'Search documents by tags' })
  @ApiQuery({
    name: 'tags',
    required: true,
    description: 'Comma-separated tags',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents found by tags',
    type: [DocumentResponseDto],
  })
  searchByTags(@Query('tags') tags: string) {
    const tagArray = tags.split(',').map((tag) => tag.trim());
    return this.documentsService.searchByTags(tagArray);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role: UserRole } },
  ) {
    return this.documentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document or file not found' })
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role: UserRole } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileBuffer, filename, mimeType } =
      await this.documentsService.downloadFile(
        id,
        req.user.userId,
        req.user.role,
      );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(fileBuffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only update your own documents',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req: { user: { userId: number; role: UserRole } },
  ) {
    return this.documentsService.update(
      id,
      updateDocumentDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document (soft delete)' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only delete your own documents',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role: UserRole } },
  ) {
    await this.documentsService.remove(id, req.user.userId, req.user.role);
    return { message: 'Document deleted successfully' };
  }
}
