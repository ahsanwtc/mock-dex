const { expectRevert } = require('@openzeppelin/test-helpers');

const Dai = artifacts.require('mocks/Dai');
const Bat = artifacts.require('mocks/Bat');
const Rep = artifacts.require('mocks/Rep');
const Zrx = artifacts.require('mocks/Zrx');
const Dex = artifacts.require('Dex');

contract('Dex', accounts => {
  let dai, bat, rep, zrx, dex;
  const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(ticker => web3.utils.fromAscii(ticker));
  const admin = accounts[0];
  const [trader1, trader2] = [accounts[1], accounts[2]];

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

    const amount = web3.utils.toWei('1000');
    const seedTokenBalance = async (token, trader) => {
      await token.faucet(trader, amount);
      await token.approve(dex.address, amount, { from: trader });
    };

    await seedTokenBalance(dai, trader1)
    await seedTokenBalance(bat, trader1)
    await seedTokenBalance(rep, trader1)
    await seedTokenBalance(zrx, trader1)

    await seedTokenBalance(dai, trader2)
    await seedTokenBalance(bat, trader2)
    await seedTokenBalance(rep, trader2)
    await seedTokenBalance(zrx, trader2)
    // await Promise.all([dai, bat, rep, zrx].map(token => seedTokenBalance(token, trader1)));
    // await Promise.all([dai, bat, rep, zrx].map(token => seedTokenBalance(token, trader2)));

  });

  it('should deposit tokens', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });
    const balance = await dex.traderBalances(trader1, DAI);
    assert(balance.toString() === amount);
  });

  it('should NOT deposit any unknown tokens', async () => {
    await expectRevert(
      dex.deposit(web3.utils.toWei('100'), web3.utils.fromAscii('XYZ'), { from: trader1 }),
      'token does not exists'
    );
  });


});