import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import LoadingSpinner from 'react-spinners/PuffLoader';

import useAuth from '~/hooks/useAuth';
import Button from '~/components/ButtonAlt';
import ArgentXLogo from '~/assets/images/wallets/argentx-logo.svg';
import BraavosLogo from '~/assets/images/wallets/braavos-logo.webp';
import InfluenceLogo from '~/assets/images/logo-icon.svg';
import theme from '~/theme';
import ClipCorner from './ClipCorner';
import Dialog from './Dialog';
import { CloseIcon } from './Icons';
import IconButton from './IconButton';
import useStore from '~/hooks/useStore';

const buttonBgStrength = 2.5;

const Wrapper = styled.div`
  background-color: black;
  display: flex;
  flex-direction: column;
  padding: 25px;
  position: relative;
  width: 500px;

  & h2 {
    margin: 0 0 10px 15px;
  }

  & h3 {
    font-size: 14px;
    padding: 20px 0 10px 0;
    text-transform: uppercase;
  }

  & h4 {
    color: #888;
    font-size: 14px;
    margin: 0;
    text-align: center;
    text-transform: uppercase;
  }
`;

const CloseButton = styled(IconButton)`
  opacity: 0.6;
  position: absolute !important;
  top: 24px;
  right: 15px;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const Header = styled.div`
  border-bottom: 1px solid #333;
  color: white;
  font-size: 24px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  text-align: center;
  text-transform: uppercase;
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

const StyledInfluenceLogo = styled(InfluenceLogo)`
  height: 55px;
  margin-top: 10px;
  width: 55px;
`;

const cornerWidth = 20;
const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

const WalletOption = styled.div`
  align-items: center;
  background-color: rgba(${p => p.theme.colors.mainRGB}, 0.15);
  border: 1px solid ${borderColor};
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: space-around;
  margin: 10px;
  padding: 20px 20px;
  position: relative;
  text-align: center;
  transition: background-color 0.3s ease;

  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerWidth}px),
    calc(100% - ${cornerWidth}px) 100%,
    0 100%
  );

  &:hover {
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.25);
    cursor: ${p => p.theme.cursors.active};
  }

  & span {
    font-size: 14px;
    line-height: 20px;
    margin: 10px 45px 0;
  }

  & h3 {
    padding: 10px 0;
  }

  @media (max-height: 800px) {
    & span {
      display: none;
    }
  }
`;

const WebWallet = styled.div`
  display: flex;

  ${WalletOption} {
    & button {
      width: 100%;
    }
  }
`;

const External = styled.div`
  display: flex;
  justify-content: space-between;

  ${WalletOption} {
    padding-bottom: 10px;

    & button {
      bottom: 15%;
      display: none;
      position: absolute;
    }

    &:hover {
      button {
        display: block;
      }

      & h3, & span {
        visibility: hidden;
      }
    }

    @media (max-height: 750px) {
      button {
        bottom: 50%;
        margin-bottom: -17.5px;
      }
    }
  }

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

const LoginDialog = () => {
  const { account, login, walletContext, authenticating } = useAuth();
  const dispatchLoggingIn = useStore((s) => s.dispatchLoggingIn);

  const [ waiting, setWaiting ] = useState(false);
  const { getAvailableWallets, walletName } = walletContext;

  const downloadWallet = (withWalletId) => {
    const links = {
      'argentX': 'https://www.argent.xyz/argent-x/',
      'braavos': 'https://braavos.app/'
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
    if (withWalletId === 'email') {
      await login({ webWalletUrl: 'https://web.hydrogen.argent47.net' });
    } else {
      const withWallet = await getWallet(withWalletId);

      if (!!withWallet) {
        await withWallet.enable();
        await login(withWallet);
      } else {
        downloadWallet(withWalletId);
      }
  
      setWaiting(false);
    }
  }, [ waiting ]);

  const onClose = useCallback(() => {
    dispatchLoggingIn(false);
  }, [dispatchLoggingIn]);

  useEffect(() => {
    if (account) onClose();
  }, [account, onClose]);

  return (
    <Dialog backdrop="transparent">
      <Wrapper>
        <Header>Log-In to Influence</Header>
        <CloseButton onClick={onClose}>
          <CloseIcon />
        </CloseButton>

        {(authenticating || waiting) && (
          <Loading>
            <div><LoadingSpinner color={theme.colors.main} /></div>
            <h4>{authenticating ? 'Authenticating...' : `Waiting for ${walletName || 'wallet'}...`}</h4>
          </Loading>
        )}
        {!authenticating && !waiting && (
          <>
            <h4>Email</h4>
            <WebWallet>
              <WalletOption onClick={() => handleWalletClick('email')}>
                <StyledInfluenceLogo />
                <Button bgStrength={buttonBgStrength} style={{ marginTop: 20 }}>Continue with Email</Button>
                <span style={{ fontSize: '75%', marginTop: 5, opacity: 0.5 }}>
                  Powered by Argent
                </span>
                <ClipCorner dimension={cornerWidth} color={borderColor} />
              </WalletOption>
            </WebWallet>

            <h4 style={{ marginTop: 15 }}>External Wallets</h4>
            <External>
              <WalletOption onClick={() => handleWalletClick('argentX')}>
                <StyledArgentXLogo />
                <h3>Argent X</h3>
                <Button bgStrength={buttonBgStrength} size="small">
                  {!!getWallet('Argent X') ? 'Login with Argent X' : 'Download Argent X'}
                </Button>
                <ClipCorner dimension={cornerWidth} color={borderColor} />
              </WalletOption>
              <WalletOption onClick={() => handleWalletClick('braavos')}>
                <StyledBraavosLogo src={BraavosLogo} />
                <h3>Braavos</h3>
                <Button bgStrength={buttonBgStrength} size="small">
                {!!getWallet('Braavos') ? 'Login with Braavos' : 'Download Braavos'}
                </Button>
                <ClipCorner dimension={cornerWidth} color={borderColor} />
              </WalletOption>
            </External>
          </>
        )}
      </Wrapper>
    </Dialog>
  );
};

export default LoginDialog;
