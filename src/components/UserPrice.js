import { useMemo } from 'react';

import { asteroidPrice } from '~/lib/priceUtils';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import useStore from '~/hooks/useStore';
import { safeBigInt } from '~/lib/utils';

const UserPrice = ({ price, priceToken, format }) => {
  const priceHelper = usePriceHelper();
  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());

  if (!priceToken) return <>-</>;
  return (
    <>
      {
        priceHelper
          .from(
            !price ? 0n : (typeof price === 'bigint' ? price : safeBigInt(price)),
            priceToken
          )
          .to(preferredUiCurrency, format || true)
      }
    </>
  );
};

export const AsteroidUserPrice = ({ lots = 0n, format = true }) => {
  const { data: priceConstants } = usePriceConstants();

  const price = useMemo(() => {
    return asteroidPrice(lots, priceConstants);
  }, [lots, priceConstants]);

  return (
    <UserPrice
      price={price}
      priceToken={priceConstants.ASTEROID_PURCHASE_TOKEN}
      format={format}
    />
  );
}

export const CrewmateUserPrice = ({ format = true }) => {
  const { data: priceConstants } = usePriceConstants();
  return (
    <UserPrice
      price={priceConstants.ADALIAN_PURCHASE_PRICE}
      priceToken={priceConstants.ADALIAN_PURCHASE_TOKEN}
      format={format}
    />
  );
};

export default UserPrice;