// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

//is xxx

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "../types/MarkExchangeEvents.sol";


import {
  Side,
  SignatureVersion,
  AssetType,
  Fee,
  Order,
  SettlementInput,
  Settlement
} from "../types/MarkExchangeDataTypes.sol";

contract InputSettlement is Ownable, MarkExchangeEvents {
    using SafeERC20 for IERC20;
    
    // constants
    // etherium WETH
    // address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;  //@@dexter TODO: to change this address
    // Mock token address
    // address public constant WETH = 0xD5ac451B0c50B9476107823Af206eD814a2e2580;  //@@dexter TODO: to change this address
    // sepolia WETH
    address public constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;  //@@dexter TODO: to change this address

    uint256 public constant INVERSE_BASIS_POINT = 10_000;

    // variables
    //Platform charges
    uint256 public maxPlatformFeeRate;  //250 maybe i.e., 2.5%
    uint256 public platformFeeRate; //feeRate
    address public platformFeeRecipient;
    
    uint256 public remainingETH = 0;

    constructor(uint256 _maxPlatformFeeRate) {
        maxPlatformFeeRate = _maxPlatformFeeRate;
    }

    function setPlatformFeeRate(uint256 _platformFeeRate)
        external
        onlyOwner
    {
        require(_platformFeeRate <= maxPlatformFeeRate, "MarkExchange: Fee cannot be more than 2.5%");
        platformFeeRate = _platformFeeRate;
        emit NewFeeRate(platformFeeRate);
    }

    function setPlatformFeeRecipient(address _platformFeeRecipient)
        external
        onlyOwner
    {
        platformFeeRecipient = _platformFeeRecipient;
        emit NewFeeRecipient(platformFeeRecipient);
    }

        /**
     * @dev Execute payment token transfer
     * @param seller seller
     * @param buyer buyer
     * @param paymentToken payment token
     * @param sellerFees seller fees
     * @param buyerFees buyer fees
     * @param price price
     */
    function _effectFundsTransfer(
        address seller,
        address buyer,
        address paymentToken,
        Fee[] calldata sellerFees,
        Fee[] calldata buyerFees,
        uint256 price
    ) internal {
        if (paymentToken == address(0)) {
            require(msg.sender == buyer, "MarkExchange: Cannot use ETH");
            require(remainingETH >= price, "MarkExchange: Insufficient value");
            remainingETH -= price;
        }

        /* Take fee. */
        uint256 sellerFeesPaid = _settleFees(sellerFees, paymentToken, buyer, price, true);
        uint256 buyerFeesPaid = _settleFees(buyerFees, paymentToken, buyer, price, false);
        if (paymentToken == address(0)) {
          /* Need to account for buyer fees paid on top of the price. */
          remainingETH -= buyerFeesPaid;
        }

        /* Transfer remainder to seller. */
        _transferTo(paymentToken, buyer, seller, price - sellerFeesPaid);
    }

    /**
     * @dev Charge a fee in ETH or WETH
     * @param fees fees to distribute
     * @param paymentToken address of token to pay in
     * @param from address to charge fees
     * @param price price of token
     * @return total fees paid
     */
    function _settleFees(
        Fee[] calldata fees,
        address paymentToken,
        address from,
        uint256 price,
        bool protocolFee
    ) internal returns (uint256) {
        uint256 totalFee = 0;

        /* Take protocol fee if enabled. */
        if (platformFeeRate > 0 && protocolFee) {
            uint256 fee = (price * platformFeeRate) / INVERSE_BASIS_POINT;
            _transferTo(paymentToken, from, platformFeeRecipient, fee);
            totalFee += fee;
        }

        /* Take order fees. */
        for (uint8 i = 0; i < fees.length; i++) {
            uint256 fee = (price * fees[i].rate) / INVERSE_BASIS_POINT;
            _transferTo(paymentToken, from, fees[i].recipient, fee);
            totalFee += fee;
        }

        require(totalFee <= price, "MarkExchange: Fees are more than the price");

        return totalFee;
    }

    /**
     * @dev Transfer amount in ETH or WETH
     * @param paymentToken address of token to pay in
     * @param from token sender
     * @param to token recipient
     * @param amount amount to transfer
     */
    function _transferTo(
        address paymentToken,
        address from,
        address to,
        uint256 amount
    ) internal {
        require(amount > 0, "MarkExchange: Amount must be greater than zero");

        if (paymentToken == address(0)) {
            /* Transfer funds in ETH. */
            require(to != address(0), "MarkExchange:Transfer to zero address");
            (bool success,) = payable(to).call{value: amount}("");
            require(success, "MarkExchange:ETH transfer failed");
        } else if (paymentToken == WETH) {
            /* Transfer funds in WETH. */
            IERC20(WETH).safeTransferFrom(from, to, amount);
        } else {
            revert("MarkExchange: Invalid payment token");
        }
    }

    /**
     * @dev effect nft asset transfer
     * @param collection collection contract address
     * @param from seller address
     * @param to buyer address
     * @param tokenId tokenId
     * @param assetType asset type of the token
     */
    function _effectNFTTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        AssetType assetType
    ) internal {
        if (assetType == AssetType.ERC721) {
            IERC721(collection).safeTransferFrom(from, to, tokenId);
        } else if (assetType == AssetType.ERC1155) {
            IERC1155(collection).safeTransferFrom(from, to, tokenId, amount, "");
        }
    }
}