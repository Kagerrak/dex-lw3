const { ethers } = require("hardhat");
require("dotenv").config();
const { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } = require("../constants");

async function main() {
  const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;
  /*
  A ContractFactory in ethers.js is an abstraction used to deloy new smart contracts so exchange Contract here is a factory for instance of our Exchange contract
  */

  const exchangeContract = await ethers.getContractFactory("Exchange");

  // here we deploy the contract
  const deployedExchangeContract = await exchangeContract.deploy(
    cryptoDevTokenAddress
  );
  await deployedExchangeContract.deployed();

  // print the address of the deployed contract
  console.log(`Exchange Contract Address: ${deployedExchangeContract.address}`);
}

// Call the main function and catch if there is any error
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
