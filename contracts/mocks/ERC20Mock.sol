// SPDX-License-Identifier: MIT
// Source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/mocks/token/ERC20Mock.sol
pragma solidity ^0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock class using ERC20
contract ERC20Mock is ERC20 {
    constructor() payable ERC20("MyToken", "MTK") {
        _mint(msg.sender, 100);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}
