// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ProFitAgentLicense.sol";

/**
 * @title ProFitAgent Manager Contract
 * @dev Contrato para gestión de agentes externos y distribución automática de earnings
 * @author ProFitAgent Team
 */
contract ProFitAgentManager is ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    // Referencia al contrato de licencias
    ProFitAgentLicense public immutable licenseContract;
    IERC20 public immutable usdtToken;
    
    // Estructura de agente
    struct Agent {
        string name;
        string agentType;           // crypto_arbitrage, surebet, grid_trading, etc.
        address agentAddress;       // Dirección del agente
        uint256 minCapital;         // Capital mínimo requerido
        uint256 maxCapital;         // Capital máximo permitido
        uint256 expectedDailyROI;   // ROI diario esperado en basis points
        uint256 riskLevel;          // 1=Low, 2=Medium, 3=High
        bool isActive;
        uint256 totalAllocated;     // Total de capital asignado
        uint256 totalEarnings;      // Total de earnings generados
        uint256 successRate;        // Tasa de éxito en basis points
    }
    
    // Asignación de agente a usuario
    struct UserAgentAllocation {
        uint256 agentId;
        uint256 allocatedAmount;    // Cantidad asignada en USDT
        uint256 allocationPercent;  // Porcentaje de la licencia (basis points)
        uint256 totalEarnings;      // Total ganado por este agente
        uint256 lastUpdateDate;
        bool isActive;
    }
    
    // Rendimiento diario de agente
    struct AgentPerformance {
        uint256 date;
        uint256 totalCapital;
        uint256 earningsGenerated;
        uint256 roiAchieved;        // ROI real en basis points
        uint256 operationsCount;
        bool isProcessed;
    }
    
    // Mapeos
    mapping(uint256 => Agent) public agents;
    mapping(address => mapping(uint256 => UserAgentAllocation)) public userAgentAllocations;
    mapping(address => uint256[]) public userAgentIds;
    mapping(uint256 => mapping(uint256 => AgentPerformance)) public agentDailyPerformance;
    mapping(uint256 => uint256) public agentPerformanceCount;
    mapping(uint256 => uint256[]) public licenseTypeAgents; // Agentes disponibles por tipo de licencia
    
    // Contadores
    uint256 public totalAgents;
    uint256 public totalActiveAgents;
    uint256 public totalCapitalManaged;
    
    // Configuración
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant TARGET_DAILY_ROI = 800; // 8% diario
    uint256 public performanceFee = 200; // 2% fee de performance
    uint256 public managementFee = 100;  // 1% fee de gestión
    
    // Eventos
    event AgentRegistered(uint256 indexed agentId, string name, address agentAddress);
    event AgentUpdated(uint256 indexed agentId, bool isActive);
    event UserAgentAllocated(address indexed user, uint256 indexed agentId, uint256 amount);
    event AgentPerformanceRecorded(uint256 indexed agentId, uint256 date, uint256 earnings);
    event EarningsDistributed(address indexed user, uint256 totalAmount);
    event AgentCapitalRebalanced(uint256 indexed agentId, uint256 newCapital);
    
    // Modificadores
    modifier validAgent(uint256 _agentId) {
        require(_agentId < totalAgents, "Invalid agent ID");
        require(agents[_agentId].isActive, "Agent not active");
        _;
    }
    
    modifier onlyAgentAddress(uint256 _agentId) {
        require(msg.sender == agents[_agentId].agentAddress, "Not authorized agent");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _licenseContract Dirección del contrato de licencias
     * @param _usdtToken Dirección del token USDT
     */
    constructor(address _licenseContract, address _usdtToken) {
        require(_licenseContract != address(0), "Invalid license contract");
        require(_usdtToken != address(0), "Invalid USDT token");
        
        licenseContract = ProFitAgentLicense(_licenseContract);
        usdtToken = IERC20(_usdtToken);
        
        // Registrar agentes iniciales
        _registerInitialAgents();
        _configureLicenseTypeAgents();
    }
    
    /**
     * @dev Registrar agentes iniciales
     */
    function _registerInitialAgents() private {
        // Agente de Arbitraje Cripto Básico
        _registerAgent(
            "Agente de Arbitraje Cripto Básico",
            "crypto_arbitrage_basic",
            address(0x1), // Placeholder - se actualizará
            1000 * 10**18,  // $1,000 min
            50000 * 10**18, // $50,000 max
            800,  // 8% diario
            1     // Low risk
        );
        
        // Agente de Arbitraje Cripto Avanzado
        _registerAgent(
            "Agente de Arbitraje Cripto Avanzado",
            "crypto_arbitrage_advanced",
            address(0x2),
            5000 * 10**18,
            200000 * 10**18,
            900,  // 9% diario
            2     // Medium risk
        );
        
        // Agente de Surebet Básico
        _registerAgent(
            "Agente de Surebet Básico",
            "surebet_basic",
            address(0x3),
            2000 * 10**18,
            25000 * 10**18,
            700,  // 7% diario
            1     // Low risk
        );
        
        // Agente de Grid Trading
        _registerAgent(
            "Agente de Grid Trading",
            "grid_trading",
            address(0x4),
            5000 * 10**18,
            100000 * 10**18,
            850,  // 8.5% diario
            2     // Medium risk
        );
        
        // Agente de DeFi Yield Farming
        _registerAgent(
            "Agente de DeFi Yield Farming",
            "defi_yield_farming",
            address(0x5),
            50000 * 10**18,
            2000000 * 10**18,
            1000, // 10% diario
            2     // Medium risk
        );
        
        // Agente de Scalping
        _registerAgent(
            "Agente de Scalping Automatizado",
            "scalping_automated",
            address(0x6),
            100000 * 10**18,
            5000000 * 10**18,
            1200, // 12% diario
            3     // High risk
        );
        
        // Agente de Market Making
        _registerAgent(
            "Agente de Market Making",
            "market_making",
            address(0x7),
            250000 * 10**18,
            10000000 * 10**18,
            900,  // 9% diario
            2     // Medium risk
        );
    }
    
    /**
     * @dev Configurar agentes por tipo de licencia
     */
    function _configureLicenseTypeAgents() private {
        // Licencia Básica (ID: 0) - Solo agente básico
        licenseTypeAgents[0].push(0); // crypto_arbitrage_basic
        
        // Licencia Estándar (ID: 1) - Agentes básicos
        licenseTypeAgents[1].push(1); // crypto_arbitrage_advanced
        licenseTypeAgents[1].push(2); // surebet_basic
        
        // Licencia Premium (ID: 2) - Agentes intermedios
        licenseTypeAgents[2].push(1); // crypto_arbitrage_advanced
        licenseTypeAgents[2].push(2); // surebet_basic
        licenseTypeAgents[2].push(3); // grid_trading
        
        // Licencia Elite (ID: 3) - Agentes avanzados
        licenseTypeAgents[3].push(1); // crypto_arbitrage_advanced
        licenseTypeAgents[3].push(2); // surebet_basic
        licenseTypeAgents[3].push(3); // grid_trading
        licenseTypeAgents[3].push(4); // defi_yield_farming
        licenseTypeAgents[3].push(5); // scalping_automated
        
        // Licencia Enterprise (ID: 4) - Todos los agentes
        licenseTypeAgents[4].push(1); // crypto_arbitrage_advanced
        licenseTypeAgents[4].push(2); // surebet_basic
        licenseTypeAgents[4].push(3); // grid_trading
        licenseTypeAgents[4].push(4); // defi_yield_farming
        licenseTypeAgents[4].push(5); // scalping_automated
        licenseTypeAgents[4].push(6); // market_making
    }
    
    /**
     * @dev Registrar nuevo agente
     */
    function _registerAgent(
        string memory _name,
        string memory _agentType,
        address _agentAddress,
        uint256 _minCapital,
        uint256 _maxCapital,
        uint256 _expectedDailyROI,
        uint256 _riskLevel
    ) private {
        agents[totalAgents] = Agent({
            name: _name,
            agentType: _agentType,
            agentAddress: _agentAddress,
            minCapital: _minCapital,
            maxCapital: _maxCapital,
            expectedDailyROI: _expectedDailyROI,
            riskLevel: _riskLevel,
            isActive: true,
            totalAllocated: 0,
            totalEarnings: 0,
            successRate: 9000 // 90% inicial
        });
        
        emit AgentRegistered(totalAgents, _name, _agentAddress);
        totalAgents++;
        totalActiveAgents++;
    }
    
    /**
     * @dev Asignar capital automáticamente a agentes según licencia
     * @param _user Dirección del usuario
     * @param _licenseTypeId Tipo de licencia
     * @param _totalCapital Capital total a asignar
     */
    function allocateCapitalToAgents(
        address _user,
        uint256 _licenseTypeId,
        uint256 _totalCapital
    ) external onlyOwner {
        require(_licenseTypeId < 5, "Invalid license type");
        require(_totalCapital > 0, "Capital must be greater than 0");
        
        uint256[] memory availableAgents = licenseTypeAgents[_licenseTypeId];
        require(availableAgents.length > 0, "No agents available for this license");
        
        // Limpiar asignaciones anteriores
        _clearUserAllocations(_user);
        
        // Asignar capital según el tipo de licencia
        if (_licenseTypeId == 0) {
            // Básica: 100% a un agente
            _allocateToAgent(_user, availableAgents[0], _totalCapital, BASIS_POINTS);
        } else if (_licenseTypeId == 1) {
            // Estándar: 70% arbitraje, 30% surebet
            _allocateToAgent(_user, availableAgents[0], _totalCapital.mul(7000).div(BASIS_POINTS), 7000);
            _allocateToAgent(_user, availableAgents[1], _totalCapital.mul(3000).div(BASIS_POINTS), 3000);
        } else if (_licenseTypeId == 2) {
            // Premium: 40% arbitraje, 35% surebet, 25% grid
            _allocateToAgent(_user, availableAgents[0], _totalCapital.mul(4000).div(BASIS_POINTS), 4000);
            _allocateToAgent(_user, availableAgents[1], _totalCapital.mul(3500).div(BASIS_POINTS), 3500);
            _allocateToAgent(_user, availableAgents[2], _totalCapital.mul(2500).div(BASIS_POINTS), 2500);
        } else if (_licenseTypeId == 3) {
            // Elite: Distribución balanceada
            uint256 perAgent = BASIS_POINTS.div(availableAgents.length);
            for (uint256 i = 0; i < availableAgents.length; i++) {
                uint256 allocation = _totalCapital.mul(perAgent).div(BASIS_POINTS);
                _allocateToAgent(_user, availableAgents[i], allocation, perAgent);
            }
        } else if (_licenseTypeId == 4) {
            // Enterprise: Distribución optimizada
            uint256[] memory allocations = new uint256[](6);
            allocations[0] = 2000; // 20% arbitraje
            allocations[1] = 1500; // 15% surebet
            allocations[2] = 1500; // 15% grid
            allocations[3] = 1500; // 15% defi
            allocations[4] = 1500; // 15% scalping
            allocations[5] = 2000; // 20% market making
            
            for (uint256 i = 0; i < availableAgents.length; i++) {
                uint256 allocation = _totalCapital.mul(allocations[i]).div(BASIS_POINTS);
                _allocateToAgent(_user, availableAgents[i], allocation, allocations[i]);
            }
        }
        
        totalCapitalManaged = totalCapitalManaged.add(_totalCapital);
    }
    
    /**
     * @dev Asignar capital a un agente específico
     */
    function _allocateToAgent(
        address _user,
        uint256 _agentId,
        uint256 _amount,
        uint256 _percent
    ) private {
        userAgentAllocations[_user][_agentId] = UserAgentAllocation({
            agentId: _agentId,
            allocatedAmount: _amount,
            allocationPercent: _percent,
            totalEarnings: 0,
            lastUpdateDate: block.timestamp,
            isActive: true
        });
        
        userAgentIds[_user].push(_agentId);
        agents[_agentId].totalAllocated = agents[_agentId].totalAllocated.add(_amount);
        
        emit UserAgentAllocated(_user, _agentId, _amount);
    }
    
    /**
     * @dev Limpiar asignaciones anteriores del usuario
     */
    function _clearUserAllocations(address _user) private {
        uint256[] memory userAgents = userAgentIds[_user];
        for (uint256 i = 0; i < userAgents.length; i++) {
            uint256 agentId = userAgents[i];
            uint256 allocatedAmount = userAgentAllocations[_user][agentId].allocatedAmount;
            
            agents[agentId].totalAllocated = agents[agentId].totalAllocated.sub(allocatedAmount);
            delete userAgentAllocations[_user][agentId];
        }
        delete userAgentIds[_user];
    }
    
    /**
     * @dev Registrar rendimiento diario de agente
     * @param _agentId ID del agente
     * @param _earningsGenerated Earnings generados
     * @param _operationsCount Número de operaciones
     */
    function recordAgentPerformance(
        uint256 _agentId,
        uint256 _earningsGenerated,
        uint256 _operationsCount
    ) external validAgent(_agentId) onlyAgentAddress(_agentId) {
        uint256 today = block.timestamp / 1 days;
        uint256 performanceIndex = agentPerformanceCount[_agentId];
        
        uint256 totalCapital = agents[_agentId].totalAllocated;
        uint256 roiAchieved = 0;
        
        if (totalCapital > 0) {
            roiAchieved = _earningsGenerated.mul(BASIS_POINTS).div(totalCapital);
        }
        
        agentDailyPerformance[_agentId][performanceIndex] = AgentPerformance({
            date: today,
            totalCapital: totalCapital,
            earningsGenerated: _earningsGenerated,
            roiAchieved: roiAchieved,
            operationsCount: _operationsCount,
            isProcessed: false
        });
        
        agentPerformanceCount[_agentId]++;
        agents[_agentId].totalEarnings = agents[_agentId].totalEarnings.add(_earningsGenerated);
        
        emit AgentPerformanceRecorded(_agentId, today, _earningsGenerated);
    }
    
    /**
     * @dev Distribuir earnings a usuarios
     * @param _agentId ID del agente
     * @param _performanceIndex Índice de rendimiento
     */
    function distributeEarnings(uint256 _agentId, uint256 _performanceIndex) 
        external 
        onlyOwner 
        validAgent(_agentId) 
    {
        AgentPerformance storage performance = agentDailyPerformance[_agentId][_performanceIndex];
        require(!performance.isProcessed, "Performance already processed");
        require(performance.earningsGenerated > 0, "No earnings to distribute");
        
        // Aquí se implementaría la lógica para distribuir a todos los usuarios
        // Por simplicidad, se marca como procesado
        performance.isProcessed = true;
    }
    
    /**
     * @dev Obtener agentes asignados a un usuario
     * @param _user Dirección del usuario
     */
    function getUserAgents(address _user) external view returns (uint256[] memory) {
        return userAgentIds[_user];
    }
    
    /**
     * @dev Obtener información de asignación de agente
     * @param _user Dirección del usuario
     * @param _agentId ID del agente
     */
    function getUserAgentAllocation(address _user, uint256 _agentId) 
        external 
        view 
        returns (
            uint256 allocatedAmount,
            uint256 allocationPercent,
            uint256 totalEarnings,
            bool isActive
        ) 
    {
        UserAgentAllocation memory allocation = userAgentAllocations[_user][_agentId];
        return (
            allocation.allocatedAmount,
            allocation.allocationPercent,
            allocation.totalEarnings,
            allocation.isActive
        );
    }
    
    /**
     * @dev Obtener rendimiento de agente
     * @param _agentId ID del agente
     */
    function getAgentPerformance(uint256 _agentId) 
        external 
        view 
        returns (
            uint256 totalAllocated,
            uint256 totalEarnings,
            uint256 successRate,
            uint256 averageROI
        ) 
    {
        Agent memory agent = agents[_agentId];
        uint256 avgROI = 0;
        
        if (agent.totalAllocated > 0) {
            avgROI = agent.totalEarnings.mul(BASIS_POINTS).div(agent.totalAllocated);
        }
        
        return (
            agent.totalAllocated,
            agent.totalEarnings,
            agent.successRate,
            avgROI
        );
    }
    
    /**
     * @dev Actualizar dirección de agente
     * @param _agentId ID del agente
     * @param _newAddress Nueva dirección
     */
    function updateAgentAddress(uint256 _agentId, address _newAddress) 
        external 
        onlyOwner 
        validAgent(_agentId) 
    {
        require(_newAddress != address(0), "Invalid address");
        agents[_agentId].agentAddress = _newAddress;
    }
    
    /**
     * @dev Pausar/activar agente
     * @param _agentId ID del agente
     * @param _isActive Estado activo
     */
    function setAgentStatus(uint256 _agentId, bool _isActive) 
        external 
        onlyOwner 
    {
        require(_agentId < totalAgents, "Invalid agent ID");
        
        bool wasActive = agents[_agentId].isActive;
        agents[_agentId].isActive = _isActive;
        
        if (wasActive && !_isActive) {
            totalActiveAgents--;
        } else if (!wasActive && _isActive) {
            totalActiveAgents++;
        }
        
        emit AgentUpdated(_agentId, _isActive);
    }
    
    /**
     * @dev Obtener estadísticas generales
     */
    function getManagerStats() external view returns (
        uint256 totalAgentsCount,
        uint256 activeAgentsCount,
        uint256 totalCapitalManagedAmount,
        uint256 totalEarningsGenerated
    ) {
        uint256 totalEarnings = 0;
        for (uint256 i = 0; i < totalAgents; i++) {
            totalEarnings = totalEarnings.add(agents[i].totalEarnings);
        }
        
        return (
            totalAgents,
            totalActiveAgents,
            totalCapitalManaged,
            totalEarnings
        );
    }
    
    /**
     * @dev Pausar/despausar contrato
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}