import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3';

import Dex from './contracts/Dex.json';
import ERC20Abi from './ERC20Abi.json';

export const getWeb3 = () => {
  return new Promise(async (resolve, reject) => {
    let provider = await detectEthereumProvider();    
    if (provider) {
      await provider.request({ method: 'eth_requestAccounts' });
      try {
        const web3 = new Web3(window.ethereum);
        resolve(web3);
      } catch(error) {
        reject(error);
      }
    } 
    
    reject('Install Metamask');    
  });
};

export const getContracts = async web3 => {
  const networkId = await web3.eth.net.getId();
  const contractDeployed = Dex.networks[networkId];
  const dex = new web3.eth.Contract(Dex.abi, contractDeployed && contractDeployed.address);
  const tokens = await dex.methods.getTokens().call();
  const tokenContracts = tokens.reduce((accumulator, token) => ({ ...accumulator, [web3.utils.hexToUtf8(token.ticker)]: new web3.eth.Contract(
    ERC20Abi, token.tokenAddress
  ) }), {});

  return { dex, ...tokenContracts };
};