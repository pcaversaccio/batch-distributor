import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { Contract, Wallet } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const expectThrowsAsync = async (
  // eslint-disable-next-line @typescript-eslint/ban-types
  method: Function,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[],
  message?: string
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let err: any = "";
  try {
    await method(...params);
  } catch (error) {
    err = error;
  }
  expect(err).to.be.an(Error.name);
  if (message) {
    expect(err.message).to.be.equal(message);
  }
};

describe("Distributor Contract", function () {
  let BatchDistributor;

  let distributor: Contract;
  let erc20: Contract;

  let sender: SignerWithAddress;
  let addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;

  const expectThrowsAsync = async (
    // eslint-disable-next-line @typescript-eslint/ban-types
    method: Function,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any[],
    message?: RegExp
  ) => {
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
  };

  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset", []);
    BatchDistributor = await ethers.getContractFactory("BatchDistributor");
    [sender, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    distributor = await BatchDistributor.deploy();
  });

  describe("ETH Transactions", function () {
    it("Transfers ETH to the given address", async function () {
      const txAmount = ethers.utils.parseEther("5.0");

      const initialRecipientBalance = await ethers.provider.getBalance(
        addr1.address
      );

      const overrides = {
        value: ethers.utils.parseEther("5.0"),
      };

      const batch = {
        txns: [{ recipient: addr1.address, amount: txAmount.toString() }],
      };

      await distributor.distributeEther(batch, overrides);

      const finalRecipientBalance = await ethers.provider.getBalance(
        addr1.address
      );

      expect(finalRecipientBalance).to.equal(
        initialRecipientBalance.add(txAmount)
      );
    });

    it("Transfers ETH to the multiple given addresses", async function () {
      const batch = {
        txns: [
          {
            recipient: addr1.address,
            amount: ethers.utils.parseEther("0.2151").toString(),
          },
          {
            recipient: addr2.address,
            amount: ethers.utils.parseEther("2.040194018").toString(),
          },
          {
            recipient: addr3.address,
            amount: ethers.utils.parseEther("0.0003184").toString(),
          },
          {
            recipient: addr4.address,
            amount: ethers.utils.parseEther("0.000000000001").toString(),
          },
        ],
      };

      const overrides = {
        value: ethers.utils.parseEther("5.0"),
      };

      await distributor.distributeEther(batch, overrides);

      const finalRecipient1Balance = await ethers.provider.getBalance(
        addr1.address
      );
      const finalRecipient2Balance = await ethers.provider.getBalance(
        addr2.address
      );
      const finalRecipient3Balance = await ethers.provider.getBalance(
        addr3.address
      );
      const finalRecipient4Balance = await ethers.provider.getBalance(
        addr4.address
      );

      expect(finalRecipient1Balance).to.equal(
        ethers.utils.parseEther("10000").add(ethers.utils.parseEther("0.2151"))
      );
      expect(finalRecipient2Balance).to.equal(
        ethers.utils
          .parseEther("10000")
          .add(ethers.utils.parseEther("2.040194018"))
      );
      expect(finalRecipient3Balance).to.equal(
        ethers.utils
          .parseEther("10000")
          .add(ethers.utils.parseEther("0.0003184"))
      );
      expect(finalRecipient4Balance).to.equal(
        ethers.utils
          .parseEther("10000")
          .add(ethers.utils.parseEther("0.000000000001"))
      );
    });

    it("Sends back unused funds", async function () {
      const fundAmount = ethers.utils.parseEther("20.0");
      const txAmount = ethers.utils.parseEther("5.0");

      const initialSenderBalance = await ethers.provider.getBalance(
        sender.address
      );

      const overrides = {
        value: fundAmount,
      };

      await distributor.distributeEther(
        { txns: [{ recipient: addr1.address, amount: txAmount.toString() }] },
        overrides
      );

      const finalSenderBalance = await ethers.provider.getBalance(
        sender.address
      );

      expect(finalSenderBalance).to.lte(initialSenderBalance.sub(txAmount));
      expect(finalSenderBalance).to.above(initialSenderBalance.sub(fundAmount));
      expect(finalSenderBalance).to.above(
        initialSenderBalance.sub(txAmount).sub(txAmount)
      );
      expect(await ethers.provider.getBalance(distributor.address)).to.equal(0);
    });

    it("Fails if gas limit too low", async function () {
      const fundAmount = ethers.utils.parseEther("20.0");
      const txAmount = ethers.utils.parseEther("5.0");

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
        /Transaction requires at least \d* gas but got 10/
      );
    });

    it("Reverts if it runs out of gas", async function () {
      const fundAmount = ethers.utils.parseEther("20.0");
      const txAmount = ethers.utils.parseEther("5.0");

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
        /Transaction ran out of gas/
      );
    });

    it("Reverts if funds are sent to a non-payable address", async function () {
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      erc20 = await ERC20.deploy();
      await erc20.deployed();

      const txAmount = ethers.utils.parseEther("5.0");

      const overrides = {
        value: txAmount,
      };

      await expect(
        distributor.distributeEther(
          { txns: [{ recipient: erc20.address, amount: txAmount.toString() }] },
          overrides
        )
      )
        .to.be.revertedWithCustomError(distributor, "EtherTransferFail")
        .withArgs(distributor.address);
    });
  });

  describe("ERC20Mock Transactions", function () {
    beforeEach(async function () {
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      erc20 = await ERC20.deploy();
      await erc20.deployed();
      await erc20.mint(sender.address, 1000000);
    });

    describe("Allowance", function () {
      it("Reverts transactions when given not enough allowance", async function () {
        const batch = { txns: [{ recipient: addr1.address, amount: 1000 }] };

        await expect(
          distributor.distributeToken(erc20.address, batch)
        ).to.be.revertedWith("ERC20: insufficient allowance");
      });

      it("Keeps any unspent allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        // set allowance for distributor
        expect(await erc20.approve(distributor.address, 10000)).to.be.ok;

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(4000);
      });
    });

    describe("Safe Transfer from Owner", function () {
      it("Reverts if total balance overflows uint256", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: ethers.constants.MaxUint256 },
            { recipient: addr2.address, amount: 1 },
          ],
        };

        // attempt to make transaction
        await expect(
          distributor.distributeToken(erc20.address, batch)
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
          [erc20.address, batch],
          /value out-of-bounds/
        );
      });

      it("Continues if any parameter is zero", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 5000 },
            { recipient: addr2.address, amount: 0 },
          ],
        };

        await erc20.approve(distributor.address, 5000);

        // attempt to make transaction
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;
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

        await erc20.approve(distributor.address, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(0);
      });

      it("Continues when transferring to self or token contract", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20.address, amount: 5000 },
          ],
        };

        await erc20.approve(distributor.address, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(0);
      });

      it("Continues when given infinite allowance", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20.address, amount: 500000 },
          ],
        };

        await erc20.approve(distributor.address, ethers.constants.MaxUint256);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;
      });
    });
  });

  describe("ERC20ReturnFalseMock Transactions", function () {
    beforeEach(async function () {
      const ERC20 = await ethers.getContractFactory("ERC20ReturnFalseMock");
      erc20 = await ERC20.deploy();
      await erc20.deployed();
      await erc20.mint(sender.address, 1000000);
    });

    describe("Allowance", function () {
      it("Reverts transactions when given not enough allowance", async function () {
        const batch = { txns: [{ recipient: addr1.address, amount: 1000 }] };

        await expect(
          distributor.distributeToken(erc20.address, batch)
        ).to.be.revertedWith("SafeERC20: ERC20 operation did not succeed");
      });

      it("Keeps any unspent allowance", async function () {
        const batch = {
          txns: [
            { recipient: addr1.address, amount: 1000 },
            { recipient: addr2.address, amount: 5000 },
          ],
        };

        // set allowance for distributor
        expect(await erc20.approve(distributor.address, 10000)).to.be.ok;

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(4000);
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

        await erc20.approve(distributor.address, 5000);

        // attempt to make transaction
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;
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

        await erc20.approve(distributor.address, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(0);
      });

      it("Continues when transferring to self or token contract", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20.address, amount: 5000 },
          ],
        };

        await erc20.approve(distributor.address, 6000);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;

        // no balance should remain because we approved the exact amount
        expect(
          await erc20.allowance(sender.address, distributor.address)
        ).to.equal(0);
      });

      it("Continues when given infinite allowance", async function () {
        const batch = {
          txns: [
            { recipient: sender.address, amount: 1000 },
            { recipient: erc20.address, amount: 500000 },
          ],
        };

        await erc20.approve(distributor.address, ethers.constants.MaxUint256);

        // make transactions
        expect(await distributor.distributeToken(erc20.address, batch)).to.be
          .ok;
      });
    });
  });

  describe("Mass Transaction Tests", function () {
    beforeEach(async function () {
      const ERC20 = await ethers.getContractFactory("ERC20Mock");
      erc20 = await ERC20.deploy();
      await erc20.deployed();
      await erc20.mint(sender.address, 1000000);
    });

    it("Transfers ETH to a large number of addresses", async function () {
      const transactionCount = 500;
      const accounts: Wallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(await ethers.Wallet.createRandom());
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
          amount: ethers.utils.parseEther("0.00001").toString(),
        });
      }

      const overrides = {
        value: ethers.utils.parseEther("5.0"),
      };

      expect(await distributor.distributeEther(batch, overrides)).to.be.ok;
    });

    it("Throws when transferring ETH to a too large number of addresses", async function () {
      const transactionCount = 1000;
      const accounts: Wallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(await ethers.Wallet.createRandom());
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
          amount: ethers.utils.parseEther("0.00001").toString(),
        });
      }

      const overrides = {
        value: ethers.utils.parseEther("5.0"),
      };

      await expectThrowsAsync(
        distributor.distributeEther,
        [batch, overrides],
        /Transaction gas limit is \d* and exceeds block gas limit of 30000000/
      );
    }).timeout(40000);

    it("Transfers ERC20 to a large number of addresses", async function () {
      const transactionCount = 100;
      const accounts: Wallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(await ethers.Wallet.createRandom());
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

      await erc20.approve(distributor.address, transactionCount);
      expect(await distributor.distributeToken(erc20.address, batch)).to.be.ok;
    }).timeout(40000);

    it("Throws when transferring ERC20 to a large number of addresses", async function () {
      const transactionCount = 1000;
      const accounts: Wallet[] = [];

      for (let i = 0; i < transactionCount; i++) {
        accounts.push(await ethers.Wallet.createRandom());
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

      await erc20.approve(distributor.address, transactionCount);
      await expectThrowsAsync(
        distributor.distributeToken,
        [erc20.address, batch],
        /Transaction gas limit is \d* and exceeds block gas limit of 30000000/
      );
    }).timeout(40000);
  });
});
