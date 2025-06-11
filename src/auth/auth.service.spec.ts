import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto, LoginDto, ChangePasswordDto } from '../dto/user.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
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

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        password: hashedPassword,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(savedUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'test@example.com',
        sub: 1,
        role: UserRole.USER,
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token', 'jwt-token');
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashedPassword',
        role: UserRole.USER,
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'password',
        ],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token', 'jwt-token');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: false,
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if found and active', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });
      expect(result).toBeInstanceOf(User);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser(1)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      const user = {
        id: 1,
        password: 'hashedOldPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashedNewPassword' as never);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.changePassword(1, changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldpassword',
        'hashedOldPassword',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        password: 'hashedNewPassword',
      });
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      const user = {
        id: 1,
        password: 'hashedOldPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
