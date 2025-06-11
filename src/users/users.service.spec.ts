import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        role: UserRole.USER,
      };

      const hashedPassword = 'hashedPassword';
      const savedUser = {
        id: 1,
        ...createUserDto,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBeInstanceOf(User);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        role: UserRole.USER,
      };

      const existingUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        {
          id: 1,
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          id: 2,
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      ];

      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockUserRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(User);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(User);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'UpdatedName',
      };

      const existingUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const updatedUser = {
        ...existingUser,
        firstName: 'UpdatedName',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(existingUser) // First call in update method
        .mockResolvedValueOnce(updatedUser); // Second call to return updated user
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.update(1, updateUserDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateUserDto);
      expect(result).toBeInstanceOf(User);
    });

    it('should throw ConflictException if email already exists', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const currentUser = {
        id: 1,
        email: 'current@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const existingUserWithEmail = {
        id: 2,
        email: 'existing@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(currentUser) // findOne call in update method
        .mockResolvedValueOnce(existingUserWithEmail); // findOne call for email check

      await expect(service.update(1, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove a user', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.remove.mockResolvedValue(user);

      await service.remove(1);

      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });
  });

  describe('softDelete', () => {
    it('should successfully deactivate a user', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      const deactivatedUser = {
        ...user,
        isActive: false,
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(user) // First call to check if user exists
        .mockResolvedValueOnce(deactivatedUser); // Second call to return updated user
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.softDelete(1);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        isActive: false,
      });
      expect(result).toBeInstanceOf(User);
    });
  });
});
