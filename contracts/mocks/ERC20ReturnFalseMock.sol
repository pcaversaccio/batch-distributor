// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20ReturnFalseMock is ERC20 {
    constructor() payable ERC20("MyToken", "MTK") {
        _mint(msg.sender, 100);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (sender == address(0)) {
            return false;
        }
        if (recipient == address(0)) {
            return false;
        }

        uint256 senderBalance = super.balanceOf(sender);
        if (senderBalance < amount) {
            return false;
        }

        uint256 currentAllowance = super.allowance(sender, _msgSender());
        if (currentAllowance < amount) {
            return false;
        }

        return super.transferFrom(sender, recipient, amount);
    }
}
