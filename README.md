# Grow5x - Plataforma de Licencias de Herramientas Tecnológicas

## ✅ Estado del Proyecto

**🟢 FASE 1 COMPLETADA** - Backend API totalmente funcional
- ✅ Estructura del proyecto creada
- ✅ Docker Compose configurado (PostgreSQL + Redis)
- ✅ Backend Node.js/TypeScript inicializado
- ✅ Prisma ORM con schema completo
- ✅ API Endpoints F1 implementados
- ✅ Jobs Redis configurados
- ✅ Errores TypeScript resueltos
- ✅ Servidor ejecutándose en puerto 5000
- ✅ **Sistema de referidos completado** - Comisiones automáticas del 10%
- ✅ **Frontend React funcional** - Páginas de usuario y admin operativas
- ✅ **Integración Telegram** - Vincular/desvincular cuentas con modal interactivo
- ✅ **Notificaciones automáticas** - Confirmación personalizada por Telegram + notificación web en tiempo real

**🟡 Pendiente**: Iniciar Docker Desktop para conectar base de datos

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker Desktop
- Git

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start Database Services
```bash
# From project root
docker compose up -d
```

### 3. Setup Database
```bash
cd backend
npm run prisma:deploy
```
> Nota: El seeding con Prisma está en revisión. Las cuentas de prueba ya están disponibles; ver docs/user-credentials.md.

### 4. Start Development Server
```bash
# Terminal 1 - API Server
npm run dev

# Terminal 2 - Background Jobs
npm run worker
```

## 📋 Cuentas por Defecto (Testing)

### Cuenta Admin
- **Email**: admin@grow5x.app
- **Password**: Admin123!
- **Rol**: admin

### Cuenta de Usuario (referida por Admin)
- **Email**: user@grow5x.app
- **Password**: User123!
- **Rol**: user
- **Sponsor**: ref_code del Admin (REF84I1MR)

> Más detalles en docs/user-credentials.md

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication
│   │   ├── products/      # License products
│   │   ├── orders/        # Order management
│   │   └── admin/         # Admin panel
│   ├── jobs/              # Background jobs
│   ├── lib/               # Utilities & middleware
│   ├── server.ts          # Express server
│   └── worker.ts          # Job processor
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Initial data
└── package.json
```

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/admin/login` - Admin login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Telegram Integration
- `POST /api/v1/user/telegram/link` - Link Telegram account
- `POST /api/v1/user/telegram/unlink` - Unlink Telegram account

#### 🔔 Notificaciones Automáticas de Telegram

**Funcionalidad**: Sistema automático que notifica al usuario cuando vincula exitosamente su cuenta de Telegram.

**Características**:
- ✅ **Mensaje directo por Telegram**: Confirmación personalizada enviada automáticamente
- ✅ **Notificación web en tiempo real**: Usando SSE (Server-Sent Events)
- ✅ **Contenido personalizado**: Incluye nombre del usuario y beneficios activados
- ✅ **Manejo de errores**: Logs detallados sin afectar el proceso principal

**Beneficios activados tras la vinculación**:
- 🔐 Códigos OTP para retiros seguros
- 🚨 Alertas automáticas de transacciones
- 📱 Notificaciones de sistema en tiempo real

## 🌐 Frontend Routes

### Authentication
- `/login` - User login page
- `/admin/login` - Admin login page
- `/register` - User registration page

### User Dashboard
- `/user/dashboard` - User main dashboard
- `/user/buy` - Purchase licenses
- `/user/licenses` - View user licenses
- `/user/referrals` - View referrals and commissions

### Admin Panel
- `/admin/` - Admin dashboard
- `/admin/orders` - Manage orders
- `/admin/users` - Manage users
- `/admin/licenses` - Manage licenses
- `/admin/referrals` - Manage referral commissions

### Products
- `GET /api/v1/products` - List available products

### Orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/:id/submit-tx` - Submit transaction

### Admin
- `GET /api/v1/admin/orders/pending` - Pending orders
- `POST /api/v1/admin/orders/:id/confirm` - Confirm order
- `POST /api/v1/admin/orders/:id/reject` - Reject order
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/stats` - Platform statistics

### Referrals
- `GET /api/v1/referrals` - Get user referrals
- `GET /api/v1/referrals/commissions` - Get user commissions
- `GET /api/v1/admin/referrals` - Get all referral commissions (admin)
- `POST /api/v1/admin/referrals/:id/release` - Release commission (admin)
- `POST /api/v1/admin/referrals/:id/cancel` - Cancel commission (admin)

## 💰 License Products

| Product | Price | Daily Earning | Total Return | Duration |
|---------|-------|---------------|--------------|----------|
| Starter | $100 | $10 | $200 | 20 days |
| Professional | $500 | $50 | $1,000 | 20 days |
| Enterprise | $1,000 | $100 | $2,000 | 20 days |

## 🔄 F1 Flow Testing

1. **Register User**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **View Products**: `GET /api/v1/products`
4. **Create Order**: `POST /api/v1/orders`
5. **Submit Transaction**: `POST /api/v1/orders/:id/submit-tx`
6. **Admin Confirm**: `POST /api/v1/admin/orders/:id/confirm`
7. **License Activated**: User receives active license

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start API server
npm run worker           # Start job processor

# Database
npm run prisma:deploy    # Apply migrations + generate client
npm run prisma:studio    # Database GUI
# npm run prisma:seed    # Temporalmente deshabilitado (realineación Prisma)

# Production
npm run build            # Build TypeScript
npm start                # Start production server
npm run start:worker     # Start production worker
```

## 🐳 Docker Services

- **PostgreSQL**: `localhost:55432`
- **Redis**: `localhost:6379`
- **System Wallet**: `TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE`

## 📊 Background Jobs

- **Order Expirer**: Expires pending orders after 30 minutes
- **Daily Earnings**: Processes daily earnings for active licenses (10% referral commission)

## 🔧 Environment Variables

Create `.env` file in `backend/` directory:

```env
DATABASE_URL="postgresql://grow5x:password123@localhost:55432/grow5x?schema=public"
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
COOKIE_SECRET=your-super-secret-cookie-key-here
REDIS_URL=redis://localhost:6379/0
TZ=UTC
```

## 🚨 Troubleshooting

### Docker Issues
```bash
# Restart Docker Desktop
# Then try again:
docker compose down
docker compose up -d
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker compose up -d
npm run prisma:deploy
```

### Port Conflicts
- API Server: Change `PORT` in `.env`
- PostgreSQL: Change port in `docker-compose.yml`
- Redis: Change port in `docker-compose.yml`

---

## 📈 Avances Completados

### ✅ Infraestructura Base
- [x] Estructura de directorios (backend/, docs/, infrastructure/)
- [x] Docker Compose para PostgreSQL 15 + Redis 7
- [x] Proyecto Node.js/TypeScript con todas las dependencias
- [x] Prisma ORM con 15+ modelos de base de datos

### ✅ API Endpoints F1
- [x] Módulo Auth: registro, login, logout con JWT
- [x] Módulo Products: catálogo de licencias
- [x] Módulo Orders: crear orden, subir comprobante
- [x] Módulo Admin: confirmar/rechazar órdenes, gestión usuarios
- [x] Middleware de autenticación y validación de roles
- [x] Schemas Zod para validación de datos

### ✅ Jobs y Workers
- [x] Job orderExpirer: expira órdenes pendientes
- [x] Job dailyEarnings: procesa ganancias y comisiones
- [x] BullMQ configurado para colas Redis
- [x] Worker para procesamiento en background

### ✅ Calidad de Código
- [x] Compilación TypeScript sin errores
- [x] Mapeo correcto entre código y schema Prisma
- [x] Manejo de errores y validaciones consistentes
- [x] Configuración de rutas Express correcta

### ✅ Sistema de Referidos (25/01/2025)
- [x] Comisiones automáticas del 10% al confirmar órdenes
- [x] Balance de usuario incluye comisiones pendientes
- [x] Endpoints API completos (/referrals, /admin/referrals)
- [x] UserReferralsPage - tabla de referidos y comisiones
- [x] AdminReferralsPage - gestión de comisiones pendientes
- [x] Navegación integrada en sidebars usuario y admin
- [x] Middleware de autenticación corregido

### ✅ Frontend React (25/01/2025)
- [x] Páginas de usuario completamente funcionales
- [x] Panel de administración operativo
- [x] Componentes UI modernos con Tailwind CSS
- [x] Integración completa con API backend
- [x] Rutas y navegación configuradas
- [x] Sistema de autenticación frontend-backend

**Status**: ✅ F1 Backend Implementation Complete  
**Servidor**: 🟢 Ejecutándose en http://localhost:5000  
**Next**: Iniciar Docker Desktop → Conectar DB → Probar flujo F1