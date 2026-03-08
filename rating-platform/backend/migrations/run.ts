import { pool } from '../src/config/database';
import fs from 'fs';
import path from 'path';

const runMigrations = async () => {
  try {
    console.log('Running migrations...');
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      
      // Split by semicolon but handle cases where semicolon is in content
      const statements = sql
        .split(/;\s*$/gm)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement) {
          try {
            await pool.query(statement);
          } catch (error: any) {
            // Ignore errors for already existing objects
            if (!error.message.includes('already exists')) {
              throw error;
            }
          }
        }
      }
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  runMigrations();
}
