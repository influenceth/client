import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ButtonPill from '~/components/ButtonPill';
import ArgentXLogo from '~/assets/images/wallets/argentx-logo.svg';
import BraavosLogo from '~/assets/images/wallets/braavos-logo.webp';
import CartridgeLogo from '~/assets/images/wallets/cartridge-logo.svg';

const StyledAccount = styled.div`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  flex-direction: column;
  padding: 40px;
  width: 700px;

  & h2 {
    margin: 0 0 10px 15px;
  }

  & h3 {
    border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
    font-size: 14px;
    padding: 20px 0 10px 0;
    text-transform: uppercase;
  }
`;

const Cartridge = styled.div`
  display: flex;
`;

const External = styled.div`
  display: flex;
  justify-content: space-between;
`;

const WalletOption = styled.div`
  align-items: center;
  background-color: ${p => p.theme.colors.contentHighlight};
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: space-around;
  margin: 10px;
  padding: 25px 20px;
  position: relative;
  text-align: center;
  transition: all 0.3s ease;

  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 25px),
    calc(100% - 25px) 100%,
    0 100%
  );

  &:hover {
    background-color: ${p => p.theme.colors.contentDark};
    cursor: ${p => p.theme.cursors.active};
  }

  & span {
    font-size: 14px;
    line-height: 20px;
    margin: 10px 30px 0;
  }

  & h3 {
    padding: 10px 0;
  }
`;

const StyledArgentXLogo = styled(ArgentXLogo)`
  height: 55px;
  margin-top: 10px;
  width: 55px;
`;

const StyledBraavosLogo = styled.img`
  height: 50px;
  margin-top: 10px;
  object-fit: contain;
  width: 50px;
`;

const StyledCartridgeLogo = styled(CartridgeLogo)`
  fill: ${p => p.theme.colors.partners.cartridge};
  height: 65px;
  margin: 20px;
`;

const BackButton = styled.div`
  display: flex;
  justify-content: center;
  padding-top: 25px;
`;

const Account = (props) => {
  const history = useHistory();
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);
  const forgetWallet = useStore(s => s.dispatchWalletDisconnected);
  const { token, login, wallet } = useAuth();
  const { account, connectionOptions, disconnect, error, walletIcon, walletName } = wallet;
  const loggedIn = account && token;

  const disconnectWallet = useCallback(() => {
    invalidateToken();
    forgetWallet();
    disconnect();
  }, [disconnect, invalidateToken, token]);

  const loginWith = useCallback(async (withWalletLabel) => {
    disconnectWallet();
    const withWallet = connectionOptions.find(v => v.label === withWalletLabel);
    await withWallet.onClick();
    login();
  }, [ wallet ]);

  return (
    <StyledAccount>
      <h2>Login to Influence:</h2>
      <Cartridge>
        <WalletOption onClick={() => loginWith('Cartridge')}>
          <StyledCartridgeLogo />
          <h3>Cartridge</h3>
          <span>The premiere Starknet gaming console connecting multiple games with a single login.</span>
        </WalletOption>
      </Cartridge>
      <External>
        <WalletOption onClick={() => loginWith('Argent X')}>
          <StyledArgentXLogo />
          <h3>Argent X</h3>
        </WalletOption>
        <WalletOption onClick={() => loginWith('Braavos')}>
          <StyledBraavosLogo src={BraavosLogo} />
          <h3>Braavos</h3>
        </WalletOption>
      </External>
      <BackButton>
        <ButtonPill onClick={() => history.push('/launcher')}>Back</ButtonPill>
      </BackButton>
    </StyledAccount>
  );
};

export default Account;
