import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';

import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import Section from '~/components/Section';
import BridgeModalDialog from '~/components/BridgeModalDialog';
import Button from '~/components/Button';
import { DisconnectIcon, LoginIcon, WalletIcon, WarningIcon } from '~/components/Icons';
import starknetIcon from '~/assets/images/starknet-icon.png';

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
  const forceExpand = useStore(s => s.dispatchOutlinerSectionExpanded);
  const forceCollapse = useStore(s => s.dispatchOutlinerSectionCollapsed);
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);

  const { token, login, wallet } = useAuth();
  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);

  const status = wallet.account ? (token ? 'logged-in' : 'connected') : 'disconnected';

  // Remove auth queries when wallet is disconnected
  const disconnectWallet = () => {
    invalidateToken();
    wallet.disconnect();
  };

  useEffect(() => {
    if (status !== 'logged-in' || !!wallet.error) forceExpand('wallet');
    if (status === 'logged-in') forceCollapse('wallet');
  }, [ status, wallet.error, forceExpand, forceCollapse ]);

  const openBridgeModal = (e) => {
    e.stopPropagation();
    setBridgeModalOpen(true);
    return false;
  };

  return (
    <Section
      name="wallet"
      title="Account"
      sticky={true}
      icon={<WalletIcon />}
      action={(<a onClick={openBridgeModal}>Assets on L1?</a>)}>
      <Info>
        <Indicator status={status}>●</Indicator>
        {status === 'disconnected' && <span>Wallet is disconnected.</span>}
        {status === 'connected' && <span>Connected as {wallet.account}</span>}
        {status === 'logged-in' && <span>Logged in as {wallet.account}</span>}
      </Info>
      {!!wallet.error && (
        <Error>
          <StyledErrorIcon />
          <span>{wallet.error}</span>
        </Error>
      )}
      <Controls>
        {status === 'disconnected' && (
          <Button
            data-tip="Connect to StarkNet"
            data-for="global"
            data-place="left"
            onClick={wallet.connect}>
            <img src={starknetIcon} height={18} width={18} /> Connect Wallet
          </Button>
        )}
        {status === 'connected' && (
          <Button
            data-tip="Login with Wallet"
            data-for="global"
            data-place="left"
            onClick={login}>
            <LoginIcon /> Login
          </Button>
        )}
        {[ 'connected', 'logged-in' ].includes(status) && (
          <Button
            data-tip="Disconnect Wallet"
            data-for="global"
            data-place="left"
            onClick={disconnectWallet}>
            <DisconnectIcon /> Disconnect
          </Button>
        )}
      </Controls>
      {bridgeModalOpen && (
        <BridgeModalDialog onClose={() => setBridgeModalOpen(false)} />
      )}
    </Section>
  );
};

export default Wallet;
