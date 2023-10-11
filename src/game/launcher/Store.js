import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import Ether from '~/components/Ether';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

import useCrewManager from '~/hooks/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import useStore from '~/hooks/useStore';

import formatters from '~/lib/formatters';
import { nativeBool, reactBool } from '~/lib/utils';
import api from '~/lib/api';
import theme from '~/theme';

import AdaliansImages from '~/assets/images/sales/adalians.png';
import AsteroidsImage from '~/assets/images/sales/asteroids.png';

const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  justify-content: center;
  width: 100%;
`;

const Group = styled.div`
  flex: 0 1 360px;
  margin: 0 10px;
`;

const SKUWrapper = styled.div`
  background: black;
  padding: 20px 15px;
`;

const innerPadding = 10;

const SKUInner = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border: 1px solid ${borderColor};
  min-height: 525px;
  padding: ${innerPadding}px;
  position: relative;
  width: 340px;
  ${p => p.theme.clipCorner(10)};
`;

const Title = styled.div`
  font-size: 28px;
  margin: 5px 0 15px;
  text-align: center;
  text-transform: uppercase;
`;

const Imagery = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 10px 20px;
  & > img {
    height: 200px;
  }
`;

const TypeLabel = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 15px;
`;

const Main = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  height: 50px;
  margin: 10px -${innerPadding}px;
  padding: ${innerPadding}px;
  & > input {
    font-size: 18px;
    height: 30px;
    text-align: right;
    width: 75px;
  }
  & > label {
    padding-left: 10px;
    font-size: 20px;
  }
  & > sub {
    align-items: flex-end;
    display: flex;
    height: 19px;
    margin-left: 4px;
    opacity: 0.5;
    vertical-align: bottom;
  }
  & > span {
    font-weight: bold;
    margin-right: 5px;
    font-size: 18px;
  }
`;

const Description = styled(TypeLabel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5px 15px 0;
  height: 67px;
`;

const Price = styled.div`
  color: white;
  font-size: 30px;
  margin-bottom: 15px;
  & span {
    margin: 0 5px;
  }
  & span:first-child {
    margin-left: 0;
  }
  & label {
    font-size: 60%;
    opacity: 0.5;
    text-transform: uppercase;
  }
`;

export const CrewmateSKU = () => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const [tally, setTally] = useState(1);

  const onPurchaseCrewmates = useCallback(() => {
    purchaseCredits(tally);
  }, [tally]);

  const isPendingPurchase = useMemo(() => {
    return !!getPendingCreditPurchase();
  }, [getPendingCreditPurchase]);

  return (
    <SKUWrapper>
      <SKUInner>
        <Title>Crewmates</Title>
        <Imagery>
          <img src={AdaliansImages} />
        </Imagery>
        <Description>
          Crewmates are the literal heart and soul of Adalia. They perform all in-game tasks and form your crew.
        </Description>
        <Main>
          <UncontrolledTextInput
            disabled={nativeBool(isPendingPurchase)}
            min={1}
            onChange={(e) => setTally(e.currentTarget.value)}
            value={safeValue(tally)}
            step={1}
            type="number" />

          <label>{Number(tally) === 1 ? 'Crewmate' : 'Crewmates'}</label>
        </Main>
        <Price>
          <span>{formatters.crewmatePrice(priceConstants, 4)}</span>
          <label>Eth each</label>
        </Price>
        <Button
          loading={reactBool(isPendingPurchase)}
          disabled={nativeBool(isPendingPurchase || Number(tally) === 0)}
          isTransaction
          onClick={onPurchaseCrewmates}
          subtle
          style={{ width: '100%' }}>
          Purchase
          {priceConstants && (
            <span style={{ color: 'white', flex: 1, fontSize: '90%', textAlign: 'right', marginLeft: 15 }}>
              {/* TODO: should this update price before "approve"? what about asteroids? */}
              <Ether>{formatters.ethPrice(BigInt(tally) * BigInt(priceConstants.ADALIAN_PRICE_ETH), 4)}</Ether>
            </span>
          )}
        </Button>
        <ClipCorner dimension={10} color={borderColor} />
      </SKUInner>
    </SKUWrapper>
  );
};

export const AsteroidSKU = () => {
  const { data: priceConstants } = usePriceConstants();

  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const [asteroidSale, setAsteroidSale] = useState({});

  useEffect(() => {
    async function getSale() {
      const salesData = await api.getAsteroidSale();
      setAsteroidSale(salesData || {});
    }

    getSale();
  }, []);

  const filterAndClose = useCallback(() => {
    updateFilters(Object.assign({}, filters, { ownedBy: 'unowned' }));
    dispatchZoomScene();
    let hudTimeout = 0;
    if (zoomStatus !== 'out') {
      updateZoomStatus('zooming-out');
      hudTimeout = 2100;
    }
    setTimeout(() => dispatchHudMenuOpened('BELT_MAP_SEARCH'), hudTimeout);
    dispatchLauncherPage();
  }, [filters, updateFilters, zoomStatus]);

  return (
    <SKUWrapper>
      <SKUInner>
        <Title>Asteroids</Title>
        <Imagery>
          <img src={AsteroidsImage} />
        </Imagery>
        <Description>
          Asteroids are the core productive land in Influence. Each asteroid comes with one free
          Adalian crewmate!
        </Description>
        <Main>
          <label><b>{asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)).toLocaleString() : ''}</b> Asteroids</label>
          <sub>remaining this period</sub>
        </Main>
        <Price>
            <label>Starting at</label>
            <span>{formatters.asteroidPrice(1, priceConstants)}</span>
            <label>Eth</label>
        </Price>
        <Button
          onClick={filterAndClose}
          subtle
          style={{ width: '100%' }}>
          Browse Available Asteroids
        </Button>
        <ClipCorner dimension={10} color={borderColor} />
      </SKUInner>
    </SKUWrapper>
  );
};

const Store = () => {
  return (
    <Wrapper>
      <Group>
        <CrewmateSKU />
      </Group>
      <Group>
        <AsteroidSKU />
      </Group>
    </Wrapper>
  );
};

export default Store;