const { expectRevert } = require('@openzeppelin/test-helpers');

const Dai = artifacts.require('mocks/Dai');
const Bat = artifacts.require('mocks/Bat');
const Rep = artifacts.require('mocks/Rep');
const Zrx = artifacts.require('mocks/Zrx');
const Dex = artifacts.require('Dex');

const Side = {
  BUY: 0, 
  SELL: 1
};

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

  it('should withdraw tokens', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });
    await dex.withdraw(amount, DAI, { from: trader1 });

    const [dexBalance, traderBalance] = await Promise.all([
      dex.traderBalances(trader1, DAI),
      dai.balanceOf(trader1)
    ]);
    assert(dexBalance.isZero());
    assert(traderBalance.toString() === web3.utils.toWei('1000'));
  });

  it('should NOT withdraw any unknown tokens', async () => {
    await expectRevert(
      dex.withdraw(web3.utils.toWei('100'), web3.utils.fromAscii('XYZ'), { from: trader1 }),
      'token does not exists'
    );
  });

  it('should NOT withdraw when balance is low', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });
    await expectRevert(
      dex.withdraw(web3.utils.toWei('1000'), DAI, { from: trader1 }),
      'not enough balance'
    );
  });

  it('should create a limit order', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });
    
    //                        ticker, amount,              price, Side side
    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, Side.BUY, { from: trader1 });

    let buyOrders = await dex.getOrders(REP, Side.BUY);
    let sellOrders = await dex.getOrders(REP, Side.SELL);

    assert(buyOrders.length === 1);
    assert(sellOrders.length === 0);
    assert(buyOrders[0].trader === trader1);
    assert(buyOrders[0].ticker === web3.utils.padRight(REP, 64));
    assert(buyOrders[0].price === '10');
    assert(buyOrders[0].amount === web3.utils.toWei('10'));

    await dex.deposit(web3.utils.toWei('200'), DAI, { from: trader2 });
    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 11, Side.BUY, { from: trader2 });
    buyOrders = await dex.getOrders(REP, Side.BUY);
    sellOrders = await dex.getOrders(REP, Side.SELL);

    assert(buyOrders.length === 2);
    assert(buyOrders[0].trader === trader2); // better price available so this order sould be at the top
    assert(buyOrders[1].trader === trader1);
    assert(sellOrders.length === 0);

    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 9, Side.BUY, { from: trader2 });
    buyOrders = await dex.getOrders(REP, Side.BUY);
    sellOrders = await dex.getOrders(REP, Side.SELL);

    assert(buyOrders.length === 3);
    assert(buyOrders[0].trader === trader2);
    assert(buyOrders[1].trader === trader1);
    assert(buyOrders[2].trader === trader2);
    assert(buyOrders[2].price === '9');
    assert(sellOrders.length === 0);
  });

  it('should NOT create limit order if token does not exist', async () => {
    await expectRevert(
      dex.createLimitOrder(web3.utils.fromAscii('XYZ'), web3.utils.toWei('100'), 10, Side.BUY, { from: trader1 }),
      'token does not exists'
    );
  });

  it('should NOT create limit order if token is DAI', async () => {
    await expectRevert(
      dex.createLimitOrder(DAI, web3.utils.toWei('100'), 10, Side.BUY, { from: trader1 }),
      'cannot trade DAI'
    );
  });

  it('should NOT create limit order if token balance is too low', async () => {
    await dex.deposit(web3.utils.toWei('99'), REP, { from: trader1 });
    await expectRevert(
      dex.createLimitOrder(REP, web3.utils.toWei('100'), 10, Side.SELL, { from: trader1 }),
      'token balance too low'
    );
  });

  it('should NOT create limit order if DAI balance is too low', async () => {
    await dex.deposit(web3.utils.toWei('80'), DAI, { from: trader1 });
    await expectRevert(
      dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, Side.BUY, { from: trader1 }),
      'DAI balance too low'
    );
  });


});