// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public cryptoDevTokenAddress;

    // Exchange is inheriting ERC20, because our exchange would keep track of Crypto Dev LP tokens
    constructor(address _CryptoDevToken) ERC20("CryptoDev LP Token", "CDLP") {
        require(
            _CryptoDevToken != address(0),
            "Token address passed is a null address"
        );
        cryptoDevTokenAddress = _CryptoDevToken;
    }

    /// @dev Returns the amount of `Crypto Dev TOkens` held by the contract
    function getReserve() public view returns (uint256) {
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }

    /// @dev Adds liquidty to the exchange
    function addLiquidity(uint256 _amount) public payable returns (uint256) {
        uint256 liquidity;
        uint256 ethBalance = address(this).balance;
        uint256 cryptoDevTokenReserve = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);
        /*
            If the reserve is empty, intake any user supplied value for
            `Ether` and `Crypto Dev` tokens because there is no ratio currently
        */
        if (cryptoDevTokenReserve == 0) {
            // transfer the `the cryptoDvtoken` from the user's accountto the contract
            cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
            // Take the current ethBalance and mint `ethBalance` amount of LP tokens to the user
            // `liquidity` provide is equal to `ethBalance` because this is the first time user
            // is addong `Eth` to the contract, so whatever `Eth` contract has is equal to the one supplied
            // by the user in the current `addLiquidity` call'
            // `liquidity` tokens that need to be minted to the user on `addLiquidity` call should  always be proportional
            // to the Eth specified by the user
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
            // _mint is ERc20.sol smart contract funtion to mint ERC20 tokens
        } else {
            /*
                If the reserve is not empty, intake any user supplied value for
                `ETHER` and determine according to the ratio how many `Crypto Dev`
                tokens need to be supplied to prevent any largee price impacts because
                of the additional liquidity 
             */
            //  EthReserve should be the current ethBalance subtracted by the value of ether sent by the user
            // in the current `addLiquidity` call
            uint256 ethReserve = ethBalance - msg.value;
            // Ratio should always be maintained so that there are no major price impacts when adding liquity
            // Ratio here is -> (cryptoDevTokenAmount user can add) = (Eth Sent by user * cryptoDevTokenReserve/Eth Reserve in the contract)
            // So doing some maths, (cryptoDevtplemAmount user can add) = (Eth sent by the user * cryptoDevTokenReserve / Eth Reserve)
            uint256 cryptoDevTokenAmount = (msg.value) *
                (cryptoDevTokenReserve / ethReserve);
            require(
                _amount >= cryptoDevTokenAmount,
                "Amount of token sent is less than the minimum tokens required"
            );
            // transfer only (cryptoDevTokenAmount user can add) amount of `Crypto Dev Token`  from users account
            cryptoDevToken.transferFrom(
                msg.sender,
                address(this),
                cryptoDevTokenAmount
            );
            // the amount of LP tokens that would be sent to the user should be proportional to the liquidity of the
            // ether added by the user
            // Ratio here to be maintained is ->
            // (LP tokens to be sent to the user(liquidity)/TotalSupply of the LP tokens contract ) = (Eth sent by the user)/ (Eth reserve in the contract)
            //  by some math  -> liquidity = (totalSupply of LP tokens in Contract *(Eth sent by the user)/(Eth reserve in the contract))
            liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
        }
        return liquidity;
    }

    // @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
    /// in the swap
    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        require(_amount > 0, "_amount should be greater thna zero");
        uint256 ethReserve = address(this).balance;
        uint256 _totalSupply = totalSupply();
        // The amount of Eth that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Eth sent back to the user) / (current Eth reserve)
        // = (amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)
        // then by some maths -> (Eth sent back to the user)
        // = (current Eth reserve * amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)
        uint256 ethAmount = (ethReserve * _amount) / _totalSupply;
        // THe amount of Crypto Dev token that would be sent back to the user is based
        // om a ratio
        // Ratio is -> (Crypto Dev sent back to the user) / (current Crypto Dev token reserve)
        // = (amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)
        // Then bby some maths -> (Crypto Dev sen back to user)
        // = (current Crypto Dev token reserve * amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)
        uint256 cryptoDevTokenAmount = (getReserve() * _amount) / _totalSupply;
        // Burn the sent LP tokens from the user's wallet because they are alrady sent to
        // remove liquidity
        _burn(msg.sender, _amount);
        // Transfer `ethAmount` of Eth from the contract to the user's wallet
        payable(msg.sender).transfer(ethAmount);
        // Transfer `cryptoDevtokenAmount` of Crypto Dev Tokens from the contract to the user's wallet
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }

    /// @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
    /// in the swap
    function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) public payable returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0);
        // We are charging a fee of 1%
        // Inout amount with fee = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100
        uint256 inputAmountWithFee = inputAmount * 99;
        // Because we need to follow the concept of `XY = K` curve
        // We need to make sure (x + Δx) * (y - Δy) = x * y
        // So the final formula is Δy = (y * Δx) / (x + Δx)
        // Δy in our case is `tokens to be received`
        // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
        // So by putting the values in the formulae you can get the numerator and denominator
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    }

    /// @dev Swaps Eth for CryptoDev Tokens
    function ethToCryptoDevToken(uint256 _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of Crypto Dev Tokens
        // that would be returned to the user after the swap
        // Notice that the `inputReserve` we are sendind is eqaual to
        // `address(this).balance - msg.value` instead of just `address(this).balance`
        // because `address(this).balance` already contains the `msg.value` user has sent in the given call
        // so we need to subtract it to get the actual input reserve
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought >= _minTokens, "insufficient output amount");
        // Transfer the `Crypto Dev` tokens to the user
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
    }

    /// @dev Swaps Crypto Tokens for Eth
    function cryptoDevTokenToEth(uint256 _tokensSold, uint256 _minEth) public {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of Eth
        // that would be returned to the user after the swap
        uint256 ethBought = getAmountOfTokens(
            _tokensSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "insufficient amount");
        // Transfer `Crypto Dev` tojens from the user's address to the contract
        ERC20(cryptoDevTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        // send the `ethBouoght` to the user from the contract
        payable(msg.sender).transfer(ethBought);
    }
}
