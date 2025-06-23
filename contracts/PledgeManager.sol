// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./RATToken.sol";

interface ILiquidityAggregator {
    function triggerLiquidityAggregation(uint256 assetValue, address pledger) external;
}

contract PledgeManager is Ownable, ReentrancyGuard, Pausable {
    RATToken public immutable ratToken;
    ILiquidityAggregator public liquidityAggregator;
    
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
    }
    
    mapping(uint256 => AssetPledge) public pledges;
    mapping(address => uint256[]) public userPledges;
    uint256 public nextPledgeId = 1;
    
    // RAT Pool for custody
    mapping(address => uint256) public userRATBalance; // User's RAT balance in custody
    uint256 public totalRATInCustody;
    
    // Asset to RAT conversion rate (1 USD = X RAT tokens)
    uint256 public ratConversionRate = 10**18; // 1:1 by default
    
    event AssetPledged(
        uint256 indexed pledgeId,
        address indexed pledger,
        uint256 estimatedValue,
        string assetDescription
    );
    
    event AssetApproved(
        uint256 indexed pledgeId,
        uint256 ratTokensIssued
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
    
    function setRATConversionRate(uint256 _rate) external onlyOwner {
        ratConversionRate = _rate;
    }
    
    function pledgeAsset(
        string calldata assetDescription,
        uint256 estimatedValue,
        string calldata documentHash
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
            approvalTime: 0
        });
        
        userPledges[msg.sender].push(pledgeId);
        
        emit AssetPledged(pledgeId, msg.sender, estimatedValue, assetDescription);
    }
    
    function approveAsset(
        uint256 pledgeId,
        uint256 approvedValue
    ) external onlyOwner onlyValidPledge(pledgeId) {
        AssetPledge storage pledge = pledges[pledgeId];
        require(pledge.status == AssetStatus.Pending, "Asset already processed");
        require(approvedValue > 0, "Approved value must be greater than 0");
        
        pledge.status = AssetStatus.Approved;
        pledge.approvalTime = block.timestamp;
        
        // Calculate RAT tokens to issue
        uint256 ratTokensToIssue = (approvedValue * ratConversionRate) / 10**18;
        pledge.ratTokensIssued = ratTokensToIssue;
        
        // Mint RAT tokens to this contract (custody pool)
        ratToken.mint(address(this), ratTokensToIssue);
        
        // Add to user's custody balance
        userRATBalance[pledge.pledger] += ratTokensToIssue;
        totalRATInCustody += ratTokensToIssue;
        
        emit AssetApproved(pledgeId, ratTokensToIssue);
        
        // Trigger liquidity aggregation
        if (address(liquidityAggregator) != address(0)) {
            liquidityAggregator.triggerLiquidityAggregation(approvedValue, pledge.pledger);
        }
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
        // This is a placeholder - you'll implement actual swap execution
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
        // Return the amount of USDT received
        return minUSDTReceived; // Placeholder
    }
    
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