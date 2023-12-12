import { expect } from "chai";
import { HDNodeWallet } from "ethers";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  BatchDistributor,
  ERC20Mock,
  ERC20ReturnFalseMock,
} from "../typechain-types";

async function expectThrowsAsync(
  // eslint-disable-next-line @typescript-eslint/ban-types
  method: Function,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[],
  message?: RegExp,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let err: any = "";
  try {
    await method(...params);
  } catch (error) {
    err = error;
  }
  if (message) {
    expect(err.message).to.match(message);
  } else {
    expect(err).to.be.an("Error");
  }
}

describe("Distributor Contract", function () {
  let distributor: BatchDistributor;
  let distributorAddr: string;

  let erc20: ERC20Mock;
  let erc20Addr: string;

  let erc20ReturnFalse: ERC20ReturnFalseMock;
  let erc20ReturnFalseAddr: string;

  let sender: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;

  beforeEach(async function () {
    await hre.ethers.provider.send("hardhat_reset", []);
    distributor = await hre.ethers.deployContract("BatchDistributor");
    [sender, addr1, addr2, addr3, addr4] = await hre.ethers.getSigners();
    await distributor.waitForDeployment();
    distributorAddr = await distributor.getAddress();
  });

  describe("ETH Transactions", function () {
    it("Transfers ETH to the given address", async function () {
      const txAmount = hre.ethers.parseEther("5.0");

      const initialRecipientBalance = await hre.ethers.provider.getBalance(
        addr1.address,
      );

      const overrides = {
        value: hre.ethers.parseEther("5.0"),
      };

      const batch = {
        txns: [{ recipient: addr1.address, amount: txAmount.toString() }],
      };

      await distributor.distributeEther(batch, overrides);

      const finalRecipientBalance = await hre.ethers.provider.getBalance(
        addr1.address,
      );

      expect(finalRecipientBalance).to.equal(
        initialRecipientBalance + txAmount,
      );
    });

    it("Transfers ETH to the multiple given addresses", async function () {
      const batch = {
        txns: [
          {
            recipient: addr1.address,
            amount: hre.ethers.parseEther("0.2151").toString(),
          },
          {
            recipient: addr2.address,
            amount: hre.ethers.parseEther("2.040194018").toString(),
          },
          {
            recipient: addr3.address,
            amount: hre.ethers.parseEther("0.0003184").toString(),
          },
          {
            recipient: addr4.address,
            amount: hre.ethers.parseEther("0.000000000001").toString(),
          },
        ],
      };

      const overrides = {
        value: hre.ethers.parseEther("5.0"),
      };

      await distributor.distributeEther(batch, overrides);

      const finalRecipient1Balance = await hre.ethers.provider.getBalance(
        addr1.address,
      );
      const finalRecipient2Balance = await hre.ethers.provider.getBalance(
        addr2.address,
      );
      const finalRecipient3Balance = await hre.ethers.provider.getBalance(
        addr3.address,
      );
      const finalRecipient4Balance = await hre.ethers.provider.getBalance(
        addr4.address,
      );

      expect(finalRecipient1Balance).to.equal(
        hre.ethers.parseEther("10000") + hre.ethers.parseEther("0.2151"),
      );
      expect(finalRecipient2Balance).to.equal(
        hre.ethers.parseEther("10000") + hre.ethers.parseEther("2.040194018"),
      );
      expect(finalRecipient3Balance).to.equal(
        hre.ethers.parseEther("10000") + hre.ethers.parseEther("0.0003184"),
      );
      expect(finalRecipient4Balance).to.equal(
        hre.ethers.parseEther("10000") +
          hre.ethers.parseEther("0.000000000001"),
      );
    });

    it("Sends back unused funds", async function () {
      const fundAmount = hre.ethers.parseEther("20.0");
      const txAmount = hre.ethers.parseEther("5.0");

      const initialSenderBalance = await hre.ethers.provider.getBalance(
        sender.address,
      );

      const overrides = {
        value: fundAmount,
      };

      await distributor.distributeEther(
        { txns: [{ recipient: addr1.address, amount: txAmount.toString() }] },
        overrides,
      );

      const finalSenderBalance = await hre.ethers.provider.getBalance(
        sender.address,
      );

      expect(finalSenderBalance).to.lte(initialSenderBalance - txAmount);
      expect(finalSenderBalance).to.above(initialSenderBalance - fundAmount);
      expect(finalSenderBalance).to.above(
        initialSenderBalance - txAmount - txAmount,
      );
      expect(await hre.ethers.provider.getBalance(distributorAddr)).to.equal(0);
    });

    it("Fails if gas limit too low", async function () {
      const fundAmount = hre.ethers.parseEther("20.0");
      const txAmount = hre.ethers.parseEther("5.0");

      const overrides = {
        value: fundAmount,
        gasLimit: 10,
      };

      await expectThrowsAsync(
        distributor.distributeEther,
        [
          { txns: [{ recipient: addr1.address, amount: txAmount.toString() }] },
          overrides,
        ],
        /Transaction requires at least \d* gas but got 10/,
      );
    });

    it("Reverts if it runs out of gas", async function () {
      const fundAmount = hre.ethers.parseEther("20.0");
      const txAmount = hre.ethers.parseEther("5.0");

      const overrides = {
        value: fundAmount,
        gasLimit: 25000,
      };

      await expectThrowsAsync(
        distributor.distributeEther,
        [
          { txns: [{ recipient: addr1.address, amount: txAmount.toString() }] },
          overrides,
        ],
        /Transaction ran out of gas/,
      );
    });

    it("Reverts if funds are sent to a non-payable address", async function () {
      const erc20 = await hre.ethers.deployContract("ERC20Mock");
      await erc20.waitForDeployment();

      const txAmount = hre.ethers.parseEther("5.0");

      const overrides = {
        value: txAmount,
      };

      await expect(
        distributor.distributeEther(
          {
            txns: [
              {
                recipient: await erc20.getAddress(),
                amount: txAmount.toString(),
              },
            ],
          },
          overrides,
        ),
      )
        .to.be.revertedWithCustomError(distributor, "EtherTransferFail")
        .withArgs(distributorAddr);
    });

    it("Reverts if unused funds are sent back to a non-payable address", async function () {
      const erc20 = await hre.ethers.deployContract("ERC20Mock");
      await erc20.waitForDeployment();
      const fundAmount = hre.ethers.parseEther("20.0");
      const txAmount = hre.ethers.parseEther("5.0");

      await hre.network.provider.send("hardhat_setCode", [
        await sender.getAddress(),
        "0x11",
      ]);

      const overrides = {
        value: fundAmount,
      };

      await expect(
        distributor.distributeEther(
          { txns: [{ recipient: addr1.address, amount: txAmount.toString() }] },
          overrides,
        ),
      )
        .to.be.revertedWithCustomError(distributor, "EtherTransferFail")
        .withArgs(distributorAddr);
    });
  });

  describe("ERC20Mock Transactions", function () {
    beforeEach(async function () {
      erc20 = await hre.ethers.deployContract("ERC20Mock");
      await erc20.waitForDeployment();
      erc20Addr = await erc20.getAddress();
      await erc20.mint(sender.address, 1000000);
    });

    describe("Allowance", function () {
      it("Reverts transactions when given not enough allowance", async function () {
        const batch = { txns: [{ recipient: addr1.address, amount: 1000 }] };

        await expect(distributor.distributeToken(erc20Addr, batch))
          .to.be.revertedWithCustomError(erc20, "ERC20InsufficientAllowance")
          .withArgs(distributorAddr, 0, 1000);
      });

      it("Keeps any unspent allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        // set allowance for distributor
        expect(await erc20.approve(distributorAddr, 10000)).to.be.ok;

        // make transactions
        expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          4000,
        );
      });
    });

    describe("Safe Transfer from Owner", function () {
      it("Reverts if total balance overflows uint256", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: hre.ethers.MaxUint256 },
            { recipient: addr2.address, amount: 1 },
          ],
        };

        // attempt to make transaction
        await expect(
          distributor.distributeToken(erc20Addr, batch),
        ).to.be.revertedWithPanic(0x11);
      });

      it("Reverts if any parameter is negative", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 5000 },
            { recipient: addr2.address, amount: -3000 },
          ],
        };

        // attempt to make transaction
        await expectThrowsAsync(
          distributor.distributeToken,
          [erc20Addr, batch],
          /value out-of-bounds/,
        );
      });

      it("Continues if any parameter is zero", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 5000 },
            { recipient: addr2.address, amount: 0 },
          ],
        };

        await erc20.approve(distributorAddr, 5000);

        // attempt to make transaction
        expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;
      });
    });

    describe("Transfer to Recipient", function () {
      it("Transfers token to the recipient address given enough allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        await erc20.approve(distributorAddr, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          0,
        );
      });

      it("Continues when transferring to self or token contract", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20Addr, amount: 5000 },
          ],
        };

        await erc20.approve(distributorAddr, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          0,
        );
      });

      it("Continues when given infinite allowance", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20Addr, amount: 500000 },
          ],
        };

        await erc20.approve(distributorAddr, hre.ethers.MaxUint256);

        // make transactions
        expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;
      });
    });
  });

  describe("ERC20ReturnFalseMock Transactions", function () {
    beforeEach(async function () {
      erc20ReturnFalse = await hre.ethers.deployContract(
        "ERC20ReturnFalseMock",
      );
      await erc20ReturnFalse.waitForDeployment();
      erc20ReturnFalseAddr = await erc20ReturnFalse.getAddress();
      await erc20ReturnFalse.mint(sender.address, 1000000);
    });

    describe("Allowance", function () {
      it("Reverts transactions when given not enough allowance", async function () {
        const batch = { txns: [{ recipient: addr1.address, amount: 1000 }] };

        await expect(distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.revertedWithCustomError(
            distributor,
            "SafeERC20FailedOperation",
          )
          .withArgs(erc20ReturnFalseAddr);
      });

      it("Keeps any unspent allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        // set allowance for distributor
        expect(await erc20.approve(distributorAddr, 10000)).to.be.ok;

        // make transactions
        expect(await distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          4000,
        );
      });
    });

    describe("Safe Transfer from Owner", function () {
      it("Continues if any parameter is zero", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 5000 },
            { recipient: addr2.address, amount: 0 },
          ],
        };

        await erc20.approve(distributorAddr, 5000);

        // attempt to make transaction
        expect(await distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.ok;
      });
    });

    describe("Transfer to Recipient", function () {
      it("Transfers token to the recipient address given enough allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        await erc20.approve(distributorAddr, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          0,
        );
      });

      it("Continues when transferring to self or token contract", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20ReturnFalseAddr, amount: 5000 },
          ],
        };

        await erc20.approve(distributorAddr, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.ok;

        // no balance should remain because we approved the exact amount
        expect(await erc20.allowance(sender.address, distributorAddr)).to.equal(
          0,
        );
      });

      it("Continues when given infinite allowance", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20ReturnFalseAddr, amount: 500000 },
          ],
        };

        await erc20.approve(distributorAddr, hre.ethers.MaxUint256);

        // make transactions
        expect(await distributor.distributeToken(erc20ReturnFalseAddr, batch))
          .to.be.ok;
      });
    });
  });

  describe("Mass Transaction Tests", function () {
    beforeEach(async function () {
      erc20 = await hre.ethers.deployContract("ERC20Mock");
      await erc20.waitForDeployment();
      erc20Addr = await erc20.getAddress();
      await erc20.mint(sender.address, 1000000);
    });

    it("Transfers ETH to a large number of addresses", async function () {
      const transactionCount = 500;
      const accounts: HDNodeWallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(hre.ethers.Wallet.createRandom());
      }

      const batch: {
        txns: {
          recipient: string;
          amount: string;
        }[];
      } = { txns: [] };

      for (const account of accounts) {
        batch.txns.push({
          recipient: account.address,
          amount: hre.ethers.parseEther("0.00001").toString(),
        });
      }

      const overrides = {
        value: hre.ethers.parseEther("5.0"),
      };

      expect(await distributor.distributeEther(batch, overrides)).to.be.ok;
    });

    it("Transfers ERC20 to a large number of addresses", async function () {
      const transactionCount = 100;
      const accounts: HDNodeWallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(hre.ethers.Wallet.createRandom());
      }

      const batch: {
        txns: {
          recipient: string;
          amount: string;
        }[];
      } = { txns: [] };

      for (const account of accounts) {
        batch.txns.push({ recipient: account.address, amount: "1" });
      }

      await erc20.approve(distributorAddr, transactionCount);
      expect(await distributor.distributeToken(erc20Addr, batch)).to.be.ok;
    });
  });
});
