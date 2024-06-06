import { useCallback, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { createPortal } from 'react-dom';

import Button from '~/components/ButtonAlt';
import theme from '~/theme';
import { ChevronRightIcon, WarningOutlineIcon } from '~/components/Icons';
import Details from '~/components/DetailsV2';
import useSession from '~/hooks/useSession';
import BrightButton from '~/components/BrightButton';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';

const FundingBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 500px;
  h3 {
    align-items: center;
    color: ${p => p.theme.colors.warning};
    display: flex;
    font-size: 18px;
    font-weight: normal;
    & > svg {
      font-size: 35px;
      margin-right: 16px;
    }
  }
`;

const FundingButtons = styled.div`
  padding: 10px 10px 20px;
  width: 400px;
  & button {
    margin-bottom: 15px;
    padding: 15px 10px;
    text-transform: none;
    width: 100%;
    & > div {
      display: flex;
      & > span {
        flex: 1;
        text-align: left;
      }
    }
  }
`;

const FundingFooter = styled.div`
  border-top: 1px solid #222;
  display: flex;
  justify-content: flex-end;
  padding: 10px 0 15px;
`;

const Disclaimer = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 15.5px;
  padding: 10px 10px 20px;
  pointer-events: ${p => p.visible ? 'all' : 'none'};
  & a {
    color: white;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ButtonExtra = styled.span`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  flex: 1;
  font-size: 90%;
  justify-content: flex-end;
  margin-left: 15px;
  text-align: right;
`;

const layerSwapChains = {
  '0x534e5f4d41494e': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  'SN_MAIN': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  '0x534e5f474f45524c49': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  'SN_GOERLI': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  '0x534e5f5345504f4c4941': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' },
  'SN_SEPOLIA': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' }
};

// TODO: deprecate this
export const FundingDialog = ({ onClose, onSelect, targetAmount }) => {
  const { accountAddress, starknet } = useSession();
  const [hoveredRampButton, setHoveredRampButton] = useState(false);

  const to = useRef();
  const onRampHover = useCallback((which) => (e) => {
    if (to.current) clearTimeout(to.current);
    if (which) {
      setHoveredRampButton(e.target);
    } else {  // close on delay so have time to click the link
      to.current = setTimeout(() => {
        setHoveredRampButton();
      }, 1500);
    }
  }, []);

  const selectBridge = useCallback(() => {
    const fromChain = layerSwapChains[starknet?.chainId]?.ethereum;
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/?from=${fromChain}&to=${toChain}&asset=ETH&destAddress=${accountAddress}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, accountAddress, targetAmount]);

  const selectStripe = useCallback(() => {
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/?from=STRIPE&to=${toChain}&asset=ETH&destAddress=${accountAddress}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, accountAddress, targetAmount]);

  const selectRamp = useCallback(() => {
    const logoUrl = window.location.origin + '/maskable-logo-192x192.png';
    // TODO: url params are confusing/not working here `&swapAsset=ETH&swapAmount=${targetAmount}`
    const url = `https://app.${process.env.NODE_ENV === 'production' ? '' : 'demo.'}ramp.network
      ?hostApiKey=${process.env.REACT_APP_RAMP_API_KEY}&hostAppName=Influence&hostLogoUrl=${logoUrl}
      &userAddress=${accountAddress}&defaultAsset=STARKNET_ETH`;

    window.open(url, '_blank');
  }, [accountAddress]);

  const onClick = useCallback((which) => {
    switch (which) {
      case 'bridge':
        selectBridge();
        break;
      case 'stripe':
        selectStripe();
        break;
      case 'ramp':
        selectRamp();
        break;
      default:
        break;
    }

    onSelect();
  }, [onSelect, selectBridge, selectStripe, selectRamp]);

  return createPortal(
    (
      <Details title="Add Funds" onClose={onClose} modalMode style={{ zIndex: 9000 }}>
        <FundingBody>
          <h3>
            <WarningOutlineIcon /> <span>Your account does not have enough funds.</span>
          </h3>
          <FundingButtons>
            <BrightButton onClick={() => onClick('bridge')}>
              <span>Fund with ETH</span>
              <ChevronRightIcon />
            </BrightButton>

            <BrightButton onClick={() => onClick('stripe')}>
              <span>Buy with credit card (U.S. Only)</span>
              <ChevronRightIcon />
            </BrightButton>

            {process.env.REACT_APP_RAMP_API_KEY && (
              <div style={{ position: 'relative' }}>
                <BrightButton
                  onClick={() => onClick('ramp')}
                  onMouseEnter={onRampHover(true)}
                  onMouseLeave={onRampHover(false)}>
                  <span>Buy now with Ramp</span>
                  <ChevronRightIcon />
                </BrightButton>

                <MouseoverInfoPane
                  referenceEl={hoveredRampButton}
                  css={css`margin-top:10px;`}
                  placement="bottom"
                  visible={!!hoveredRampButton}
                  zIndex={9001}>
                  <Disclaimer visible={!!hoveredRampButton}>
                    RAMP DISCLAIMER: Don't invest unless you're prepared to lose all the money you
                    invest. This is a high-risk investment and you should not expect to be protected
                    if something goes wrong.{' '}
                    <a href="https://ramp.network/risk-warning" target="_blank" rel="noopener noreferrer">Take 2 minutes to learn more.</a>
                  </Disclaimer>
                </MouseoverInfoPane>
              </div>
            )}
          </FundingButtons>
        </FundingBody>
        <FundingFooter>
          <Button onClick={onClose}>Back</Button>
        </FundingFooter>
      </Details>
    ),
    document.body
  );
};