import { useCallback, useEffect, useState } from 'react';

import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import Section from '~/components/Section';
import BridgeModalDialog from '~/components/BridgeModalDialog';
import Button from '~/components/Button';
import { DisconnectIcon, LoginIcon, WalletIcon, WarningIcon, PlayIcon, StopIcon } from '~/components/Icons';

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
  width: 100%;

  & > div {
    flex: 1;
    & > div {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

const Indicator = styled.span`
  color: ${p => {
    if (p.status === 'disconnected') return '#df4300';
    if (p.status === 'connected') return '#ff984f';
    if (p.status === 'logged-in') return '#2BCC80';
  }};

  flex: 0 0 22px;
  font-size: 25px;
  margin-bottom: 2px;

  & > img {
    height: 16px;
    width: 16px;
  }
`;

const Account = styled.span`
  background: #333;
  border-radius: 8px;
  font-weight: bold;
  padding: 2px 6px;
  color: white;
  
  &:before {
    content: "${p => p.account.substr(0, 6)}"
  }
  &:after {
    content: "...${p => p.account.substr(p.wallet === 'Braavos' ? -7 : -4)}"
  }
`;

const ConnectedOptions = styled.div`
  display: flex;
  & > button:first-child {
    margin-right: 8px;
  }
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

const Link = styled.span`
  color: ${p => p.theme.colors.mainText};
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    color: white;
  }
`;

const Wallet = () => {
  const forceExpand = useStore(s => s.dispatchOutlinerSectionExpanded);
  const forceCollapse = useStore(s => s.dispatchOutlinerSectionCollapsed);
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);

  const { token, login, wallet } = useAuth();
  const {
    account,
    connectionOptions,
    disconnect,
    error,
    sessionAccount,
    sessionsEnabled,
    startSession,
    stopSession,
    walletIcon,
    walletName
  } = wallet;

  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);

  const status = account ? (token ? 'logged-in' : 'connected') : 'disconnected';

  // Remove auth queries when wallet is disconnected
  const disconnectWallet = useCallback(() => {
    invalidateToken();
    disconnect();
  }, [disconnect, invalidateToken]);

  useEffect(() => {
    if (status !== 'logged-in' || !!error) forceExpand('wallet');
    if (status === 'logged-in' && sessionAccount) forceCollapse('wallet');
  }, [ status, error, forceExpand, forceCollapse, sessionAccount ]);

  const openBridgeModal = useCallback((e) => {
    e.stopPropagation();
    setBridgeModalOpen(true);
    return false;
  }, []);

  return (
    <Section
      name="wallet"
      title="Account"
      sticky={true}
      icon={<WalletIcon />}
      action={(<Link onClick={openBridgeModal}>Assets on L1?</Link>)}>
      <Info>
        <Indicator status={status}>{walletIcon || '●'}</Indicator>
        {status === 'disconnected' && (
          <span>Wallet is disconnected. Connect with...</span>
        )}
        {status === 'connected' && (
          <span>Ready to login with <Account account={account} wallet={walletName} /></span>
        )}
        {status === 'logged-in' && (
          <span>Logged in as <Account account={account} wallet={walletName} /></span>
        )}
      </Info>
      {error && (
        <Error>
          <StyledErrorIcon /> <span>{error}</span>
        </Error>
      )}
      <Controls>
        {status === 'disconnected' && connectionOptions.map((connectionOption) => {
          const { label, logo, dataTip, onClick } = connectionOption;
          return (
            <Button
              key={label}
              dataTip={dataTip}
              dataPlace="left"
              onClick={onClick}>
              {logo} {label}
            </Button>
          );
        })}
        <ConnectedOptions style={{ display: 'flex' }}>
          {status === 'connected' && (
            <Button
              data-tip="Login with Wallet"
              data-for="global"
              data-place="bottom"
              lessTransparent
              onClick={login}>
              <LoginIcon /> Login
            </Button>
          )}
          {status === 'logged-in' && !sessionAccount && (
            <Button
              data-tip="Start Wallet Session"
              data-for="global"
              data-place="bottom"
              disabled={!sessionsEnabled}
              lessTransparent
              onClick={startSession}>
              <PlayIcon /> Start Session
            </Button>
          )}
          {status === 'logged-in' && sessionsEnabled && sessionAccount && (
            <Button
              data-tip="End Wallet Session"
              data-for="global"
              data-place="bottom"
              lessTransparent
              onClick={stopSession}>
              <StopIcon /> End Session
            </Button>
          )}
          {status !== 'disconnected' && (
            <Button
              data-tip="Disconnect Wallet"
              data-for="global"
              data-place="bottom"
              color="#286e86"
              onClick={disconnectWallet}>
              <DisconnectIcon /> Disconnect
            </Button>
          )}
        </ConnectedOptions>
      </Controls>
      {bridgeModalOpen && (
        <BridgeModalDialog onClose={() => setBridgeModalOpen(false)} />
      )}
    </Section>
  );
};

export default Wallet;
