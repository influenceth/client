import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';

import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected
} from '@web3-react/injected-connector';
import { UserRejectedRequestError as UserRejectedRequestErrorWC } from '@web3-react/walletconnect-connector';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import Section from '~/components/Section';
import Button from '~/components/Button';
import { DisconnectIcon, LoginIcon, WalletIcon, WarningIcon } from '~/components/Icons';
import starknetIcon from '~/assets/images/starknet-icon.png';

const networkNames = {
  1: 'Ethereum Mainnet',
  4: 'Rinkeby Testnet',
  5: 'Goerli Testnet',
  1337: 'Local Testnet'
};

const getErrorMessage = (error) => {
  console.error(error);

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

// TODO: if completely logged out, should we always present the list? i.e. rather than just enabling first

const Wallet = () => {
  const queryClient = useQueryClient();
  const forceExpand = useStore(s => s.dispatchOutlinerSectionExpanded);
  const forceCollapse = useStore(s => s.dispatchOutlinerSectionCollapsed);
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);

  const { token, restartLogin, wallet } = useAuth();
  const status = wallet.account && wallet.isConnected ? (token ? 'logged-in' : 'connected') : 'disconnected';

  // Remove auth queries when wallet is disconnected
  const disconnectWallet = () => {
    queryClient.removeQueries([ 'login', wallet.account ]);
    queryClient.removeQueries([ 'sign', wallet.account ]);
    queryClient.removeQueries([ 'verify', wallet.account ]);
    invalidateToken();
    wallet.disconnect();
  };

  useEffect(() => {
    if (status !== 'logged-in' || !!wallet.error) forceExpand('wallet');
    if (status === 'logged-in') forceCollapse('wallet');
  }, [ status, wallet.error, forceExpand, forceCollapse ]);
  
  useEffect(() => {
    wallet.reconnect();
  }, []);

  return (
    <Section
      name="wallet"
      title="Account"
      sticky={true}
      icon={<WalletIcon />}>
      <Info>
        <Indicator status={status}>●</Indicator>
        {status === 'disconnected' && <span>Wallet is disconnected.</span>}
        {status === 'connected' && <span>Connected as {wallet.account}</span>}
        {status === 'logged-in' && <span>Logged in as {wallet.account}</span>}
      </Info>
      {!!wallet.error && (
        <Error>
          <StyledErrorIcon />
          <span>{getErrorMessage(wallet.error)}</span>
        </Error>
      )}
      <Controls>
        {status === 'disconnected' && (
          <Button
            data-tip="Connect to StarkNet"
            data-for="global"
            data-place="left"
            onClick={() => wallet.connect({ showList: true })}>
            <img src={starknetIcon} height={18} width={18} /> Connect Wallet
          </Button>
        )}
        {status === 'connected' && (
          <Button
            data-tip="Login with Wallet"
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
