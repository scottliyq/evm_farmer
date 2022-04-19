const ethers = require('ethers');
require("dotenv").config();
const schedule = require('node-schedule');


const axios = require('axios');
const erc20Abi = require('./ABI/erc20.json');
const routerAbi = require('./ABI/router_swappi.json');
const factoryAbi = require('./ABI/factory.json');
const farmAbi = require('./ABI/farm_swappi.json');
const stakingAbi = require('./ABI/staking.json');
// const utils = require('./utils');

const rpcUrl = 'https://evm.confluxrpc.com/';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const config = {
    PPI: '0x22f41abf77905f50df398f21213290597e7414dd',
    WCFX: '0x14b2d3bc65e74dae1030eafd8ac30c533c976a9b',
    USDT: '0xfe97e85d13abd9c1c33384e796f10b73905637ce',
    ADDRESS_ROUTER: '0x62b0873055bf896dd869e172119871ac24aea305',
    // FACTORY: '0xBD9EbFe0E6e909E56f1Fd3346D0118B7Db49Ca15',
    ADDRESS_FARM: '0xca49dbc049fca1916a1e51315b992a0d1eb308e7',
    // STAKING: '0xbc22a1304213b1a11eed3c5d116908575939bc4b',
    slippage: 1
}

async function getFaucet(address) {
    return new Promise(resolve => {
        axios.post('https://neonswap.live/neonswap.live/request_airdrop', {
            amount: 1000,
            wallet: address
        }).then(res => {
            console.log(`${wallet.address}: Received 1000 NEON from the faucet!`);
            resolve(true);
        }).catch(err => {
            resolve(false);
        })
    })

}

function getTokenBalance(tokenContractAddress, address) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenContractAddress, erc20Abi, provider);
        let balance = await contract.balanceOf(address);
        let decimals = await contract.decimals();
        resolve(ethers.utils.formatUnits(balance, decimals))
    })

}

function hasApproved(tokenAddress, myAddress, spender) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        let isApproved = await contract.allowance(myAddress, spender);
        resolve(isApproved > 0 ? true : false);
    });
}

function approve(wallet, tokenAddress, spender) {
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

function getLp(tokenA, tokenB) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.FACTORY, factoryAbi, provider);
        let lp = await contract.getPair(tokenA, tokenB);
        resolve(lp);
    });
}

function getPendingFarmingRewards(pid, address) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ADDRESS_FARM, farmAbi, provider);
        let rewards = await contract.userInfo(pid, address);
        resolve(rewards.pendingRewards / 1e18);
    });
}

function addLiquidity(wallet, amountIn, token, path) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.ROUTER);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.ROUTER);
        }
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountTokenDesired = amounts[1];
        const amountETHMin = ethers.utils.parseEther("" + Number(amountIn) * (100 - config.slippage) / 100);
        const tokenAmounts = await contract.getAmountsOut(amountETHMin, path);
        const amountTokenMin = tokenAmounts[1].sub(tokenAmounts[1].mul(config.slippage).div(100));

        console.log(`${wallet.address} is going to add liquidity..`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} added liquidity successfully`);
            resolve(true);
        }).catch(err => {
            resolve(false);
        });

    })
}

function swapEthToToken(wallet, amountIn, path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ROUTER, routerAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountOutMin = amounts[1].sub(amounts[1].mul(config.slippage).div(100));
        console.log(`${wallet.address} is going to swap ${amountIn} NEON for ${amountOutMin / 1e18} MORA`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.swapExactETHForTokens(amountOutMin, path, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
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


function swapExactTokensForTokens(wallet, paramAmountIn, path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ADDRESS_ROUTER, routerAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amountIn = ethers.utils.parseEther(paramAmountIn)
       
        const amounts = await contract.getAmountsOut(amountIn, path);

        const amountOutMin = amounts[2].sub(amounts[1].mul(config.slippage).div(100));
        console.log(`${wallet.address} is going to swap ${amountIn / 1e18} Token1 for ${amountOutMin / 1e18} Token2`);
        
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000
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


function deposit(wallet, pid, amount) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ADDRESS_FARM, farmAbi, provider);
        if (amount > 0) {
            console.log(`${wallet.address} is going to start farming...`);
        } else {
            console.log(`${wallet.address} is going to harvest...`)
        }

        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.deposit(pid, ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            if (amount > 0) {
                console.log(`${wallet.address} added to pool successfully`);
            } else {
                console.log(`${wallet.address} harvest successfully`);
            }
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}


function stake(wallet, amount) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.STAKING);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.STAKING);
        }
        const contract = new ethers.Contract(config.STAKING, stakingAbi, provider);
        console.log(`${wallet.address} is going to stake...`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.enter(ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} staked successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}

function unstake(wallet, amount) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.STAKING);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.STAKING);
        }
        const contract = new ethers.Contract(config.STAKING, stakingAbi, provider);
        console.log(`${wallet.address} is going to unstake...`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.leave(ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} unstaked successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function start(privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    // await getFaucet(wallet.address);
    console.log("wallet address: " + wallet.address);
    let balance = await provider.getBalance(wallet.address) / 1e18;

    console.log("wallet balance:" + balance);

    //todo 取水
    // while(balance<1000){
    //     await getFaucet(wallet.address);
    //     await sleep(10000);
    //     balance = await provider.getBalance(wallet.address) / 1e18;
    // }
    // if (balance >= 1000) {
        //Swap NEON for MORA
        // await swapEthToToken(wallet, ""+balance*0.49, [config.WNEON, config.MORA]);
        // //Add liquidity
        // await addLiquidity(wallet, ""+balance*0.49, config.MORA, [config.WNEON, config.MORA]);
    // }
    //Find NEON MORA LP contract address
    // let NEON_MORA_LP = await getLp(config.WNEON, config.MORA);
    // //Farming
    // let isApproved = await hasApproved(NEON_MORA_LP, wallet.address, config.NEON_MORA_FARM);
    // if (!isApproved) {
    //     console.log("start to approve");
    //     await approve(wallet, NEON_MORA_LP, config.NEON_MORA_FARM);
    // }
    // let lpBalance = await getTokenBalance(NEON_MORA_LP, wallet.address);
    // if (lpBalance > 0) {
    //     console.log("start to deposit");
    //     await deposit(wallet, 0, lpBalance);
    // }
    //Check pending rewards
    // let pendingRewards = await getPendingFarmingRewards(3, wallet.address);
    // console.log("pending rewards:" + pendingRewards);
    // if (pendingRewards > 1) {
        //todo
    await deposit(wallet, 3, 0);
    // }
    let dexTokenBalance = await getTokenBalance(config.PPI, wallet.address);
    console.log("token balance in wallet:" + dexTokenBalance);
    if (dexTokenBalance > 0) {

        await swapExactTokensForTokens(wallet, dexTokenBalance, [config.PPI, config.WCFX, config.USDT]);
    }
    // let stakedMora = await getTokenBalance(config.STAKING, wallet.address);
    // if (stakedMora > 0) {
    //     //unstake MORA
    //     await unstake(wallet, stakedMora);
    // }
}

async function main(){

    schedule.scheduleJob('1 50 * * * *',()=>{
        try {
            console.log('Task star: ' + new Date());
            let keys = process.env.TEST_PRIVATE_KEY.split(",");
            for(let key of keys){
                start(key)
            }
        } catch( error  ) {

            if(error.message !== undefined)
                console.error(error.message);
            else
                console.error( error );
        }
    }); 
}

main();