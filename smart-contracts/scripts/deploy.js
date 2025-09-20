const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Direcciones de tokens en BSC
const USDT_BSC_MAINNET = "0x55d398326f99059fF775485246999027B3197955";
const USDT_BSC_TESTNET = "0x7ef95a0FEE0Dd31b22626fF2be2D586aA8D0756f";

// Configuración de wallets del sistema
const SYSTEM_WALLETS = {
  mainnet: {
    treasury: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Actualizar con wallet real
    operations: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Actualizar con wallet real
    emergency: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Actualizar con wallet real
  },
  testnet: {
    treasury: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Wallet de prueba
    operations: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Wallet de prueba
    emergency: "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e", // Wallet de prueba
  }
};

async function main() {
  console.log("🚀 Iniciando deployment de contratos ProFitAgent...");
  
  // Obtener información de la red
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log(`📡 Red: ${network.name} (Chain ID: ${chainId})`);
  
  // Determinar configuración según la red
  let usdtAddress;
  let wallets;
  
  if (chainId === 56) {
    // BSC Mainnet
    usdtAddress = USDT_BSC_MAINNET;
    wallets = SYSTEM_WALLETS.mainnet;
    console.log("🌐 Desplegando en BSC Mainnet");
  } else if (chainId === 97) {
    // BSC Testnet
    usdtAddress = USDT_BSC_TESTNET;
    wallets = SYSTEM_WALLETS.testnet;
    console.log("🧪 Desplegando en BSC Testnet");
  } else {
    // Red local o desconocida
    console.log("⚠️  Red local detectada, usando direcciones de prueba");
    usdtAddress = "0x0000000000000000000000000000000000000001"; // Placeholder
    wallets = SYSTEM_WALLETS.testnet;
  }
  
  // Obtener el deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Verificar balance del deployer
  const balance = await deployer.getBalance();
  console.log(`💰 Balance del deployer: ${ethers.utils.formatEther(balance)} BNB`);
  
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.warn("⚠️  Balance bajo del deployer. Asegúrate de tener suficiente BNB para gas.");
  }
  
  console.log("\n📋 Configuración de deployment:");
  console.log(`   USDT Token: ${usdtAddress}`);
  console.log(`   Treasury Wallet: ${wallets.treasury}`);
  console.log(`   Operations Wallet: ${wallets.operations}`);
  console.log(`   Emergency Wallet: ${wallets.emergency}`);
  
  // 1. Desplegar ProFitAgentLicense
  console.log("\n🔨 Desplegando ProFitAgentLicense...");
  const ProFitAgentLicense = await ethers.getContractFactory("ProFitAgentLicense");
  
  const licenseContract = await ProFitAgentLicense.deploy(
    usdtAddress,
    wallets.treasury,
    wallets.operations,
    wallets.emergency
  );
  
  await licenseContract.deployed();
  console.log(`✅ ProFitAgentLicense desplegado en: ${licenseContract.address}`);
  
  // 2. Desplegar ProFitAgentManager
  console.log("\n🔨 Desplegando ProFitAgentManager...");
  const ProFitAgentManager = await ethers.getContractFactory("ProFitAgentManager");
  
  const managerContract = await ProFitAgentManager.deploy(
    licenseContract.address,
    usdtAddress
  );
  
  await managerContract.deployed();
  console.log(`✅ ProFitAgentManager desplegado en: ${managerContract.address}`);
  
  // 3. Configurar autorización del manager en el contrato de licencias
  console.log("\n⚙️  Configurando autorizaciones...");
  
  const authTx = await licenseContract.setAgentAuthorization(managerContract.address, true);
  await authTx.wait();
  console.log(`✅ Manager autorizado en el contrato de licencias`);
  
  // 4. Verificar deployment
  console.log("\n🔍 Verificando deployment...");
  
  try {
    // Verificar que los contratos están correctamente configurados
    const totalLicenseTypes = await licenseContract.totalLicenseTypes();
    console.log(`📊 Tipos de licencia creados: ${totalLicenseTypes}`);
    
    const managerStats = await managerContract.getManagerStats();
    console.log(`🤖 Agentes registrados: ${managerStats.totalAgentsCount}`);
    
    // Verificar autorización
    const isAuthorized = await licenseContract.authorizedAgents(managerContract.address);
    console.log(`🔐 Manager autorizado: ${isAuthorized}`);
    
  } catch (error) {
    console.error("❌ Error en la verificación:", error.message);
  }
  
  // 5. Guardar información de deployment
  const deploymentInfo = {
    network: network.name,
    chainId: chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ProFitAgentLicense: {
        address: licenseContract.address,
        constructorArgs: [
          usdtAddress,
          wallets.treasury,
          wallets.operations,
          wallets.emergency
        ]
      },
      ProFitAgentManager: {
        address: managerContract.address,
        constructorArgs: [
          licenseContract.address,
          usdtAddress
        ]
      }
    },
    configuration: {
      usdtToken: usdtAddress,
      systemWallets: wallets
    }
  };
  
  // Crear directorio de deployments si no existe
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Guardar información de deployment
  const deploymentFile = path.join(deploymentsDir, `deployment-${network.name}-${chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n📄 Información de deployment guardada en: ${deploymentFile}`);
  
  // 6. Mostrar resumen final
  console.log("\n🎉 ¡Deployment completado exitosamente!");
  console.log("\n📋 RESUMEN DE CONTRATOS:");
  console.log(`   ProFitAgentLicense: ${licenseContract.address}`);
  console.log(`   ProFitAgentManager: ${managerContract.address}`);
  
  console.log("\n🔗 PRÓXIMOS PASOS:");
  console.log("   1. Verificar contratos en BSCScan (ejecutar script de verificación)");
  console.log("   2. Configurar direcciones de agentes reales");
  console.log("   3. Actualizar frontend con las direcciones de contratos");
  console.log("   4. Realizar pruebas de integración");
  console.log("   5. Configurar monitoreo y alertas");
  
  if (chainId === 56) {
    console.log("\n⚠️  IMPORTANTE: Estás en MAINNET. Asegúrate de:");
    console.log("   - Verificar todas las direcciones de wallets");
    console.log("   - Realizar pruebas exhaustivas en testnet primero");
    console.log("   - Tener un plan de respuesta a emergencias");
  }
  
  return {
    licenseContract: licenseContract.address,
    managerContract: managerContract.address,
    deploymentInfo
  };
}

// Ejecutar deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error en el deployment:", error);
      process.exit(1);
    });
}

module.exports = main;