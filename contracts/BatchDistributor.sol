// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Error that occurs when transferring ether has failed.
 * @param emitter The contract that emits the error.
 */
error EtherTransferFail(address emitter);

/**
 * @title Native and ERC-20 Token Batch Distributor
 * @author 0x7761676d69
 * @notice Helper smart contract for batch sending both
 * native and ERC-20 tokens.
 * @dev Since we use nested struct objects, we rely on the ABI coder v2.
 * The ABI coder v2 is activated by default since Solidity `v0.8.0`.
 */
contract BatchDistributor {
    using SafeERC20 for IERC20;

    /**
     * @dev Transaction struct for the transaction payload.
     */
    struct Transaction {
        address payable recipient;
        uint256 amount;
    }

    /**
     * @dev Batch struct for the array of transactions.
     */
    struct Batch {
        Transaction[] txns;
    }

    /**
     * @dev You can cut out 10 opcodes in the creation-time EVM bytecode
     * if you declare a constructor `payable`.
     *
     * For more in-depth information see here:
     * https://forum.openzeppelin.com/t/a-collection-of-gas-optimisation-tricks/19966/5.
     */
    constructor() payable {}

    /**
     * @dev Distributes ether, denominated in wei, to a predefined batch
     * of recipient addresses.
     * @notice In the event that excessive ether is sent, the residual
     * amount is returned back to the `msg.sender`.
     * @param batch Nested struct object that contains an array of tuples that
     * contain each a recipient address & ether amount in wei.
     */
    function distributeEther(Batch calldata batch) external payable {
        /**
         * @dev Caching the length in for loops saves 3 additional gas
         * for a `calldata` array for each iteration except for the first.
         */
        uint256 length = batch.txns.length;

        /**
         * @dev If a variable is not set/initialised, it is assumed to have
         * the default value. The default value for the `uint` types is 0.
         */
        for (uint256 i; i < length; ++i) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool sent, ) = batch.txns[i].recipient.call{
                value: batch.txns[i].amount
            }("");
            if (!sent) revert EtherTransferFail(address(this));
        }

        uint256 balance = address(this).balance;
        if (balance != 0) {
            /**
             * @dev Any wei amount previously forced into this contract (e.g. by
             * using the `SELFDESTRUCT` opcode) will be part of the refund transaction.
             */
            // solhint-disable-next-line avoid-low-level-calls
            (bool refunded, ) = payable(msg.sender).call{value: balance}("");
            if (!refunded) revert EtherTransferFail(address(this));
        }
    }

    /**
     * @dev Distributes ERC-20 tokens, denominated in their corresponding
     * lowest unit, to a predefined batch of recipient addresses.
     * @notice To deal with (potentially) non-compliant ERC-20 tokens that
     * do have no return value, we use the `SafeERC20` library for external calls.
     * Note: Since we cast the token address into the official ERC-20 interface,
     * the use of non-compliant ERC-20 tokens is prevented by design. Nevertheless,
     * we keep this guardrail for security reasons.
     * @param token ERC-20 token contract address.
     * @param batch Nested struct object that contains an array of tuples that
     * contain each a recipient address & token amount.
     */
    function distributeToken(IERC20 token, Batch calldata batch) external {
        /**
         * @dev Caching the length in for loops saves 3 additional gas
         * for a `calldata` array for each iteration except for the first.
         */
        uint256 length = batch.txns.length;

        /**
         * @dev If a variable is not set/initialised, it is assumed to have
         * the default value. The default value for the `uint` types is 0.
         */
        uint256 total;
        for (uint256 i; i < length; ++i) {
            total += batch.txns[i].amount;
        }

        /**
         * @dev By combining a `transferFrom` call to itself and then
         * distributing the tokens from its own address using `transfer`,
         * 5'000 gas is saved on each transfer as `allowance` is only
         * touched once.
         */
        token.safeTransferFrom(msg.sender, address(this), total);

        for (uint256 i; i < length; ++i) {
            token.safeTransfer(batch.txns[i].recipient, batch.txns[i].amount);
        }
    }
}
