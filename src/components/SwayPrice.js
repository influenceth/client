import { useMemo } from 'react';

import { asteroidPrice, TOKEN } from '~/lib/priceUtils';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import { safeBigInt } from '~/lib/utils';
import UserPrice from './UserPrice';

const SwayPrice = ({ price, priceToken, format }) => {
  return (
    <UserPrice
      price={price}
      priceToken={priceToken}
      format={format}
    />
  );

  // TODO: remove above, use below once we are going to start using sway pricing

  const priceHelper = usePriceHelper();

  if (!priceToken) return <>-</>;
  return (
    <>
      {
        priceHelper
          .from(
            !price ? 0n : (typeof price === 'bigint' ? price : safeBigInt(price)),
            priceToken
          )
          .to(TOKEN.SWAY, format || true)
      }
    </>
  );
};

export const AsteroidSwayPrice = ({ lots = 0n, format = true, noLiquidityThreshold }) => {
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();

  const price = useMemo(() => {
    return priceConstants ? asteroidPrice(lots, priceConstants) : 0n;
  }, [lots, priceConstants]);

  const isOverThreshold = useMemo(() => {
    if (noLiquidityThreshold || !price || !priceConstants?.ASTEROID_PURCHASE_TOKEN || !priceHelper) return false;
    return priceHelper.from(price, priceConstants.ASTEROID_PURCHASE_TOKEN).to(TOKEN.USDC, false) > 1000e6;
  }, [noLiquidityThreshold, price, priceConstants, priceHelper]);

  if (isOverThreshold) {
    return (
      <UserPrice
        price={price}
        priceToken={priceConstants.ASTEROID_PURCHASE_TOKEN}
        format={format}
      />
    );
  }

  return (
    <SwayPrice
      price={price}
      priceToken={priceConstants.ASTEROID_PURCHASE_TOKEN}
      format={format}
    />
  );
}

export const CrewmateSwayPrice = ({ format = true }) => {
  const { data: priceConstants } = usePriceConstants();
  return (
    <SwayPrice
      price={priceConstants.ADALIAN_PURCHASE_PRICE}
      priceToken={priceConstants.ADALIAN_PURCHASE_TOKEN}
      format={format}
    />
  );
};

export default SwayPrice;