const Dai = artifacts.require('mocks/Dai');
const Bat = artifacts.require('mocks/Bat');
const Rep = artifacts.require('mocks/Rep');
const Zrx = artifacts.require('mocks/Zrx');
const Dex = artifacts.require('Dex');

const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(ticker => web3.utils.fromAscii(ticker));

module.exports = async (deployer, _network, accounts) => {
  const [trader1, trader2, trader3, trader4, _] = accounts;
  
  await Promise.all(
    [Dai, Bat, Rep, Zrx, Dex].map(contract => deployer.deploy(contract))
  );

  const [dai, bat, rep, zrx, dex] = await Promise.all(
    [Dai, Bat, Rep, Zrx, Dex].map(contract => contract.deployed())
  );
  
  await Promise.all([
    dex.addToken(DAI, dai.address),
    dex.addToken(BAT, bat.address),
    dex.addToken(REP, rep.address),
    dex.addToken(ZRX, zrx.address),
  ]);
};
