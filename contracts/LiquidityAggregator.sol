// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Extended is IERC20 {
    function decimals() external view returns (uint8);
}

interface IRATStakingPool {
    function addYield(uint256 amount) external;
}

interface IPancakeRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);
}

contract LiquidityAggregator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Extended;
    
    struct DEXConfig {
        address router;
        bool isActive;
        uint256 priority; // Lower number = higher priority
        string name;
    }
    
    struct SwapResult {
        uint256 amountOut;
        address dexUsed;
        string dexName;
        uint256 gasUsed;
    }
    
    // State variables
    mapping(address => DEXConfig) public dexConfigs;
    address[] public activeDEXes;
    
    IERC20Extended public immutable USDT;
    address public ratStakingPool;
    
    uint256 public totalUSDTAggregated;
    uint256 public totalSwapsExecuted;
    uint256 public slippageTolerance = 300; // 3% in basis points
    
    // Events
    event LiquidityAggregated(
        address indexed fromToken,
        uint256 amountIn,
        uint256 usdtOut,
        address dexUsed,
        string dexName
    );
    
    event DEXConfigured(
        address indexed router,
        bool isActive,
        uint256 priority,
        string name
    );
    
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
    event StakingPoolUpdated(address oldPool, address newPool);
    
    constructor(
        address _usdtAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_usdtAddress != address(0), "Invalid USDT address");
        USDT = IERC20Extended(_usdtAddress);
    }
    
    /**
     * @dev Configure a DEX router
     * @param router Address of the DEX router
     * @param isActive Whether the DEX is active
     * @param priority Priority level (lower = higher priority)
     * @param name Name of the DEX
     */
    function configureDEX(
        address router,
        bool isActive,
        uint256 priority,
        string memory name
    ) external onlyOwner {
        require(router != address(0), "Invalid router address");
        
        dexConfigs[router] = DEXConfig({
            router: router,
            isActive: isActive,
            priority: priority,
            name: name
        });
        
        // Add to active DEXes if not already present and is active
        if (isActive && !_isInActiveDEXes(router)) {
            activeDEXes.push(router);
        } else if (!isActive) {
            _removeFromActiveDEXes(router);
        }
        
        emit DEXConfigured(router, isActive, priority, name);
    }
    
    /**
     * @dev Set the RAT staking pool address
     * @param _ratStakingPool Address of the RAT staking pool
     */
    function setRATStakingPool(address _ratStakingPool) external onlyOwner {
        require(_ratStakingPool != address(0), "Invalid staking pool address");
        
        address oldPool = ratStakingPool;
        ratStakingPool = _ratStakingPool;
        
        emit StakingPoolUpdated(oldPool, _ratStakingPool);
    }
    
    /**
     * @dev Aggregate liquidity by swapping tokens to USDT
     * @param fromToken Token to swap from
     * @param amountIn Amount of tokens to swap
     * @param amountOutMin Minimum amount of USDT expected
     * @return swapResult Details of the swap execution
     */
    function aggregateLiquidity(
        address fromToken,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (SwapResult memory swapResult) {
        require(fromToken != address(0), "Invalid token address");
        require(amountIn > 0, "Amount must be greater than 0");
        require(fromToken != address(USDT), "Cannot swap USDT to USDT");
        
        IERC20Extended(fromToken).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Find best DEX for the swap
        (address bestDEX, uint256 bestAmountOut, string memory bestDEXName) = _findBestDEX(fromToken, amountIn);
        require(bestDEX != address(0), "No suitable DEX found");
        require(bestAmountOut >= amountOutMin, "Insufficient output amount");
        
        // Execute the swap
        uint256 usdtBalanceBefore = USDT.balanceOf(address(this));
        uint256 gasStart = gasleft();
        
        _executeSwap(fromToken, amountIn, bestAmountOut, bestDEX);
        
        uint256 gasUsed = gasStart - gasleft();
        uint256 usdtReceived = USDT.balanceOf(address(this)) - usdtBalanceBefore;
        
        // Update statistics
        totalUSDTAggregated += usdtReceived;
        totalSwapsExecuted++;
        
        // Distribute yield to staking pool (10% of swap amount)
        if (ratStakingPool != address(0) && usdtReceived > 0) {
            uint256 yieldAmount = usdtReceived / 10; // 10% yield
            if (yieldAmount > 0) {
                USDT.forceApprove(address(ratStakingPool), yieldAmount);
                IRATStakingPool(ratStakingPool).addYield(yieldAmount);
            }
        }
        
        // Transfer remaining USDT to the caller
        uint256 remainingUSDT = USDT.balanceOf(address(this));
        if (remainingUSDT > 0) {
            USDT.safeTransfer(msg.sender, remainingUSDT);
        }
        
        swapResult = SwapResult({
            amountOut: usdtReceived,
            dexUsed: bestDEX,
            dexName: bestDEXName,
            gasUsed: gasUsed
        });
        
        emit LiquidityAggregated(fromToken, amountIn, usdtReceived, bestDEX, bestDEXName);
    }
    
    /**
     * @dev Get the best quote for swapping tokens to USDT
     * @param fromToken Token to swap from
     * @param amountIn Amount of tokens to swap
     * @return bestDEX Address of the best DEX
     * @return bestAmountOut Best amount out from the best DEX
     * @return bestDEXName Name of the best DEX
     */
    function getBestQuote(
        address fromToken,
        uint256 amountIn
    ) external view returns (
        address bestDEX,
        uint256 bestAmountOut,
        string memory bestDEXName
    ) {
        return _findBestDEX(fromToken, amountIn);
    }
    
    /**
     * @dev Set slippage tolerance
     * @param _slippageTolerance New slippage tolerance in basis points
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage tolerance too high"); // Max 10%
        
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = _slippageTolerance;
        
        emit SlippageToleranceUpdated(oldTolerance, _slippageTolerance);
    }
    
    /**
     * @dev Get all active DEXes
     */
    function getActiveDEXes() external view returns (address[] memory) {
        return activeDEXes;
    }
    
    /**
     * @dev Get aggregation statistics
     */
    function getStats() external view returns (
        uint256 totalAggregated,
        uint256 totalSwaps,
        uint256 activeDEXCount
    ) {
        return (totalUSDTAggregated, totalSwapsExecuted, activeDEXes.length);
    }
    
    /**
     * @dev Emergency withdrawal function (admin only)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20Extended(token).safeTransfer(owner(), amount);
    }
    
    // Internal functions
    
    function _findBestDEX(
        address fromToken,
        uint256 amountIn
    ) internal view returns (
        address bestDEX,
        uint256 bestAmountOut,
        string memory bestDEXName
    ) {
        for (uint256 i = 0; i < activeDEXes.length; i++) {
            address dexRouter = activeDEXes[i];
            DEXConfig memory config = dexConfigs[dexRouter];
            
            if (!config.isActive) continue;
            
            try this._getQuoteFromDEX(dexRouter, fromToken, amountIn) returns (uint256 amountOut) {
                if (amountOut > bestAmountOut) {
                    bestDEX = dexRouter;
                    bestAmountOut = amountOut;
                    bestDEXName = config.name;
                }
            } catch {
                // Skip this DEX if quote fails
                continue;
            }
        }
    }
    
    function _getQuoteFromDEX(
        address router,
        address fromToken,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = address(USDT);
        
        uint256[] memory amounts = IPancakeRouter(router).getAmountsOut(amountIn, path);
        return amounts[1];
    }
    
    function _executeSwap(
        address fromToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address router
    ) internal {
        IERC20Extended(fromToken).forceApprove(router, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = address(USDT);
        
        // Apply slippage tolerance
        uint256 minAmountOut = (amountOutMin * (10000 - slippageTolerance)) / 10000;
        
        IPancakeRouter(router).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
    }
    
    function _isInActiveDEXes(address router) internal view returns (bool) {
        for (uint256 i = 0; i < activeDEXes.length; i++) {
            if (activeDEXes[i] == router) {
                return true;
            }
        }
        return false;
    }
    
    function _removeFromActiveDEXes(address router) internal {
        for (uint256 i = 0; i < activeDEXes.length; i++) {
            if (activeDEXes[i] == router) {
                activeDEXes[i] = activeDEXes[activeDEXes.length - 1];
                activeDEXes.pop();
                break;
            }
        }
    }
}