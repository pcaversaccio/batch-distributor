/* eslint-disable @typescript-eslint/no-unused-vars */
import hre from "hardhat";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const batchDistributor = await hre.ethers.deployContract("BatchDistributor");

  await batchDistributor.waitForDeployment();
  const batchDistributorAddress = await batchDistributor.getAddress();

  console.log("BatchDistributor deployed to:", batchDistributorAddress);

  await delay(30000); // Wait for 30 seconds before verifying the contract

  await hre.run("verify:verify", {
    address: batchDistributorAddress,
  });

  // await hre.tenderly.verify({
  //   name: "BatchDistributor",
  //   address: batchDistributorAddress,
  // });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
