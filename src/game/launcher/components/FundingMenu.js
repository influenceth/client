import { useEffect, useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from 'styled-components';

import LayerswapImage from '~/assets/images/sales/logo_layerswap.svg';
import RampImage from '~/assets/images/sales/logo_ramp.svg';
import Button from '~/components/ButtonAlt';
import CollapsibleBlock from '~/components/CollapsibleBlock';
import { useEthBalance, useSwayBalance, useUSDCBalance } from '~/hooks/useWalletBalance';
import { formatFixed } from '~/lib/utils';

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

const FundingMenu = () => {
  const { data: weiBalance } = useEthBalance();
  const { data: usdcBalance } = useUSDCBalance();
  const { data: swayBalance } = useSwayBalance();

  useEffect(() => {
    console.log({ weiBalance, swayBalance, usdcBalance });
  }, [weiBalance, swayBalance, usdcBalance]);

  const tooltipContent = useMemo(() => {
    return ReactDOMServer.renderToStaticMarkup(
      <Subtotals>
        <div><label>{formatFixed((parseFloat(weiBalance) / 1e18) || 0, 5)} ETH</label><span>$1.23</span></div>
        <div><label>{formatFixed(parseFloat(usdcBalance) || 0, 2)} USDC</label><span>$4.56</span></div>
      </Subtotals>
    )
  }, [weiBalance, usdcBalance]);

  return (
    <FundWrapper>
      <h3>Wallet Balance:</h3>
      <label data-tooltip-id="launcherTooltip" data-tooltip-html={tooltipContent} data-tooltip-place="top">
        $78.90
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
          <Button>
            Use Credit Card
          </Button>
        </FundingOption>
        <FundingOption>
          <div>
            <label>Transfer from another account or exchange. Powered by <b>LayerSwap</b>.</label>
            <LayerswapImage />
          </div>
          <Button>
            Transfer via LayerSwap
          </Button>
        </FundingOption>
      </CollapsibleBlock>
    </FundWrapper>
  );
};

export default FundingMenu;