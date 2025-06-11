import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    return new User(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find();
    return users.map((user) => new User(user));
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return new User(user);
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return new User(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being updated and doesn't conflict
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async softDelete(id: number): Promise<User> {
    await this.findOne(id); // Check if user exists
    await this.userRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  async restore(id: number): Promise<User> {
    await this.userRepository.update(id, { isActive: true });
    return this.findOne(id);
  }
}
