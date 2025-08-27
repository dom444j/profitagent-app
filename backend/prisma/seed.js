"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('Creating license products...');
    const products = await Promise.all([
        prisma.licenseProduct.upsert({
            where: { name: 'Starter License' },
            update: {},
            create: {
                name: 'Starter License',
                description: 'Perfect for beginners. Start earning daily returns with minimal investment.',
                price_usdt: new library_1.Decimal('100.00'),
                daily_earning_usdt: new library_1.Decimal('10.00'),
                total_earning_usdt: new library_1.Decimal('300.00'),
                duration_days: 30,
                status: 'active'
            }
        }),
        prisma.licenseProduct.upsert({
            where: { name: 'Professional License' },
            update: {},
            create: {
                name: 'Professional License',
                description: 'For serious investors. Higher returns with professional-grade features.',
                price_usdt: new library_1.Decimal('500.00'),
                daily_earning_usdt: new library_1.Decimal('50.00'),
                total_earning_usdt: new library_1.Decimal('1500.00'),
                duration_days: 30,
                status: 'active'
            }
        }),
        prisma.licenseProduct.upsert({
            where: { name: 'Enterprise License' },
            update: {},
            create: {
                name: 'Enterprise License',
                description: 'Maximum earning potential for enterprise-level investments.',
                price_usdt: new library_1.Decimal('1000.00'),
                daily_earning_usdt: new library_1.Decimal('100.00'),
                total_earning_usdt: new library_1.Decimal('3000.00'),
                duration_days: 30,
                status: 'active'
            }
        })
    ]);
    console.log(`✅ Created ${products.length} license products`);
    console.log('Creating system settings...');
    const settings = await Promise.all([
        prisma.setting.upsert({
            where: { key: 'system_wallet_address' },
            update: {},
            create: {
                key: 'system_wallet_address',
                value: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
                description: 'Main system wallet address for receiving deposits'
            }
        }),
        prisma.setting.upsert({
            where: { key: 'daily_earnings_paused' },
            update: {},
            create: {
                key: 'daily_earnings_paused',
                value: 'false',
                description: 'Global switch to pause/resume daily earnings distribution'
            }
        }),
        prisma.setting.upsert({
            where: { key: 'referral_commission_rate' },
            update: {},
            create: {
                key: 'referral_commission_rate',
                value: '0.10',
                description: 'Referral commission rate (10%)'
            }
        }),
        prisma.setting.upsert({
            where: { key: 'order_expiration_minutes' },
            update: {},
            create: {
                key: 'order_expiration_minutes',
                value: '30',
                description: 'Order expiration time in minutes'
            }
        }),
        prisma.setting.upsert({
            where: { key: 'minimum_withdrawal_usdt' },
            update: {},
            create: {
                key: 'minimum_withdrawal_usdt',
                value: '10.00',
                description: 'Minimum withdrawal amount in USDT'
            }
        })
    ]);
    console.log(`✅ Created ${settings.length} system settings`);
    console.log('Creating admin user...');
    const adminPassword = await bcrypt_1.default.hash('admin123!', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@grow5x.com' },
        update: {},
        create: {
            email: 'admin@grow5x.com',
            password_hash: adminPassword,
            first_name: 'System',
            last_name: 'Administrator',
            ref_code: 'ADMIN001',
            status: 'active'
        }
    });
    console.log(`✅ Created admin user: ${adminUser.email}`);
    console.log('Creating demo users...');
    const demoPassword = await bcrypt_1.default.hash('demo123!', 10);
    const demoUsers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'demo1@example.com' },
            update: {},
            create: {
                email: 'demo1@example.com',
                password_hash: demoPassword,
                first_name: 'Demo',
                last_name: 'User One',
                ref_code: 'DEMO001',
                status: 'active'
            }
        }),
        prisma.user.upsert({
            where: { email: 'demo2@example.com' },
            update: {},
            create: {
                email: 'demo2@example.com',
                password_hash: demoPassword,
                first_name: 'Demo',
                last_name: 'User Two',
                ref_code: 'DEMO002',
                sponsor_code: 'DEMO001',
                status: 'active'
            }
        })
    ]);
    console.log(`✅ Created ${demoUsers.length} demo users`);
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • ${products.length} License Products`);
    console.log(`   • ${settings.length} System Settings`);
    console.log(`   • 1 Admin User (admin@grow5x.com / admin123!)`);
    console.log(`   • ${demoUsers.length} Demo Users (demo1@example.com, demo2@example.com / demo123!)`);
    console.log('');
    console.log('🔗 System Wallet: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map