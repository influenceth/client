import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Crewmate, Process } from '@influenceth/sdk';
import cloneDeep from 'lodash/cloneDeep';

import { CheckIcon, MyAssetDoubleIcon, MyAssetIcon, MyAssetsIcon, MyAssetTripleIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import NavIcon from '~/components/NavIcon';
import theme from '~/theme';
import useWalletPurchasableBalances, { GAS_BUFFER_VALUE_USDC } from '~/hooks/useWalletPurchasableBalances';
import usePriceConstants from '~/hooks/usePriceConstants';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import Button from '~/components/ButtonAlt';
import UserPrice from '~/components/UserPrice';
import {
  advPackCrewmates,
  advPackPriceUSD,
  basicPackCrewmates,
  basicPackPriceUSD,
  introPackCrewmates,
  introPackPriceUSD
} from '../Store';
import FundingFlow from './FundingFlow';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useSwapHelper from '~/hooks/useSwapHelper';
import useSession from '~/hooks/useSession';
import { useEthBalance } from '~/hooks/useWalletTokenBalance';
import { PurchaseForm } from './SKU';
import { fireTrackingEvent, nativeBool, ordersToFills, reactBool } from '~/lib/utils';
import useShoppingListData from '~/hooks/useShoppingListData';
import PurchaseButtonInner from '~/components/PurchaseButtonInner';
import useCrewContext from '~/hooks/useCrewContext';


const PackWrapper = styled.div`
  height: 325px;
  overflow: hidden auto;
  padding: 0px 8px 10px;
`;

const PackFlavor = styled.div`
  align-items: center;
  color: ${p => p.color || p.theme.colors.main};
  display: flex;
  ${p => p.smaller
    ? `
      font-size: 14px;
    `
    : `
      font-size: 15px;
      font-weight: bold;
    `
  }
  height: 75px;
  filter: brightness(135%);
  padding: 0 10px;
  text-align: center;
`;

const PackContents = styled.div`
  & > div {
    align-items: center;
    display: flex;
    margin-bottom: 10px;
    &:last-child { margin-bottom: 0; }

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

  border: solid rgba(255, 255, 255, 0.2);
  border-width: 1px 0;
  padding: 10px 0 15px;
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
        white-space: nowrap;
      }
    }
  }
`;
const Flair = styled.div`
  background: ${p => p.color || p.theme.colors.main};
  clip-path: polygon(0 0, 100% 0, 0 100%);
  font-size: 22px;
  height: 44px;
  left: 0;
  padding: 2px 3px;
  position: absolute;
  text-align: left;
  top: 0;
  width: 44px;
`;

const MARKET_BUFFER = 0.1;

const buildingIdsToShoppingList = (buildingIds) => {
  return buildingIds.reduce((acc, b) => {
    const inputs = Process.TYPES[Building.TYPES[b].processType].inputs;
    Object.keys(inputs).forEach((product) => {
      if (!acc[product]) acc[product] = 0;
      acc[product] += inputs[product];
    });
    return acc;
  }, {});
};

const introBuildings = [Building.IDS.WAREHOUSE];
const basicBuildings = [Building.IDS.WAREHOUSE, Building.IDS.EXTRACTOR, Building.IDS.REFINERY];
const advBuildings = [...basicBuildings, Building.IDS.BIOREACTOR, Building.IDS.FACTORY];
const introBuildingShoppingList = buildingIdsToShoppingList(introBuildings);
const basicBuildingShoppingList = buildingIdsToShoppingList(basicBuildings);
const advBuildingShoppingList = buildingIdsToShoppingList(advBuildings);
const uniqueProductIds = Array.from(
  new Set([
    ...Object.keys(introBuildingShoppingList),
    ...Object.keys(basicBuildingShoppingList),
    ...Object.keys(advBuildingShoppingList)
  ])
);

export const useStarterPackPricing = () => {
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();
  const { data: wallet } = useWalletPurchasableBalances();

  const adalianPrice = useMemo(() => {
    if (!priceConstants) return priceHelper.from(0);
    return priceHelper.from(priceConstants?.ADALIAN_PURCHASE_PRICE, priceConstants?.ADALIAN_PURCHASE_TOKEN);
  }, [priceConstants]);

  const {
    data: resourceMarketplaces,
    dataUpdatedAt: resourceMarketplacesUpdatedAt,
  } = useShoppingListData(1, 0, uniqueProductIds);

  // TODO: could just add adv building difference to basic to avoid repeating all those calcs for shared buildings
  const getMarketCostForBuildingList = useCallback((buildingIds) => {
    if (!resourceMarketplaces) return 0;

    // get instance of resourceMarketplaces that we can be destructive with
    const dynamicMarketplaces = cloneDeep(resourceMarketplaces);

    // split building list into granular orders
    const allOrders = buildingIds.reduce((acc, b) => {
      const inputs = Process.TYPES[Building.TYPES[b].processType].inputs;
      Object.keys(inputs).forEach((productId) => {
        acc.push({ productId, amount: inputs[productId] });
      });
      return acc;
    }, []);

    // sort by size desc
    allOrders.sort((a, b) => b.amount - a.amount);
    
    // walk through orders... for each, get best remaining price, then continue
    allOrders.forEach((order) => {
      let totalFilled = 0;
      let totalPaid = 0;
      if (dynamicMarketplaces[order.productId]) {

        // for each marketplace, set _dynamicUnitPrice for min(target, avail)
        dynamicMarketplaces[order.productId].forEach((row) => {
          let marketFills = ordersToFills(
            'buy',
            row.orders,
            Math.min(row.supply, order.amount),
            row.marketplace?.Exchange?.takerFee || 0,
            1,
            row.feeEnforcement || 1
          );
          const marketplaceCost = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0);
          const marketplaceFilled = marketFills.reduce((acc, cur) => acc + cur.fillAmount, 0);
          row._dynamicUnitPrice = marketplaceCost / marketplaceFilled;
        });

        // sort by _dynamicUnitPrice (asc)
        dynamicMarketplaces[order.productId].sort((a, b) => a._dynamicUnitPrice - b._dynamicUnitPrice);

        // process orders destructively until target met
        dynamicMarketplaces[order.productId].every((row) => {
          let marketFills = ordersToFills(
            'buy',
            row.orders,
            Math.min(row.supply, order.amount - totalFilled),
            row.marketplace?.Exchange?.takerFee || 0,
            1,
            row.feeEnforcement || 1,
            true
          );
          const marketplaceCost = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0);
          const marketplaceFilled = marketFills.reduce((acc, cur) => acc + cur.fillAmount, 0);

          row.supply -= marketplaceFilled;
          totalPaid += marketplaceCost;
          totalFilled += marketplaceFilled;
          return (totalFilled < order.amount);
        });

      }

      order.cost = totalPaid / TOKEN_SCALE[TOKEN.SWAY];
      if (totalFilled < order.amount) {
        console.warn(`Unable to fill productId ${order.productId}! ${totalFilled} < ${order.amount}`);
      }
    });

    return allOrders.reduce((acc, o) => acc + o.cost, 0);
  }, [resourceMarketplacesUpdatedAt]);

  const introPackSwayMin = useMemo(() => {
    const marketCost = getMarketCostForBuildingList(introBuildings);
    return (1 + MARKET_BUFFER) * marketCost;
  }, [getMarketCostForBuildingList]);

  const basicPackSwayMin = useMemo(() => {
    const marketCost = getMarketCostForBuildingList(basicBuildings);
    return (1 + MARKET_BUFFER) * marketCost;
  }, [getMarketCostForBuildingList]);

  const advPackSwayMin = useMemo(() => {
    const marketCost = getMarketCostForBuildingList(advBuildings);
    return (1 + MARKET_BUFFER) * marketCost;
  }, [getMarketCostForBuildingList]);

  return useMemo(() => {
    const introMinPrice = priceHelper.from(introPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const introMinSwayValue = priceHelper.from(introPackSwayMin * TOKEN_SCALE[TOKEN.SWAY], TOKEN.SWAY);
    const introCrewmatesValue = priceHelper.from(introPackCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const introEthValue = priceHelper.from(wallet?.shouldMaintainEthGasReserve ? GAS_BUFFER_VALUE_USDC : 0, TOKEN.USDC);
    const introSwayValue = priceHelper.from(
      Math.max(
        introMinSwayValue.usdcValue,
        introMinPrice.usdcValue - introCrewmatesValue.usdcValue - introEthValue.usdcValue
      ),
      TOKEN.USDC
    );
    const introPrice = priceHelper.from(introCrewmatesValue.usdcValue + introEthValue.usdcValue + introSwayValue.usdcValue, TOKEN.USDC);

    const basicMinPrice = priceHelper.from(basicPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const basicMinSwayValue = priceHelper.from(basicPackSwayMin * TOKEN_SCALE[TOKEN.SWAY], TOKEN.SWAY);
    const basicCrewmatesValue = priceHelper.from(basicPackCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const basicEthValue = priceHelper.from(wallet?.shouldMaintainEthGasReserve ? GAS_BUFFER_VALUE_USDC : 0, TOKEN.USDC);
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
      intro: {
        name: 'Explorer',
        price: introPrice,
        crewmates: introPackCrewmates,
        crewmatesValue: introCrewmatesValue,
        ethFormatted: introEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: introEthValue,
        swayFormatted: introSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: introSwayValue
      },
      basic: {
        name: 'Strategist',
        price: basicPrice,
        crewmates: basicPackCrewmates,
        crewmatesValue: basicCrewmatesValue,
        ethFormatted: basicEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: basicEthValue,
        swayFormatted: basicSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: basicSwayValue
      },
      advanced: {
        name: 'Industrialist',
        price: advPrice,
        crewmates: advPackCrewmates,
        crewmatesValue: advCrewmatesValue,
        ethFormatted: advEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: advEthValue,
        swayFormatted: advSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: advSwayValue
      }
    };
  }, [adalianPrice, advPackSwayMin, basicPackSwayMin, introPackSwayMin, priceConstants, priceHelper]);
};

export const useStarterPacks = () => {
  const { execute } = useContext(ChainTransactionContext);
  const { data: ethBalance } = useEthBalance();
  const priceHelper = usePriceHelper();
  const { buildMultiswapFromSellAmount } = useSwapHelper();
  const starterPacks = useStarterPackPricing();
  const { accountAddress } = useSession();

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

      fireTrackingEvent('purchase', {
        category: 'purchase',
        currency: 'USD',
        externalId: accountAddress,
        value: Number(crewmateTally) * 5,
        items: [{
          item_name: `starter_pack_${which}`
        }]
      });

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
  }, [accountAddress, buildMultiswapFromSellAmount, ethBalance, execute, priceHelper, starterPacks]);
};

const PurchasePackButton = ({ pack }) => {
  const { pendingTransactions, isLaunched } = useCrewContext();

  const [isPurchasing, setIsPurchasing] = useState();

  const isPurchasingStarterPack = useMemo(() => {
    return isPurchasing || (pendingTransactions || []).find(tx => tx.key === 'PurchaseStarterPack');
  }, [pendingTransactions]);

  const onPurchase = useCallback(() => {
    pack.onPurchase((which) => setIsPurchasing(which));
  }, [pack]);

  return (
    <Button
      disabled={nativeBool(isPurchasingStarterPack || !isLaunched)}
      isTransaction
      loading={reactBool(isPurchasingStarterPack)}
      onClick={() => onPurchase()}>
      <PurchaseButtonInner>
        <label>Purchase Pack</label>
        <span>
          <UserPrice price={pack.price.usdcValue} priceToken={TOKEN.USDC} format={TOKEN_FORMAT.SHORT} />
        </span>
      </PurchaseButtonInner>
    </Button>
  );
}

// TODO: consider moving isFunding to higher level context with single reference
const StarterPackWrapper = ({ children, pack, ...props }) => {
  const { data: wallet } = useWalletPurchasableBalances();

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
};

export const IntroStarterPack = (props) => {
  const { data: wallet } = useWalletPurchasableBalances();
  const packs = useStarterPacks();
  const pack = packs.intro;
  return (
    <StarterPackWrapper color="green" pack={pack} {...props}>
      <h2>
        <Flair color={theme.colors.glowGreen} style={{ fontSize: '19px' }}>
          <MyAssetIcon />
        </Flair>
        {pack.name}
      </h2>
      <PackWrapper>
        <PackFlavor color={theme.colors.glowGreen} smaller={props.asButton}>A pair of hands and a plan are all you need to get going in the Belt!</PackFlavor>
        <PackContents>
          <div>
            <span><NavIcon color={theme.colors.glowGreen} /></span>
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
            <span><NavIcon color={theme.colors.glowGreen} /></span>
            <label>{pack.swayFormatted}</label>
            <span>
              <UserPrice
                price={pack.swayValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          {wallet?.shouldMaintainEthGasReserve && (
            <div>
              <span><NavIcon color={theme.colors.glowGreen} /></span>
              <label>{pack.ethFormatted}</label>
              <span>
                <UserPrice
                  price={pack.ethValue.usdcValue}
                  priceToken={TOKEN.USDC}
                  format={TOKEN_FORMAT.SHORT} />
                {' '}Value
              </span>
            </div>
          )}
        </PackContents>
        <PackChecks>
          <div>
            <span><CheckIcon /></span>
            <label><b>{pack.crewmates}x Crewmate{pack.crewmates === 1 ? '' : 's'}</b> to perform game tasks (Recommended <strong>Miner</strong> and <strong>Engineer</strong>)</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>SWAY to construct <b>1x Warehouse</b> (Production buildings may be leased from other players)</label>
          </div>
        </PackChecks>
      </PackWrapper>

      {!props.asButton && <PurchasePackButton pack={pack} />}
    </StarterPackWrapper>
  );
};

export const BasicStarterPack = (props) => {
  const { data: wallet } = useWalletPurchasableBalances();
  const packs = useStarterPacks();
  const pack = packs.basic;
  return (
    <StarterPackWrapper pack={pack} {...props}>
      <h2>
        <Flair color={theme.colors.main}>
          <MyAssetDoubleIcon />
        </Flair>
        {pack.name}
      </h2>
      <PackWrapper>
        <PackFlavor smaller={props.asButton}>A self-sufficient starter kit for your own mining and refining operation!</PackFlavor>
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
          {wallet?.shouldMaintainEthGasReserve && (
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
          )}
        </PackContents>
        <PackChecks>
          <div>
            <span><CheckIcon /></span>
            <label><b>{pack.crewmates}x Crewmate{pack.crewmates === 1 ? '' : 's'}</b> to perform game tasks (Recommended <strong>Miner</strong> and <strong>Engineer</strong>)</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>SWAY to construct <b>1x Warehouse</b>, <b>1x Extractor</b>, and <b>1x Refinery</b> buildings</label>
          </div>
        </PackChecks>
      </PackWrapper>

      {!props.asButton && <PurchasePackButton pack={pack} />}
    </StarterPackWrapper>
  );
};

export const AdvancedStarterPack = (props) => {
  const { data: wallet } = useWalletPurchasableBalances();
  const packs = useStarterPacks();
  const pack = packs.advanced;
  return (
    <StarterPackWrapper color="purple" pack={pack} {...props}>
      <h2>
        <Flair color={theme.colors.txButton}>
          <MyAssetTripleIcon />
        </Flair>
        {pack.name}
      </h2>
      <PackWrapper>
        <PackFlavor color={theme.colors.lightPurple} smaller={props.asButton}>Ready to take on the Belt with a specialized crew and expanded production capabilities!</PackFlavor>
        <PackContents>
          <div>
            <span><NavIcon color={theme.colors.txButton} /></span>
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
            <span><NavIcon color={theme.colors.txButton} /></span>
            <label>{pack.swayFormatted}</label>
            <span>
              <UserPrice
                price={pack.swayValue.usdcValue}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
              {' '}Value
            </span>
          </div>
          {wallet?.shouldMaintainEthGasReserve && (
            <div>
              <span><NavIcon color={theme.colors.txButton} /></span>
              <label>{pack.ethFormatted}</label>
              <span>
                <UserPrice
                  price={pack.ethValue.usdcValue}
                  priceToken={TOKEN.USDC}
                  format={TOKEN_FORMAT.SHORT} />
                {' '}Value
              </span>
            </div>
          )}
        </PackContents>
        <PackChecks>
          <div>
            <span><CheckIcon /></span>
            <label><b>{pack.crewmates}x Crewmate{pack.crewmates === 1 ? '' : 's'}</b> to form a full crew and perform game tasks efficiently</label>
          </div>
          <div>
            <span><CheckIcon /></span>
            <label>SWAY to construct all {packs.basic.name} pack buildings plus <b>1x Bioreactor</b> and <b>1x Factory</b></label>
          </div>
        </PackChecks>
      </PackWrapper>
      
      {!props.asButton && <PurchasePackButton pack={pack} />}
    </StarterPackWrapper>
  );
};
