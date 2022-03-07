const Dai = artifacts.require('mocks/Dai');
const Bat = artifacts.require('mocks/Bat');
const Rep = artifacts.require('mocks/Rep');
const Zrx = artifacts.require('mocks/Zrx');
const Dex = artifacts.require('Dex');

contract('Dex', () => {
  let dai, bat, rep, zrx, dex;
  const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(ticker => web3.utils.fromAscii(ticker));

  beforeEach(async () => {
    ([dai, bat, rep, zrx] = await Promise.all([
      Dai.new(),
      Bat.new(),
      Rep.new(),
      Zrx.new()
    ]));

    dex = await Dex.new();
    await Promise.all([
      dex.addToken(DAI, dai.address),
      dex.addToken(BAT, bat.address),
      dex.addToken(REP, rep.address),
      dex.addToken(ZRX, zrx.address),
    ]);
  });
});