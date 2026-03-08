import 'reflect-metadata';
import { config } from 'dotenv';

config({ path: '.env.test' });

beforeAll(() => {
  jest.setTimeout(30000);
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});
