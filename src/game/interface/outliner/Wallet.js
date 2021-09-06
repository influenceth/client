import { useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected
} from '@web3-react/injected-connector';
import { UserRejectedRequestError as UserRejectedRequestErrorWC } from '@web3-react/walletconnect-connector';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useEagerConnect from '~/hooks/useEagerConnect';
import useInactiveListener from '~/hooks/useInactiveListener';
import useAuth from '~/hooks/useAuth';
import { injected, walletconnect } from '~/lib/blockchain/connectors';
import Section from '~/components/Section';
import Button from '~/components/Button';
import { DisconnectIcon, LoginIcon, WalletIcon, WarningIcon } from '~/components/Icons';
import MetamaskLogo from '~/assets/images/metamask-fox.svg';
import WalletConnectLogo from '~/assets/images/walletconnect-logo.svg';
import BraveLogo from '~/assets/images/brave-icon.svg';

const networkNames = {
  1: 'Ethereum Mainnet',
  4: 'Rinkeby Testnet',
  1337: 'Local Testnet'
};

const getErrorMessage = (error) => {
  if (error instanceof NoEthereumProviderError) {
    return 'No Ethereum browser extension detected, install MetaMask or visit from a dApp browser on mobile.';
  } else if (error instanceof UnsupportedChainIdError) {
    return `Network unsupported, please connect to ${networkNames[process.env.REACT_APP_CHAIN_ID]}.`;
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWC
  ) {
    return 'Please authorize Influence to access your Ethereum account.';
  } else {
    return 'An unknown error occurred, please check the console for details.';
  }
};

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;

  & > * {
    margin-right: 10px;
  }
`;

const Info = styled.div`
  align-items: center;
  display: flex;

  & span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Indicator = styled.span`
  color: ${p => {
    if (p.status === 'disconnected') return '#df4300';
    if (p.status === 'connected') return '#ff984f';
    if (p.status === 'logged-in') return '#2BCC80';
  }};

  flex: 0 0 20px;
  font-size: 25px;
  margin-bottom: 2px;
`;

const Error = styled.div`
  align-items: center;
  display: flex;
  margin-bottom: 20px;
`;

const StyledErrorIcon = styled(WarningIcon)`
  color: ${p => p.theme.colors.error};
  height: 20px;
  margin-right: 5px;
  width: 20px;
`;

const Wallet = () => {
  const { connector, account, activate, deactivate, error } = useWeb3React();
  const queryClient = useQueryClient();
  const forceExpand = useStore(s => s.dispatchOutlinerSectionExpanded);
  const forceCollapse = useStore(s => s.dispatchOutlinerSectionCollapsed);
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);
  const [ activatingConnector, setActivatingConnector ] = useState();
  const { token, restartLogin } = useAuth();
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
    if (connector.close) connector.close(); // for WalletConnect
    deactivate();
  };

  useEffect(() => {
    if (status !== 'logged-in' || !!error) forceExpand('wallet');
    if (status === 'logged-in') forceCollapse('wallet');
  }, [ status, error, forceExpand, forceCollapse ]);

  // Eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // Connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  return (
    <Section
      name="wallet"
      title="Account"
      sticky={true}
      icon={<WalletIcon />}>
      <Info>
        <Indicator status={status}>●</Indicator>
        {status === 'disconnected' && <span>Wallet disconnected. Connect with:</span>}
        {status === 'connected' && <span>Connected as {account}</span>}
        {status === 'logged-in' && <span>Logged in as {account}</span>}
      </Info>
      {!!error && (
        <Error>
          <StyledErrorIcon />
          <span>{getErrorMessage(error)}</span>
        </Error>
      )}
      <Controls>
        {status === 'disconnected' && !!navigator.brave && (
          <Button
            data-tip="Brave Browser"
            data-for="global"
            data-place="left"
            onClick={() => {
              setActivatingConnector(injected);
              activate(injected);
            }}>
            <BraveLogo viewBox="0 0 55 64" /> Brave
          </Button>
        )}
        {status === 'disconnected' && !navigator.brave && (
          <Button
            data-tip="Metamask"
            data-for="global"
            data-place="left"
            onClick={() => {
              setActivatingConnector(injected);
              activate(injected);
            }}>
            <MetamaskLogo /> Metamask
          </Button>
        )}
        {status === 'disconnected' && (
          <Button
            data-tip="WalletConnect"
            data-for="global"
            data-place="left"
            onClick={() => {
              setActivatingConnector(walletconnect);
              activate(walletconnect);
            }}>
            <WalletConnectLogo /> WalletConnect
          </Button>
        )}
        {status === 'connected' && (
          <Button
            data-tip="Login with Ethereum"
            data-for="global"
            data-place="left"
            onClick={() => restartLogin()}>
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
