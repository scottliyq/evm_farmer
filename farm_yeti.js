/* 
    类型为质押LP，获得staking的收益，非标准的farm类型

*/

const ethers = require('ethers');
require("dotenv").config();
const axios = require('axios');
const erc20Abi = require('./ABI/erc20.json');

// const factoryAbi = require('./ABI/factory.json');
// const farmAbi = require('./ABI/farm.json');
const stakingAbi = require('./ABI/avax/yeti_staking.json');
const common = require('./common.js');


const MIN_TRADE_BALANCE = 1;
const MIN_TRADE_USD_VALUE= 10;
const DECIMAL_USDT = 6;

const rpcUrl = 'https://api.avax.network/ext/bc/C/rpc';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const config = {
    ADDRESS_YETI: '0x77777777777d4554c39223C354A05825b2E8Faa3',
    ADDRESS_USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    ADDRESS_ROUTER: '0x60ae616a2155ee3d9a68541ba4544862310933d4',
    ADDRESS_WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    ADDRESS_STAKING: '0xfffFffFFfFe8aA117FE603a37188E666aF110F39',
    slippage: 1
}

function convertHexToInt(hexValue) {
    return parseInt(hexValue.toHexString().toString());
}

//获取curve lp质押的收益
async function getStakingRewards(address) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ADDRESS_STAKING, stakingAbi, provider);
        let rewards = await contract.earned(address);
        resolve(rewards / 1e18);
    });
}

async function claimRewards(wallet) {
    console.log(`${wallet.address} is going to claim rewards`);
    // const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const gasPrice = await provider.getGasPrice();

    const contract = new ethers.Contract(config.ADDRESS_STAKING, stakingAbi, provider);
    const signer = contract.connect(wallet);

    return new Promise(async (resolve) => {
        signer.getReward({
            gasPrice: gasPrice,
            gasLimit: 120000
        }).then(async (result) => {
            await result.wait();
            console.log(`${wallet.address} claim rewards successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err);
            resolve(false);
        });
    
    });

}






const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function start(privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // let balance = await provider.getBalance(wallet.address) / 1e18;

    // console.log("wallet balance: " + balance);

        
    let rewards = await getStakingRewards(wallet.address);

    console.log("staking rewards: " + rewards);
    // if(rewards > 1) {
       
    // }

    // let dexTokenBalance = await common.getTokenBalance(config.ADDRESS_YETI, wallet.address, provider);
    // console.log("YETI balance in wallet:" + dexTokenBalance);
    const tokenUsdValue = await common.getTokenUSDValue(config.ADDRESS_ROUTER, provider, [config.ADDRESS_YETI, config.ADDRESS_WAVAX, config.ADDRESS_USDT]);
    console.log("YETI usd value:" + tokenUsdValue);

    const totalUsdValue = parseFloat(rewards) * parseFloat(tokenUsdValue);

    if (totalUsdValue > MIN_TRADE_USD_VALUE) {
        await claimRewards(wallet);
    
        const dexTokenBalance = await common.getTokenBalance(config.ADDRESS_YETI, wallet.address, provider);

        let isApproved = await common.hasApproved(config.ADDRESS_YETI, wallet.address, config.ADDRESS_ROUTER, provider);
        if (!isApproved) {
            await common.approve(wallet, config.ADDRESS_YETI, config.ADDRESS_ROUTER, provider);
        }
        await common.swapExactTokensForTokens(config.ADDRESS_ROUTER,provider, wallet, dexTokenBalance, [config.ADDRESS_YETI, config.ADDRESS_WAVAX, config.ADDRESS_USDT], provider);
    }


}

async function processFarm(){
    let keys = process.env.AVAX_KEY.split(",");

    for(let key of keys){
        start(key)
    }
}

async function main(){
    processFarm();
}    

module.exports = {  
    processFarm: processFarm, 
};

main();
