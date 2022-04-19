
const ethers = require('ethers');
const routerAbi = require('./ABI/pancake.json');
const erc20Abi = require('./ABI/erc20.json');
const SLIPPAGE = 1;

async function hasApproved(tokenAddress, myAddress, spender, provider) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        let isApproved = await contract.allowance(myAddress, spender);
        resolve(isApproved > 0 ? true : false);
    });
}

async function approve(wallet, tokenAddress, spender, provider) {
    return new Promise(async (resolve) => {
        console.log(`${wallet.address} is going to approve ${spender} to spend your token`);
        let maxAmount = "999999999000000000000000000";
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const signer = contract.connect(wallet);
        signer.approve(spender, maxAmount, {
            gasPrice: await provider.getGasPrice(),
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (result) => {
            await result.wait();
            console.log(`${wallet.address} approved ${spender} to spend your token`);
            resolve(true);
        }).catch(err => {
            console.log("Approve error: " + err.reason);
            resolve(false)
        });
    });
}

async function getTokenBalance(tokenContractAddress, address, provider) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenContractAddress, erc20Abi, provider);
        let balance = await contract.balanceOf(address);
        let decimals = await contract.decimals();
        resolve(ethers.utils.formatUnits(balance, decimals))
    })
}

async function getTokenUSDValue(routerAddress, provider, path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(routerAddress, routerAbi, provider);
        const amountIn = ethers.utils.parseEther("1.0");
        const amounts = await contract.getAmountsOut(amountIn, path);

        // for(let amount of amounts) {
        //     console.log(convertHexToInt(amount));
        // }
        //TODO usdt位数只有1e6,不是1e18
        const amountOutMin = amounts[2].mul(1e12).sub(amounts[0].mul(SLIPPAGE).div(100));
        resolve(ethers.utils.formatUnits(amountOutMin, 18))
    })
}


async function swapExactTokensForTokens(routerAddress, provider, wallet, paramAmountIn, path) {

    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(routerAddress, routerAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 200;
        const amountIn = ethers.utils.parseEther(paramAmountIn);
       
        const amounts = await contract.getAmountsOut(amountIn, path);

        // for(let amount of amounts) {
        //     console.log(convertHexToInt(amount));
        // }
        //TODO usdt位数只有1e6,不是1e18
        const amountOutMin = (amounts[2].mul(1e12).sub(amounts[0].mul(SLIPPAGE).div(100))).div(1e12);
        console.log(`${wallet.address} is going to swap ${amountIn / 1e18} Token1 for ${amountOutMin / 1e6} Token2`);
        
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 300000
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} swap successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err);
            resolve(false);
        });

    })
}


module.exports = {  
    approve: approve, 
    hasApproved: hasApproved, 
    getTokenBalance: getTokenBalance,
    swapExactTokensForTokens: swapExactTokensForTokens,
    getTokenUSDValue: getTokenUSDValue
};