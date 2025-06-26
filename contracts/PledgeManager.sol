// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPriceOracle.sol";

contract PledgeManager is Ownable, ReentrancyGuard, Pausable {
    
    struct AssetPledge {
        address pledger;
        string assetType;
        uint256 assetValue;
        string ipfsHash;
        uint256 timestamp;
        PledgeStatus status;
        uint256 ratTokensMinted;
        string verificationNotes;
    }
    
    enum PledgeStatus {
        Pending,
        Verified,
        Rejected,
        Liquidated
    }
    
    // State variables
    mapping(uint256 => AssetPledge) public pledges;
    mapping(address => uint256[]) public userPledges;
    uint256 public nextPledgeId = 1;
    uint256 public totalActiveValue;
    
    IPriceOracle public priceOracle;
    address public ratTokenAddress;
    
    // Events
    event AssetPledged(
        uint256 indexed pledgeId,
        address indexed pledger,
        string assetType,
        uint256 assetValue,
        string ipfsHash
    );
    
    event PledgeVerified(
        uint256 indexed pledgeId,
        uint256 ratTokensMinted,
        string verificationNotes
    );
    
    event PledgeRejected(
        uint256 indexed pledgeId,
        string reason
    );
    
    event PledgeLiquidated(
        uint256 indexed pledgeId,
        uint256 recoveredValue
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Submit a new asset pledge
     * @param assetType Type of asset being pledged
     * @param assetValue Declared value of the asset
     * @param ipfsHash IPFS hash of asset documentation
     */
    function submitPledge(
        string memory assetType,
        uint256 assetValue,
        string memory ipfsHash
    ) external whenNotPaused nonReentrant {
        require(bytes(assetType).length > 0, "Asset type cannot be empty");
        require(assetValue > 0, "Asset value must be greater than 0");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        uint256 pledgeId = nextPledgeId++;
        
        pledges[pledgeId] = AssetPledge({
            pledger: msg.sender,
            assetType: assetType,
            assetValue: assetValue,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            status: PledgeStatus.Pending,
            ratTokensMinted: 0,
            verificationNotes: ""
        });
        
        userPledges[msg.sender].push(pledgeId);
        
        emit AssetPledged(pledgeId, msg.sender, assetType, assetValue, ipfsHash);
    }
    
    /**
     * @dev Verify and approve an asset pledge (admin only)
     * @param pledgeId ID of the pledge to verify
     * @param ratTokensToMint Amount of RAT tokens to mint
     * @param verificationNotes Notes from the verification process
     */
    function verifyPledge(
        uint256 pledgeId,
        uint256 ratTokensToMint,
        string memory verificationNotes
    ) external onlyOwner {
        require(pledges[pledgeId].pledger != address(0), "Pledge does not exist");
        require(pledges[pledgeId].status == PledgeStatus.Pending, "Pledge not pending");
        require(ratTokensToMint > 0, "Must mint at least 1 token");
        
        pledges[pledgeId].status = PledgeStatus.Verified;
        pledges[pledgeId].ratTokensMinted = ratTokensToMint;
        pledges[pledgeId].verificationNotes = verificationNotes;
        
        totalActiveValue += pledges[pledgeId].assetValue;
        
        // Mint RAT tokens to the pledger
        // Note: This requires the RATToken contract to be set and this contract to have minting rights
        if (ratTokenAddress != address(0)) {
            // Call mint function on RAT token contract
            (bool success, ) = ratTokenAddress.call(
                abi.encodeWithSignature(
                    "mint(address,uint256,string)",
                    pledges[pledgeId].pledger,
                    ratTokensToMint,
                    string(abi.encodePacked("Asset pledge verification #", toString(pledgeId)))
                )
            );
            require(success, "Failed to mint RAT tokens");
        }
        
        emit PledgeVerified(pledgeId, ratTokensToMint, verificationNotes);
    }
    
    /**
     * @dev Reject an asset pledge (admin only)
     * @param pledgeId ID of the pledge to reject
     * @param reason Reason for rejection
     */
    function rejectPledge(
        uint256 pledgeId,
        string memory reason
    ) external onlyOwner {
        require(pledges[pledgeId].pledger != address(0), "Pledge does not exist");
        require(pledges[pledgeId].status == PledgeStatus.Pending, "Pledge not pending");
        
        pledges[pledgeId].status = PledgeStatus.Rejected;
        pledges[pledgeId].verificationNotes = reason;
        
        emit PledgeRejected(pledgeId, reason);
    }
    
    /**
     * @dev Mark a pledge as liquidated (admin only)
     * @param pledgeId ID of the pledge to liquidate
     * @param recoveredValue Value recovered from liquidation
     */
    function liquidatePledge(
        uint256 pledgeId,
        uint256 recoveredValue
    ) external onlyOwner {
        require(pledges[pledgeId].pledger != address(0), "Pledge does not exist");
        require(pledges[pledgeId].status == PledgeStatus.Verified, "Pledge not verified");
        
        pledges[pledgeId].status = PledgeStatus.Liquidated;
        totalActiveValue -= pledges[pledgeId].assetValue;
        
        emit PledgeLiquidated(pledgeId, recoveredValue);
    }
    
    /**
     * @dev Set the RAT token contract address (admin only)
     * @param _ratTokenAddress Address of the RAT token contract
     */
    function setRATTokenAddress(address _ratTokenAddress) external onlyOwner {
        require(_ratTokenAddress != address(0), "Invalid token address");
        ratTokenAddress = _ratTokenAddress;
    }
    
    /**
     * @dev Set the price oracle contract (admin only)
     * @param _priceOracle Address of the price oracle contract
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle address");
        priceOracle = IPriceOracle(_priceOracle);
    }
    
    /**
     * @dev Get pledge details
     * @param pledgeId ID of the pledge
     */
    function getPledge(uint256 pledgeId) external view returns (AssetPledge memory) {
        require(pledges[pledgeId].pledger != address(0), "Pledge does not exist");
        return pledges[pledgeId];
    }
    
    /**
     * @dev Get all pledge IDs for a user
     * @param user Address of the user
     */
    function getUserPledges(address user) external view returns (uint256[] memory) {
        return userPledges[user];
    }
    
    /**
     * @dev Get total number of pledges
     */
    function getTotalPledges() external view returns (uint256) {
        return nextPledgeId - 1;
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
     * @dev Helper function to convert uint to string
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}