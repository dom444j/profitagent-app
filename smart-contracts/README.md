# ProFitAgent Smart Contracts

🚀 **Contratos inteligentes para el ecosistema ProFitAgent en Binance Smart Chain (BSC)**

Sistema de gestión de licencias y agentes externos para trading automatizado con pagos en USDT BEP20.

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura](#-arquitectura)
- [Contratos](#-contratos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Verificación](#-verificación)
- [Seguridad](#-seguridad)
- [Licencias Disponibles](#-licencias-disponibles)
- [Agentes Externos](#-agentes-externos)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)

## 🎯 Descripción General

ProFitAgent es un ecosistema DeFi que permite a los usuarios adquirir licencias para acceder a agentes de trading automatizado especializados. El sistema garantiza un retorno del **8% diario durante 25 días** a través de estrategias diversificadas de arbitraje, surebet, grid trading, DeFi yield farming y más.

### Características Principales

- ✅ **Pagos exclusivos en USDT BEP20**
- ✅ **5 niveles de licencia** ($500 - $10,000)
- ✅ **7 tipos de agentes especializados**
- ✅ **Retorno garantizado del 8% diario**
- ✅ **Gestión automática de capital**
- ✅ **Sistema de fees transparente**
- ✅ **Contratos auditables y seguros**

## 🏗️ Arquitectura

```
ProFitAgent Smart Contracts
├── ProFitAgentLicense.sol     # Gestión de licencias y pagos
├── ProFitAgentManager.sol     # Gestión de agentes y asignaciones
└── Interfaces/
    ├── IProFitAgentLicense.sol
    └── IProFitAgentManager.sol
```

### Flujo de Funcionamiento

1. **Compra de Licencia** → Usuario paga en USDT BEP20
2. **Asignación de Agentes** → Capital se distribuye automáticamente
3. **Generación de Earnings** → Agentes reportan rendimientos diarios
4. **Distribución de Ganancias** → Usuarios reclaman sus earnings
5. **Gestión de Riesgo** → Monitoreo y rebalanceo automático

## 📄 Contratos

### ProFitAgentLicense.sol

**Contrato principal para gestión de licencias y pagos**

- Gestión de 5 tipos de licencia
- Procesamiento de pagos en USDT BEP20
- Distribución automática de fees
- Sistema de earnings diarios
- Funciones de emergencia y pausado

### ProFitAgentManager.sol

**Contrato para gestión de agentes externos**

- Registro y configuración de agentes
- Asignación automática de capital
- Monitoreo de rendimiento
- Rebalanceo de portfolios
- Reportes de performance

## 🛠️ Instalación

### Prerrequisitos

- Node.js >= 16.0.0
- npm o yarn
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/profitagent/profitagent-platform.git
cd smart-contracts

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
```

## ⚙️ Configuración

### Variables de Entorno

Edita el archivo `.env` con tus configuraciones:

```bash
# Private key del deployer (SIN 0x)
PRIVATE_KEY=your_private_key_here

# RPC endpoints
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# API Keys
BSCSCAN_API_KEY=your_bscscan_api_key

# System Wallets
TREASURY_WALLET=0x...
OPERATIONS_WALLET=0x...
EMERGENCY_WALLET=0x...
```

### Direcciones de Tokens

```javascript
// USDT en BSC Mainnet
const USDT_MAINNET = "0x55d398326f99059fF775485246999027B3197955";

// USDT en BSC Testnet
const USDT_TESTNET = "0x7ef95a0FEE0Dd31b22626fF2be2D586aA8D0756f";
```

## 🚀 Deployment

### Testnet (Recomendado para pruebas)

```bash
# Compilar contratos
npm run compile

# Desplegar en BSC Testnet
npm run deploy:testnet

# Verificar contratos
npm run verify:testnet
```

### Mainnet (Producción)

```bash
# ⚠️ IMPORTANTE: Verificar todas las configuraciones

# Desplegar en BSC Mainnet
npm run deploy:mainnet

# Verificar contratos
npm run verify:mainnet
```

### Deployment Local

```bash
# Iniciar nodo local
npm run node

# En otra terminal, desplegar
npm run deploy:localhost
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Reporte de gas
npm run gas-report
```

### Estructura de Tests

```
test/
├── ProFitAgentLicense.test.js
├── ProFitAgentManager.test.js
├── integration/
│   ├── full-flow.test.js
│   └── agent-allocation.test.js
└── utils/
    └── helpers.js
```

## ✅ Verificación

Después del deployment, verificar en BSCScan:

```bash
# Verificar automáticamente
npm run verify:testnet  # o verify:mainnet

# Verificar manualmente
npx hardhat verify --network bscTestnet CONTRACT_ADDRESS "CONSTRUCTOR_ARG1" "CONSTRUCTOR_ARG2"
```

## 🔒 Seguridad

### Características de Seguridad

- ✅ **ReentrancyGuard** - Protección contra ataques de reentrancia
- ✅ **Ownable** - Control de acceso administrativo
- ✅ **Pausable** - Capacidad de pausar en emergencias
- ✅ **SafeMath** - Protección contra overflow/underflow
- ✅ **Authorized Agents** - Solo agentes autorizados pueden operar

### Auditorías

- [ ] Auditoría interna completada
- [ ] Auditoría externa pendiente
- [ ] Bug bounty program

### Mejores Prácticas

1. **Nunca** commitear private keys al repositorio
2. Usar **hardware wallets** para mainnet
3. **Probar exhaustivamente** en testnet primero
4. Mantener **backups seguros** de configuraciones
5. **Monitorear** contratos después del deployment

## 💎 Licencias Disponibles

| Licencia | Precio | Duración | Agentes Incluidos | ROI Diario |
|----------|--------|----------|-------------------|------------|
| **Básica** | $500 | 25 días | 1 agente compartido | 8% |
| **Estándar** | $1,000 | 25 días | 2 agentes compartidos | 8% |
| **Premium** | $2,500 | 25 días | 3 agentes personalizados | 8% |
| **Elite** | $5,000 | 25 días | 5 agentes completos | 8% |
| **Enterprise** | $10,000 | 25 días | 7 agentes + desarrollo custom | 8% |

### Cálculo de Retornos

```javascript
// Ejemplo: Licencia Elite ($5,000)
const principal = 5000; // USD
const dailyROI = 0.08; // 8%
const duration = 25; // días

const dailyEarnings = principal * dailyROI; // $400/día
const totalEarnings = dailyEarnings * duration; // $10,000
const totalReturn = principal + totalEarnings; // $15,000
const netProfit = totalEarnings; // $10,000 (100% ganancia)
```

## 🤖 Agentes Externos

### Tipos de Agentes

1. **Arbitraje Cripto** - Aprovecha diferencias de precios entre exchanges
2. **Surebet** - Apuestas deportivas con ganancia garantizada
3. **Grid Trading** - Trading sistemático en rangos de precios
4. **DeFi Yield Farming** - Optimización de rendimientos en protocolos DeFi
5. **Scalping** - Trading de alta frecuencia
6. **Market Making** - Provisión de liquidez
7. **Cross-Chain Arbitrage** - Arbitraje entre diferentes blockchains

### Asignación por Licencia

```javascript
// Licencia Enterprise - Distribución optimizada
const allocation = {
  cryptoArbitrage: 20%, // $2,000
  surebet: 15%,         // $1,500
  gridTrading: 15%,     // $1,500
  defiYield: 15%,       // $1,500
  scalping: 15%,        // $1,500
  marketMaking: 20%     // $2,000
};
```

## 📚 API Reference

### ProFitAgentLicense

#### Funciones Principales

```solidity
// Comprar licencia
function purchaseLicense(uint256 _licenseTypeId) external

// Reclamar earnings
function claimEarnings() external

// Obtener earnings no reclamados
function getUnclaimedEarnings(address _user) external view returns (uint256)

// Información de licencia
function getUserLicenseInfo(address _user) external view returns (...)
```

#### Eventos

```solidity
event LicensePurchased(address indexed user, uint256 licenseTypeId, uint256 amount);
event EarningsGenerated(address indexed user, uint256 amount, uint256 agentId);
event EarningsClaimed(address indexed user, uint256 amount);
```

### ProFitAgentManager

#### Funciones Principales

```solidity
// Asignar capital a agentes
function allocateCapitalToAgents(address _user, uint256 _licenseTypeId, uint256 _totalCapital) external

// Registrar rendimiento de agente
function recordAgentPerformance(uint256 _agentId, uint256 _earningsGenerated, uint256 _operationsCount) external

// Obtener agentes de usuario
function getUserAgents(address _user) external view returns (uint256[] memory)
```

## 🔧 Troubleshooting

### Errores Comunes

#### Error: "Insufficient allowance"
```javascript
// Solución: Aprobar USDT antes de comprar licencia
const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
const licensePrice = ethers.utils.parseUnits("500", 18);
await usdtContract.approve(LICENSE_CONTRACT_ADDRESS, licensePrice);
```

#### Error: "License type not active"
```javascript
// Verificar que el tipo de licencia esté activo
const licenseType = await licenseContract.licenseTypes(licenseTypeId);
console.log("Is Active:", licenseType.isActive);
```

#### Error: "Not authorized agent"
```javascript
// Verificar autorización del agente
const isAuthorized = await licenseContract.authorizedAgents(agentAddress);
console.log("Agent Authorized:", isAuthorized);
```

### Logs de Debug

```bash
# Habilitar logs detallados
export DEBUG=hardhat:*
npm run deploy:testnet
```

### Verificación de Estado

```javascript
// Script para verificar estado del sistema
const stats = await licenseContract.getContractStats();
console.log("Total Users:", stats.totalUsers.toString());
console.log("Total Volume:", ethers.utils.formatUnits(stats.totalVolume, 18));
console.log("Contract Balance:", ethers.utils.formatUnits(stats.contractBalance, 18));
```

## 📞 Soporte

- **Email**: dev@profitagent.app
- **Telegram**: @ProFitAgentSupport
- **Discord**: [ProFitAgent Community](https://discord.gg/profitagent)
- **GitHub Issues**: [Reportar Bug](https://github.com/profitagent/profitagent-platform/issues)

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

**⚠️ Disclaimer**: Este software se proporciona "tal como está". Los desarrolladores no se hacen responsables de pérdidas financieras. Realizar auditorías de seguridad antes de usar en producción.

**🔐 Seguridad**: Reportar vulnerabilidades de seguridad a security@profitagent.app

---

*Construido con ❤️ por el equipo ProFitAgent*