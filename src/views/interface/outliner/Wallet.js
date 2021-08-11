import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { MdAccountBalanceWallet as WalletIcon } from 'react-icons/md';
import { FaEthereum as ConnectIcon } from 'react-icons/fa';
import { VscDebugDisconnect as DisconnectIcon } from 'react-icons/vsc';
import { RiLoginCircleFill as LoginIcon } from 'react-icons/ri';

import useStore from '~/hooks/useStore';
import useEagerConnect from '~/hooks/useEagerConnect';
import useInactiveListener from '~/hooks/useInactiveListener';
import useAuth from '~/hooks/useAuth';
import { injected } from '~/lib/blockchain/connectors';
import Section from '~/components/Section';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;

  & > * {
    margin-right: 10px;
  }
`;

const Info = styled.div`
  align-items: center;
  display: flex;
  margin-bottom: 15px;

  & span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Indicator = styled.span`
  color: ${props => {
    if (props.status === 'disconnected') return '#df4300';
    if (props.status === 'connected') return '#ff984f';
    if (props.status === 'logged-in') return '#2BCC80';
  }};

  flex: 0 0 20px;
  font-size: 25px;
  margin-bottom: 2px;
`;

const Wallet = () => {
  const { connector, account, activate, deactivate, active } = useWeb3React();
  const queryClient = useQueryClient();
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);
  const [ activatingConnector, setActivatingConnector ] = useState();
  const [ login, setLogin ] = useState(false);
  const { token } = useAuth(login);
  const status = account ? (token ? 'logged-in' : 'connected') : 'disconnected';

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
    invalidateToken();
    setLogin(false);
    deactivate();
  };

  // Eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // Connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  return (
    <Section
      name="wallet"
      title="Account"
      icon={<WalletIcon />}>
      <Info>
        <Indicator status={status}>●</Indicator>
        {status === 'disconnected' && <span>Wallet disconnected</span>}
        {status === 'connected' && <span>Connected as {account}</span>}
        {status === 'logged-in' && <span>Logged in as {account}</span>}
      </Info>
      <Controls>
       {status === 'disconnected' && (
          <Button
            data-tip="Connect Wallet"
            data-for="global"
            data-place="left"
            onClick={() => {
              setActivatingConnector(injected);
              activate(injected);
            }}>
            <ConnectIcon /> Connect
          </Button>
        )}
        {status === 'connected' && (
          <Button
            data-tip="Login with Ethereum"
            data-for="global"
            data-place="left"
            onClick={() => setLogin(true)}>
            <LoginIcon /> Login
          </Button>
        )}
        {[ 'connected', 'logged-in' ].includes(status) && (
          <Button
            data-tip="Disconnect Wallet"
            data-for="global"
            data-place="left"
            onClick={() => disconnectWallet()}>
            <DisconnectIcon /> Disconnect
          </Button>
        )}
      </Controls>
    </Section>
  );
};

export default Wallet;
