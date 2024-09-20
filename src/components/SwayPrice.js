import { useMemo } from 'react';

import { asteroidPrice, TOKEN } from '~/lib/priceUtils';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import { safeBigInt } from '~/lib/utils';

const SwayPrice = ({ price, priceToken, format }) => {
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

export const AsteroidSwayPrice = ({ lots = 0n, format = true }) => {
  const { data: priceConstants } = usePriceConstants();

  const price = useMemo(() => {
    return asteroidPrice(lots, priceConstants);
  }, [lots, priceConstants]);

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