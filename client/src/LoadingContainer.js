import React, { useEffect, useState } from 'react';

import { getWeb3, getContracts } from './utils';
import App from './App';

const LoadingContainer = () => {
  const [web3, setWeb3] = useState(undefined);
  const [contracts, setContracts] = useState(undefined);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const contracts = await getContracts(web3);
      const accounts = await web3.eth.getAccounts();

      setWeb3(web3);
      setContracts(contracts);
      setAccounts(accounts);
    };

    init();
  }, []);

  const isReady = () => web3 !== undefined && contracts !== undefined && accounts.length > 0;

  if (!isReady()) {
    return (
      <div>
        Loading ...
      </div>
    );
  }

  return <App web3={web3} contracts={contracts} accounts={accounts} />;
};

export default LoadingContainer;