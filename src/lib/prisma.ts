import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for Prisma client to prevent too many connections
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;
  private static isInitialized = false;
  private static initializationError: Error | null = null;
  private static connectionTested = false;

  static getInstance(): PrismaClient | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    if (this.initializationError) {
      console.error('Prisma client initialization failed:', this.initializationError);
      return null;
    }
    
    return this.instance;
  }

  static isAvailable(): boolean {
    const client = this.getInstance();
    return client !== null;
  }

  static async testConnection(): Promise<boolean> {
    const client = this.getInstance();
    if (!client) return false;

    try {
      await client.$queryRaw`SELECT 1`;
      this.connectionTested = true;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.connectionTested = false;
      return false;
    }
  }

  private static initialize() {
    try {
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // For SQLite, check if database file exists or can be created
      if (process.env.DATABASE_URL.startsWith('file:')) {
        const dbPath = process.env.DATABASE_URL.replace('file:', '');
        const fullPath = path.resolve(process.cwd(), dbPath);
        const dirPath = path.dirname(fullPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Check if file exists or can be created
        if (!fs.existsSync(fullPath)) {
          try {
            fs.writeFileSync(fullPath, '');
            console.log(`Created SQLite database file: ${fullPath}`);
          } catch (error) {
            throw new Error(`Cannot create SQLite database file: ${fullPath} - ${error}`);
          }
        }

        // Check if file is writable
        try {
          fs.accessSync(fullPath, fs.constants.W_OK | fs.constants.R_OK);
        } catch (error) {
          throw new Error(`SQLite database file is not accessible: ${fullPath} - ${error}`);
        }
      }

      // In development, use global variable to prevent hot reload issues
      if (process.env.NODE_ENV === 'development') {
        if (global.__prisma) {
          this.instance = global.__prisma;
        } else {
          this.instance = new PrismaClient({
            log: ['error', 'warn'],
            datasources: {
              db: {
                url: process.env.DATABASE_URL
              }
            }
          });
          global.__prisma = this.instance;
        }
      } else {
        // In production, create new instance
        this.instance = new PrismaClient({
          log: ['error'],
          datasources: {
            db: {
              url: process.env.DATABASE_URL
            }
          }
        });
      }

      this.isInitialized = true;
      console.log('Prisma client initialized successfully');
      
      // Test connection in background (don't block initialization)
      this.testConnection().catch(error => {
        console.warn('Initial database connection test failed:', error);
      });
      
    } catch (error) {
      this.initializationError = error as Error;
      this.isInitialized = true;
      console.error('Failed to initialize Prisma client:', error);
    }
  }

  static async disconnect() {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      this.isInitialized = false;
      if (process.env.NODE_ENV === 'development') {
        global.__prisma = undefined;
      }
    }
  }
}

// Export the singleton instance getter
export const getPrismaClient = () => PrismaClientSingleton.getInstance();

// Export availability checker
export const isPrismaAvailable = () => PrismaClientSingleton.isAvailable();

// Export connection test function
export const testPrismaConnection = () => PrismaClientSingleton.testConnection();

// Export disconnect function for cleanup
export const disconnectPrisma = () => PrismaClientSingleton.disconnect();

// Default export for backward compatibility
export default getPrismaClient();