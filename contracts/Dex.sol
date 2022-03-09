// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Dex {

  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }

  struct Order {
    uint id;
    address trader;
    Side side;
    bytes32 ticker;
    uint amount;
    uint filled;
    uint price;
    uint date;
  }

  enum Side {
    BUY,
    SELL
  }

  mapping(bytes32 => Token) public tokens;
  bytes32[] public tokenList;
  address public admin;
  mapping(address => mapping(bytes32 => uint)) public traderBalances;
  mapping(bytes32 => mapping(uint => Order[])) public orderBook;
  uint public nextOrderId;
  uint public nextTradeId;
  bytes32 constant DAI = bytes32('DAI');

  constructor() {
    admin = msg.sender;
  }

  function getOrders(bytes32 ticker, Side side) external view returns(Order[] memory) {
    return orderBook[ticker][uint(side)];
  }

  function getTokens() external view returns(Token[] memory) {
    Token[] memory _tokens = new Token[](tokenList.length);
    for (uint i = 0; i < tokenList.length; i++) {
      _tokens[i] = Token(
        tokens[tokenList[i]].ticker,
        tokens[tokenList[i]].tokenAddress
      );
    }
    return _tokens;
  }

  event NewTrade(
    uint tradeId, uint orderId, bytes32 indexed ticker, address indexed trader1, address indexed trader2, uint amount, uint price, uint date
  );

  function addToken(bytes32 ticker, address tokenAddress) external onlyAdmin() {
    tokens[ticker] = Token(ticker, tokenAddress);
    tokenList.push(ticker);
  }

  function deposit(uint amount, bytes32 ticker) tokenExists(ticker) external  {
    IERC20(tokens[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    traderBalances[msg.sender][ticker] += amount;
  }

  function withdraw(uint amount, bytes32 ticker) external tokenExists(ticker) {
    require(traderBalances[msg.sender][ticker] >= amount, 'not enough balance');
    traderBalances[msg.sender][ticker] -= amount;
    IERC20(tokens[ticker].tokenAddress).transfer(msg.sender, amount);
  }

  function createLimitOrder(bytes32 ticker, uint amount, uint price, Side side) external tokenExists(ticker) tokenNotDai(ticker) {        
    /* sell order */ 
    if (side == Side.SELL) {
      require(traderBalances[msg.sender][ticker] >= amount, 'token balance too low');
    } else {
      require(traderBalances[msg.sender][DAI] >= amount * price, 'DAI balance too low');
    }

    Order[] storage orders = orderBook[ticker][uint(side)];
    orders.push(Order(
      nextOrderId,
      msg.sender,
      side,
      ticker,
      amount,
      0,
      price,
      block.timestamp
    ));

    uint i = orders.length > 0 ? orders.length - 1 : 0;
    while(i > 0) {
      if (side == Side.BUY && orders[i-1].price > orders[i].price) {
        break;
      }
      if (side == Side.SELL && orders[i-1].price < orders[i].price) {
        break;
      }

      Order memory order = orders[i-1];
      orders[i-1] = orders[i];
      orders[i] = order;
      i--;
    }

    nextOrderId++;
  }

  function createMarketOrder(bytes32 ticker, uint amount, Side side) external tokenExists(ticker) tokenNotDai(ticker) {
    /* sell order */ 
    if (side == Side.SELL) {
      require(traderBalances[msg.sender][ticker] >= amount, 'token balance too low');
    } else {
      // require(traderBalances[msg.sender][DAI] >= amount * price, 'DAI balance too low');
    }
    
    Order[] storage orders = orderBook[ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
    uint i;
    uint remaining = amount;
    while (i < orders.length && remaining > 0) {
      uint available = orders[i].amount - orders[i].filled;
      uint matched = (remaining > available) ? available : remaining;
      remaining = remaining - matched;
      orders[i].filled += matched;
      emit NewTrade(nextTradeId, orders[i].id, ticker, orders[i].trader, msg.sender, matched, orders[i].price, block.timestamp);

      if (side == Side.SELL) {
        traderBalances[msg.sender][ticker] -= matched;
        traderBalances[msg.sender][DAI] += matched * orders[i].price;
        traderBalances[orders[i].trader][ticker] += matched;
        traderBalances[orders[i].trader][DAI] -= matched * orders[i].price;
      }
        
      if (side == Side.BUY) {
        require(traderBalances[msg.sender][DAI] >= matched * orders[i].price, 'DAI balance too low');
        traderBalances[msg.sender][ticker] += matched;
        traderBalances[msg.sender][DAI] -= matched * orders[i].price;
        traderBalances[orders[i].trader][ticker] -= matched;
        traderBalances[orders[i].trader][DAI] += matched * orders[i].price;
      }
      nextTradeId++;
      i++;
    }

    i = 0;
    while (i < orders.length && orders[i].filled == orders[i].amount) {
      for (uint j = i; j < orders.length - 1; j++) {
        orders[j] = orders[j+i];
      }
      orders.pop();
      i++;
    }
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'only admin');
    _;
  }

  modifier tokenExists(bytes32 ticker) {
    require(tokens[ticker].tokenAddress != address(0), 'token does not exists');
    _;
  }

  modifier tokenNotDai(bytes32 ticker) {
    require(ticker != DAI, 'cannot trade DAI');
    _;
  }
}