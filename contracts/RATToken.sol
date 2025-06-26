// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract RATToken is ERC20, Ownable, Pausable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public totalMinted;
    
    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    
    constructor(address initialOwner) 
        ERC20("Real Asset Token", "RAT") 
        Ownable(initialOwner)
    {
        // Mint initial supply to deployer
        uint256 initialSupply = 100000000 * 10**18; // 100 million tokens
        _mint(initialOwner, initialSupply);
        totalMinted = initialSupply;
        
        emit TokensMinted(initialOwner, initialSupply, "Initial mint");
    }
    
    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting
     */
    function mint(address to, uint256 amount, string memory reason) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalMinted + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(to, amount);
        totalMinted += amount;
        
        emit TokensMinted(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burn(uint256 amount, string memory reason) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        totalMinted -= amount;
        
        emit TokensBurned(msg.sender, amount, reason);
    }
    
    /**
     * @dev Override transfer to add pause functionality
     */
    function _update(address from, address to, uint256 value) 
        internal 
        whenNotPaused 
        override
    {
        super._update(from, to, value);
    }
    
    /**
     * @dev Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get remaining mintable supply
     */
    function getRemainingMintableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
}