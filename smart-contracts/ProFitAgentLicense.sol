// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ProFitAgent License Contract
 * @dev Contrato inteligente para gestión de licencias y pagos automáticos en USDT BEP20
 * @author ProFitAgent Team
 */
contract ProFitAgentLicense is ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    // Token USDT en BSC
    IERC20 public immutable usdtToken;
    
    // Direcciones del sistema
    address public treasuryWallet;
    address public operationsWallet;
    address public emergencyWallet;
    
    // Configuración de licencias
    struct LicenseType {
        string name;
        uint256 price;          // Precio en USDT (18 decimales)
        uint256 duration;       // Duración en días
        uint256 dailyReturn;    // Retorno diario en basis points (800 = 8%)
        bool isActive;
    }
    
    // Información de licencia de usuario
    struct UserLicense {
        uint256 licenseTypeId;
        uint256 purchaseDate;
        uint256 expirationDate;
        uint256 totalInvested;
        uint256 totalEarned;
        uint256 lastClaimDate;
        bool isActive;
        uint256 agentAllocation; // Porcentaje asignado a agentes
    }
    
    // Información de earnings diarios
    struct DailyEarning {
        uint256 date;
        uint256 amount;
        uint256 agentId;
        bool claimed;
    }
    
    // Mapeos
    mapping(uint256 => LicenseType) public licenseTypes;
    mapping(address => UserLicense) public userLicenses;
    mapping(address => mapping(uint256 => DailyEarning)) public dailyEarnings;
    mapping(address => uint256) public userEarningsCount;
    mapping(address => bool) public authorizedAgents;
    
    // Contadores
    uint256 public totalLicenseTypes;
    uint256 public totalActiveLicenses;
    uint256 public totalVolumeUSDT;
    
    // Configuración del sistema
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant DAILY_RETURN_TARGET = 800; // 8% diario
    uint256 public treasuryFee = 1000; // 10% fee para treasury
    uint256 public operationsFee = 500; // 5% fee para operaciones
    
    // Eventos
    event LicensePurchased(address indexed user, uint256 licenseTypeId, uint256 amount);
    event EarningsGenerated(address indexed user, uint256 amount, uint256 agentId);
    event EarningsClaimed(address indexed user, uint256 amount);
    event LicenseTypeCreated(uint256 indexed licenseTypeId, string name, uint256 price);
    event LicenseTypeUpdated(uint256 indexed licenseTypeId, bool isActive);
    event AgentAuthorized(address indexed agent, bool authorized);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    // Modificadores
    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender], "Not authorized agent");
        _;
    }
    
    modifier validLicenseType(uint256 _licenseTypeId) {
        require(_licenseTypeId < totalLicenseTypes, "Invalid license type");
        require(licenseTypes[_licenseTypeId].isActive, "License type not active");
        _;
    }
    
    modifier hasActiveLicense(address _user) {
        require(userLicenses[_user].isActive, "No active license");
        require(block.timestamp <= userLicenses[_user].expirationDate, "License expired");
        _;
    }
    
    /**
     * @dev Constructor del contrato
     * @param _usdtToken Dirección del token USDT en BSC
     * @param _treasuryWallet Wallet del treasury
     * @param _operationsWallet Wallet de operaciones
     * @param _emergencyWallet Wallet de emergencia
     */
    constructor(
        address _usdtToken,
        address _treasuryWallet,
        address _operationsWallet,
        address _emergencyWallet
    ) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_treasuryWallet != address(0), "Invalid treasury address");
        require(_operationsWallet != address(0), "Invalid operations address");
        require(_emergencyWallet != address(0), "Invalid emergency address");
        
        usdtToken = IERC20(_usdtToken);
        treasuryWallet = _treasuryWallet;
        operationsWallet = _operationsWallet;
        emergencyWallet = _emergencyWallet;
        
        // Crear tipos de licencia iniciales
        _createInitialLicenseTypes();
    }
    
    /**
     * @dev Crear tipos de licencia iniciales
     */
    function _createInitialLicenseTypes() private {
        // Licencia Básica - $500
        _createLicenseType("Básica", 500 * 10**18, 25, 800);
        
        // Licencia Estándar - $1,000
        _createLicenseType("Estándar", 1000 * 10**18, 25, 800);
        
        // Licencia Premium - $2,500
        _createLicenseType("Premium", 2500 * 10**18, 25, 800);
        
        // Licencia Elite - $5,000
        _createLicenseType("Elite", 5000 * 10**18, 25, 800);
        
        // Licencia Enterprise - $10,000
        _createLicenseType("Enterprise", 10000 * 10**18, 25, 800);
    }
    
    /**
     * @dev Crear nuevo tipo de licencia
     * @param _name Nombre de la licencia
     * @param _price Precio en USDT
     * @param _duration Duración en días
     * @param _dailyReturn Retorno diario en basis points
     */
    function _createLicenseType(
        string memory _name,
        uint256 _price,
        uint256 _duration,
        uint256 _dailyReturn
    ) private {
        licenseTypes[totalLicenseTypes] = LicenseType({
            name: _name,
            price: _price,
            duration: _duration,
            dailyReturn: _dailyReturn,
            isActive: true
        });
        
        emit LicenseTypeCreated(totalLicenseTypes, _name, _price);
        totalLicenseTypes++;
    }
    
    /**
     * @dev Comprar licencia
     * @param _licenseTypeId ID del tipo de licencia
     */
    function purchaseLicense(uint256 _licenseTypeId) 
        external 
        nonReentrant 
        whenNotPaused 
        validLicenseType(_licenseTypeId)
    {
        require(!userLicenses[msg.sender].isActive, "Already has active license");
        
        LicenseType memory licenseType = licenseTypes[_licenseTypeId];
        
        // Transferir USDT del usuario al contrato
        require(
            usdtToken.transferFrom(msg.sender, address(this), licenseType.price),
            "USDT transfer failed"
        );
        
        // Distribuir fees
        uint256 treasuryAmount = licenseType.price.mul(treasuryFee).div(BASIS_POINTS);
        uint256 operationsAmount = licenseType.price.mul(operationsFee).div(BASIS_POINTS);
        
        require(usdtToken.transfer(treasuryWallet, treasuryAmount), "Treasury transfer failed");
        require(usdtToken.transfer(operationsWallet, operationsAmount), "Operations transfer failed");
        
        // Crear licencia de usuario
        uint256 expirationDate = block.timestamp + (licenseType.duration * 1 days);
        
        userLicenses[msg.sender] = UserLicense({
            licenseTypeId: _licenseTypeId,
            purchaseDate: block.timestamp,
            expirationDate: expirationDate,
            totalInvested: licenseType.price,
            totalEarned: 0,
            lastClaimDate: block.timestamp,
            isActive: true,
            agentAllocation: BASIS_POINTS // 100% inicialmente
        });
        
        totalActiveLicenses++;
        totalVolumeUSDT = totalVolumeUSDT.add(licenseType.price);
        
        emit LicensePurchased(msg.sender, _licenseTypeId, licenseType.price);
    }
    
    /**
     * @dev Generar earnings diarios (solo agentes autorizados)
     * @param _user Dirección del usuario
     * @param _amount Cantidad de earnings
     * @param _agentId ID del agente que generó los earnings
     */
    function generateDailyEarnings(
        address _user,
        uint256 _amount,
        uint256 _agentId
    ) 
        external 
        onlyAuthorizedAgent 
        hasActiveLicense(_user)
    {
        uint256 earningsIndex = userEarningsCount[_user];
        
        dailyEarnings[_user][earningsIndex] = DailyEarning({
            date: block.timestamp,
            amount: _amount,
            agentId: _agentId,
            claimed: false
        });
        
        userEarningsCount[_user]++;
        userLicenses[_user].totalEarned = userLicenses[_user].totalEarned.add(_amount);
        
        emit EarningsGenerated(_user, _amount, _agentId);
    }
    
    /**
     * @dev Reclamar earnings acumulados
     */
    function claimEarnings() external nonReentrant hasActiveLicense(msg.sender) {
        uint256 totalClaimable = 0;
        uint256 earningsCount = userEarningsCount[msg.sender];
        
        for (uint256 i = 0; i < earningsCount; i++) {
            if (!dailyEarnings[msg.sender][i].claimed) {
                totalClaimable = totalClaimable.add(dailyEarnings[msg.sender][i].amount);
                dailyEarnings[msg.sender][i].claimed = true;
            }
        }
        
        require(totalClaimable > 0, "No earnings to claim");
        require(usdtToken.balanceOf(address(this)) >= totalClaimable, "Insufficient contract balance");
        
        userLicenses[msg.sender].lastClaimDate = block.timestamp;
        
        require(usdtToken.transfer(msg.sender, totalClaimable), "Earnings transfer failed");
        
        emit EarningsClaimed(msg.sender, totalClaimable);
    }
    
    /**
     * @dev Obtener earnings no reclamados
     * @param _user Dirección del usuario
     * @return Cantidad total no reclamada
     */
    function getUnclaimedEarnings(address _user) external view returns (uint256) {
        uint256 totalUnclaimed = 0;
        uint256 earningsCount = userEarningsCount[_user];
        
        for (uint256 i = 0; i < earningsCount; i++) {
            if (!dailyEarnings[_user][i].claimed) {
                totalUnclaimed = totalUnclaimed.add(dailyEarnings[_user][i].amount);
            }
        }
        
        return totalUnclaimed;
    }
    
    /**
     * @dev Autorizar/desautorizar agente
     * @param _agent Dirección del agente
     * @param _authorized Estado de autorización
     */
    function setAgentAuthorization(address _agent, bool _authorized) external onlyOwner {
        authorizedAgents[_agent] = _authorized;
        emit AgentAuthorized(_agent, _authorized);
    }
    
    /**
     * @dev Actualizar estado de tipo de licencia
     * @param _licenseTypeId ID del tipo de licencia
     * @param _isActive Nuevo estado
     */
    function updateLicenseTypeStatus(uint256 _licenseTypeId, bool _isActive) external onlyOwner {
        require(_licenseTypeId < totalLicenseTypes, "Invalid license type");
        licenseTypes[_licenseTypeId].isActive = _isActive;
        emit LicenseTypeUpdated(_licenseTypeId, _isActive);
    }
    
    /**
     * @dev Actualizar wallets del sistema
     */
    function updateSystemWallets(
        address _treasuryWallet,
        address _operationsWallet,
        address _emergencyWallet
    ) external onlyOwner {
        require(_treasuryWallet != address(0), "Invalid treasury address");
        require(_operationsWallet != address(0), "Invalid operations address");
        require(_emergencyWallet != address(0), "Invalid emergency address");
        
        treasuryWallet = _treasuryWallet;
        operationsWallet = _operationsWallet;
        emergencyWallet = _emergencyWallet;
    }
    
    /**
     * @dev Actualizar fees del sistema
     */
    function updateSystemFees(uint256 _treasuryFee, uint256 _operationsFee) external onlyOwner {
        require(_treasuryFee.add(_operationsFee) <= 2000, "Total fees cannot exceed 20%");
        treasuryFee = _treasuryFee;
        operationsFee = _operationsFee;
    }
    
    /**
     * @dev Retiro de emergencia (solo owner)
     * @param _token Dirección del token
     * @param _amount Cantidad a retirar
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Insufficient balance");
        
        require(token.transfer(emergencyWallet, _amount), "Emergency withdrawal failed");
        
        emit EmergencyWithdrawal(_token, _amount);
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
    
    /**
     * @dev Obtener información de licencia de usuario
     * @param _user Dirección del usuario
     */
    function getUserLicenseInfo(address _user) external view returns (
        uint256 licenseTypeId,
        string memory licenseName,
        uint256 purchaseDate,
        uint256 expirationDate,
        uint256 totalInvested,
        uint256 totalEarned,
        bool isActive,
        uint256 daysRemaining
    ) {
        UserLicense memory license = userLicenses[_user];
        LicenseType memory licenseType = licenseTypes[license.licenseTypeId];
        
        uint256 daysLeft = 0;
        if (license.expirationDate > block.timestamp) {
            daysLeft = (license.expirationDate - block.timestamp) / 1 days;
        }
        
        return (
            license.licenseTypeId,
            licenseType.name,
            license.purchaseDate,
            license.expirationDate,
            license.totalInvested,
            license.totalEarned,
            license.isActive && block.timestamp <= license.expirationDate,
            daysLeft
        );
    }
    
    /**
     * @dev Obtener estadísticas del contrato
     */
    function getContractStats() external view returns (
        uint256 totalUsers,
        uint256 totalVolume,
        uint256 contractBalance,
        uint256 totalLicenseTypesCount
    ) {
        return (
            totalActiveLicenses,
            totalVolumeUSDT,
            usdtToken.balanceOf(address(this)),
            totalLicenseTypes
        );
    }
}