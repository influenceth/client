import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import AsteroidRendering from '~/components/AsteroidRendering';
import Button from '~/components/ButtonAlt';
import { ChevronDoubleRightIcon, MyAssetIcon, SearchIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import { TOKEN, TOKEN_SCALE, asteroidPrice, asteroidPriceToLots } from '~/lib/priceUtils';
import { PurchaseForm, PurchaseFormRows } from './components/PurchaseForm';
import SKUTitle from './components/SKUTitle';
import useAsteroid from '~/hooks/useAsteroid';
import theme from '~/theme';
import ClipCorner from '~/components/ClipCorner';
import { AsteroidSwayPrice } from '~/components/SwayPrice';
import LiveTimer from '~/components/LiveTimer';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import useBlockTime from '~/hooks/useBlockTime';

const AsteroidsOuter = styled.div`
  display: flex;
  flex-direction: row;
  height: 280px;
  width: 100%;
  & > div {
    flex: 1;
  }
`;

const AsteroidButtonInner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  width: 100%;
  & > span {
    flex: 1;
    padding-left: 10px;
    text-align: left;
  }
`;

const offset = 5;
const dim = 90;
const FlairCard = styled.div`
  left: ${offset}px;
  position: absolute;
  top: ${offset}px;
  filter: drop-shadow(2px 2px 6px black);
  z-index: 1;
  
  & > div {
    align-items: center;
    background: black;
    border: 1px solid #777;
    display: flex;
    height: ${dim * 1.2}px;
    width: ${dim}px;
    ${p => p.theme.clipCorner(10)};

    & > span {
      font-size: 22px;
      position: absolute;
      top: 4px;
      left: 4px;
      z-index: 2;
    }

    & > div {
      height: ${dim}px;
      overflow: hidden;
      width: ${dim}px;
    }
  }
`;

const FlavorText = styled.div`
  font-size: 14px;
  line-height: 1.4em;
  padding: 7px 5px 20px ${dim + 20}px;
`;

const AsteroidPurchaseForm = styled(PurchaseForm)`
  flex-basis: 290px;
  & > h2 {
    font-size: 17px;
    text-align: left;
    padding-left: ${dim + 20}px;
  }
  & sup {
    font-size: 8px;
    margin-top: -4px;
  }
  & a {
    color: white;
  }
`;

const Footer = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 18px;
  opacity: 0.6;
  padding: 20px 0 0;
  text-align: center;
`;

const sizeUI = {
  small: {
    asteroidId: 249998,
    color: theme.colors.main,
    colorLabel: undefined,
    flavorText: 'Perfect for solo players. Own and colonize your own outpost in Adalia.',
    name: 'Small Asteroids',
    maxPriceUSDC: 100,
  },
  medium: {
    asteroidId: 2507,
    color: theme.colors.lightPurple,
    colorLabel: 'purple',
    flavorText: 'Ideal for small and medium groups. Build out the ultimate space base!',
    name: 'Medium Asteroids',
    maxPriceUSDC: 1000,
  },
  large: {
    asteroidId: 18,
    color: theme.colors.lightOrange,
    colorLabel: 'orange',
    flavorText: `Now you're serious. Get an alliance together and take on the belt!`,
    name: 'Large Asteroids',
    maxPriceUSDC: 10000,
  },
};

const AsteroidSize = ({ sizeLabel }) => {
  const { asteroidId, color, colorLabel, flavorText, maxPriceUSDC, name } = sizeUI[sizeLabel];

  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();

  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const minPriceUSDC = useMemo(() => {
    if (sizeLabel === 'small' && priceConstants?.ASTEROID_PURCHASE_TOKEN) {
      return priceHelper.from(asteroidPrice(13n, priceConstants), priceConstants.ASTEROID_PURCHASE_TOKEN).to(TOKEN.USDC);
    }
    if (sizeLabel === 'medium') return sizeUI.small.maxPriceUSDC * TOKEN_SCALE[TOKEN.USDC];
    if (sizeLabel === 'large') return sizeUI.medium.maxPriceUSDC * TOKEN_SCALE[TOKEN.USDC];
  }, [priceHelper, priceConstants, sizeLabel]);

  const [minLots, maxLots] = useMemo(() => {
    return [
      asteroidPriceToLots(priceHelper.from(minPriceUSDC, TOKEN.USDC), priceConstants),
      asteroidPriceToLots(priceHelper.from(maxPriceUSDC * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC), priceConstants),
    ];
  }, [priceHelper, priceConstants]);
  
  const filterUnownedAsteroidsAndClose = useCallback(() => {
    updateFilters(Object.assign({}, filters, { ownedBy: 'unowned', surfaceAreaMin: minLots || 0, surfaceAreaMax: maxLots || 2e6 }));
    dispatchZoomScene();
    let hudTimeout = 0;
    if (zoomStatus !== 'out') {
      updateZoomStatus('zooming-out');
      hudTimeout = 2100;
    }
    setTimeout(() => dispatchHudMenuOpened('BELT_MAP_SEARCH'), hudTimeout);
    dispatchLauncherPage();
  }, [dispatchHudMenuOpened, dispatchLauncherPage, dispatchZoomScene, filters, maxLots, minLots, updateFilters, updateZoomStatus, zoomStatus]);

  return (
    <AsteroidPurchaseForm color={colorLabel}>
      <h2>
        <FlairCard>
          <div>
            <span style={{ color }}><MyAssetIcon /></span>
            <div>
              <AsteroidRendering asteroid={asteroid} varyDistance />
            </div>
          </div>
          <ClipCorner dimension={10} color="#777" offset="-1" />
        </FlairCard>
        {name}
      </h2>
      <FlavorText style={{ color }}>{flavorText}</FlavorText>

      <PurchaseFormRows style={{ marginBottom: 20 }}>
        <div>
          <label>Surface Area</label>
          {minLots && maxLots && <span>{minLots.toLocaleString()} - {maxLots.toLocaleString()} km<sup>2</sup></span>}
        </div>
        <div>
          <label>Starting Price</label>
          <span>
            <AsteroidSwayPrice lots={BigInt(minLots || 0)} />
          </span>
        </div>
        <div>
          <label>Spectral Types</label>
          <span>
            <a href="https://wiki.influenceth.io/game/asteroids/spectral-type" target="_blank" rel="noopener noreferrer">Learn more...</a>
          </span>
        </div>
      </PurchaseFormRows>

      <Button onClick={filterUnownedAsteroidsAndClose}>
        <AsteroidButtonInner>
          <SearchIcon />
          <span>Search Available</span>
          <ChevronDoubleRightIcon />
        </AsteroidButtonInner>
      </Button>
    </AsteroidPurchaseForm>
  );

};

const AsteroidsRemaining = styled.div`
  color: white;
  font-size: 24px;
  font-weight: normal;
  line-height: 20px;
  text-align: right;
  text-transform: none;
  & > span {
    font-size: 15px;
    opacity: 0.4;
  }
`;

const AsteroidSKU = () => {
  const { data: asteroidSale } = useAsteroidSale();
  const blockTime = useBlockTime();
  const [asteroidsRemaining, nextAsteroidSale] = useMemo(() => {
    if (!asteroidSale) return [0, 0, false];

    const remaining = asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)) : 0;
    const now = blockTime || Math.floor(Date.now() / 1e3);
    return [
      remaining,
      Math.ceil(now / 1e6) * 1e6
    ];
  }, [asteroidSale, blockTime]);

  return (
    <div style={{ width: '100%' }}>
      <SKUTitle style={{ display: 'flex' }}>
        <span style={{ flex: 1 }}>Buy Asteroids</span>
        {
          asteroidsRemaining > 0
            ? (
              <AsteroidsRemaining>
                <div>{asteroidsRemaining.toLocaleString()} Remaining</div>
                <span>In this sales period</span>
              </AsteroidsRemaining>
            )
            : (
              <AsteroidsRemaining>
                <div>Next Sale</div>
                <span>Starts in <b><LiveTimer target={nextAsteroidSale} /></b></span>
              </AsteroidsRemaining>
            )
        }
      </SKUTitle>
      <AsteroidsOuter>
        <AsteroidSize sizeLabel="small" />
        <span style={{ width: 15 }} />
        <AsteroidSize sizeLabel="medium" />
        <span style={{ width: 15 }} />
        <AsteroidSize sizeLabel="large" />
      </AsteroidsOuter>
      <Footer>
        Asteroids can be browsed and purchased using the in-game asteroid search.
      </Footer>
    </div>
  );
};

export default AsteroidSKU;