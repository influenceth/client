import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import styled, { css } from 'styled-components';

import LayerswapImage from '~/assets/images/sales/logo_layerswap.svg';
import RampImage from '~/assets/images/sales/logo_ramp.svg';
import Button from '~/components/ButtonAlt';
import CollapsibleBlock from '~/components/CollapsibleBlock';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useSession from '~/hooks/useSession';
import useWalletUSD from '~/hooks/useWalletUSD';
import { formatFixed, formatUSD } from '~/lib/utils';

const FundWrapper = styled.div`
  padding: 0 20px 5px;
  & > h3 {
    font-size: 15px;
    font-weight: normal;
    margin-bottom: 15px;
    opacity: 0.65;
  }
  & > label {
    font-size: 32px;
    line-height: 32px;
  }
  & > button {
    margin-top: 20px;
    & > div {
      padding: 7px 5px 7px 10px !important;
    }
    width: 100%;
  }
`;

const Subtotals = styled.div`
  & > div {
    display: flex;
    flex-direction: row;
    font-size: 17px;
    justify-content: space-between;
    & > label {
      margin-right: 30px;
    }
    & > span {
      opacity: 0.6;
    }
  }
`;

const FundingOption = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  &:not(:first-child) {
    margin-top: 15px;
  }
  & > div {
    align-items: center;
    color: white;
    display: flex;
    justify-content: space-between;
    width: 100%;
    & > label {
      color: #888;
      flex: 0 0 calc(100% - 70px);
      font-size: 13px;
      padding-right: 20px;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
    & > svg {
      color: white;
    }
  }
  & > button {
    margin-top: 12px;
    width: 100%;
  }
`;

const Disclaimer = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 12px;
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

const ethToken = process.env.REACT_APP_ERC20_TOKEN_ADDRESS;
const usdcToken = process.env.REACT_APP_USDC_TOKEN_ADDRESS;
const swayToken = process.env.REACT_APP_STARKNET_SWAY_TOKEN;

const layerSwapChains = {
  '0x534e5f4d41494e': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  'SN_MAIN': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  '0x534e5f474f45524c49': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  'SN_GOERLI': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  '0x534e5f5345504f4c4941': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' },
  'SN_SEPOLIA': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' }
};

const FundingMenu = () => {
  const { accountAddress, starknet } = useSession();
  const { data: wallet } = useWalletUSD();

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

  const selectLayerswap = useCallback(() => {
    const fromChain = layerSwapChains[starknet?.chainId]?.ethereum;
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/`
      + `?from=${fromChain}`
      + `&to=${toChain}`
      + `&asset=ETH`
      + `&destAddress=${accountAddress}`
      + `&lockAddress=true`
      // + `&amount=${targetAmount}`
      + `&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, accountAddress]);

  const selectRamp = useCallback(() => {
    const logoUrl = window.location.origin + '/maskable-logo-192x192.png';
    
    const url = `https://app.${process.env.NODE_ENV === 'production' ? '' : 'demo.'}ramp.network`
      + `?hostApiKey=${process.env.REACT_APP_RAMP_API_KEY}`
      + `&hostAppName=Influence`
      + `&hostLogoUrl=${logoUrl}`
      + `&userAddress=${accountAddress}`
      // TODO: url params are confusing/not working here:
      // + `&defaultAsset=ETH_ETH`
      // + `&swapAsset=ETH_ETH,ETH_USDC`
      // + `&swapAmount=${targetAmount}`
      ;

    window.open(url, '_blank');
  }, [accountAddress]);

  const tooltipContent = useMemo(() => ReactDOMServer.renderToStaticMarkup(
    <Subtotals>
      <div><label>{formatFixed(wallet?.ethBalance || 0, 5)} ETH</label><span>{formatUSD(wallet?.ethBalanceUSD || 0)}</span></div>
      <div><label>{formatFixed(wallet?.usdcBalance || 0, 2)} USDC</label><span>{formatUSD(wallet?.usdcBalanceUSD || 0)}</span></div>
    </Subtotals>
  ), [wallet]);

  return (
    <FundWrapper>
      <h3>Wallet Balance:</h3>
      <label data-tooltip-id="launcherTooltip" data-tooltip-html={tooltipContent} data-tooltip-place="top">
        {formatUSD(wallet?.totalUSD)}
      </label>
      <CollapsibleBlock
        containerHeight={250}
        initiallyClosed
        outerStyle={{ marginTop: 20 }}
        title={<span style={{ textTransform: 'uppercase' }}>Add Funds</span>}>
        <FundingOption>
          <div>
            <label>Add funds with a credit card. Powered by <b>Ramp</b>.</label>
            <RampImage />
          </div>
          <Button
            onClick={selectRamp}
            onMouseEnter={onRampHover(true)}
            onMouseLeave={onRampHover(false)}>
            Use Credit Card
          </Button>
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
        </FundingOption>
        <FundingOption>
          <div>
            <label>Transfer from another account or exchange. Powered by <b>LayerSwap</b>.</label>
            <LayerswapImage />
          </div>
          <Button onClick={selectLayerswap}>
            Transfer via LayerSwap
          </Button>
        </FundingOption>
      </CollapsibleBlock>
    </FundWrapper>
  );
};

export default FundingMenu;