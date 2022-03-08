# Batch Distributor

[![build status](https://github.com/pcaversaccio/batch-distributor/actions/workflows/test-contracts.yml/badge.svg)](./actions)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Installation

It is recommended to install [Yarn](https://classic.yarnpkg.com) through the `npm` package manager, which comes bundled with [Node.js](https://nodejs.org) when you install it on your system. It is recommended to use a Node.js version `>= 16.0.0`.

Once you have `npm` installed, you can run the following both to install and upgrade Yarn:

```bash
npm install --global yarn
```

After having installed Yarn, simply run:

```bash
yarn install
```

## Unit Tests

You can run the unit tests with

```bash
yarn test
```

## Test Coverage

This repository implements a test coverage [plugin](https://github.com/sc-forks/solidity-coverage). Simply run:

```bash
yarn coverage
```

## Implemented Functionalities

- **ETH Batch Transaction:** `distributeEther(batch (tuple))`
- **ERC20 Batch Transaction:** `distributeToken(token (address), batch (tuple))`

The parameter `batch` is a nested struct object that contains an array of tuples that contain each a recipient address & ETH/token amount. Please ensure that the amount for the ETH transactions is given in `wei` (1 wei = 10<sup>-18</sup> ETH) and check the decimal digits for the ERC20 tokens.

```typescript
{
  txns: [{ recipient: address, amount: amount }];
}
```

## Caveats

1. Although the batch size is only theoretically limited to the size of `uint256`, sending too many transactions in a batch will cause the block `gasLimit` to be exceeded and therefore such a transaction will revert. A large number of transactions should be split into separate batches.
2. A low-level Solidity call will copy _any amount of bytes_ to local memory. When bytes are copied from `returndata` to `memory`, the [memory expansion cost](https://ethereum.stackexchange.com/questions/92546/what-is-expansion-cost) is paid. This means that when using a standard solidity call, the callee can **"returnbomb"** the caller, imposing an arbitrary gas cost. Because this gas is paid _by the caller_ and _in the caller's context_, it can cause the caller to run out of gas and halt execution. It is possible to prevent this attack (see e.g. [here](https://github.com/nomad-xyz/ExcessivelySafeCall)), but this contract contains no measures against it. If you need this kind of security, please do not use this contract.

## Test Deployments

The smart contract [`BatchDistributor.sol`](./contracts/BatchDistributor.sol) has been deployed to the following test networks:

- **Rinkeby:** [`0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423`](https://rinkeby.etherscan.io/address/0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423)
- **Kovan:** [`0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423`](https://kovan.etherscan.io/address/0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423)
- **Ropsten:** [`0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423`](https://ropsten.etherscan.io/address/0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423)
- **Goerli:** [`0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423`](https://goerli.etherscan.io/address/0x886c0707aa72190Fe9fEB4B7Ca579e4ebA659423)

### Examples

- _Example 1:_ ETH distribution [`0x79e15e0c516a059965bd6e7e184d602a653b0cbb1d742136bc815ceef6352fe3`](https://rinkeby.etherscan.io/tx/0x79e15e0c516a059965bd6e7e184d602a653b0cbb1d742136bc815ceef6352fe3)
  - Input tuple data `batch`: `[[["0x9F3f11d72d96910df008Cfe3aBA40F361D2EED03",1],["0x3854Ca47Abc62A3771fE06ab45622A42C4A438Cf",2]]]`
- _Example 2:_ ERC-20 token distribution [`0xae3196edbbaddd0b185e569006747a41dbd01cf8eb350365a2bec0daa43f16e5`](https://rinkeby.etherscan.io/tx/0xae3196edbbaddd0b185e569006747a41dbd01cf8eb350365a2bec0daa43f16e5)
  - Input `token` address: `0x6A9865aDE2B6207dAAC49f8bCba9705dEB0B0e6D`
  - Input tuple data `batch`: `[[["0x9F3f11d72d96910df008Cfe3aBA40F361D2EED03",50],["0x3854Ca47Abc62A3771fE06ab45622A42C4A438Cf",50]]]`
