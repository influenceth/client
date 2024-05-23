import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import CrewmatesHeroImage from '~/assets/images/sales/crewmates_hero.png';
import SwayImage from '~/assets/images/sales/sway.png';
import SwayHeroImage from '~/assets/images/sales/sway_hero.jpg';
import StarterPackHeroImage from '~/assets/images/sales/starter_packs_hero.jpg';
import AdalianFlourish from '~/components/AdalianFlourish';
import HeroLayout from '~/components/HeroLayout';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { CheckIcon, PurchaseAsteroidIcon, SwayIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import useBlockTime from '~/hooks/useBlockTime';
import { formatTimer } from '~/lib/utils';
import NavIcon from '~/components/NavIcon';
import theme from '~/theme';
import Button from '~/components/ButtonAlt';

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
  width: 100%;
  & > * {
    margin-top: 10px;
  }
`;

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 1;
  font-size: 16px;
  padding-right: 20px;
  & > p {
    margin: 0 0 1em;
  }
`;

const purchasePacksPadding = 15;
const purchaseFormMargin = 15;
const purchaseFormWidth = 280;
const PurchaseForm = styled.div`
  background: linear-gradient(
    to bottom,
    ${p => p.isOrange
        ? 'rgba(127, 98, 54, 0.7)'
        : (p.isPurple ? 'rgba(70, 68, 134, 0.7)' : 'rgba(48, 88, 114, 0.7)')
    },
    transparent
  );

  flex: 0 0 ${purchaseFormWidth}px;
  align-self: stretch;
  padding: 5px;
  & > h3 {
    align-items: center;
    background: rgba(
      ${p => p.isOrange
      ? p.theme.hexToRGB(p.theme.colors.inFlight)
      : (p.isPurple ? p.theme.hexToRGB(p.theme.colors.txButton) : p.theme.colors.mainRGB)},
      0.5
    );
    display: flex;
    font-size: 16px;
    justify-content: space-between;
    margin: 0;
    padding: 10px 10px;
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
  margin-top: 6px;
  padding: 0 10px;
  & > div:first-child {
    color: ${p => p.inactive ? p.theme.colors.inFlight : 'white'};
    font-size: 60px;
    line-height: 0;
  }
  & > div:last-child {
    label {
      font-size: 17px;
      font-weight: bold;
    }
    span {
      color: ${p => p.inactive ? p.theme.colors.inFlight : p.theme.colors.main};
      display: block;
      font-size: 85%;
    }
  }
`;

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
    }
    & > label {
      color: ${p => p.theme.colors.main};
      font-size: 13px;
      & > b {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

const PurchaseButtonInner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  & > span {
    color: white;
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
      <PurchaseForm isOrange={remaining === 0 || remainingTime <= 0}>
        <h3>
          <span>
            {remainingTime > 0 && remaining > 0 && `Sale Active`}
            {remainingTime > 0 && remaining === 0 && `Next Sale`}
            {remainingTime <= 0 && `Sale Inactive`}
          </span>
          <span>
            {remainingTime > 0 && (trendingToSellOut || remaining <= 0)
              ? (
                <>
                  {remaining > 0 ? 'Ends in' : 'Starts in'}
                  <b>{formatTimer(remainingTime, 2)}</b>
                </>
              )
              : null
            }
          </span>
        </h3>
        <div>
          <AsteroidBanner inactive={remaining === 0 || remainingTime <= 0}>
            <div>
              <PurchaseAsteroidIcon />
            </div>
            {(remaining > 0 && remainingTime > 0)
              ? (
                <div>
                  <label>{asteroidSale ? remaining.toLocaleString() : '...'} Asteroid{remaining === 1 ? '' : 's'}</label>
                  <span>Remaining in sale period</span>
                </div>
              )
              : (
                <div>
                  <span>All asteroids in this sale period have been purchased.</span>
                </div>
              )}
          </AsteroidBanner>
        </div>
        <footer style={{ fontSize: '85%', marginTop: 10, padding: '0 10px', textAlign: 'left' }}>
          Available asteroids can be purchased directly in the belt view
        </footer>
      </PurchaseForm>
    </Wrapper>
  );
};

const CrewmateSKU = ({ onUpdateTotalPrice }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    onUpdateTotalPrice(quantity * 5);
  }, [quantity, onUpdateTotalPrice]);

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

// TODO: wrap in launch feature flag
const StarterPackSKU = () => {
  return (
    <Wrapper>
      <Description>
        <p>
          Starter Packs come with crewmates and SWAY.
        </p>
        <p>
          Note: Some components of a starter pack are purchased on a decentralized exchange, so their quantities may vary somewhat depending on the price of those assets.
        </p>
      </Description>

      <div style={{ display: 'flex', flex: '0 0 570px', height: 317, marginTop: -125 }}>
        <PurchaseForm style={{ marginRight: purchaseFormMargin, height: '100%' }}>
          <h3>Basic Starter Pack</h3>
          <PackWrapper>
            <PackContents>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>1 Crewmate</label>
                <span>$5 Value</span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>122,276 SWAY</label>
                <span>$20 Value</span>
              </div>
            </PackContents>
            <PackChecks>
              <div>
                <span><CheckIcon /></span>
                <label>Basic Extraction starter kit</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>1x Crewmate to perform game tasks (Recommended <b>Miner</b> class)</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>SWAY to construct <b>1x Warehouse</b> and <b>1x Extractor</b> buildings</label>
              </div>
            </PackChecks>
          </PackWrapper>
        </PurchaseForm>

        <PurchaseForm isPurple>
          <h3>Advanced Starter Pack</h3>
          <PackWrapper>
            <PackContents>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>5 Crewmates</label>
                <span>$25 Value</span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>243,276 SWAY</label>
                <span>$35 Value</span>
              </div>
            </PackContents>
            <PackChecks>
              <div>
                <span><CheckIcon /></span>
                <label>Advanced starter kit for extraction, refining, and production processes</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>5x crewmates to form a full crew and perform game tasks efficiently</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>SWAY to construct <b>1x Warehouse</b> and <b>1x Extractor</b> and <b>1x Refinery</b> buildings</label>
              </div>
            </PackChecks>
          </PackWrapper>
        </PurchaseForm>
      </div>
    </Wrapper>
  );
};

// TODO: wrap in launch feature flag
const SwaySKU = ({ onUpdateTotalPrice }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    onUpdateTotalPrice(quantity);
  }, [quantity, onUpdateTotalPrice]);

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
  );
};

const defaultStyleOverrides = {
  belowFold: { padding: '10px 0 20px 0' },
  title: { textTransform: 'uppercase' }
};

const SKU = ({ asset, onBack }) => {
  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const [totalPrice, setTotalPrice] = useState(0);

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
        styleOverrides: {
          ...defaultStyleOverrides,
          belowFold: { padding: '10px 0 20px 0' },
          body: { paddingLeft: '35px' }
        },
        content: <AsteroidSKU />,
        flourishWidth: 1,
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
        content: <CrewmateSKU onUpdateTotalPrice={(total) => setTotalPrice(total)} />,
        flourish: <AdalianFlourish filter="saturate(125%)" style={{ marginLeft: 35 }} />,
        flourishWidth: 145
      };
    }
    if (asset === 'packs') {
      return {
        coverImage: StarterPackHeroImage,
        title: <>Buy Starter<br/>Packs</>,
        styleOverrides: {
          ...defaultStyleOverrides,
          aboveFold: { height: 125, marginTop: -125 },
          belowFold: { padding: '10px 0 20px 0' },
          body: { overflow: 'visible', paddingLeft: '35px' },
          rule: { width: 308 }
        },
        content: <StarterPackSKU />,
        flourishWidth: 1,
        rightButton: {
          label: (
            <PurchaseButtonInner>
              <label>Purchase Pack</label>
              <span>$60</span>
            </PurchaseButtonInner>
          ),
          props: {
            isTransaction: true,
            style: { margin: `0 ${purchasePacksPadding}px` },
            width: purchaseFormWidth - 2 * purchasePacksPadding
          },
          preLabel: (
            <Button
              isTransaction
              style={{ marginRight: purchaseFormMargin + purchasePacksPadding }}
              width={purchaseFormWidth - 2 * purchasePacksPadding}>
              <PurchaseButtonInner>
                <label>Purchase Pack</label>
                <span>$20</span>
              </PurchaseButtonInner>
            </Button>
          )
        }
      };
    }
    return {
      coverImage: SwayHeroImage,
      title: 'Buy Sway',
      content: <SwaySKU onUpdateTotalPrice={(total) => setTotalPrice(total)} />,
      flourish: <Flourish src={SwayImage} />,
      flourishWidth: 145
    };
  }, [asset, filterUnownedAsteroidsAndClose]);

  // price constants (i.e. price of crewmate, etc)
  // sway/usd conversion
  // eth/usd conversion
  // eth/sway conversion

  return (
    <HeroLayout
      autoHeight
      belowFoldMin={192}
      styleOverrides={defaultStyleOverrides}
      leftButton={{
        label: 'Back',
        onClick: onBack
      }}
      rightButton={{
        label: (
          <PurchaseButtonInner>
            <label>Purchase</label>
            <span>
              ${Math.round(totalPrice || 0)}
              {/* ${(totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}
            </span>
          </PurchaseButtonInner>
        ),
        onClick: () => {},
        props: { disabled: !(totalPrice > 0), isTransaction: true }
      }}
      {...props}>
      {content}
    </HeroLayout>
  );
};

export default SKU;