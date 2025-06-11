import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Document } from '../entities/document.entity';
import { IngestionJob } from '../entities/ingestion-job.entity';
import * as bcrypt from 'bcryptjs';

export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);

    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (!existingAdmin) {
      // Create default admin user
      const adminUser = userRepository.create({
        email: 'admin@example.com',
        firstName: 'System',
        lastName: 'Administrator',
        password: await bcrypt.hash('admin123', 12),
        role: UserRole.ADMIN,
        isActive: true,
      });

      await userRepository.save(adminUser);
      console.log('✅ Default admin user created');
    }

    // Create sample regular user
    const existingUser = await userRepository.findOne({
      where: { email: 'user@example.com' },
    });

    if (!existingUser) {
      const regularUser = userRepository.create({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: await bcrypt.hash('user123', 12),
        role: UserRole.USER,
        isActive: true,
      });

      await userRepository.save(regularUser);
      console.log('✅ Default regular user created');
    }

    // Create sample editor user
    const existingEditor = await userRepository.findOne({
      where: { email: 'editor@example.com' },
    });

    if (!existingEditor) {
      const editorUser = userRepository.create({
        email: 'editor@example.com',
        firstName: 'Jane',
        lastName: 'Editor',
        password: await bcrypt.hash('editor123', 12),
        role: UserRole.EDITOR,
        isActive: true,
      });

      await userRepository.save(editorUser);
      console.log('✅ Default editor user created');
    }

    // Create sample viewer user
    const existingViewer = await userRepository.findOne({
      where: { email: 'viewer@example.com' },
    });

    if (!existingViewer) {
      const viewerUser = userRepository.create({
        email: 'viewer@example.com',
        firstName: 'Bob',
        lastName: 'Viewer',
        password: await bcrypt.hash('viewer123', 12),
        role: UserRole.VIEWER,
        isActive: true,
      });

      await userRepository.save(viewerUser);
      console.log('✅ Default viewer user created');
    }
  }
}

// Main execution
async function main() {
  // Create DataSource with PostgreSQL configuration
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'nestjs_assignment',
    entities: [User, Document, IngestionJob],
    synchronize: true,
    logging: true,
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const seeder = new DatabaseSeeder(dataSource);
    console.log('🌱 Starting database seeding...');
    await seeder.seed();
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  });
}
