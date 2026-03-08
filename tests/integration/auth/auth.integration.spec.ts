import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../../config/test-database';
import { UserFactory } from '../../factories/user.factory';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userFactory: UserFactory;

  beforeAll(async () => {
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should not register user with weak password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should not register user with duplicate email', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Create first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Try to create second user with same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({
        email: 'test@example.com',
        password,
      });

      const loginDto = {
        email: 'test@example.com',
        password,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(user.email);
    });

    it('should not login with invalid password', async () => {
      const password = 'Password123!';
      await UserFactory.create({
        email: 'test@example.com',
        password,
      });

      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should not login with non-existent email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should not login inactive user', async () => {
      const password = 'Password123!';
      await UserFactory.create({
        email: 'test@example.com',
        password,
        isActive: false,
      });

      const loginDto = {
        email: 'test@example.com',
        password,
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get user profile with valid token', async () => {
      const user = await UserFactory.create({
        email: 'test@example.com',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const token = loginResponse.body.access_token;

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe(user.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should not get profile with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh access token', async () => {
      const user = await UserFactory.create({
        email: 'test@example.com',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const oldToken = loginResponse.body.access_token;

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).not.toBe(oldToken);
    });
  });

  describe('/auth/change-password (POST)', () => {
    it('should change password with valid credentials', async () => {
      const oldPassword = 'Password123!';
      const user = await UserFactory.create({
        email: 'test@example.com',
        password: oldPassword,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: oldPassword,
        })
        .expect(200);

      const token = loginResponse.body.access_token;

      const changePasswordDto = {
        oldPassword,
        newPassword: 'NewPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordDto)
        .expect(200);

      // Verify new password works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: changePasswordDto.newPassword,
        })
        .expect(200);
    });

    it('should not change password with incorrect old password', async () => {
      const oldPassword = 'Password123!';
      await UserFactory.create({
        email: 'test@example.com',
        password: oldPassword,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: oldPassword,
        })
        .expect(200);

      const token = loginResponse.body.access_token;

      const changePasswordDto = {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordDto)
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should block after multiple failed login attempts', async () => {
      const password = 'Password123!';
      await UserFactory.create({
        email: 'test@example.com',
        password,
      });

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          });
      }

      // Next attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'AnotherWrongPassword123!',
        })
        .expect(429);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Too many attempts');
    });
  });
});
