#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dbPool = require('../config/database');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../database/migrations');
    this.migrationsTable = 'schema_migrations';
  }

  async initialize() {
    try {
      await dbPool.initialize();
      await this.ensureMigrationsTable();
    } catch (error) {
      console.error('Failed to initialize migration runner:', error);
      process.exit(1);
    }
  }

  async ensureMigrationsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      await dbPool.query(createTableQuery);
      console.log('Migrations table ensured');
    } catch (error) {
      console.error('Failed to create migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await dbPool.query(
        `SELECT name FROM ${this.migrationsTable} ORDER BY executed_at`
      );
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Failed to get executed migrations:', error);
      throw error;
    }
  }

  async getPendingMigrations() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      return migrationFiles.filter(file => !executedMigrations.includes(file));
    } catch (error) {
      console.error('Failed to get pending migrations:', error);
      throw error;
    }
  }

  async runMigration(migrationName) {
    const migrationPath = path.join(this.migrationsDir, migrationName);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationName}`);
    }

    const client = await dbPool.getClient();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Running migration: ${migrationName}`);
      
      // Read and execute migration SQL
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await client.query(migrationSQL);
      
      // Record migration as executed
      await client.query(
        `INSERT INTO ${this.migrationsTable} (name) VALUES ($1)`,
        [migrationName]
      );
      
      await client.query('COMMIT');
      console.log(`Migration completed: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration failed: ${migrationName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(migrationName) {
    const client = await dbPool.getClient();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Rolling back migration: ${migrationName}`);
      
      // Get the down migration
      const downMigrationPath = path.join(this.migrationsDir, migrationName.replace('.sql', '.down.sql'));
      
      if (!fs.existsSync(downMigrationPath)) {
        throw new Error(`Down migration file not found: ${migrationName.replace('.sql', '.down.sql')}`);
      }
      
      // Execute down migration
      const downMigrationSQL = fs.readFileSync(downMigrationPath, 'utf8');
      await client.query(downMigrationSQL);
      
      // Remove migration record
      await client.query(
        `DELETE FROM ${this.migrationsTable} WHERE name = $1`,
        [migrationName]
      );
      
      await client.query('COMMIT');
      console.log(`Migration rolled back: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Rollback failed: ${migrationName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runAllMigrations() {
    try {
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration run failed:', error);
      process.exit(1);
    }
  }

  async rollbackLastMigration() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = executedMigrations[executedMigrations.length - 1];
      await this.rollbackMigration(lastMigration);
      
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    }
  }

  async listMigrations() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql') && !file.endsWith('.down.sql'))
        .sort();
      
      console.log('\nMigration Status:');
      console.log('================');
      
      for (const migration of allMigrations) {
        const status = executedMigrations.includes(migration) ? '✓' : '○';
        console.log(`${status} ${migration}`);
      }
    } catch (error) {
      console.error('Failed to list migrations:', error);
      process.exit(1);
    }
  }

  async close() {
    await dbPool.close();
  }
}

// Command line interface
async function main() {
  const command = process.argv[2];
  const migrationRunner = new MigrationRunner();
  
  try {
    await migrationRunner.initialize();
    
    switch (command) {
      case 'up':
        await migrationRunner.runAllMigrations();
        break;
        
      case 'down':
        await migrationRunner.rollbackLastMigration();
        break;
        
      case 'list':
        await migrationRunner.listMigrations();
        break;
        
      case 'pending':
        const pending = await migrationRunner.getPendingMigrations();
        if (pending.length > 0) {
          console.log('Pending migrations:');
          pending.forEach(m => console.log(`  - ${m}`));
        } else {
          console.log('No pending migrations');
        }
        break;
        
      default:
        console.log(`
Usage: node migrate.js <command>

Commands:
  up       Run all pending migrations
  down     Rollback the last migration
  list     List all migrations and their status
  pending  List pending migrations
`);
    }
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  } finally {
    await migrationRunner.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
