import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Check if admin user already exists
    const adminCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (adminCheck.rows.length > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
    const userPassword = await bcrypt.hash('password', BCRYPT_ROUNDS);

    // Insert test users
    await pool.query(`
      INSERT INTO users (email, username, password_hash, role, reputation)
      VALUES
        ('admin@example.com', 'admin', $1, 'admin', 100),
        ('user1@example.com', 'user1', $2, 'user', 50),
        ('user2@example.com', 'user2', $2, 'user', 30)
    `, [adminPassword, userPassword]);

    // Insert test rating objects
    await pool.query(`
      INSERT INTO rating_objects (title, description, category, tags, creator_id)
      VALUES
        ('iPhone 15 Pro', 'Apple\'s latest flagship smartphone', 'Technology', '{"smartphone", "apple", "mobile"}', 1),
        ('Tesla Model 3', 'Electric sedan from Tesla', 'Automotive', '{"electric", "tesla", "car"}', 1),
        ('MacBook Pro M3', 'Apple\'s professional laptop', 'Technology', '{"laptop", "apple", "computer"}', 2)
    `);

    // Insert test ratings
    await pool.query(`
      INSERT INTO ratings (object_id, user_id, score, comment, anonymous)
      VALUES
        (1, 2, 5, 'Excellent phone, great camera quality!', false),
        (1, 3, 4, 'Good phone but battery could be better', false),
        (2, 2, 5, 'Amazing car, love the autopilot feature', false),
        (2, 3, 4, 'Great range and performance', false),
        (3, 2, 5, 'Perfect for development work', false)
    `);

    console.log('✓ Database seeded successfully!');
    console.log('');
    console.log('Default users:');
    console.log('- admin@example.com / admin123 (Admin)');
    console.log('- user1@example.com / password (User)');
    console.log('- user2@example.com / password (User)');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };