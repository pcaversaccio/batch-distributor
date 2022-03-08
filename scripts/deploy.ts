import hre, { ethers } from "hardhat";

async function main() {
  const Contract = await ethers.getContractFactory("BatchDistributor");
  const contract = await Contract.deploy();

  await contract.deployed();

  console.log("BatchDistributor deployed to:", contract.address);

  await hre.tenderly.verify({
    name: "BatchDistributor",
    address: contract.address,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
