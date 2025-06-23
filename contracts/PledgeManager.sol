// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./RATToken.sol";
import "./interfaces/IPriceOracle.sol";

interface ILiquidityAggregator {
    function triggerLiquidityAggregation(uint256 assetValue, address pledger) external;
}

interface IRATStakingPool {
    function adminStakeForUser(address user, uint256 amount) external;
    function getUserStakedBalance(address user) external view returns (uint256);
}

contract PledgeManager is Ownable, ReentrancyGuard, Pausable {
    RATToken public immutable ratToken;
    ILiquidityAggregator public liquidityAggregator;
    IRATStakingPool public ratStakingPool;
    IPriceOracle public priceOracle;
    
    enum AssetStatus { Pending, Approved, Rejected }
    
    struct AssetPledge {
        address pledger;
        string assetDescription;
        uint256 estimatedValue; // In USD with 18 decimals
        string documentHash; // IPFS hash or document reference
        AssetStatus status;
        uint256 ratTokensIssued;
        uint256 pledgeTime;
        uint256 approvalTime;
        bool autoStaked; // Whether RAT tokens were automatically staked
        address assetAddress; // Address of the pledged asset (for price verification)
        uint256 marketValueAtApproval; // Market value from oracle at approval time
    }
    
    mapping(uint256 => AssetPledge) public pledges;
    mapping(address => uint256[]) public userPledges;
    uint256 public nextPledgeId = 1;
    
    // RAT Pool for custody
    mapping(address => uint256) public userRATBalance; // User's RAT balance in custody
    uint256 public totalRATInCustody;
    
    // Auto-staking configuration
    bool public autoStakeEnabled = true;
    uint256 public autoStakePercentage = 8000; // 80% of RAT tokens auto-staked (8000/10000)
    
    // Asset to RAT conversion rate (1 USD = X RAT tokens)
    uint256 public ratConversionRate = 10**18; // 1:1 by default
    
    // Price verification settings
    bool public priceVerificationEnabled = true;
    uint256 public maxPriceDeviation = 2000; // 20% max deviation (2000/10000)
    
    event AssetPledged(
        uint256 indexed pledgeId,
        address indexed pledger,
        uint256 estimatedValue,
        string assetDescription,
        address assetAddress
    );
    
    event AssetApproved(
        uint256 indexed pledgeId,
        uint256 ratTokensIssued,
        uint256 autoStakedAmount,
        uint256 marketValue
    );
    
    event AssetRejected(
        uint256 indexed pledgeId,
        string reason
    );
    
    event RATTokensSwapped(
        address indexed user,
        uint256 ratAmount,
        uint256 usdtReceived
    );
    
    event AutoStakeConfigUpdated(bool enabled, uint256 percentage);
    event PriceVerificationConfigUpdated(bool enabled, uint256 maxDeviation);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    modifier onlyValidPledge(uint256 pledgeId) {
        require(pledgeId < nextPledgeId && pledgeId > 0, "Invalid pledge ID");
        _;
    }
    
    constructor(address _ratToken) {
        ratToken = RATToken(_ratToken);
    }
    
    function setLiquidityAggregator(address _aggregator) external onlyOwner {
        liquidityAggregator = ILiquidityAggregator(_aggregator);
    }
    
    function setRATStakingPool(address _stakingPool) external onlyOwner {
        ratStakingPool = IRATStakingPool(_stakingPool);
    }
    
    function setPriceOracle(address _priceOracle) external onlyOwner {
        address oldOracle = address(priceOracle);
        priceOracle = IPriceOracle(_priceOracle);
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }
    
    function setRATConversionRate(uint256 _rate) external onlyOwner {
        ratConversionRate = _rate;
    }
    
    function setAutoStakeConfig(bool _enabled, uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Percentage cannot exceed 100%");
        autoStakeEnabled = _enabled;
        autoStakePercentage = _percentage;
        emit AutoStakeConfigUpdated(_enabled, _percentage);
    }
    
    function setPriceVerificationConfig(bool _enabled, uint256 _maxDeviation) external onlyOwner {
        require(_maxDeviation <= 10000, "Max deviation cannot exceed 100%");
        priceVerificationEnabled = _enabled;
        maxPriceDeviation = _maxDeviation;
        emit PriceVerificationConfigUpdated(_enabled, _maxDeviation);
    }
    
    function pledgeAsset(
        string calldata assetDescription,
        uint256 estimatedValue,
        string calldata documentHash,
        address assetAddress
    ) external whenNotPaused nonReentrant {
        require(estimatedValue > 0, "Asset value must be greater than 0");
        require(bytes(assetDescription).length > 0, "Asset description required");
        
        uint256 pledgeId = nextPledgeId++;
        
        pledges[pledgeId] = AssetPledge({
            pledger: msg.sender,
            assetDescription: assetDescription,
            estimatedValue: estimatedValue,
            documentHash: documentHash,
            status: AssetStatus.Pending,
            ratTokensIssued: 0,
            pledgeTime: block.timestamp,
            approvalTime: 0,
            autoStaked: false,
            assetAddress: assetAddress,
            marketValueAtApproval: 0
        });
        
        userPledges[msg.sender].push(pledgeId);
        
        emit AssetPledged(pledgeId, msg.sender, estimatedValue, assetDescription, assetAddress);
    }
    
    function approveAsset(
        uint256 pledgeId,
        uint256 approvedValue
    ) external onlyOwner onlyValidPledge(pledgeId) {
        AssetPledge storage pledge = pledges[pledgeId];
        require(pledge.status == AssetStatus.Pending, "Asset already processed");
        require(approvedValue > 0, "Approved value must be greater than 0");
        
        uint256 marketValue = 0;
        
        // Price verification if enabled and oracle is available
        if (priceVerificationEnabled && address(priceOracle) != address(0) && pledge.assetAddress != address(0)) {
            require(priceOracle.isPriceFresh(pledge.assetAddress), "Stale price data");
            
            // Get market price from oracle
            (int256 marketPrice, ) = priceOracle.getLatestPrice(pledge.assetAddress);
            require(marketPrice > 0, "Invalid market price");
            
            // Convert market price to USD value (assuming 1 unit of asset)
            // This calculation may need adjustment based on your asset decimals
            marketValue = uint256(marketPrice) * 10**10; // Convert from 8 decimals to 18 decimals
            
            // Check if approved value is within acceptable deviation from market value
            uint256 deviation = _calculateDeviation(approvedValue, marketValue);
            require(deviation <= maxPriceDeviation, "Approved value exceeds maximum deviation from market price");
        }
        
        pledge.status = AssetStatus.Approved;
        pledge.approvalTime = block.timestamp;
        pledge.marketValueAtApproval = marketValue;
        
        // Calculate RAT tokens to issue
        uint256 ratTokensToIssue = (approvedValue * ratConversionRate) / 10**18;
        pledge.ratTokensIssued = ratTokensToIssue;
        
        // Mint RAT tokens to this contract (custody pool)
        ratToken.mint(address(this), ratTokensToIssue);
        
        uint256 autoStakedAmount = 0;
        
        // Auto-stake portion if enabled and staking pool is set
        if (autoStakeEnabled && address(ratStakingPool) != address(0)) {
            autoStakedAmount = (ratTokensToIssue * autoStakePercentage) / 10000;
            uint256 custodyAmount = ratTokensToIssue - autoStakedAmount;
            
            // Approve staking pool to take tokens
            if (autoStakedAmount > 0) {
                ratToken.approve(address(ratStakingPool), autoStakedAmount);
                ratStakingPool.adminStakeForUser(pledge.pledger, autoStakedAmount);
                pledge.autoStaked = true;
            }
            
            // Add remaining to user's custody balance
            if (custodyAmount > 0) {
                userRATBalance[pledge.pledger] += custodyAmount;
                totalRATInCustody += custodyAmount;
            }
        } else {
            // Add all to user's custody balance
            userRATBalance[pledge.pledger] += ratTokensToIssue;
            totalRATInCustody += ratTokensToIssue;
        }
        
        emit AssetApproved(pledgeId, ratTokensToIssue, autoStakedAmount, marketValue);
        
        // Trigger liquidity aggregation
        if (address(liquidityAggregator) != address(0)) {
            liquidityAggregator.triggerLiquidityAggregation(approvedValue, pledge.pledger);
        }
    }
    
    function _calculateDeviation(uint256 approvedValue, uint256 marketValue) internal pure returns (uint256) {
        if (marketValue == 0) return 0;
        
        uint256 difference = approvedValue > marketValue 
            ? approvedValue - marketValue 
            : marketValue - approvedValue;
            
        return (difference * 10000) / marketValue;
    }
    
    function rejectAsset(
        uint256 pledgeId,
        string calldata reason
    ) external onlyOwner onlyValidPledge(pledgeId) {
        AssetPledge storage pledge = pledges[pledgeId];
        require(pledge.status == AssetStatus.Pending, "Asset already processed");
        
        pledge.status = AssetStatus.Rejected;
        
        emit AssetRejected(pledgeId, reason);
    }
    
    // Admin function to stake RAT from custody for user
    function adminStakeRATForUser(address user, uint256 amount) external {
        require(msg.sender == address(ratStakingPool), "Only staking pool can call");
        require(userRATBalance[user] >= amount, "Insufficient custody balance");
        
        // Deduct from user's custody balance
        userRATBalance[user] -= amount;
        totalRATInCustody -= amount;
        
        // Transfer RAT tokens to staking pool (they will be pulled by the staking pool)
        ratToken.transfer(address(ratStakingPool), amount);
    }
    
    // Admin function to return staked RAT to custody
    function adminUnstakeRATForUser(address user, uint256 amount) external {
        require(msg.sender == address(ratStakingPool), "Only staking pool can call");
        
        // Add back to user's custody balance
        userRATBalance[user] += amount;
        totalRATInCustody += amount;
        
        // Tokens will be transferred by the staking pool
    }
    
    function adminSwapRATForUser(
        address user,
        uint256 ratAmount,
        uint256 minUSDTReceived,
        bytes calldata swapData
    ) external onlyOwner nonReentrant {
        require(userRATBalance[user] >= ratAmount, "Insufficient RAT balance");
        require(ratAmount > 0, "Amount must be greater than 0");
        
        // Deduct from user's custody balance
        userRATBalance[user] -= ratAmount;
        totalRATInCustody -= ratAmount;
        
        // Burn the RAT tokens
        ratToken.burn(ratAmount);
        
        // Execute swap through aggregator (implementation depends on your swap logic)
        uint256 usdtReceived = _executeSwap(ratAmount, minUSDTReceived, swapData);
        
        emit RATTokensSwapped(user, ratAmount, usdtReceived);
    }
    
    function _executeSwap(
        uint256 ratAmount,
        uint256 minUSDTReceived,
        bytes calldata swapData
    ) internal returns (uint256 usdtReceived) {
        // Placeholder for swap execution logic
        // This would integrate with your liquidity aggregator
        return minUSDTReceived; // Placeholder
    }
    
    // View functions
    function getUserPledges(address user) external view returns (uint256[] memory) {
        return userPledges[user];
    }
    
    function getPledgeDetails(uint256 pledgeId) 
        external 
        view 
        onlyValidPledge(pledgeId) 
        returns (AssetPledge memory) 
    {
        return pledges[pledgeId];
    }
    
    function getUserRATBalance(address user) external view returns (uint256) {
        return userRATBalance[user];
    }
    
    function getUserTotalRAT(address user) external view returns (
        uint256 custodyBalance,
        uint256 stakedBalance,
        uint256 totalBalance
    ) {
        custodyBalance = userRATBalance[user];
        
        // Get staked balance from staking pool if available
        if (address(ratStakingPool) != address(0)) {
            try ratStakingPool.getUserStakedBalance(user) returns (uint256 staked) {
                stakedBalance = staked;
            } catch {
                stakedBalance = 0;
            }
        } else {
            stakedBalance = 0;
        }
        
        totalBalance = custodyBalance + stakedBalance;
    }
    
    function getAssetCurrentMarketValue(address assetAddress) external view returns (uint256 marketValue, bool isFresh) {
        if (address(priceOracle) == address(0) || assetAddress == address(0)) {
            return (0, false);
        }
        
        try priceOracle.isPriceFresh(assetAddress) returns (bool fresh) {
            if (!fresh) return (0, false);
            
            try priceOracle.getLatestPrice(assetAddress) returns (int256 price, uint256) {
                if (price > 0) {
                    marketValue = uint256(price) * 10**10; // Convert from 8 to 18 decimals
                    isFresh = true;
                }
            } catch {
                return (0, false);
            }
        } catch {
            return (0, false);
        }
    }
    
    function validatePledgeValue(uint256 pledgeId) external view onlyValidPledge(pledgeId) returns (
        bool isValid,
        uint256 currentMarketValue,
        uint256 deviation,
        string memory status
    ) {
        AssetPledge memory pledge = pledges[pledgeId];
        
        if (pledge.assetAddress == address(0) || address(priceOracle) == address(0)) {
            return (true, 0, 0, "No price verification available");
        }
        
        try priceOracle.isPriceFresh(pledge.assetAddress) returns (bool fresh) {
            if (!fresh) {
                return (false, 0, 0, "Price data is stale");
            }
            
            try priceOracle.getLatestPrice(pledge.assetAddress) returns (int256 price, uint256) {
                if (price <= 0) {
                    return (false, 0, 0, "Invalid price");
                }
                
                currentMarketValue = uint256(price) * 10**10;
                deviation = _calculateDeviation(pledge.estimatedValue, currentMarketValue);
                isValid = deviation <= maxPriceDeviation;
                
                if (isValid) {
                    status = "Value within acceptable range";
                } else {
                    status = "Value exceeds maximum deviation";
                }
            } catch {
                return (false, 0, 0, "Failed to get price");
            }
        } catch {
            return (false, 0, 0, "Oracle not responding");
        }
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency function to withdraw tokens (only owner)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
}