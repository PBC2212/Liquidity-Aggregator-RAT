// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    /**
     * @dev Get current price for an asset
     * @param asset Asset identifier
     * @return price Current price in USD with 8 decimal places
     */
    function getPrice(string memory asset) external view returns (uint256 price);
    
    /**
     * @dev Check if price exists and is fresh for an asset
     * @param asset Asset identifier
     * @return exists Whether price data exists
     * @return isFresh Whether the price is fresh (not stale)
     */
    function isPriceAvailable(string memory asset) external view returns (
        bool exists,
        bool isFresh
    );
}