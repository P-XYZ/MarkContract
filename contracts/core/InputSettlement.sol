// SPDX-License-Identifier: UNLICENSED
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

error ZeroAddress();
error CannotUseETH();
error InsufficientValue();
error InvalidPaymentToken();
error FeeMoreThan2Point5();
error FeeMoreThanPrice();
error ZeroAmount();
error ETHTransferFailed();

contract InputSettlement is Ownable, MarkExchangeEvents {
    using SafeERC20 for IERC20;
    uint256 private constant INVERSE_BASIS_POINT = 10_000;

    // variables
    //Platform charges
    uint256 immutable maxPlatformFeeRate;  //250 maybe i.e., 2.5%
    uint256 public platformFeeRate; //feeRate
    address public platformFeeRecipient;
    
    uint256 public remainingETH;

    constructor(uint256 _maxPlatformFeeRate) {
        maxPlatformFeeRate = _maxPlatformFeeRate;
    }

    function setPlatformFeeRate(uint256 _platformFeeRate)
        external
        onlyOwner
    {
        if(_platformFeeRate > maxPlatformFeeRate) revert FeeMoreThan2Point5();
        platformFeeRate = _platformFeeRate;
        emit NewFeeRate(platformFeeRate);
    }

    function setPlatformFeeRecipient(address _platformFeeRecipient)
        external
        onlyOwner
    {
        _addressNotZero(_platformFeeRecipient);

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
        uint256 remainingETHMem = remainingETH;
        if (paymentToken == address(0)) {
            if(msg.sender != buyer) revert CannotUseETH();
            if(remainingETHMem < price) revert InsufficientValue();
            remainingETHMem -= price;
        }

        /* Take fee. */
        uint256 sellerFeesPaid = _settleFees(sellerFees, paymentToken, buyer, price, true);
        uint256 buyerFeesPaid = _settleFees(buyerFees, paymentToken, buyer, price, false);
        if (paymentToken == address(0)) {
          /* Need to account for buyer fees paid on top of the price. */
          remainingETHMem -= buyerFeesPaid;
        }
        remainingETH = remainingETHMem;
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
        if (platformFeeRate != 0 && protocolFee) {
            uint256 fee = (price * platformFeeRate) / INVERSE_BASIS_POINT;
            _transferTo(paymentToken, from, platformFeeRecipient, fee);
            totalFee += fee;
        }

        /* Take order fees. */
        for (uint256 i = 0; i < fees.length; ++i) {
            uint256 fee = (price * fees[i].rate) / INVERSE_BASIS_POINT;
            _transferTo(paymentToken, from, fees[i].recipient, fee);
            totalFee += fee;
        }

        if(totalFee > price) revert FeeMoreThanPrice();

        return totalFee;
    }

    /**
     * @dev Transfer amount in ETH or ERC20
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
        if(amount == 0) revert ZeroAmount();

        if (paymentToken == address(0)) {
            /* Transfer funds in ETH. */
            _addressNotZero(to);
            (bool success,) = payable(to).call{value: amount}("");
            if(!success) revert ETHTransferFailed();
        } else {
            /* Transfer funds in ERC20. */
            IERC20(paymentToken).safeTransferFrom(from, to, amount);
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
        } else {
            IERC1155(collection).safeTransferFrom(from, to, tokenId, amount, "");
        }
    }

    function _addressNotZero(
        address addressToValidate
    ) internal pure {
        assembly {
            if iszero(addressToValidate) {
                let ptr := mload(0x40)
                mstore(ptr, 0xd92e233d00000000000000000000000000000000000000000000000000000000) // selector for `ZeroAddress()`
                revert(ptr, 0x4)
            }
        }
    }
}
