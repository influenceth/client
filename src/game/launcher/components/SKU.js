import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import CrewmatesHeroImage from '~/assets/images/sales/crewmates_hero.png';
import SwayImage from '~/assets/images/sales/sway.png';
import SwayHeroImage from '~/assets/images/sales/sway_hero.jpg';
import StarterPackHeroImage from '~/assets/images/sales/starter_packs_hero.jpg';
import AdalianFlourish from '~/components/AdalianFlourish';
import HeroLayout from '~/components/HeroLayout';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { PurchaseAsteroidIcon, SwayIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import useBlockTime from '~/hooks/useBlockTime';
import { formatTimer } from '~/lib/utils';


const Flourish = styled.div`
  background: url(${p => p.src});
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;
  height: 100%;
  width: 100%;
`;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  & > * {
    margin-top: 10px;
  }
`;

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 16px;
  padding-right: 20px;
  & > p {
    margin: 0 0 1em;
  }
`;

const PurchaseForm = styled.div`
  background: linear-gradient(to bottom, #163041, transparent);
  flex: 0 0 280px;
  align-self: stretch;
  padding: 5px;
  & > h3 {
    align-items: center;
    background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
    display: flex;
    font-size: 15px;
    justify-content: space-between;
    margin: 0;
    padding: 8px 12px;
    text-transform: uppercase;
    & > span:last-child {
      color: rgba(255, 255, 255, 0.5);
      font-weight: normal;
      & > b {
        color: white;
        font-weight: normal;
        margin-left: 4px;
      }
    }
  }
  & > footer {
    color: #777;
    font-size: 14px;
    margin-top: 16px;
    text-align: center;
    & > b {
      color: white;
      font-weight: normal;
    }
  }
`;

const PurchaseFormRows = styled.div`
  & > div {
    align-items: center;
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 14px;
    height: 28px;
    justify-content: space-between;
    padding: 0 8px;
    & > label {
      opacity: 0.7;
    }
    & > span {
      align-items: center;
      display: flex;
      & > input {
        width: 80px;
      }
    }
  }
`;
const SwayExchangeRows = styled(PurchaseFormRows)`
  & > div {
    & > span > input {
      width: 120px !important;
    }
    & > span:last-child {
      font-size: 18px;
    }
  }
`;
const AsteroidBanner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 10px;
  padding-left: 10px;
  & > div:first-child {
    font-size: 60px;
    line-height: 0;
  }
  & > div:last-child {
    label {
      font-size: 17px;
      font-weight: bold;
    }
    span {
      color: ${p => p.theme.colors.main};
      display: block;
      font-size: 90%;
    }
  }
`;

const AsteroidSKU = () => {
  const { data: asteroidSale } = useAsteroidSale();
  const blockTime = useBlockTime();

  const [remaining, remainingTime, trendingToSellOut] = useMemo(() => {
    if (!asteroidSale) return [0, 0, false];

    const asteroidSaleEnd = ((asteroidSale.period || 0) + 1) * 1e6;
    const remaining = asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)) : 0;
    const remainingTime = asteroidSaleEnd - blockTime;
    return [
      remainingTime > 0 ? remaining : 0,
      remainingTime,
      (remaining / remainingTime) <= (asteroidSale.limit / 1e6)
    ];
  }, [asteroidSale, blockTime]);

  return (
    <Wrapper>
      <Description>
        <p>
          Asteroids are the core productive land in Influence. Asteroid owners
          hold the rights to mining and constructing on their asteroid, or may
          share or contract those rights to others. Every asteroid also comes
          with one free Adalian crewmate!
        </p>
        <p>
          Note: Each asteroid has unique celestrial attributes, orbital
          mechanics, and resource abundances that should be carefully
          considered before buying.
        </p>
      </Description>
      <PurchaseForm>
        <h3>
          <span>
            {remainingTime > 0 && remaining > 0 && `Sale Active`}
            {remainingTime > 0 && remaining === 0 && `Sold Out`}
            {remainingTime <= 0 && `Sale Inactive`}
          </span>
          <span>
            {remainingTime > 0 && (trendingToSellOut || remaining <= 0)
              ? (
                <>
                  {remaining > 0 ? 'Ends in' : 'Reopens in'}
                  <b>{formatTimer(remainingTime, 2)}</b>
                </>
              )
              : null
            }
          </span>
        </h3>
        <div>
          <AsteroidBanner>
            <div>
              <PurchaseAsteroidIcon />
            </div>
            <div>
              <label>{asteroidSale ? remaining.toLocaleString() : '...'} Asteroid{remaining === 1 ? '' : 's'}</label>
              <span>Remaining in sale period</span>
            </div>
          </AsteroidBanner>
        </div>
        <footer style={{ fontSize: '85%', marginTop: 10, padding: '0 10px', textAlign: 'left' }}>
          Available asteroids can be purchased directly in the belt view
        </footer>
      </PurchaseForm>
    </Wrapper>
  );
};

const CrewmateSKU = () => {
  const [quantity, setQuantity] = useState(1);

  return (
    <Wrapper>
      <Description>
        <p>
          Crewmates are the literal heart and soul of Adalia. They perform all in-game
          tasks and form your crew. A crew is composed of up to 5 crewmates.
        </p>
        <p>
          Crewmate credits are turned into crewmates after completing their backstory
          and earning traits at any Habitat in the belt.
        </p>
      </Description>
      <PurchaseForm>
        <h3>Crewmate Credits</h3>
        <PurchaseFormRows>
          <div>
            <label>Collection</label>
            <span>Adalian</span>
          </div>
          <div>
            <label>Price</label>
            <span>$5 Each</span>
          </div>
          <div>
            <label>Quantity</label>
            <span>
              <UncontrolledTextInput
                max={99}
                min={1}
                onChange={(e) => setQuantity(e.currentTarget.value)}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity || ''}
              />
            </span>
          </div>
        </PurchaseFormRows>
      </PurchaseForm>
    </Wrapper>
  );
};

const StarterPackSKU = () => {
  return <div />;
};

const SwaySKU = () => {
  const [quantity, setQuantity] = useState(1);

  return (
    <Wrapper>
      <Description>
        <p>
          SWAY is the single currency used for transacting in Adalia. It is purchased
          on a decentralized exchange from the pool of community sellers.
        </p>
      </Description>
      <PurchaseForm>
        <h3>Sway Exchange</h3>
        <SwayExchangeRows style={{ paddingTop: 6 }}>
          <div style={{ margin: '6px 0' }}>
            <span>
              <UncontrolledTextInput
                max={99}
                min={1}
                onChange={(e) => setQuantity(e.currentTarget.value)}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity || ''} />
            </span>
            <span>
              USD
            </span>
          </div>
          <div>
            <span>
              <UncontrolledTextInput
                max={99}
                min={1}
                onChange={(e) => setQuantity(e.currentTarget.value)}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity || ''} />
              <span style={{ fontSize: '24px' }}><SwayIcon /></span>
            </span>
            <span>
              SWAY
            </span>
          </div>
        </SwayExchangeRows>
        <footer>Powered by <b>AVNU</b></footer>
      </PurchaseForm>
    </Wrapper>
  )
};

const SKU = ({ asset, onBack }) => {
  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const filterUnownedAsteroidsAndClose = useCallback(() => {
    updateFilters(Object.assign({}, filters, { ownedBy: 'unowned' }));
    dispatchZoomScene();
    let hudTimeout = 0;
    if (zoomStatus !== 'out') {
      updateZoomStatus('zooming-out');
      hudTimeout = 2100;
    }
    setTimeout(() => dispatchHudMenuOpened('BELT_MAP_SEARCH'), hudTimeout);
    dispatchLauncherPage();
  }, [filters, updateFilters, zoomStatus, dispatchHudMenuOpened, dispatchLauncherPage, dispatchZoomScene, updateZoomStatus]);

  const { content, ...props } = useMemo(() => {
    if (asset === 'asteroids') {
      return {
        coverImage: AsteroidsHeroImage,
        title: 'Buy Asteroids',
        bodyStyle: { padding: '10px 0 20px 10px' },
        content: <AsteroidSKU />,
        flourishWidth: 145,
        rightButton: {
          label: 'Browse Available Asteroids',
          onClick: filterUnownedAsteroidsAndClose,
        }
      };
    }
    if (asset === 'crewmates') {
      return {
        coverImage: CrewmatesHeroImage,
        title: 'Buy Crewmates',
        content: <CrewmateSKU />,
        flourish: <AdalianFlourish filter="saturate(125%)" style={{ marginLeft: 35 }} />,
        flourishWidth: 145
      };
    }
    if (asset === 'packs') {
      return {
        coverImage: StarterPackHeroImage,
        title: 'Buy Starter Packs',
        content: <StarterPackSKU />
      };
    }
    return {
      coverImage: SwayHeroImage,
      title: 'Buy Sway',
      content: <SwaySKU />,
      flourish: <Flourish src={SwayImage} />,
      flourishWidth: 145
    };
  }, [asset, filterUnownedAsteroidsAndClose]);

  return (
    <HeroLayout
      autoHeight
      belowFoldMin={192}
      bodyStyle={{ padding: '10px 0 20px 0' }}
      leftButton={{
        label: 'Back',
        onClick: onBack
      }}
      rightButton={{
        label: 'Purchase',
        onClick: () => {},
        props: { isTransaction: true }
      }}
      {...props}>
      {content}
    </HeroLayout>
  );
};

export default SKU;