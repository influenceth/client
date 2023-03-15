import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import LoadingSpinner from 'react-spinners/PuffLoader';

import useAuth from '~/hooks/useAuth';
import Button from '~/components/Button';
import ArgentXLogo from '~/assets/images/wallets/argentx-logo.svg';
import BraavosLogo from '~/assets/images/wallets/braavos-logo.webp';
import CartridgeLogo from '~/assets/images/wallets/cartridge-logo.svg';
import useStore from '~/hooks/useStore';
import theme from '~/theme';

const StyledWallets = styled.div`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  flex-direction: column;
  padding: 40px 110px;
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

const Loading = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
  & > div {
    height: 60px;
    width: 60px;
  }
  & > h4 {
    margin: 0 0 0 8px;
  }
`;

const Cartridge = styled.div`
  display: flex;
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
  fill: rgb(251,203,74);
  height: 65px;
  margin: 20px;
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
  transition: background-color 0.3s ease;

  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 25px),
    calc(100% - 25px) 100%,
    0 100%
  );

  & button {
    bottom: 20%;
    display: none;
    position: absolute;
  }

  &:hover {
    background-color: ${p => p.theme.colors.contentDark};
    cursor: ${p => p.theme.cursors.active};

    & h3, & span {
      visibility: hidden;
    }

    & button {
      display: block;
    }
  }

  & span {
    font-size: 14px;
    line-height: 20px;
    margin: 10px 45px 0;
  }

  & h3 {
    padding: 10px 0;
  }

  @media (max-height: 750px) {
    ${StyledCartridgeLogo} {
      display: none;
    }
    button {
      bottom: 50%;
      margin-bottom: -17.5px;
    }
  }
  @media (max-height: 800px) {
    & span {
      display: none;
    }
  }
`;

const External = styled.div`
  display: flex;
  justify-content: space-between;

  @media (max-height: 880px) {
    ${StyledArgentXLogo}, ${StyledBraavosLogo} {
      display: none;
    }
    ${WalletOption} button {
      bottom: 50%;
      margin-bottom: -17.5px;
    }
  }
`;

const Wallets = (props) => {
  const { account, login, walletContext, authenticating } = useAuth();
  const [ waiting, setWaiting ] = useState(false);
  const { getAvailableWallets, walletName } = walletContext;

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const downloadWallet = (withWalletId) => {
    const links = {
      'argentX': 'https://www.argent.xyz/argent-x/',
      'braavos': 'https://braavos.app/',
      'Cartridge': 'https://cartridge.gg/'
    };

    window.open(links[withWalletId], '_blank', 'noreferrer');
  };

  const getWallet = async (withWalletId) => {
    const wallets = await getAvailableWallets();
    return wallets.find(v => v.id === withWalletId);
  };

  const handleWalletClick = useCallback(async (withWalletId) => {
    if (waiting) return;
    setWaiting(true);
    const withWallet = await getWallet(withWalletId);

    if (!!withWallet) {
      await withWallet.enable();
      await login(withWallet);
    } else {
      downloadWallet(withWalletId);
    }

    setWaiting(false);
  }, [ waiting ]);

  useEffect(() => {
    if (account) dispatchLauncherPage('account');
  }, [account]);

  return (
    <StyledWallets>
      {(authenticating || waiting) && (
        <Loading>
          <div><LoadingSpinner color={theme.colors.main} /></div>
          <h4>{authenticating ? 'Authenticating...' : `Waiting for ${walletName || 'wallet'}...`}</h4>
        </Loading>
      )}
      {!authenticating && !waiting && (
        <>
          <Cartridge>
            <WalletOption onClick={() => handleWalletClick('Cartridge')}>
              <StyledCartridgeLogo />
              <h3>Login with Cartridge</h3>
              <span>
                The premiere Starknet gaming console connecting multiple games with a single login.
              </span>
              <Button backgroundColor={"rgba(251,203,74, 0.33)"} color={"rgb(251,203,74)"}>Login with Cartridge</Button>
            </WalletOption>
          </Cartridge>
          <External>
            <WalletOption onClick={() => handleWalletClick('argentX')}>
              <StyledArgentXLogo />
              <h3>Argent X</h3>
              <Button backgroundColor={"rgba(231,140,100, 0.33)"} color={'rgb(231,140,100)'}>
                {!!getWallet('Argent X') ? 'Login with Argent X' : 'Download Argent X'}
              </Button>
            </WalletOption>
            <WalletOption onClick={() => handleWalletClick('braavos')}>
              <StyledBraavosLogo src={BraavosLogo} />
              <h3>Braavos</h3>
              <Button backgroundColor={'rgba(233,161,61, 0.33)'} color={'rgb(233,161,61)'}>
              {!!getWallet('Braavos') ? 'Login with Braavos' : 'Download Braavos'}
              </Button>
            </WalletOption>
          </External>
        </>
      )}
    </StyledWallets>
  );
};

export default Wallets;