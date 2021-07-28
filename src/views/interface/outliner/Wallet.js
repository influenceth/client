import { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { MdAccountBalanceWallet } from 'react-icons/md';

import useEagerConnect from '~/hooks/useEagerConnect';
import useInactiveListener from '~/hooks/useInactiveListener';
import { injected } from '~/lib/connectors';
import Pane from './Pane';
import Button from '~/components/Button';

const Wallet = () => {
  const web3Context = useWeb3React();
  const { connector, library, chainId, account, activate, deactivate, active, error } = web3Context;
  const [ activatingConnector, setActivatingConnector ] = useState();

  // handle logic to recognize the connector currently being activated
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [ activatingConnector, connector ]);

  // Handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // Handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  return (
    <Pane title="Wallet" icon={<MdAccountBalanceWallet />}>
      <span>{account}</span>
      {!active && (
        <Button
          onClick={() => {
            setActivatingConnector(injected);
            activate(injected);
          }}>
          Connect
        </Button>
      )}
      {active && (
        <Button onClick={() => deactivate()}>
          Disconnect
        </Button>
      )}
    </Pane>
  );
};

export default Wallet;
