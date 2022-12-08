import { Contract, providers, utils, BigNumber } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS } from "../constants";

/**
 * removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
 * liquidity and also the calculated amount of `ether`and `CD` tokens
 */
export const removeLiquidity = async (signer, removedLPTokensWei) => {
  try {
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      signer
    );
    const tx = await exchangeContract.removeLiquidity(removedLPTokensWei);
    await tx.wait(1);
  } catch (error) {
    console.error(error);
  }
};

/**
 * getTokensAfterRemove: Calculates the amount of `Eth` and `CD` tokens
 * that wpould be returned back to the user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */
export const getTokensAfterRemove = async (
  provider,
  removeLPTokenWei,
  _ethBalance,
  cryptoDevTokenReserve
) => {
  try {
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );
    // Get the total supply of `Crypto Dev` LP tokens
    const _totalSupply = await exchangeContract.totalSupply();
    // here we are using the BigNumber methods of multiplication and division
    // The amount of Eth that would be sent back to the user after he withdraws the LP token
    // is calculated based on a ratio,
    // Ratio is -> (amount of Eth that would be sent vack to the user / Eth reserve) = (LP tokens withdrawn / total suppply of LP tokens)
    // By some maths we get -> (amount of Eth that would be sent back to the user) = (Eth reserves * LP tokens withdrawn) / (total supply of LP tokens)
    // Similarly we also maintain for the ratio of `CD` tokens,so here in our case
    // Ratio is -> (amount of CD tokens sent back to the user / CD tokens reserve) = (LP Tokens withdrawn) / (total supply of LP tokens)
    // Then (amount of CD tokens sent back to the user) = (CD token reserve * LP tokens withdraw) / (total supply of LP tokens)
    const _removeEther = _ethBalance.mul(removeLPTokenWei).div(_totalSupply);
    const _removeCD = cryptoDevTokenReserve
      .mul(removeLPTokenWei)
      .div(_totalSupply);
    return { _removeEther, _removeCD };
  } catch (error) {
    console.error(error);
  }
};
