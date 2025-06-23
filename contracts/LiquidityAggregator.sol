// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Extended is IERC20 {
    function decimals() external view returns (uint8);
}

interface IUniswapV2Router {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
    
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IRATStakingPool {
    function addYield(uint256 usdtAmount) external;
}

contract LiquidityAggregator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Extended;
    
    IERC20Extended public immutable USDT;
    IERC20Extended public immutable WETH;
    
    // DEX Router addresses
    mapping(string => address) public dexRouters;
    mapping(address => bool) public authorizedCallers; // PledgeManager, etc.
    
    // Staking pool integration
    IRATStakingPool public ratStakingPool;
    bool public autoYieldEnabled = true;
    uint256 public yieldPercentage = 5000; // 50% of acquired USDT goes to yield (5000/10000)
    
    // Fee configuration
    uint256 public aggregatorFeePercent = 50; // 0.5% (50/10000)
    uint256 public constant MAX_FEE_PERCENT = 500; // 5% max
    address public feeRecipient;
    
    // Liquidity sources configuration
    uint256 public minLiquidityThreshold = 100 * 10**6; // $100 USDT minimum
    uint256 public maxSlippage = 300; // 3% (300/10000)
    
    // Tracking
    uint256 public totalUSDTAggregated;
    uint256 public totalYieldProvided;
    
    // Events
    event LiquidityAggregated(
        address indexed pledger,
        uint256 assetValue,
        uint256 usdtAcquired,
        uint256 feesTaken,
        uint256 yieldProvided,
        string dexUsed
    );
    
    event YieldProvidedToPool(uint256 usdtAmount);
    event DEXRouterUpdated(string dexName, address router);
    event FeeUpdated(uint256 newFeePercent);
    event SlippageUpdated(uint256 newMaxSlippage);
    event AutoYieldConfigUpdated(bool enabled, uint256 percentage);
    
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender], "Not authorized");
        _;
    }
    
    constructor(
        address _usdt,
        address _weth,
        address _feeRecipient
    ) {
        USDT = IERC20Extended(_usdt);
        WETH = IERC20Extended(_weth);
        feeRecipient = _feeRecipient;
        authorizedCallers[msg.sender] = true;
        
        // Initialize with common DEX routers (update addresses for your network)
        dexRouters["uniswap"] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Uniswap V2
        dexRouters["sushiswap"] = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F; // SushiSwap
        dexRouters["pancakeswap"] = 0x10ED43C718714eb63d5aA57B78B54704E256024E; // PancakeSwap (BSC)
    }
    
    function setRATStakingPool(address _stakingPool) external onlyOwner {
        ratStakingPool = IRATStakingPool(_stakingPool);
    }
    
    function setAutoYieldConfig(bool _enabled, uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Percentage cannot exceed 100%");
        autoYieldEnabled = _enabled;
        yieldPercentage = _percentage;
        emit AutoYieldConfigUpdated(_enabled, _percentage);
    }
    
    function addAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }
    
    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }
    
    function updateDEXRouter(string calldata dexName, address router) external onlyOwner {
        dexRouters[dexName] = router;
        emit DEXRouterUpdated(dexName, router);
    }
    
    function setAggregatorFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Fee too high");
        aggregatorFeePercent = _feePercent;
        emit FeeUpdated(_feePercent);
    }
    
    function setMaxSlippage(uint256 _maxSlippage) external onlyOwner {
        require(_maxSlippage <= 1000, "Slippage too high"); // Max 10%
        maxSlippage = _maxSlippage;
        emit SlippageUpdated(_maxSlippage);
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    function triggerLiquidityAggregation(
        uint256 assetValue,
        address pledger
    ) external onlyAuthorized nonReentrant {
        require(assetValue >= minLiquidityThreshold, "Below minimum threshold");
        
        // Calculate target USDT amount (matching asset value)
        uint256 targetUSDT = assetValue / 10**12; // Convert from 18 decimals to 6 decimals (USDT)
        
        // Try to aggregate liquidity from best available source
        (uint256 usdtAcquired, string memory dexUsed) = _aggregateLiquidity(targetUSDT);
        
        // Calculate and take fees
        uint256 fees = (usdtAcquired * aggregatorFeePercent) / 10000;
        uint256 netUSDT = usdtAcquired - fees;
        
        // Transfer fees to fee recipient
        if (fees > 0 && feeRecipient != address(0)) {
            USDT.safeTransfer(feeRecipient, fees);
        }
        
        // Calculate yield amount for staking pool
        uint256 yieldAmount = 0;
        if (autoYieldEnabled && address(ratStakingPool) != address(0)) {
            yieldAmount = (netUSDT * yieldPercentage) / 10000;
            
            if (yieldAmount > 0) {
                // Approve and add yield to staking pool
                USDT.safeApprove(address(ratStakingPool), yieldAmount);
                ratStakingPool.addYield(yieldAmount);
                
                totalYieldProvided += yieldAmount;
                emit YieldProvidedToPool(yieldAmount);
            }
        }
        
        // Remaining USDT stays in this contract for additional liquidity
        uint256 remainingUSDT = netUSDT - yieldAmount;
        totalUSDTAggregated += usdtAcquired;
        
        emit LiquidityAggregated(
            pledger, 
            assetValue, 
            usdtAcquired, 
            fees, 
            yieldAmount, 
            dexUsed
        );
    }
    
    function _aggregateLiquidity(uint256 targetUSDT) 
        internal 
        returns (uint256 usdtAcquired, string memory dexUsed) 
    {
        // Try Uniswap first
        (bool success, uint256 amount) = _tryUniswapAggregation(targetUSDT, "uniswap");
        if (success && amount > 0) {
            return (amount, "uniswap");
        }
        
        // Try SushiSwap
        (success, amount) = _tryUniswapAggregation(targetUSDT, "sushiswap");
        if (success && amount > 0) {
            return (amount, "sushiswap");
        }
        
        // Try PancakeSwap (if on BSC)
        (success, amount) = _tryUniswapAggregation(targetUSDT, "pancakeswap");
        if (success && amount > 0) {
            return (amount, "pancakeswap");
        }
        
        // If all fail, revert
        revert("No liquidity available");
    }
    
    function _tryUniswapAggregation(
        uint256 targetUSDT,
        string memory dexName
    ) internal returns (bool success, uint256 usdtAmount) {
        address router = dexRouters[dexName];
        if (router == address(0)) return (false, 0);
        
        try this._executeUniswapSwap(router, targetUSDT) returns (uint256 amount) {
            return (true, amount);
        } catch {
            return (false, 0);
        }
    }
    
    function _executeUniswapSwap(
        address router,
        uint256 targetUSDT
    ) external returns (uint256) {
        require(msg.sender == address(this), "Internal call only");
        
        IUniswapV2Router uniRouter = IUniswapV2Router(router);
        
        // Create path: ETH -> USDT
        address[] memory path = new address[](2);
        path[0] = address(WETH);
        path[1] = address(USDT);
        
        // Calculate required ETH amount
        uint256[] memory amountsIn = uniRouter.getAmountsOut(1 ether, path);
        uint256 ethNeeded = (targetUSDT * 1 ether) / amountsIn[1];
        
        // Check if contract has enough ETH
        if (address(this).balance < ethNeeded) {
            revert("Insufficient ETH balance");
        }
        
        // Calculate minimum output with slippage protection
        uint256 minAmountOut = (targetUSDT * (10000 - maxSlippage)) / 10000;
        
        // Execute swap
        uint256[] memory amounts = uniRouter.swapExactETHForTokens{value: ethNeeded}(
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        return amounts[1]; // USDT amount received
    }
    
    // Manual yield provision to staking pool
    function provideYieldToPool(uint256 usdtAmount) external onlyOwner {
        require(address(ratStakingPool) != address(0), "Staking pool not set");
        require(usdtAmount > 0, "Amount must be greater than 0");
        require(USDT.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT balance");
        
        USDT.safeApprove(address(ratStakingPool), usdtAmount);
        ratStakingPool.addYield(usdtAmount);
        
        totalYieldProvided += usdtAmount;
        emit YieldProvidedToPool(usdtAmount);
    }
    
    // Function to add ETH liquidity for swapping
    function addETHLiquidity() external payable onlyOwner {
        // ETH is now available for swaps
    }
    
    // Function to add token liquidity
    function addTokenLiquidity(address token, uint256 amount) external onlyOwner {
        IERC20Extended(token).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    // Get best quote across all DEXs
    function getBestQuote(uint256 amountIn, address tokenIn, address tokenOut) 
        external 
        view 
        returns (uint256 bestAmountOut, string memory bestDex) 
    {
        uint256 maxOut = 0;
        string memory topDex = "";
        
        // Check each DEX
        string[] memory dexNames = new string[](3);
        dexNames[0] = "uniswap";
        dexNames[1] = "sushiswap"; 
        dexNames[2] = "pancakeswap";
        
        for (uint i = 0; i < dexNames.length; i++) {
            address router = dexRouters[dexNames[i]];
            if (router != address(0)) {
                try this._getQuoteFromDEX(router, amountIn, tokenIn, tokenOut) returns (uint256 amountOut) {
                    if (amountOut > maxOut) {
                        maxOut = amountOut;
                        topDex = dexNames[i];
                    }
                } catch {
                    // Skip this DEX if quote fails
                }
            }
        }
        
        return (maxOut, topDex);
    }
    
    function _getQuoteFromDEX(
        address router,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256) {
        require(msg.sender == address(this), "Internal call only");
        
        IUniswapV2Router uniRouter = IUniswapV2Router(router);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256[] memory amounts = uniRouter.getAmountsOut(amountIn, path);
        return amounts[1];
    }
    
    // View functions for analytics
    function getAggregatorStats() external view returns (
        uint256 _totalUSDTAggregated,
        uint256 _totalYieldProvided,
        uint256 _currentUSDTBalance,
        uint256 _yieldPercentage,
        bool _autoYieldEnabled
    ) {
        _totalUSDTAggregated = totalUSDTAggregated;
        _totalYieldProvided = totalYieldProvided;
        _currentUSDTBalance = USDT.balanceOf(address(this));
        _yieldPercentage = yieldPercentage;
        _autoYieldEnabled = autoYieldEnabled;
    }
    
    // Emergency withdrawal function
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20Extended(token).safeTransfer(owner(), amount);
        }
    }
    
    // Function to receive ETH
    receive() external payable {}
}