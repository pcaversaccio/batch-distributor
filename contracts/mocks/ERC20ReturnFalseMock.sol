// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20ReturnFalseMock is ERC20, ERC20Burnable, Pausable, Ownable {
    constructor() ERC20("MyToken", "MTK") {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
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
