# Batch Distributor

[![🕵️‍♂️ Test smart contracts](https://github.com/pcaversaccio/batch-distributor/actions/workflows/test-contracts.yml/badge.svg)](https://github.com/pcaversaccio/batch-distributor/actions/workflows/test-contracts.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/license/mit)

## Installation

It is recommended to install [`pnpm`](https://pnpm.io) through the `npm` package manager, which comes bundled with [Node.js](https://nodejs.org/en) when you install it on your system. It is recommended to use a Node.js version `>=22.11.0`.

Once you have `npm` installed, you can run the following both to install and upgrade `pnpm`:

```console
npm install -g pnpm
```

After having installed `pnpm`, simply run:

```console
pnpm install
```

## Unit Tests

You can run the unit tests with

```console
pnpm test
```

## Test Coverage

This repository implements a test coverage [plugin](https://github.com/sc-forks/solidity-coverage). Simply run:

```console
pnpm coverage
```

## Implemented Functionalities

- **ETH Batch Transaction:** `distributeEther(batch (tuple))`
- **ERC20 Batch Transaction:** `distributeToken(token (address), batch (tuple))`

The parameter `batch` is a nested struct object that contains an array of tuples that contain each a recipient address & ETH/token amount. Please ensure that the amount for the ETH transactions is given in `wei` (1 wei = $10^{-18}$ ETH) and check the decimal digits for the ERC20 tokens.

```typescript
{
  txns: [{ recipient: address, amount: amount }];
}
```

## Caveats

1. Although the batch size is only theoretically limited to the size of `uint256`, sending too many transactions in a batch will cause the block `gasLimit` to be exceeded and therefore such a transaction will revert. A large number of transactions should be split into separate batches.
2. A low-level Solidity call will copy _any amount of bytes_ to local memory. When bytes are copied from `returndata` to `memory`, the [memory expansion cost](https://ethereum.stackexchange.com/questions/92546/what-is-the-memory-expansion-cost) is paid. This means that when using a standard Solidity call, the callee can **"returnbomb"** the caller, imposing an arbitrary gas cost. Because this gas is paid _by the caller_ and _in the caller's context_, it can cause the caller to run out of gas and halt execution. It is possible to prevent this attack (see e.g. [here](https://github.com/nomad-xyz/ExcessivelySafeCall)), but this contract contains no measures against it. If you need this kind of security, please do not use this contract.

## Test Deployments

The smart contract [`BatchDistributor`](./contracts/BatchDistributor.sol) has been deployed to the following test networks:

- **Sepolia:** [`0xE710359D8E887afDF66053E6a9e044E0499e3446`](https://sepolia.etherscan.io/address/0xE710359D8E887afDF66053E6a9e044E0499e3446)
- **Holešky (Holešovice):** [`0xE710359D8E887afDF66053E6a9e044E0499e3446`](https://holesky.etherscan.io/address/0xE710359D8E887afDF66053E6a9e044E0499e3446)

### Examples

- _Example 1:_ ETH distribution [`0x1a7345857f653944d5d555a81057a1ff0e364929542ab1db2a037496f2ba6f6b`](https://sepolia.etherscan.io/tx/0x1a7345857f653944d5d555a81057a1ff0e364929542ab1db2a037496f2ba6f6b)
  - Input tuple data `batch`: `[[["0x9F3f11d72d96910df008Cfe3aBA40F361D2EED03",1],["0x3854Ca47Abc62A3771fE06ab45622A42C4A438Cf",2]]]`
- _Example 2:_ ERC-20 token distribution [`0x224448bdb43314f30236c147447e29e002515c0e285cc76132ac4a270e1f56a8`](https://sepolia.etherscan.io/tx/0x224448bdb43314f30236c147447e29e002515c0e285cc76132ac4a270e1f56a8)
  - Input `token` address (Wrapped Ether (WETH)): [`0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`](https://sepolia.etherscan.io/address/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14)
  - Input tuple data `batch`: `[[["0x9F3f11d72d96910df008Cfe3aBA40F361D2EED03",50],["0x3854Ca47Abc62A3771fE06ab45622A42C4A438Cf",50]]]`
