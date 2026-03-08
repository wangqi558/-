import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserService } from '../../../src/users/user.service';
import { User } from '../../../src/users/entities/user.entity';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/users/dto/update-user.dto';
import { UserRole } from '../../../src/users/enums/user-role.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = new User();
      user.id = 1;
      user.email = createUserDto.email;
      user.password = hashedPassword;
      user.firstName = createUserDto.firstName;
      user.lastName = createUserDto.lastName;
      user.role = UserRole.USER;
      user.isActive = true;
      user.emailVerified = false;

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.create(createUserDto);

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: expect.any(String),
        role: UserRole.USER,
        isActive: true,
        emailVerified: false,
      });
    });

    it('should throw BadRequestException when email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const existingUser = new User();
      existingUser.email = createUserDto.email;

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.create(createUserDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const page = 1;
      const limit = 10;
      const users = [new User(), new User()];
      const total = 20;

      mockQueryBuilder.getMany.mockResolvedValue(users);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(page, limit);

      expect(result).toEqual({
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith((page - 1) * limit);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(limit);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
    });

    it('should filter users by role when provided', async () => {
      const page = 1;
      const limit = 10;
      const role = UserRole.ADMIN;
      const users = [new User()];
      const total = 5;

      mockQueryBuilder.getMany.mockResolvedValue(users);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(page, limit, role);

      expect(result.data).toEqual(users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role = :role', { role });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const userId = 1;
      const user = new User();
      user.id = userId;

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(userId);

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['ratings'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 999;

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      const user = new User();
      user.email = email;

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail(email);

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const existingUser = new User();
      existingUser.id = userId;
      existingUser.firstName = 'Test';
      existingUser.lastName = 'User';

      const updatedUser = { ...existingUser, ...updateUserDto };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw BadRequestException when trying to update email to existing one', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const existingUser = new User();
      existingUser.id = userId;

      const userWithSameEmail = new User();
      userWithSameEmail.id = 2;
      userWithSameEmail.email = updateUserDto.email;

      mockUserRepository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(userWithSameEmail);

      await expect(service.update(userId, updateUserDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      const userId = 1;
      const user = new User();
      user.id = userId;
      user.isActive = true;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, isActive: false });

      const result = await service.remove(userId);

      expect(result).toBe(true);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...user,
        isActive: false,
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email', async () => {
      const userId = 1;
      const user = new User();
      user.id = userId;
      user.emailVerified = false;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue({ ...user, emailVerified: true });

      const result = await service.verifyEmail(userId);

      expect(result).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...user,
        emailVerified: true,
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const userId = 1;
      const user = new User();
      user.id = userId;
      user.ratings = [];

      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.count.mockResolvedValue(10);

      const result = await service.getUserStats(userId);

      expect(result).toEqual({
        totalRatings: 10,
        averageRatingGiven: 0,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const query = 'test';
      const users = [new User(), new User()];

      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await service.searchUsers(query);

      expect(result).toEqual(users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query',
        { query: `%${query}%` }
      );
    });
  });
});
