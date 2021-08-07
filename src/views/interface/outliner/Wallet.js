import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { FaEthereum } from 'react-icons/fa';
import { VscDebugDisconnect } from 'react-icons/vsc';

import useEagerConnect from '~/hooks/useEagerConnect';
import useInactiveListener from '~/hooks/useInactiveListener';
import { injected } from '~/lib/blockchain/connectors';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const Wallet = () => {
  const { connector, account, activate, deactivate, active } = useWeb3React();
  const queryClient = useQueryClient();
  const [ activatingConnector, setActivatingConnector ] = useState();

  // Recognize the connector currently being activated
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [ activatingConnector, connector ]);

  // Remove auth queries when wallet is disconnected
  const disconnectWallet = () => {
    queryClient.removeQueries([ 'login', account ]);
    queryClient.removeQueries([ 'sign', account ]);
    queryClient.removeQueries([ 'verify', account ]);
    deactivate();
  };

  // Eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // Connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  return (
    <Section
      name="wallet"
      title="Wallet"
      icon={<MdAccountBalanceWallet />}>
      <Controls>
       {!active && (
          <IconButton
            data-tip="Connect Wallet"
            onClick={() => {
              setActivatingConnector(injected);
              activate(injected);
            }}>
            <FaEthereum />
          </IconButton>
        )}
        {active && (
          <IconButton
            data-tip="Disconnect Wallet"
            onClick={() => disconnectWallet()}>
            <VscDebugDisconnect />
          </IconButton>
        )}
      </Controls>
      <span>{account}</span>
    </Section>
  );
};

export default Wallet;
