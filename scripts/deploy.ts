/* eslint-disable @typescript-eslint/no-unused-vars */
import hre, { ethers } from "hardhat";

async function main() {
  const contract = await ethers.deployContract("BatchDistributor");

  await contract.deployed();

  console.log("BatchDistributor deployed to:", contract.address);

  // await hre.tenderly.verify({
  //   name: "BatchDistributor",
  //   address: contract.address,
  // });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
