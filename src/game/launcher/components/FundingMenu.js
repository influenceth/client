import { useCallback, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from 'styled-components';
import { useQueryClient } from 'react-query';

import Button from '~/components/ButtonAlt';
import { ChevronRightIcon, EthIcon, UsdcIcon } from '~/components/Icons';
import Switcher from '~/components/SwitcherButton';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useWalletBalances from '~/hooks/useWalletBalances';
import { nativeBool, reactBool } from '~/lib/utils';
import usePriceHelper from '~/hooks/usePriceHelper';
import UserPrice from '~/components/UserPrice';
import theme from '~/theme';
import api from '~/lib/api';
import useFaucetInfo from '~/hooks/useFaucetInfo';
import FundingFlow from './FundingFlow';
import { PurchaseButton, PurchaseButtonInner } from './SKU';

const FundWrapper = styled.div`
  padding: 0 20px 5px;
  & > div:first-child {
    align-items: center;
    display: flex;
    flex-direction: row;
    width: 100%;
    & > h3 {
      flex: 1;
      font-size: 15px;
      font-weight: normal;
      margin-bottom: 15px;
      opacity: 0.65;
      white-space: nowrap;
    }
    & > div {
      opacity: 0.5;
      transition: opacity 250ms ease;
      &:hover { opacity: 1; }

      & button svg {
        margin-right: 0;
      }
    }
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
    align-items: center;
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

const AddFundsButton = styled(Button)`
  color: white;
  font-weight: bold;
  & > div {
    display: flex;
    flex-direction: row;
    & > span {
      flex: 1;
      font-size: 15px;
      text-align: left;
    }
    & > svg {
      font-size: 25px;
    }
  }
`;

const FundingMenu = () => {
  const priceHelper = usePriceHelper();
  const { data: wallet } = useWalletBalances();

  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());
  const dispatchPreferredUiCurrency = useStore(s => s.dispatchPreferredUiCurrency);

  const [isFunding, setIsFunding] = useState();

  const tooltipContent = useMemo(() => ReactDOMServer.renderToStaticMarkup(
    <Subtotals>
      {Object.keys(wallet?.tokenBalance || {}).map((tokenAddress) => {
        const balance = priceHelper.from(wallet.tokenBalance[tokenAddress], tokenAddress);
        return (
          <div key={tokenAddress}>
            <label>{balance?.to(tokenAddress, TOKEN_FORMAT.VERBOSE)}</label>
            <span>{balance?.to(preferredUiCurrency, true)}</span>
          </div>
        );
      })}
      {wallet?.gasReserveBalance && (
        <div>
          <label>{wallet.gasReserveBalance.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE)}</label>
          <span style={{ color: theme.colors.orange, fontSize: '85%', opacity: 1 }}>Gas Reserve (ETH)</span>
        </div>
      )}
    </Subtotals>
  ), [preferredUiCurrency, wallet]);

  return (
    <FundWrapper>
      <div>
        <h3>Available Wallet Balance:</h3>
        <div>
          <Switcher
            buttons={[
              { icon: <UsdcIcon />, value: TOKEN.USDC, tooltip: 'Display Prices in USD' },
              { icon: <EthIcon />, value: TOKEN.ETH, tooltip: 'Display Prices in ETH' }
            ]}
            onChange={dispatchPreferredUiCurrency}
            size="icon"
            tooltipContainer="launcherTooltip"
            value={preferredUiCurrency}
          />
        </div>
      </div>
      <label data-tooltip-id="launcherTooltip" data-tooltip-html={tooltipContent} data-tooltip-place="top">
        {wallet?.combinedBalance?.to(preferredUiCurrency, true)}
      </label>
        <AddFundsButton onClick={() => setIsFunding(true)}>
          <span>Add Funds</span>
          <ChevronRightIcon />
        </AddFundsButton>
      {isFunding && <FundingFlow onClose={() => setIsFunding()} />}

      {/* 
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
      */}
    </FundWrapper>
  );
};

export default FundingMenu;