import { Contract } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/*
    getAmountOfTokensReceivedFromSwap: Returns the number of Eth/Crypto Dev tokens that can be receive
    when the user swaps `_swapAmountWei` amount of Eth/Crypto Dev tokens
*/
export const getAmountOfTokensReceivedFromSwap = async (
  _swapAmountWei,
  provider,
  ethSelected,
  ethBalance,
  reservedCD
) => {
  // Create a new instance of the exchange contract
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    provider
  );
  let amountOfTokens;
  // if `Eth` is selected this means our input value is `Eth` which means our input amount would be
  // `_swapAmountWei`, the input reserve would be the `ethBalance` of the contract and output reserve
  // would be the `Crypto Dev` token reserve
  if (ethSelected) {
    amountOfTokens = await exchangeContract.getAmountOfTokens(
      _swapAmountWei,
      ethBalance,
      reservedCD
    );
  } else {
    // If `Eth` is not selected this means our input value is `Crypto Dev` tokens our input amount would be
    // `_swapAmountWei`, the input reserve would be the `Crypto Dev` token reserve of the contract and output reserve
    //  would be the `ethBalance`
    amountOfTokens = await exchangeContract.getAmountOfTokens(
      _swapAmountWei,
      reservedCD,
      ethBalance
    );
  }
  return amountOfTokens;
};

/*
    swapTokens: Swaps `swapAmount` of Eth/Crypto Dev token with `tokentoBeReceivedAfterSwap` amount of Eth/Crypto Dev tokens
*/
export const swapTokens = async (
  signer,
  swapAmountWei,
  tokenToBeReceivedAfterSwap,
  ethSelected
) => {
  // Create a new instance of the exchange contract
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );
  // Create a new instance of the token contract
  const tokenContract = new Contract(
    TOKEN_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_ABI,
    signer
  );

  let tx;
  // If Eth is selected call `ethToCryptoDevToken` function else
  // call the `cryptoDevTokenToEth` funtion from the contract
  // As you can see ypu need to pass the `swapAmount` as a value to the function because
  // it is the ether we are paying to the contract, instead of a value we are passing to the function
  if (ethSelected) {
    tx = await exchangeContract.ethToCryptoDevToken(
      tokenToBeReceivedAfterSwap,
      {
        value: swapAmountWei,
      }
    );
  } else {
    // User has to approve `swapAmountWei` for the contract beacause `Crypto Dev` token
    // is anc ERC20
    tx = await tokenContract.approve(
      EXCHANGE_CONTRACT_ADDRESS,
      swapAmountWei.toString()
    );
    await tx.wait(1);
    //   call `cryptoDevTokenToEth` function which would take in `swapAmountWei` of `Crypto Dev` tokens and would
    //   send back `tokenToBeReceivedAfterSwap`
    tx = await exchangeContract.cryptoDevTokenToEth(
      swapAmountWei,
      tokenToBeReceivedAfterSwap
    );
    await tx.wait(1);
  }
};
