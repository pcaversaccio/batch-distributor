/* eslint-disable @typescript-eslint/no-unused-vars */
import hre, { ethers } from "hardhat";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const contract = await ethers.deployContract("BatchDistributor");

  await contract.deployed();
  const contractAddress = contract.address;

  console.log("BatchDistributor deployed to:", contract.address);

  await delay(30000); // Wait for 30 seconds before verifying the contract

  await hre.run("verify:verify", {
    address: contractAddress,
  });

  // await hre.tenderly.verify({
  //   name: "BatchDistributor",
  //   address: contract.address,
  // });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
