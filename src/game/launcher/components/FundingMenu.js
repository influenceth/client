import { useCallback, useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { ChevronRightIcon, EthIcon, RefreshIcon, UsdcIcon } from '~/components/Icons';
import Switcher from '~/components/SwitcherButton';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useWalletPurchasableBalances from '~/hooks/useWalletPurchasableBalances';
import usePriceHelper from '~/hooks/usePriceHelper';
import theme from '~/theme';
import FundingFlow from './FundingFlow';
import IconButton from '~/components/IconButton';

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
  & > p {
    align-items: center;
    display: flex;
    font-size: 32px;
    line-height: 38px;
    height: 38px;
    margin: 0;

    & > svg {
      height: 24px;
    }

    & > span {
      flex: 1;
    }

    & > button {
      margin-left: 4px;
      margin-right: 0;
      opacity: 0.3;
      transition: opacity 150ms ease;
    }
    &:hover > button {
      opacity: 1;
    }
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
  const { accountAddress, login } = useSession();
  const priceHelper = usePriceHelper();
  const { data: wallet, isLoading, refetch } = useWalletPurchasableBalances();

  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());
  const dispatchPreferredUiCurrency = useStore(s => s.dispatchPreferredUiCurrency);

  const [isFunding, setIsFunding] = useState();

  const handleFunding = useCallback(() => {
    if (!accountAddress) return login();
    setIsFunding(true);
  }, [accountAddress, login]);

  const reloadBalance = useCallback(() => {
    refetch();
  }, [refetch]);

  const tooltipContent = useMemo(() => ReactDOMServer.renderToStaticMarkup(
    <Subtotals>
      {Object.keys(wallet?.tokenBalances || {}).map((tokenAddress) => {
        const balance = priceHelper.from(wallet.tokenBalances[tokenAddress], tokenAddress);
        return (
          <div key={tokenAddress}>
            <label>{balance?.to(tokenAddress, TOKEN_FORMAT.VERBOSE)}</label>
            <span>{balance?.to(preferredUiCurrency, true)}</span>
          </div>
        );
      })}
      {wallet?.shouldMaintainEthGasReserve && (
        <div>
          <label>{wallet.ethGasReserveBalance.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE)}</label>
          <span style={{ color: theme.colors.orange, fontSize: '85%', opacity: 1 }}>Gas Reserve (ETH)</span>
        </div>
      )}
    </Subtotals>
  ), [preferredUiCurrency, wallet, wallet?.shouldMaintainEthGasReserve]);

  return (
    <FundWrapper>
      {accountAddress && (
        <>
          <div>
            <h3>Available Wallet Balance ({wallet?.shouldMaintainEthGasReserve ? '*' : 'poop'}):</h3>
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

          <p data-tooltip-id="launcherTooltip" data-tooltip-html={tooltipContent} data-tooltip-place="top">
            <span>{wallet?.combinedBalance?.to(preferredUiCurrency, true)}</span>
            {!isLoading && (
              <IconButton borderless onClick={reloadBalance}>
                <RefreshIcon />
              </IconButton>
            )}
          </p>
        </>
      )}
      <AddFundsButton onClick={handleFunding}>
        <span>Add Funds</span>
        <ChevronRightIcon />
      </AddFundsButton>
      {isFunding && <FundingFlow onClose={() => setIsFunding()} />}
    </FundWrapper>
  );
};

export default FundingMenu;