import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import { CheckIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import NavIcon from '~/components/NavIcon';
import theme from '~/theme';
import useWalletBalances, { GAS_BUFFER_VALUE_USDC } from '~/hooks/useWalletBalances';
import usePriceConstants from '~/hooks/usePriceConstants';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import UserPrice from '~/components/UserPrice';
import { advPackCrewmates, advPackPriceUSD, advPackSwayMin, basicPackCrewmates, basicPackPriceUSD, basicPackSwayMin } from '../Store';
import FundingFlow from './FundingFlow';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useSwapHelper from '~/hooks/useSwapHelper';
import { useEthBalance } from '~/hooks/useWalletTokenBalance';
import { PurchaseForm } from './SKU';

const PackWrapper = styled.div`
  padding: 10px 8px;
`;

const PackContents = styled.div`
  &:before {
    content: "Contains:";
    color: ${p => p.theme.colors.main};
    display: block;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 15px;
  }

  & > div {
    align-items: center;
    display: flex;
    margin-bottom: 10px;

    & > label {
      flex: 1;
      font-size: 18px;
      font-weight: bold;
      white-space: nowrap;
    }
    & > span {
      opacity: 0.6;
      white-space: nowrap;

      &:first-child {
        font-size: 12px;
        margin-right: 6px;
        opacity: 1;
      }
    }
  }

  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
`;
const PackChecks = styled.div`
  padding-top: 15px;
  & > div {
    display: flex;
    flex-direction: row;
    margin-bottom: 8px;
    & > span {
      color: ${p => p.theme.colors.main};
      flex: 0 0 32px;
      font-size: 12px;
      padding-top: 3px;
    }
    & > label {
      color: ${p => p.theme.colors.main};
      font-size: 13px;
      line-height: 18px;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

export const useStarterPackPricing = () => {
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();

  const adalianPrice = useMemo(() => {
    if (!priceConstants) return priceHelper.from(0);
    return priceHelper.from(priceConstants?.ADALIAN_PURCHASE_PRICE, priceConstants?.ADALIAN_PURCHASE_TOKEN);
  }, [priceConstants]);

  return useMemo(() => {
    const basicMinPrice = priceHelper.from(basicPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const basicMinSwayValue = priceHelper.from(basicPackSwayMin * TOKEN_SCALE[TOKEN.SWAY], TOKEN.SWAY);
    const basicCrewmatesValue = priceHelper.from(basicPackCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const basicEthValue = priceHelper.from(GAS_BUFFER_VALUE_USDC, TOKEN.USDC);
    const basicSwayValue = priceHelper.from(
      Math.max(
        basicMinSwayValue.usdcValue,
        basicMinPrice.usdcValue - basicCrewmatesValue.usdcValue - basicEthValue.usdcValue
      ),
      TOKEN.USDC
    );
    const basicPrice = priceHelper.from(basicCrewmatesValue.usdcValue + basicEthValue.usdcValue + basicSwayValue.usdcValue, TOKEN.USDC);

    const advMinPrice = priceHelper.from(advPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const advMinSwayValue = priceHelper.from(advPackSwayMin * TOKEN_SCALE[TOKEN.SWAY], TOKEN.SWAY);
    const advCrewmatesValue = priceHelper.from(advPackCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const advEthValue = basicEthValue;
    const advSwayValue = priceHelper.from(
      Math.max(
        advMinSwayValue.usdcValue,
        advMinPrice.usdcValue - advCrewmatesValue.usdcValue - advEthValue.usdcValue
      ),
      TOKEN.USDC
    );
    const advPrice = priceHelper.from(advCrewmatesValue.usdcValue + advEthValue.usdcValue + advSwayValue.usdcValue, TOKEN.USDC);

    return {
      basic: {
        price: basicPrice,
        crewmates: basicPackCrewmates,
        crewmatesValue: basicCrewmatesValue,
        ethFormatted: basicEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: basicEthValue,
        swayFormatted: basicSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: basicSwayValue
      },
      advanced: {
        price: advPrice,
        crewmates: advPackCrewmates,
        crewmatesValue: advCrewmatesValue,
        ethFormatted: advEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: advEthValue,
        swayFormatted: advSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: advSwayValue
      }
    };
  }, [adalianPrice, priceConstants, priceHelper]);
};

export const useStarterPacks = () => {
  const { execute } = useContext(ChainTransactionContext);
  const { data: ethBalance } = useEthBalance();
  const priceHelper = usePriceHelper();
  const { buildMultiswapFromSellAmount } = useSwapHelper();
  const starterPacks = useStarterPackPricing();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  return useMemo(() => {
    const onPurchase = (which) => async (onIsPurchasing) => {
      const pack = starterPacks[which];
      const totalPrice = pack.price;
      const crewmateTally = pack.crewmates;
      const purchaseEth_usd = pack.ethValue.to(TOKEN.USDC);
      const purchaseSway_usd = pack.swayValue.to(TOKEN.USDC);

      if (onIsPurchasing) onIsPurchasing(true);

      let ethSwapCalls = await buildMultiswapFromSellAmount(purchaseEth_usd, TOKEN.ETH);
      // this means has no usdc (likely) OR illiquid swap (unlikely)... we'll assume the former.
      // can still allow the transaction to go through as long as has enough ETH to cover the
      // cost (and subsequent swaps will not leave without any gas buffer)
      if (ethSwapCalls === false) {
        if (priceHelper.from(ethBalance, TOKEN.ETH).to(TOKEN.USDC) >= totalPrice.usdcValue) {
          ethSwapCalls = [];
        } else {
          createAlert({
            type: 'GenericAlert',
            data: { content: 'Insufficient ETH or USDC/ETH swap liquidity!' },
            level: 'warning',
            duration: 5000
          });
          if (onIsPurchasing) onIsPurchasing(false);
          return;
        }
      }
      const swaySwapCalls = await buildMultiswapFromSellAmount(purchaseSway_usd, TOKEN.SWAY);
      if (swaySwapCalls === false) {
        createAlert({
          type: 'GenericAlert',
          data: { content: 'Insufficient SWAY swap liquidity!' },
          level: 'warning',
          duration: 5000
        });
        if (onIsPurchasing) onIsPurchasing(false);
        return;
      }

      await execute('PurchaseStarterPack', {
        collection: Crewmate.COLLECTION_IDS.ADALIAN,
        crewmateTally,
        swapCalls: [ ...ethSwapCalls, ...swaySwapCalls ]
      });

      if (onIsPurchasing) onIsPurchasing(false);
    };

    // attach onPurchase to each
    return Object.keys(starterPacks).reduce((acc, k) => {
      acc[k] = {
        ...starterPacks[k],
        onPurchase: onPurchase(k)
      };
      return acc;
    }, {});
  }, [buildMultiswapFromSellAmount, ethBalance, execute, priceHelper, starterPacks]);
};

// TODO: consider moving isFunding to higher level context with single reference
const StarterPackWrapper = ({ children, pack, ...props }) => {
  const { data: wallet } = useWalletBalances();

  const [isFunding, setIsFunding] = useState();
  const [isFunded, setIsFunded] = useState();
  const onClick = useCallback(() => {
    if (props.asButton) {
      if (pack.price.usdcValue > wallet?.combinedBalance?.to(TOKEN.USDC)) {
        setIsFunding({
          totalPrice: pack.price,
          onClose: () => setIsFunding(),
          onFunded: () => setIsFunded(true)
        });
      } else {
        setIsFunded(true);
      }
    }
  }, [props.asButton, pack.price, wallet?.combinedBalance]);

  // pull pack.onPurchase out of onClick (so can be re-memoized after wallet balance updates before called)
  useEffect(() => {
    if (isFunded) {
      pack.onPurchase(props.onIsPurchasing);
      setIsFunded();
    }
  }, [isFunded, pack.onPurchase])

  return (
    <>
      <PurchaseForm {...props} onClick={onClick}>
        {children}
      </PurchaseForm>
      {isFunding && <FundingFlow {...isFunding} />}
    </>
  );
}

export const BasicStarterPack = (props) => {
  const packs = useStarterPacks();
  const pack = packs.basic;
  return (
    <StarterPackWrapper pack={pack} {...props}>
      <h3>Basic Starter Pack</h3>
      <PackWrapper>
        <PackContents>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.crewmates} Crewmate{pack.crewmates === 1 ? '' : 's'}</label>
            <span>
              <UserPrice
                price={pack.crewmatesValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.swayFormatted}</label>
            <span>
              <UserPrice
                price={pack.swayValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.ethFormatted}</label>
            <span>
              <UserPrice
                price={pack.ethValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
        </PackContents>
        <PackChecks>
          <div>
            <span><CheckIcon /></span>
            <label>Basic starter kit for extraction and simple refining</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>{pack.crewmates}x Crewmate{pack.crewmates === 1 ? '' : 's'} to perform game tasks (Recommended <b>Miner</b> and <b>Engineer</b> classes)</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>SWAY to construct <b>1x Warehouse</b>, <b>1x Extractor</b>, and <b>1x Refinery</b> buildings</label>
          </div>
        </PackChecks>
      </PackWrapper>
    </StarterPackWrapper>
  );
};

export const AdvancedStarterPack = (props) => {
  const packs = useStarterPacks();
  const pack = packs.advanced;
  return (
    <StarterPackWrapper isPurple pack={pack} {...props}>
      <h3>Advanced Starter Pack</h3>
      <PackWrapper>
        <PackContents>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.crewmates} Crewmate{pack.crewmates === 1 ? '' : 's'}</label>
            <span>
              <UserPrice
                price={pack.crewmatesValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.swayFormatted}</label>
            <span>
              <UserPrice
                price={pack.swayValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          <div>
            <span><NavIcon color={theme.colors.main} /></span>
            <label>{pack.ethFormatted}</label>
            <span>
              <UserPrice
                price={pack.ethValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
        </PackContents>
        <PackChecks>
          <div>
            <span><CheckIcon /></span>
            <label>Advanced starter kit for access to expanded production chains</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>{pack.crewmates}x Crewmate{pack.crewmates === 1 ? '' : 's'} to form a full crew and play at max efficiency</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>SWAY to construct all basic pack buildings plus <b>1x Bioreactor</b> and <b>1x Factory</b></label>
          </div>
        </PackChecks>
      </PackWrapper>
    </StarterPackWrapper>
  );
};
