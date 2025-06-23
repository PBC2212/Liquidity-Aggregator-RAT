// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRATToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
}

interface IERC20Extended is IERC20 {
    function decimals() external view returns (uint8);
}

interface IPledgeManager {
    function getUserRATBalance(address user) external view returns (uint256);
    function adminStakeRATForUser(address user, uint256 amount) external;
    function adminUnstakeRATForUser(address user, uint256 amount) external;
}

contract RATStakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IRATToken;
    using SafeERC20 for IERC20Extended;
    
    IRATToken public immutable ratToken;
    IERC20Extended public immutable usdt;
    IPledgeManager public pledgeManager;
    
    // Staking data
    struct StakeInfo {
        uint256 amount;           // Amount of RAT tokens staked
        uint256 rewardDebt;       // Reward debt for yield calculation
        uint256 lastStakeTime;    // Last time user staked
        uint256 totalClaimed;     // Total USDT claimed by user
    }
    
    mapping(address => StakeInfo) public userStakes;
    mapping(address => bool) public yieldProviders; // Authorized yield providers (LiquidityAggregator, etc.)
    
    // Pool statistics
    uint256 public totalStaked;           // Total RAT tokens staked in pool
    uint256 public totalYieldDistributed; // Total USDT distributed as yield
    uint256 public accUSDTPerShare;       // Accumulated USDT per share (scaled by 1e12)
    uint256 public lastYieldTime;         // Last time yield was distributed
    
    // Pool configuration
    uint256 public minStakeAmount = 1 * 10**18;        // Minimum 1 RAT to stake
    uint256 public unstakeLockPeriod = 7 days;         // 7 days lock period for unstaking
    uint256 public yieldDistributionFee = 200;         // 2% fee on yield distribution (200/10000)
    uint256 public constant MAX_FEE = 1000;            // Max 10% fee
    address public feeRecipient;
    
    // Yield sources
    uint256 public pendingYieldUSDT;      // USDT waiting to be distributed
    uint256 public yieldDistributionRate = 100;  // Percentage of pending yield to distribute per day (10000 = 100%)
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 totalStaked);
    event Unstaked(address indexed user, uint256 amount, uint256 totalStaked);
    event YieldClaimed(address indexed user, uint256 usdtAmount);
    event YieldDistributed(uint256 usdtAmount, uint256 newAccUSDTPerShare);
    event YieldAdded(address indexed provider, uint256 usdtAmount);
    event EmergencyWithdraw(address indexed user, uint256 ratAmount);
    
    modifier onlyYieldProvider() {
        require(yieldProviders[msg.sender], "Not authorized yield provider");
        _;
    }
    
    constructor(
        address _ratToken,
        address _usdt,
        address _feeRecipient
    ) {
        ratToken = IRATToken(_ratToken);
        usdt = IERC20Extended(_usdt);
        feeRecipient = _feeRecipient;
        lastYieldTime = block.timestamp;
        
        // Set owner as initial yield provider
        yieldProviders[msg.sender] = true;
    }
    
    function setPledgeManager(address _pledgeManager) external onlyOwner {
        pledgeManager = IPledgeManager(_pledgeManager);
    }
    
    function addYieldProvider(address provider) external onlyOwner {
        yieldProviders[provider] = true;
    }
    
    function removeYieldProvider(address provider) external onlyOwner {
        yieldProviders[provider] = false;
    }
    
    function setYieldDistributionFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        yieldDistributionFee = _fee;
    }
    
    function setYieldDistributionRate(uint256 _rate) external onlyOwner {
        require(_rate <= 10000, "Rate cannot exceed 100%");
        yieldDistributionRate = _rate;
    }
    
    function setMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
    }
    
    function setUnstakeLockPeriod(uint256 _period) external onlyOwner {
        require(_period <= 30 days, "Lock period too long");
        unstakeLockPeriod = _period;
    }
    
    // Stake RAT tokens directly (if user has RAT tokens)
    function stakeRAT(uint256 amount) external whenNotPaused nonReentrant {
        require(amount >= minStakeAmount, "Amount below minimum");
        
        _distributeYield();
        
        StakeInfo storage user = userStakes[msg.sender];
        
        // Update user's reward debt
        if (user.amount > 0) {
            uint256 pending = (user.amount * accUSDTPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                usdt.safeTransfer(msg.sender, pending);
                user.totalClaimed += pending;
                emit YieldClaimed(msg.sender, pending);
            }
        }
        
        // Transfer RAT tokens from user
        ratToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update staking info
        user.amount += amount;
        user.lastStakeTime = block.timestamp;
        user.rewardDebt = (user.amount * accUSDTPerShare) / 1e12;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, user.amount);
    }
    
    // Admin function to stake RAT from custody on behalf of user
    function adminStakeForUser(address user, uint256 amount) external onlyOwner whenNotPaused {
        require(amount >= minStakeAmount, "Amount below minimum");
        require(address(pledgeManager) != address(0), "PledgeManager not set");
        
        _distributeYield();
        
        // Use PledgeManager to transfer RAT from custody
        pledgeManager.adminStakeRATForUser(user, amount);
        
        StakeInfo storage userStake = userStakes[user];
        
        // Update user's reward debt
        if (userStake.amount > 0) {
            uint256 pending = (userStake.amount * accUSDTPerShare) / 1e12 - userStake.rewardDebt;
            if (pending > 0) {
                usdt.safeTransfer(user, pending);
                userStake.totalClaimed += pending;
                emit YieldClaimed(user, pending);
            }
        }
        
        // Update staking info
        userStake.amount += amount;
        userStake.lastStakeTime = block.timestamp;
        userStake.rewardDebt = (userStake.amount * accUSDTPerShare) / 1e12;
        
        totalStaked += amount;
        
        emit Staked(user, amount, userStake.amount);
    }
    
    // Unstake RAT tokens
    function unstakeRAT(uint256 amount) external nonReentrant {
        StakeInfo storage user = userStakes[msg.sender];
        require(user.amount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= user.lastStakeTime + unstakeLockPeriod, 
            "Unstake lock period not passed"
        );
        
        _distributeYield();
        
        // Calculate and send pending rewards
        uint256 pending = (user.amount * accUSDTPerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            usdt.safeTransfer(msg.sender, pending);
            user.totalClaimed += pending;
            emit YieldClaimed(msg.sender, pending);
        }
        
        // Update staking info
        user.amount -= amount;
        user.rewardDebt = (user.amount * accUSDTPerShare) / 1e12;
        
        totalStaked -= amount;
        
        // Transfer RAT tokens back to user
        ratToken.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount, user.amount);
    }
    
    // Claim accumulated USDT rewards
    function claimRewards() external nonReentrant {
        _distributeYield();
        
        StakeInfo storage user = userStakes[msg.sender];
        uint256 pending = (user.amount * accUSDTPerShare) / 1e12 - user.rewardDebt;
        
        require(pending > 0, "No pending rewards");
        
        user.rewardDebt = (user.amount * accUSDTPerShare) / 1e12;
        user.totalClaimed += pending;
        
        usdt.safeTransfer(msg.sender, pending);
        
        emit YieldClaimed(msg.sender, pending);
    }
    
    // Add USDT yield to the pool (called by LiquidityAggregator or admin)
    function addYield(uint256 usdtAmount) external onlyYieldProvider {
        require(usdtAmount > 0, "Amount must be greater than 0");
        
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        // Take fee
        uint256 fee = (usdtAmount * yieldDistributionFee) / 10000;
        if (fee > 0 && feeRecipient != address(0)) {
            usdt.safeTransfer(feeRecipient, fee);
        }
        
        uint256 netYield = usdtAmount - fee;
        pendingYieldUSDT += netYield;
        
        emit YieldAdded(msg.sender, netYield);
        
        // Optionally auto-distribute yield
        _distributeYield();
    }
    
    // Internal function to distribute pending yield
    function _distributeYield() internal {
        if (totalStaked == 0 || pendingYieldUSDT == 0) {
            return;
        }
        
        // Calculate how much yield to distribute based on time elapsed and rate
        uint256 timeSinceLastDistribution = block.timestamp - lastYieldTime;
        uint256 dailyDistribution = (pendingYieldUSDT * yieldDistributionRate) / 10000;
        uint256 timeBasedDistribution = (dailyDistribution * timeSinceLastDistribution) / 1 days;
        
        // Don't distribute more than available
        uint256 toDistribute = timeBasedDistribution > pendingYieldUSDT ? 
            pendingYieldUSDT : timeBasedDistribution;
        
        if (toDistribute > 0) {
            // Update accumulated USDT per share
            accUSDTPerShare += (toDistribute * 1e12) / totalStaked;
            
            // Update state
            pendingYieldUSDT -= toDistribute;
            totalYieldDistributed += toDistribute;
            lastYieldTime = block.timestamp;
            
            emit YieldDistributed(toDistribute, accUSDTPerShare);
        }
    }
    
    // Manual yield distribution (admin function)
    function distributeYield() external onlyOwner {
        _distributeYield();
    }
    
    // Force distribute all pending yield
    function forceDistributeAllYield() external onlyOwner {
        require(totalStaked > 0, "No stakers");
        require(pendingYieldUSDT > 0, "No pending yield");
        
        uint256 toDistribute = pendingYieldUSDT;
        
        // Update accumulated USDT per share
        accUSDTPerShare += (toDistribute * 1e12) / totalStaked;
        
        // Update state
        pendingYieldUSDT = 0;
        totalYieldDistributed += toDistribute;
        lastYieldTime = block.timestamp;
        
        emit YieldDistributed(toDistribute, accUSDTPerShare);
    }
    
    // View functions
    function pendingRewards(address user) external view returns (uint256) {
        StakeInfo memory userStake = userStakes[user];
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 currentAccUSDTPerShare = accUSDTPerShare;
        
        // Calculate additional yield that would be distributed
        if (totalStaked > 0 && pendingYieldUSDT > 0) {
            uint256 timeSinceLastDistribution = block.timestamp - lastYieldTime;
            uint256 dailyDistribution = (pendingYieldUSDT * yieldDistributionRate) / 10000;
            uint256 timeBasedDistribution = (dailyDistribution * timeSinceLastDistribution) / 1 days;
            uint256 toDistribute = timeBasedDistribution > pendingYieldUSDT ? 
                pendingYieldUSDT : timeBasedDistribution;
            
            if (toDistribute > 0) {
                currentAccUSDTPerShare += (toDistribute * 1e12) / totalStaked;
            }
        }
        
        return (userStake.amount * currentAccUSDTPerShare) / 1e12 - userStake.rewardDebt;
    }
    
    function getUserStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingUSDT,
        uint256 totalClaimedUSDT,
        uint256 lastStakeTime,
        bool canUnstake
    ) {
        StakeInfo memory userStake = userStakes[user];
        stakedAmount = userStake.amount;
        pendingUSDT = this.pendingRewards(user);
        totalClaimedUSDT = userStake.totalClaimed;
        lastStakeTime = userStake.lastStakeTime;
        canUnstake = block.timestamp >= userStake.lastStakeTime + unstakeLockPeriod;
    }
    
    function getPoolStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalYieldDistributed,
        uint256 _pendingYieldUSDT,
        uint256 _currentAPY,
        uint256 _poolUSDTBalance
    ) {
        _totalStaked = totalStaked;
        _totalYieldDistributed = totalYieldDistributed;
        _pendingYieldUSDT = pendingYieldUSDT;
        _poolUSDTBalance = usdt.balanceOf(address(this));
        
        // Calculate approximate APY based on recent yield
        if (_totalStaked > 0 && _totalYieldDistributed > 0) {
            // Simple APY calculation (this could be more sophisticated)
            uint256 timeOperating = block.timestamp - (block.timestamp - 365 days); // Placeholder
            if (timeOperating > 0) {
                _currentAPY = (_totalYieldDistributed * 365 days * 10000) / (_totalStaked * timeOperating);
            }
        }
    }
    
    // Emergency functions
    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage user = userStakes[msg.sender];
        require(user.amount > 0, "No staked amount");
        
        uint256 amount = user.amount;
        
        // Reset user stake (forfeit rewards in emergency)
        user.amount = 0;
        user.rewardDebt = 0;
        totalStaked -= amount;
        
        // Transfer RAT tokens back to user
        ratToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Admin emergency withdrawal
    function emergencyWithdrawAdmin(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    receive() external payable {}
}