// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Extended is IERC20 {
    function decimals() external view returns (uint8);
}

contract RATStakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20Extended;
    
    struct StakeInfo {
        uint256 amount;
        uint256 stakingTime;
        uint256 lastRewardClaim;
        uint256 accumulatedRewards;
    }
    
    struct PoolInfo {
        uint256 totalStaked;
        uint256 totalRewards;
        uint256 rewardPerTokenStored;
        uint256 lastUpdateTime;
        uint256 rewardRate; // Rewards per second
    }
    
    // State variables
    IERC20Extended public immutable ratToken;
    IERC20Extended public immutable rewardToken; // USDT
    
    PoolInfo public poolInfo;
    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public userRewardPerTokenPaid;
    
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 RAT tokens
    uint256 public constant MIN_STAKE_DURATION = 7 days;
    uint256 public constant EARLY_UNSTAKE_PENALTY = 1000; // 10% in basis points
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 penalty);
    event RewardsClaimed(address indexed user, uint256 amount);
    event YieldAdded(uint256 amount, address indexed contributor);
    event RewardRateUpdated(uint256 newRate);
    
    constructor(
        address _ratToken,
        address _rewardToken,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_ratToken != address(0), "Invalid RAT token address");
        require(_rewardToken != address(0), "Invalid reward token address");
        
        ratToken = IERC20Extended(_ratToken);
        rewardToken = IERC20Extended(_rewardToken);
        
        poolInfo.lastUpdateTime = block.timestamp;
        poolInfo.rewardRate = 1 * 10**18; // 1 USDT per second initially
    }
    
    modifier updateReward(address account) {
        poolInfo.rewardPerTokenStored = rewardPerToken();
        poolInfo.lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            stakes[account].accumulatedRewards = earned(account);
            userRewardPerTokenPaid[account] = poolInfo.rewardPerTokenStored;
        }
        _;
    }
    
    /**
     * @dev Stake RAT tokens
     * @param amount Amount of RAT tokens to stake
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant updateReward(msg.sender) {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        
        ratToken.safeTransferFrom(msg.sender, address(this), amount);
        
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].stakingTime = block.timestamp;
        stakes[msg.sender].lastRewardClaim = block.timestamp;
        
        poolInfo.totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Unstake RAT tokens
     * @param amount Amount of RAT tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Amount must be greater than 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        
        uint256 penalty = 0;
        uint256 stakingDuration = block.timestamp - stakes[msg.sender].stakingTime;
        
        // Apply early unstaking penalty if staked for less than minimum duration
        if (stakingDuration < MIN_STAKE_DURATION) {
            penalty = (amount * EARLY_UNSTAKE_PENALTY) / 10000;
        }
        
        uint256 amountToReturn = amount - penalty;
        
        stakes[msg.sender].amount -= amount;
        poolInfo.totalStaked -= amount;
        
        // Transfer tokens back to user
        ratToken.safeTransfer(msg.sender, amountToReturn);
        
        // If there's a penalty, keep it in the contract (or send to treasury)
        if (penalty > 0) {
            // Penalty stays in contract and can be used for additional rewards
            poolInfo.totalRewards += penalty;
        }
        
        emit Unstaked(msg.sender, amountToReturn, penalty);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = stakes[msg.sender].accumulatedRewards;
        require(reward > 0, "No rewards to claim");
        
        stakes[msg.sender].accumulatedRewards = 0;
        stakes[msg.sender].lastRewardClaim = block.timestamp;
        
        rewardToken.safeTransfer(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, reward);
    }
    
    /**
     * @dev Add yield to the pool (called by LiquidityAggregator)
     * @param amount Amount of USDT to add as yield
     */
    function addYield(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        poolInfo.totalRewards += amount;
        
        // Increase reward rate based on the yield added
        if (poolInfo.totalStaked > 0) {
            uint256 additionalRate = amount / (7 days); // Distribute over 7 days
            poolInfo.rewardRate += additionalRate;
        }
        
        emit YieldAdded(amount, msg.sender);
    }
    
    /**
     * @dev Set reward rate (admin only)
     * @param _rewardRate New reward rate (rewards per second)
     */
    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        poolInfo.rewardRate = _rewardRate;
        emit RewardRateUpdated(_rewardRate);
    }
    
    /**
     * @dev Calculate reward per token
     */
    function rewardPerToken() public view returns (uint256) {
        if (poolInfo.totalStaked == 0) {
            return poolInfo.rewardPerTokenStored;
        }
        
        return poolInfo.rewardPerTokenStored + 
            (((block.timestamp - poolInfo.lastUpdateTime) * poolInfo.rewardRate * 1e18) / poolInfo.totalStaked);
    }
    
    /**
     * @dev Calculate earned rewards for an account
     * @param account Address of the account
     */
    function earned(address account) public view returns (uint256) {
        return (stakes[account].amount * 
            (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18) + 
            stakes[account].accumulatedRewards;
    }
    
    /**
     * @dev Get staking information for an account
     * @param account Address of the account
     */
    function getStakeInfo(address account) external view returns (
        uint256 stakedAmount,
        uint256 stakingTime,
        uint256 stakingDuration,
        uint256 earnedRewards,
        bool canUnstakeWithoutPenalty
    ) {
        StakeInfo memory stakeInfo = stakes[account];
        uint256 duration = block.timestamp - stakeInfo.stakingTime;
        bool noPenalty = duration >= MIN_STAKE_DURATION;
        
        return (
            stakeInfo.amount,
            stakeInfo.stakingTime,
            duration,
            earned(account),
            noPenalty
        );
    }
    
    /**
     * @dev Get pool statistics
     */
    function getPoolStats() external view returns (
        uint256 totalStaked,
        uint256 totalRewards,
        uint256 currentRewardRate,
        uint256 totalStakers
    ) {
        // Note: totalStakers would require additional tracking
        return (
            poolInfo.totalStaked,
            poolInfo.totalRewards,
            poolInfo.rewardRate,
            0 // Placeholder for total stakers
        );
    }
    
    /**
     * @dev Calculate early unstaking penalty for an amount
     * @param account Address of the account
     * @param amount Amount to potentially unstake
     */
    function calculatePenalty(address account, uint256 amount) external view returns (uint256) {
        uint256 stakingDuration = block.timestamp - stakes[account].stakingTime;
        
        if (stakingDuration >= MIN_STAKE_DURATION) {
            return 0;
        }
        
        return (amount * EARLY_UNSTAKE_PENALTY) / 10000;
    }
    
    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal function (admin only)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20Extended(token).safeTransfer(owner(), amount);
    }
}