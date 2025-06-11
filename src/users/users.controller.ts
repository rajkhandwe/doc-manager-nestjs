import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }

  @Put(':id/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }
}
