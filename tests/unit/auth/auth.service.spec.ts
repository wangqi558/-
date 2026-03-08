import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../../src/auth/auth.service';
import { User } from '../../../src/users/entities/user.entity';
import { UserService } from '../../../src/users/user.service';
import { JwtPayload } from '../../../src/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User();
      user.id = 1;
      user.email = email;
      user.password = hashedPassword;
      user.isActive = true;
      user.emailVerified = true;

      mockUserService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(result.email).toBe(email);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser(email, password))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User();
      user.id = 1;
      user.email = email;
      user.password = hashedPassword;
      user.isActive = true;
      user.emailVerified = true;

      mockUserService.findByEmail.mockResolvedValue(user);

      await expect(service.validateUser(email, wrongPassword))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User();
      user.id = 1;
      user.email = email;
      user.password = hashedPassword;
      user.isActive = false;
      user.emailVerified = true;

      mockUserService.findByEmail.mockResolvedValue(user);

      await expect(service.validateUser(email, password))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const user = new User();
      user.id = 1;
      user.email = 'test@example.com';
      user.firstName = 'Test';
      user.lastName = 'User';
      user.role = 'user';

      const expectedToken = 'jwt-token';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(user);

      expect(result).toEqual({
        access_token: expectedToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
      });
    });
  });

  describe('register', () => {
    it('should create new user and return tokens', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUser = new User();
      createdUser.id = 1;
      createdUser.email = registerDto.email;
      createdUser.firstName = registerDto.firstName;
      createdUser.lastName = registerDto.lastName;
      createdUser.role = 'user';

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.access_token).toBe('jwt-token');
      expect(mockUserService.create).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when email already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const existingUser = new User();
      existingUser.email = registerDto.email;

      mockUserService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(registerDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('validateToken', () => {
    it('should return user info for valid token', async () => {
      const payload: JwtPayload = {
        email: 'test@example.com',
        sub: 1,
        role: 'user',
      };

      const user = new User();
      user.id = payload.sub;
      user.email = payload.email;
      user.role = payload.role;

      mockUserService.findById.mockResolvedValue(user);

      const result = await service.validateToken(payload);

      expect(result).toEqual(user);
      expect(mockUserService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('should return null when user not found', async () => {
      const payload: JwtPayload = {
        email: 'test@example.com',
        sub: 1,
        role: 'user',
      };

      mockUserService.findById.mockResolvedValue(null);

      const result = await service.validateToken(payload);

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return new access token', async () => {
      const userId = 1;
      const user = new User();
      user.id = userId;
      user.email = 'test@example.com';
      user.role = 'user';

      const newToken = 'new-jwt-token';

      mockUserService.findById.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(newToken);

      const result = await service.refreshToken(userId);

      expect(result).toEqual({ access_token: newToken });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
      });
    });
  });

  describe('changePassword', () => {
    it('should update user password', async () => {
      const userId = 1;
      const oldPassword = 'oldpassword123';
      const newPassword = 'newpassword123';
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);

      const user = new User();
      user.id = userId;
      user.password = hashedOldPassword;

      mockUserService.findById.mockResolvedValue(user);
      mockUserService.update.mockResolvedValue({ ...user, password: newPassword });

      const result = await service.changePassword(userId, oldPassword, newPassword);

      expect(result).toBe(true);
      expect(mockUserService.update).toHaveBeenCalledWith(userId, {
        password: expect.any(String),
      });
    });

    it('should throw UnauthorizedException when old password is incorrect', async () => {
      const userId = 1;
      const oldPassword = 'oldpassword123';
      const wrongPassword = 'wrongpassword';
      const newPassword = 'newpassword123';
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);

      const user = new User();
      user.id = userId;
      user.password = hashedOldPassword;

      mockUserService.findById.mockResolvedValue(user);

      await expect(service.changePassword(userId, wrongPassword, newPassword))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
