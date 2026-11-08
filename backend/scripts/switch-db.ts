import * as fs from 'fs';
import * as path from 'path';

const target = process.argv[2]; // 'sqlite' | 'postgres'

if (!target || (target !== 'sqlite' && target !== 'postgres')) {
  console.log('Использование: tsx scripts/switch-db.ts [sqlite|postgres]');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const schemaTarget = path.join(prismaDir, 'schema.prisma');
const envFile = path.join(rootDir, '.env');

if (target === 'sqlite') {
  const sqliteSchema = fs.readFileSync(path.join(prismaDir, 'schema.sqlite.prisma'), 'utf-8');
  fs.writeFileSync(schemaTarget, sqliteSchema);
  
  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL="file:./dev.db"');
  } else {
    envContent += '\nDATABASE_URL="file:./dev.db"';
  }
  if (!envContent.includes('JWT_SECRET=')) {
    envContent += '\nJWT_SECRET="della_kazakhstan_super_secret_jwt_key_2026"';
  }
  if (!envContent.includes('PORT=')) {
    envContent += '\nPORT=5000';
  }
  fs.writeFileSync(envFile, envContent);
  console.log('✅ База данных переключена на SQLite (file:./dev.db)');
} else {
  let schemaContent = fs.readFileSync(schemaTarget, 'utf-8');
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaTarget, schemaContent);

  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/della_db?schema=public"'
    );
  } else {
    envContent += '\nDATABASE_URL="postgresql://postgres:postgres@localhost:5432/della_db?schema=public"';
  }
  fs.writeFileSync(envFile, envContent);
  console.log('✅ База данных переключена на PostgreSQL (postgresql://postgres:postgres@localhost:5432/della_db?schema=public)');
}

