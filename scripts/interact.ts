import hre from "hardhat";

// Colour codes for terminal prints
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";

async function distributeEther() {
  const testnetAddress = "0xBFe76cA9bAbF3566A89e215782d97ADb87Fa55C6";
  const batchDistributor = await hre.ethers.getContractAt(
    "BatchDistributor",
    testnetAddress,
  );

  ////////////////
  //  PAYLOAD  //
  //////////////

  // The `parseEther` method will parse a string representing ether
  // into a BigNumber in wei (1 ether = 10**18 wei).
  // Examples:
  // parseEther("1.0") => { BigNumber: "1000000000000000000" }
  // parseEther("-0.5") => { BigNumber: "-500000000000000000" }
  // Your payload:
  const txns = [
    {
      recipient: "0x9F3f11d72d96910df008Cfe3aBA40F361D2EED03",
      amount: hre.ethers.parseEther("0.000000000000000001"),
    },
    {
      recipient: "0x3854Ca47Abc62A3771fE06ab45622A42C4A438Cf",
      amount: hre.ethers.parseEther("0.000000000000000002"),
    },
  ];
  // In the event that excessive ether is sent, the residual amount is
  // returned back to the `msg.sender`.
  const msgValue = hre.ethers.parseEther("0.000000000000000004");

  ////////////////
  //  SENDING  //
  //////////////

  const tx = await batchDistributor.distributeEther(
    { txns: txns },
    { value: msgValue },
  );
  console.log("The transaction hash is: " + `${GREEN}${tx.hash}${RESET}\n`);
  console.log("Waiting until the transaction is confirmed...\n");
  const receipt = await tx.wait();
  console.log(
    "The transaction returned the following transaction receipt:\n",
    receipt,
  );
}

// To run it, invoke `npx hardhat run scripts/interact.ts --network <network_name>`
distributeEther().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
