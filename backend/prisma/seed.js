"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt_1 = require("bcrypt");
var library_1 = require("@prisma/client/runtime/library");
// Configurar Prisma con URL del .env
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var admin, _a, _b, testUser, _c, _d, testUser2, _e, _f, walletAddresses, i, address, licenseProducts, _i, licenseProducts_1, licenseData, existingProduct, basicProduct;
        var _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    _b = (_a = prisma.user).upsert;
                    _g = {
                        where: { email: 'admin@profitagent.app' }
                    };
                    _h = {};
                    return [4 /*yield*/, bcrypt_1.default.hash('Admin123!', 10)];
                case 1:
                    _g.update = (_h.password_hash = _r.sent(),
                        _h.first_name = 'Admin',
                        _h.last_name = 'System',
                        _h.status = 'active',
                        _h.role = 'admin',
                        _h.ref_code = 'REF84I1MR',
                        _h);
                    _j = {
                        email: 'admin@profitagent.app'
                    };
                    return [4 /*yield*/, bcrypt_1.default.hash('Admin123!', 10)];
                case 2: return [4 /*yield*/, _b.apply(_a, [(_g.create = (_j.password_hash = _r.sent(),
                            _j.first_name = 'Admin',
                            _j.last_name = 'System',
                            _j.status = 'active',
                            _j.role = 'admin',
                            _j.ref_code = 'REF84I1MR',
                            _j),
                            _g)])];
                case 3:
                    admin = _r.sent();
                    _d = (_c = prisma.user).upsert;
                    _k = {
                        where: { email: 'user@profitagent.app' }
                    };
                    _l = {};
                    return [4 /*yield*/, bcrypt_1.default.hash('User123!', 10)];
                case 4:
                    _k.update = (_l.password_hash = _r.sent(),
                        _l.first_name = 'User',
                        _l.last_name = 'Test',
                        _l.status = 'active',
                        _l.role = 'user',
                        _l.ref_code = 'REFCYU89I',
                        _l.sponsor_id = admin.id,
                        _l.balance = new library_1.Decimal('1000.00'),
                        _l);
                    _m = {
                        email: 'user@profitagent.app'
                    };
                    return [4 /*yield*/, bcrypt_1.default.hash('User123!', 10)];
                case 5: return [4 /*yield*/, _d.apply(_c, [(_k.create = (_m.password_hash = _r.sent(),
                            _m.first_name = 'User',
                            _m.last_name = 'Test',
                            _m.status = 'active',
                            _m.role = 'user',
                            _m.ref_code = 'REFCYU89I',
                            _m.sponsor_id = admin.id,
                            _m.balance = new library_1.Decimal('1000.00'),
                            _m),
                            _k)])];
                case 6:
                    testUser = _r.sent();
                    _f = (_e = prisma.user).upsert;
                    _o = {
                        where: { email: 'user2@profitagent.app' }
                    };
                    _p = {};
                    return [4 /*yield*/, bcrypt_1.default.hash('User123!', 10)];
                case 7:
                    _o.update = (_p.password_hash = _r.sent(),
                        _p.first_name = 'Maria',
                        _p.last_name = 'Garcia',
                        _p.status = 'active',
                        _p.role = 'user',
                        _p.ref_code = 'REFMG2024',
                        _p.sponsor_id = admin.id,
                        _p.balance = new library_1.Decimal('750.00'),
                        _p);
                    _q = {
                        email: 'user2@profitagent.app'
                    };
                    return [4 /*yield*/, bcrypt_1.default.hash('User123!', 10)];
                case 8: return [4 /*yield*/, _f.apply(_e, [(_o.create = (_q.password_hash = _r.sent(),
                            _q.first_name = 'Maria',
                            _q.last_name = 'Garcia',
                            _q.status = 'active',
                            _q.role = 'user',
                            _q.ref_code = 'REFMG2024',
                            _q.sponsor_id = admin.id,
                            _q.balance = new library_1.Decimal('750.00'),
                            _q),
                            _o)])];
                case 9:
                    testUser2 = _r.sent();
                    walletAddresses = [
                        '0xcFBFc3fBA18799641f3A83Ed7D5C5b346bAf1B18',
                        '0x2A9928e07Db86bfAD524BC510c42a80Fa476EeF8',
                        '0x9e88170F7E7dd94a903d5A4271bE7Db6D2fDF367',
                        '0x7f60A86eb28B899C2d1Ab6f6CE02236633618ed3',
                        '0x9dEd7A01d9994F6e294F898ACDD4Aa3fEc60A950',
                        '0x50f5faA58906301FaBad2458DcFbE6472BE30522',
                        '0xfe04a160A6327e00C9004ca8c84f8C45Ec1056f5',
                        '0x6F0f8963fA1F39a687f3B907e9B206F511095345',
                        '0xBb9dCC2dF24C2F7e9C5dB87A9293642DD35816bd',
                        '0xf5414D523610B6D2EB271F10790b70d3DA4Bb1d3',
                        '0xd969B45931000ccD2F6cf3fEe94a377E6d0Ef415',
                        '0x07AaCEc2Aa7B9977182b1Aa44A8EC3aC3645E877',
                        '0xaD133c5122AE545AcD51d7C3d5C58BcaC8f34EdB',
                        '0x39C64B6d0Bb4EA2D2085df6B081231B5733Ebf79'
                    ];
                    i = 0;
                    _r.label = 10;
                case 10:
                    if (!(i < walletAddresses.length)) return [3 /*break*/, 13];
                    address = walletAddresses[i];
                    if (!address)
                        return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.adminWallet.upsert({
                            where: { address: address },
                            update: {
                                label: "Wallet ".concat(i + 1),
                                status: 'active'
                            },
                            create: {
                                label: "Wallet ".concat(i + 1),
                                address: address,
                                status: 'active'
                            }
                        })];
                case 11:
                    _r.sent();
                    _r.label = 12;
                case 12:
                    i++;
                    return [3 /*break*/, 10];
                case 13:
                    licenseProducts = [
                        {
                            name: "🟢 ProFitAgent Básica",
                            code: "PFA_BASIC",
                            price_usdt: new library_1.Decimal('500'),
                            daily_rate: new library_1.Decimal('0.08'),
                            duration_days: 25,
                            max_cap_percentage: new library_1.Decimal('200.00'),
                            cashback_cap: new library_1.Decimal('1.00'),
                            potential_cap: new library_1.Decimal('1.00'),
                            description: "Usuarios nuevos que buscan comenzar con trading automatizado. Acceso a agentes básicos de arbitraje.",
                            sla_hours: 24,
                            badge: null,
                            target_user: "Usuarios nuevos que buscan comenzar con trading automatizado",
                            active: true
                        },
                        {
                            name: "🔵 ProFitAgent Estándar",
                            code: "PFA_STANDARD",
                            price_usdt: new library_1.Decimal('1000'),
                            daily_rate: new library_1.Decimal('0.08'),
                            duration_days: 25,
                            max_cap_percentage: new library_1.Decimal('200.00'),
                            cashback_cap: new library_1.Decimal('1.00'),
                            potential_cap: new library_1.Decimal('1.00'),
                            description: "Traders con experiencia intermedia. Agentes de arbitraje + Grid Trading. Email support.",
                            sla_hours: 12,
                            badge: null,
                            target_user: "Traders con experiencia intermedia",
                            active: true
                        },
                        {
                            name: "🟡 ProFitAgent Premium",
                            code: "PFA_PREMIUM",
                            price_usdt: new library_1.Decimal('2500'),
                            daily_rate: new library_1.Decimal('0.08'),
                            duration_days: 25,
                            max_cap_percentage: new library_1.Decimal('200.00'),
                            cashback_cap: new library_1.Decimal('1.00'),
                            potential_cap: new library_1.Decimal('1.00'),
                            description: "Traders profesionales y empresas pequeñas. Todos los agentes + DCA avanzado. Chat en vivo + análisis de mercado.",
                            sla_hours: 6,
                            badge: "POPULAR",
                            target_user: "Traders profesionales y empresas pequeñas",
                            active: true
                        },
                        {
                            name: "🟠 ProFitAgent Elite",
                            code: "PFA_ELITE",
                            price_usdt: new library_1.Decimal('5000'),
                            daily_rate: new library_1.Decimal('0.08'),
                            duration_days: 25,
                            max_cap_percentage: new library_1.Decimal('200.00'),
                            cashback_cap: new library_1.Decimal('1.00'),
                            potential_cap: new library_1.Decimal('1.00'),
                            description: "Inversores institucionales y traders de alto volumen. Agentes exclusivos + Machine Learning. Soporte prioritario + gestor de cuenta.",
                            sla_hours: 3,
                            badge: "VIP",
                            target_user: "Inversores institucionales y traders de alto volumen",
                            active: true
                        },
                        {
                            name: "🔴 ProFitAgent Enterprise",
                            code: "PFA_ENTERPRISE",
                            price_usdt: new library_1.Decimal('10000'),
                            daily_rate: new library_1.Decimal('0.08'),
                            duration_days: 25,
                            max_cap_percentage: new library_1.Decimal('200.00'),
                            cashback_cap: new library_1.Decimal('1.00'),
                            potential_cap: new library_1.Decimal('1.00'),
                            description: "Empresas grandes e instituciones financieras. Personalización completa + agentes custom. Soporte 24/7 + integración personalizada.",
                            sla_hours: 1,
                            badge: "EXCLUSIVA",
                            target_user: "Empresas grandes e instituciones financieras",
                            active: true
                        }
                    ];
                    _i = 0, licenseProducts_1 = licenseProducts;
                    _r.label = 14;
                case 14:
                    if (!(_i < licenseProducts_1.length)) return [3 /*break*/, 18];
                    licenseData = licenseProducts_1[_i];
                    return [4 /*yield*/, prisma.licenseProduct.findFirst({
                            where: { name: licenseData.name }
                        })];
                case 15:
                    existingProduct = _r.sent();
                    if (!!existingProduct) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.licenseProduct.create({
                            data: licenseData
                        })];
                case 16:
                    _r.sent();
                    _r.label = 17;
                case 17:
                    _i++;
                    return [3 /*break*/, 14];
                case 18: return [4 /*yield*/, prisma.licenseProduct.findFirst({
                        where: { code: 'PFA_BASIC' }
                    })];
                case 19:
                    basicProduct = _r.sent();
                    if (!basicProduct) return [3 /*break*/, 21];
                    return [4 /*yield*/, prisma.userLicense.create({
                            data: {
                                user_id: testUser.id,
                                product_id: basicProduct.id,
                                order_id: 'ORDER_SEED_001',
                                principal_usdt: basicProduct.price_usdt,
                                total_earned_usdt: new library_1.Decimal('0'),
                                cashback_accum: new library_1.Decimal('0'),
                                potential_accum: new library_1.Decimal('0'),
                                status: 'active',
                                days_generated: 0,
                                start_date: new Date(),
                                end_date: new Date(Date.now() + (basicProduct.duration_days * 24 * 60 * 60 * 1000))
                            }
                        })];
                case 20:
                    _r.sent();
                    _r.label = 21;
                case 21:
                    console.log('✅ Usuarios creados:');
                    console.log('👑 Admin:', admin.email);
                    console.log('🧪 Usuario Normal:', testUser.email);
                    console.log('👩 Usuario 2:', testUser2.email);
                    console.log('\n💰 Wallets creadas: 14 wallets activas');
                    console.log('📦 Productos de licencia: 5 niveles (Básica, Estándar, Premium, Elite, Enterprise)');
                    console.log('🎯 Licencia activa: 1 licencia básica para', testUser.email);
                    console.log('\n🎉 Base de datos poblada exitosamente con 3 usuarios, 14 wallets, 5 productos de licencia y 1 licencia activa!');
                    return [2 /*return*/];
            }
        });
    });
}
main().finally(function () { return prisma.$disconnect(); });
