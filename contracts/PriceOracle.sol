// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPriceOracle.sol";

contract PriceOracle is IPriceOracle, Ownable {
    mapping(address => AggregatorV3Interface) public priceFeeds;
    mapping(address => uint8) public assetDecimals;
    mapping(address => string) public assetNames;
    
    uint256 public stalenessThreshold = 3600; // 1 hour default
    
    event PriceFeedAdded(address indexed asset, address indexed feed, string name);
    event PriceFeedUpdated(address indexed asset, address indexed oldFeed, address indexed newFeed);
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    constructor() {}
    
    /**
     * @dev Add a Chainlink price feed for an asset
     * @param asset The asset address (use address(0) for ETH)
     * @param feed The Chainlink aggregator address
     * @param name Human readable name for the asset
     */
    function addPriceFeed(
        address asset, 
        address feed, 
        string calldata name
    ) external onlyOwner {
        require(feed != address(0), "Invalid feed address");
        require(address(priceFeeds[asset]) == address(0), "Feed already exists");
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        
        // Verify the feed works by fetching latest data
        (, , , uint256 updatedAt, ) = aggregator.latestRoundData();
        require(updatedAt > 0, "Invalid feed");
        
        priceFeeds[asset] = aggregator;
        assetDecimals[asset] = aggregator.decimals();
        assetNames[asset] = name;
        
        emit PriceFeedAdded(asset, feed, name);
    }
    
    /**
     * @dev Update an existing price feed
     */
    function updatePriceFeed(address asset, address newFeed) external onlyOwner {
        require(address(priceFeeds[asset]) != address(0), "Feed does not exist");
        require(newFeed != address(0), "Invalid feed address");
        
        address oldFeed = address(priceFeeds[asset]);
        AggregatorV3Interface aggregator = AggregatorV3Interface(newFeed);
        
        // Verify the new feed works
        (, , , uint256 updatedAt, ) = aggregator.latestRoundData();
        require(updatedAt > 0, "Invalid feed");
        
        priceFeeds[asset] = aggregator;
        assetDecimals[asset] = aggregator.decimals();
        
        emit PriceFeedUpdated(asset, oldFeed, newFeed);
    }
    
    /**
     * @dev Set the staleness threshold for price data
     */
    function setStalenessThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0, "Invalid threshold");
        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = threshold;
        emit StalenessThresholdUpdated(oldThreshold, threshold);
    }
    
    /**
     * @dev Get the latest price for an asset
     */
    function getLatestPrice(address asset) 
        external 
        view 
        override 
        returns (int256 price, uint256 timestamp) 
    {
        AggregatorV3Interface feed = priceFeeds[asset];
        require(address(feed) != address(0), "Price feed not found");
        
        (, int256 feedPrice, , uint256 updatedAt, ) = feed.latestRoundData();
        require(feedPrice > 0, "Invalid price");
        require(updatedAt > 0, "Invalid timestamp");
        
        // Normalize to 8 decimals (Chainlink standard)
        uint8 decimals = feed.decimals();
        if (decimals != 8) {
            if (decimals > 8) {
                price = feedPrice / int256(10**(decimals - 8));
            } else {
                price = feedPrice * int256(10**(8 - decimals));
            }
        } else {
            price = feedPrice;
        }
        
        timestamp = updatedAt;
    }
    
    /**
     * @dev Get latest prices for multiple assets
     */
    function getLatestPrices(address[] calldata assets) 
        external 
        view 
        override 
        returns (int256[] memory prices, uint256 timestamp) 
    {
        prices = new int256[](assets.length);
        uint256 latestTimestamp = 0;
        
        for (uint256 i = 0; i < assets.length; i++) {
            (int256 price, uint256 assetTimestamp) = this.getLatestPrice(assets[i]);
            prices[i] = price;
            
            if (assetTimestamp > latestTimestamp) {
                latestTimestamp = assetTimestamp;
            }
        }
        
        timestamp = latestTimestamp;
    }
    
    /**
     * @dev Check if price data is fresh
     */
    function isPriceFresh(address asset) external view override returns (bool) {
        AggregatorV3Interface feed = priceFeeds[asset];
        if (address(feed) == address(0)) return false;
        
        (, , , uint256 updatedAt, ) = feed.latestRoundData();
        return (block.timestamp - updatedAt) <= stalenessThreshold;
    }
    
    /**
     * @dev Get staleness threshold
     */
    function getStalenessThreshold() external view override returns (uint256) {
        return stalenessThreshold;
    }
    
    /**
     * @dev Convert asset amount to USD value
     */
    function convertToUSD(address asset, uint256 amount) 
        external 
        view 
        override 
        returns (uint256 usdValue) 
    {
        require(this.isPriceFresh(asset), "Stale price data");
        
        (int256 price, ) = this.getLatestPrice(asset);
        require(price > 0, "Invalid price");
        
        // Assuming asset has 18 decimals, price has 8 decimals
        // Result should have 8 decimal places for USD
        usdValue = (amount * uint256(price)) / 10**18;
    }
    
    /**
     * @dev Remove a price feed (emergency function)
     */
    function removePriceFeed(address asset) external onlyOwner {
        require(address(priceFeeds[asset]) != address(0), "Feed does not exist");
        delete priceFeeds[asset];
        delete assetDecimals[asset];
        delete assetNames[asset];
    }
    
    /**
     * @dev Emergency circuit breaker
     */
    function emergencyPause() external onlyOwner {
        // Implement emergency pause logic if needed
        // Could pause all price feeds or specific ones
    }
}