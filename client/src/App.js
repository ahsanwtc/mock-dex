import React, { useState, useEffect } from 'react';

import Header from './Header';
import Footer from './Footer';
import Wallet from './Wallet';

function App({ web3, accounts, contracts }) {
  const [tokens, setTokens] = useState([]);
  const [user, setUser] = useState({ accounts: [], selectedToken: undefined,  balances: { tokenDex: 0, tokenWallet: 0 }});

  const selectToken = token => setUser({ ...user, selectedToken: token });

  useEffect(() => {
    const init = async () => {
      const rawTokens = await contracts.dex.methods.getTokens().call(); 
      const tokens = rawTokens.map(token => ({
        ...token,
        ticker: web3.utils.hexToUtf8(token.ticker)
      }));
      const balances = await getBalances(accounts[0], tokens[0]);
      setTokens(tokens);
      setUser({ accounts, selectedToken: tokens[0], balances });
    }
    init();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBalances = async (account, token) => {
    const tokenDex = await contracts.dex.methods
      .traderBalances(account, web3.utils.fromAscii(token.ticker))
      .call();
    const tokenWallet = await contracts[token.ticker].methods
      .balanceOf(account)
      .call();
    return { tokenDex, tokenWallet };
  }

  const deposit = async amount => {
    await contracts[user.selectedToken.ticker].methods
      .approve(contracts.dex.options.address, amount)
      .send({from: user.accounts[0]});
    await contracts.dex.methods
      .deposit(amount, web3.utils.fromAscii(user.selectedToken.ticker))
      .send({from: user.accounts[0]});
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances }));
  }

  const withdraw = async amount => {
    await contracts.dex.methods
      .withdraw(
        amount, 
        web3.utils.fromAscii(user.selectedToken.ticker)
      )
      .send({from: user.accounts[0]});
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances }));
  }
  
  if(user.selectedToken === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div id="app">
       <Header contracts={contracts} tokens={tokens} user={user} selectToken={selectToken}/>
      <main className="container-fluid">
        <div className="row">
          <div className="col-sm-4 first-col">
            <Wallet user={user} deposit={deposit} withdraw={withdraw}/>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
