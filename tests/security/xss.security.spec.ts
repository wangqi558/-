import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/test-database';
import { UserFactory } from '../factories/user.factory';
import { CategoryFactory } from '../factories/category.factory';
import { ItemFactory } from '../factories/item.factory';
import { RatingFactory } from '../factories/rating.factory';

describe('XSS Security Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testItem: any;

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
    
    // Create test user and authenticate
    await UserFactory.create({
      email: 'xss@example.com',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'xss@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;

    // Create test category and item
    const category = await CategoryFactory.create({
      name: 'XSS Test Category',
    });

    testItem = await ItemFactory.create(category, {
      name: 'XSS Test Item',
    });
  });

  describe('Rating comments XSS prevention', () => {
    it('should sanitize XSS in rating comments', async () => {
      const xssPayloads = [
        '<script>alert("XSS")\u003c/script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">\u003c/iframe>',
        '<body onload=alert("XSS")>',
        '<svg onload=alert("XSS")>\u003c/svg>',
        '<input onfocus=alert("XSS") autofocus>',
        "';alert(String.fromCharCode(88,83,83))//",
        'javascript:alert("XSS")',
        '<script>alert(document.cookie)\u003c/script>',
        '<img src="#" onmouseover="alert(\'XSS\')"/>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: testItem.id,
            score: 5,
            comment: payload,
          })
          .expect(201);

        // Get the rating and verify it's sanitized
        const ratingResponse = await request(app.getHttpServer())
          .get(`/ratings/${response.body.id}`)
          .expect(200);

        const comment = ratingResponse.body.comment;
        
        // Should not contain executable scripts
        expect(comment).not.toContain('<script');
        expect(comment).not.toContain('javascript:');
        expect(comment).not.toContain('onerror=');
        expect(comment).not.toContain('onload=');
        expect(comment).not.toContain('onfocus=');
        expect(comment).not.toContain('onmouseover=');
        
        // Should be escaped or stripped
        expect(comment).toMatch(/^<>$|^$/); // Either empty or contains safe HTML
      }
    });

    it('should handle encoded XSS attempts', async () => {
      const encodedXssPayloads = [
        '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
        '%3Cimg%20src%3Dx%20onerror%3Dalert(%22XSS%22)%3E',
        '&#60;script&#62;alert("XSS")&#60;/script&#62;',
        '\\u003Cscript\\u003Ealert(\\"XSS\\")\\u003C/script\\u003E',
      ];

      for (const payload of encodedXssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: testItem.id,
            score: 5,
            comment: decodeURIComponent(payload),
          })
          .expect(201);

        // Verify the stored comment is safe
        const ratingResponse = await request(app.getHttpServer())
          .get(`/ratings/${response.body.id}`)
          .expect(200);

        const comment = ratingResponse.body.comment;
        expect(comment).not.toContain('<script');
        expect(comment).not.toContain('alert(');
      }
    });
  });

  describe('User profile XSS prevention', () => {
    it('should sanitize XSS in user profile data', async () => {
      const xssPayloads = [
        {
          firstName: '<script>alert("XSS")\u003c/script>',
          lastName: '<img src=x onerror=alert("XSS")>',
        },
        {
          firstName: 'Normal',
          lastName: "';alert('XSS');//",
        },
      ];

      for (const payload of xssPayloads) {
        // Update user profile
        await request(app.getHttpServer())
          .put('/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload)
          .expect(200);

        // Get profile and verify sanitization
        const profileResponse = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const profile = profileResponse.body;
        
        expect(profile.firstName).not.toContain('<script');
        expect(profile.lastName).not.toContain('alert(');
        expect(profile.firstName).not.toContain('onerror=');
      }
    });
  });

  describe('Item and category XSS prevention', () => {
    it('should sanitize XSS in item names and descriptions', async () => {
      const category = await CategoryFactory.create({
        name: 'Safe Category',
      });

      const xssPayloads = [
        {
          name: '<script>alert("Item XSS")\u003c/script> Item',
          description: '<iframe src="javascript:alert(\'XSS\')"\u003e\u003c/iframe\u003e',
        },
        {
          name: 'Normal Item',
          description: '<svg onload=alert("Description XSS")>\u003c/svg\u003e',
        },
      ];

      for (const payload of xssPayloads) {
        // This would be an admin endpoint in real implementation
        // For now, we'll test with factory
        const item = await ItemFactory.create(category, payload);

        const response = await request(app.getHttpServer())
          .get(`/items/${item.id}`)
          .expect(200);

        const itemData = response.body;
        
        expect(itemData.name).not.toContain('<script');
        expect(itemData.description).not.toContain('javascript:');
        expect(itemData.description).not.toContain('onload=');
      }
    });
  });

  describe('URL parameter XSS prevention', () => {
    it('should sanitize XSS in URL parameters', async () => {
      const xssPayloads = [
        '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '\'"onmouseover=alert(1)//',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/ratings?itemId=${payload}`)
          .expect(400); // Should validate input

        // Response should not execute XSS
        expect(response.text).not.toContain('<script');
        expect(response.text).not.toContain('alert(');
      }
    });
  });

  describe('JSON response XSS prevention', () => {
    it('should properly escape JSON responses', async () => {
      const rating = await RatingFactory.create(
        { id: 1 } as any,
        testItem,
        {
          score: 5,
          comment: '</script><script>alert("JSON XSS")\u003c/script>',
        }
      );

      const response = await request(app.getHttpServer())
        .get(`/ratings/${rating.id}`)
        .expect(200);

      // Response should be properly encoded
      const responseText = response.text;
      expect(responseText).not.toContain('<script>alert');
      
      // Parse JSON to ensure it's valid
      const jsonData = JSON.parse(responseText);
      expect(jsonData.comment).toBeDefined();
      expect(jsonData.comment).not.toContain('<script');
    });
  });

  describe('Content-Type security', () => {
    it('should set correct Content-Type for JSON responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      
      // Should not be interpreted as HTML
      expect(response.headers['content-type']).not.toContain('text/html');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check for security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});
