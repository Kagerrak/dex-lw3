import { Contract, utils } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * addLiquidity helps add liquidity to the exchange,
 * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
 * to the exchange. If he is adding the liquidity after the initial liquidity has already been addedd
 * then we calculate the Crypto Dev tokens he can add, given the Eth he wants to add by keeping the ratios constant
 */
export const addLiquidity = async (
  signer,
  addCDAmountWei,
  addEtherAmountWei
) => {
  try {
    // create a new instancec of the token contract
    const tokenContract = new Contract(
      TOKEN_CONTRACT_ADDRESS,
      TOKEN_CONTRACT_ABI,
      signer
    );
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      signer
    );
    // Because CD tokens are an ERC20 , user would need to give the contract allowance
    // tp take the required number CD tokens out of his contract
    let tx = await tokenContract.approve(
      EXCHANGE_CONTRACT_ADDRESS,
      addCDAmountWei.toString()
    );
    await tx.wait(1);
    // After the contract ahas the approval, add the ether and cd tokens in the liquidity
    tx = await exchangeContract.addLiquidity(addCDAmountWei, {
      value: addEtherAmountWei,
    });
    await tx.wait(1);
  } catch (error) {
    console.error(error);
  }
};
/**
 * calculateCD calculates the CD tokens that need to be added to the liquidity
 * given `_addEtherAmontWei` amount of ether
 */
export const calculateCD = async (
  _addEther = "0",
  etherBalanceContract,
  cdTokenReserve
) => {
  // `_addEther` is a string, we need to convert it to a Bignumber before we can do our calculations
  // We dothat using `parseEther` function from `ethers.js`
  const _addEtherAmontWei = utils.parseEther(_addEther);

  //   Ratio needs to be maintained when we add liquidity.
  //   We need to let the user know for a specific amount of ether how many `CD` tokens
  //   He can add so that the price impact is not large
  //   The ratio we follow is (amount of Crypto Dev tokens to be added) / (Crypto Dev tokens balance) = (ETH that would be added) / (Eth reserve in the contract)
  //   So by maths we get -> (amount of Crypto Dev tokens to be added) = (Eth that would be added * Crypto Dev tokens balance) / (Eth reserve in the contract)

  const cryptoDevTokenAmount = _addEtherAmontWei
    .mul(cdTokenReserve)
    .div(etherBalanceContract);
  return cryptoDevTokenAmount;
};
