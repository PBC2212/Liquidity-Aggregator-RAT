// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPriceOracle.sol";

contract PriceOracle is IPriceOracle, Ownable {
    
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(string => PriceData) private assetPrices;
    mapping(address => bool) public authorizedUpdaters;
    
    uint256 public constant PRICE_STALENESS_THRESHOLD = 24 hours;
    
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event UpdaterAuthorized(address indexed updater, bool authorized);
    
    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedUpdaters[initialOwner] = true;
    }
    
    function updatePrice(string memory asset, uint256 price) external onlyAuthorized {
        require(bytes(asset).length > 0, "Asset cannot be empty");
        require(price > 0, "Price must be greater than 0");
        
        assetPrices[asset] = PriceData({
            price: price,
            timestamp: block.timestamp,
            isActive: true
        });
        
        emit PriceUpdated(asset, price, block.timestamp);
    }
    
    function getPrice(string memory asset) external view override returns (uint256 price) {
        PriceData memory priceData = assetPrices[asset];
        require(priceData.isActive, "Asset price not available");
        require(
            block.timestamp - priceData.timestamp <= PRICE_STALENESS_THRESHOLD,
            "Price data is stale"
        );
        
        return priceData.price;
    }
    
    function isPriceAvailable(string memory asset) external view override returns (
        bool exists,
        bool isFresh
    ) {
        PriceData memory priceData = assetPrices[asset];
        exists = priceData.isActive;
        isFresh = exists && (block.timestamp - priceData.timestamp <= PRICE_STALENESS_THRESHOLD);
        
        return (exists, isFresh);
    }
    
    function setUpdaterAuthorization(address updater, bool authorized) external onlyOwner {
        require(updater != address(0), "Invalid updater address");
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }
}