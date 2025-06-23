// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPriceOracle {
    /**
     * @dev Returns the latest price for a given asset
     * @param asset The asset address or identifier
     * @return price The price in USD with 8 decimals
     * @return timestamp The timestamp of the price
     */
    function getLatestPrice(address asset) external view returns (int256 price, uint256 timestamp);
    
    /**
     * @dev Returns the latest price for multiple assets
     * @param assets Array of asset addresses
     * @return prices Array of prices in USD with 8 decimals
     * @return timestamp The timestamp of the prices
     */
    function getLatestPrices(address[] calldata assets) 
        external 
        view 
        returns (int256[] memory prices, uint256 timestamp);
    
    /**
     * @dev Checks if the price data is fresh (within acceptable staleness threshold)
     * @param asset The asset address
     * @return fresh True if price is fresh, false otherwise
     */
    function isPriceFresh(address asset) external view returns (bool fresh);
    
    /**
     * @dev Returns the staleness threshold for price data
     * @return threshold Staleness threshold in seconds
     */
    function getStalenessThreshold() external view returns (uint256 threshold);
    
    /**
     * @dev Converts asset value to USD using current price
     * @param asset The asset address
     * @param amount The amount of asset
     * @return usdValue The USD value with 8 decimals
     */
    function convertToUSD(address asset, uint256 amount) external view returns (uint256 usdValue);
}