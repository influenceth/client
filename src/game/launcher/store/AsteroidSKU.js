import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { CheckIcon } from '~/components/Icons';
import UserPrice from '~/components/UserPrice';
import useStore from '~/hooks/useStore';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE, asteroidPriceToLots } from '~/lib/priceUtils';
import { PurchaseForm } from './components/PurchaseForm';

const smallMaxPrice = 100 * TOKEN_SCALE[TOKEN.USDC];
const mediumMaxPrice = 1000 * TOKEN_SCALE[TOKEN.USDC];
const largeMaxPrice = 10000 * TOKEN_SCALE[TOKEN.USDC];

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 1;
  font-size: 16px;
  padding-right: 20px;
  & > p {
    margin: 0 0 1em;
  }
`;

const AsteroidSizeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  & > div {
    flex: 0 0 32%;
    padding-bottom: 20px;
    & > div {
      padding: 10px;
    }
  }
`;
const AsteroidAd = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  padding: 0 0 15px;
  & > svg {
    margin-left: 2px;
    margin-top: 2px;
  }
  & > span {
    flex: 0 0 calc(100% - 18px);
    font-size: 14px;
    opacity: 0.7;
    padding-left: 10px;
  }
`;
const AsteroidButtonInner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  & > span:last-child {
    color: white;
    font-size: 14px;
  }
`;

const FilterAsteroidButton = ({ price, sizeFilter }) => {
  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const filterUnownedAsteroidsAndClose = useCallback(() => {
    updateFilters(Object.assign({}, filters, { ownedBy: 'unowned', ...sizeFilter }));
    dispatchZoomScene();
    let hudTimeout = 0;
    if (zoomStatus !== 'out') {
      updateZoomStatus('zooming-out');
      hudTimeout = 2100;
    }
    setTimeout(() => dispatchHudMenuOpened('BELT_MAP_SEARCH'), hudTimeout);
    dispatchLauncherPage();
  }, [filters, sizeFilter, updateFilters, zoomStatus, dispatchHudMenuOpened, dispatchLauncherPage, dispatchZoomScene, updateZoomStatus]);

  return (
    <Button onClick={filterUnownedAsteroidsAndClose} style={{ width: '100%' }}>
      <AsteroidButtonInner>
        <span>Search Available</span>
        <span>{price}</span>
      </AsteroidButtonInner>
    </Button>
  );
}

const AsteroidSKU = () => {
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();
  const [smallMaxLots, mediumMaxLots, largeMaxLots] = useMemo(() => {
    return [
      asteroidPriceToLots(priceHelper.from(smallMaxPrice, TOKEN.USDC).to(TOKEN.ETH), priceConstants),
      asteroidPriceToLots(priceHelper.from(mediumMaxPrice, TOKEN.USDC).to(TOKEN.ETH), priceConstants),
      asteroidPriceToLots(priceHelper.from(largeMaxPrice, TOKEN.USDC).to(TOKEN.ETH), priceConstants),
    ];
  }, [priceHelper, priceConstants]);

  return (
    <div>
      <Description>
        <p style={{ borderBottom: '1px solid #333', padding: '5px 0 18px' }}>
          Asteroids are the core productive land in Influence. There are 250,000 in total, and more
          will never be added. Owners hold the rights to all mining and land-use on their asteroid,
          and may share or contract those rights to others. Each asteroid has unique orbital
          attributes, resource composition, and comes with a free Adalian crewmate!
        </p>
      </Description>
      <AsteroidSizeWrapper>
        <PurchaseForm>
          <h3>Small Asteroids</h3>
          <div>
            <AsteroidAd>
              <CheckIcon />
              <span>Perfect for solo players. Own and colonize your own outpost in Adalia.</span>
            </AsteroidAd>
            {/* TODO: preferred currency */}
            <FilterAsteroidButton
              price={<>{'<'} <UserPrice price={smallMaxPrice} priceToken={TOKEN.USDC} format={TOKEN_FORMAT.SHORT} /></>}
              sizeFilter={{ surfaceAreaMin: 0, surfaceAreaMax: smallMaxLots }} />
          </div>
        </PurchaseForm>

        <PurchaseForm color="purple">
          <h3>Medium Asteroids</h3>
          <div>
            <AsteroidAd>
              <CheckIcon />
              <span>Ideal for small and medium groups. Build out the ultimate space base!</span>
            </AsteroidAd>
            <FilterAsteroidButton
              price={<>{'<'} <UserPrice price={mediumMaxPrice} priceToken={TOKEN.USDC} format={TOKEN_FORMAT.SHORT} /></>}
              sizeFilter={{ surfaceAreaMin: smallMaxLots, surfaceAreaMax: mediumMaxLots }} />
          </div>
        </PurchaseForm>

        <PurchaseForm color="orange">
          <h3>Large Asteroids</h3>
          <div>
            <AsteroidAd>
              <CheckIcon />
              <span>Now you're serious. Get an alliance together and take on the belt!</span>
            </AsteroidAd>
            <FilterAsteroidButton
              price={<>{'<'} <UserPrice price={largeMaxPrice} priceToken={TOKEN.USDC} format={TOKEN_FORMAT.SHORT} /></>}
              sizeFilter={{ surfaceAreaMin: mediumMaxLots, surfaceAreaMax: largeMaxLots }} />
          </div>
        </PurchaseForm>
      </AsteroidSizeWrapper>
    </div>
  );
};

export default AsteroidSKU;