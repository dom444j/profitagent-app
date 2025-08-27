const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Copiar archivos necesarios al contenedor
console.log('📦 Copying migration files to container...');

// Crear directorio temporal en el contenedor
execSync('docker exec grow5x_pg mkdir -p /tmp/migrations', { stdio: 'inherit' });

// Copiar schema.prisma
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Modificar la DATABASE_URL en el schema para usar conexión local del contenedor
const modifiedSchema = schemaContent.replace(
  /DATABASE_URL\s*=\s*"[^"]*"/,
  'DATABASE_URL="postgresql://grow5x@localhost:5432/grow5x?schema=public"'
);

fs.writeFileSync('/tmp/schema-container.prisma', modifiedSchema);
execSync('docker cp /tmp/schema-container.prisma grow5x_pg:/tmp/schema.prisma', { stdio: 'inherit' });

// Copiar directorio de migraciones
const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
if (fs.existsSync(migrationsDir)) {
  execSync('docker cp prisma/migrations grow5x_pg:/tmp/', { stdio: 'inherit' });
}

// Instalar Prisma CLI en el contenedor y ejecutar migraciones
console.log('🔧 Installing Prisma CLI in container...');
execSync('docker exec grow5x_pg sh -c "apt-get update && apt-get install -y curl && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"', { stdio: 'inherit' });

console.log('📦 Installing Prisma...');
execSync('docker exec grow5x_pg sh -c "cd /tmp && npm init -y && npm install prisma@latest"', { stdio: 'inherit' });

console.log('🚀 Running migrations...');
execSync('docker exec grow5x_pg sh -c "cd /tmp && npx prisma migrate deploy --schema=schema.prisma"', { stdio: 'inherit' });

console.log('✅ Migrations completed successfully!');

// Limpiar archivos temporales
fs.unlinkSync('/tmp/schema-container.prisma');