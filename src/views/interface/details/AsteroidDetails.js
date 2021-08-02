import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import utils from 'influence-utils';
import { utils as ethersUtils } from 'ethers';
import { MdFlag, MdBlurOff } from 'react-icons/md';
import { AiFillEdit } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidPrice from '~/hooks/useAsteroidPrice';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useScanAsteroid from '~/hooks/useScanAsteroid';
import Details from '~/components/Details';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import BonusBadge from '~/components/BonusBadge';
import DataReadout from '~/components/DataReadout';
import formatters from '~/lib/formatters';

const resourceNames = {
  yield: 'Yield',
  volatile: 'Volatiles',
  metal: 'Metals',
  organic: 'Organics',
  rareearth: 'Rare Earth',
  fissile: 'Fissiles'
};

const StyledAsteroidDetails = styled.div`
  align-items: stretch;
  display: flex;
  height: 100%;
`;

const SidePanel = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 300px;
`;

const Rarity = styled.div`
  display: flex;
  margin-bottom: 15px;

  & span {
    color: ${props => props.theme.colors.rarity[props.rarity]};
    font-size: ${props => props.theme.fontSizes.featureText};
    line-height: ${props => props.theme.fontSizes.featureText};
    margin-left: 10px;
  }

  & div {
    background-color: ${props => props.theme.colors.rarity[props.rarity]};
    border-radius: 50%;
    height: ${props => props.theme.fontSizes.featureText};
    width: ${props => props.theme.fontSizes.featureText};
  }
`;

const StyledButton = styled(Button)`
  margin: 10px 0;
`;

const Log = styled.ul`
  border-top: 1px solid ${props => props.theme.colors.contentBorder};
  flex: 0 1 33%;
  margin: auto 0 0 0;
  padding: 0;
  min-height: 300px;
`;

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  margin-left: 20px;
`;

const Resources = styled.div`
  border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
  display: flex;
  flex: 0 1 auto;
  padding-bottom: 20px;
  min-height: 250px;
`;

const ResourceMix = styled.div`
  flex: 1 1 33%;
`;

const Bonuses = styled.div`
  display: flex;
  flex: 1 1 67%;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const Bonus = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 32%;
`;

const BonusBars = styled.div`
  display: flex;
  flex: 0 0 20px;
  flex-direction: column;
`;

const BonusBar = styled.div`
  background-color: ${props => {
    if (props.on) return props.theme.colors.bonus[`level${props.level}`];
    if (!props.on) return props.theme.colors.disabledText;
  }};
  border-radius: 3px;
  height: 15px;
  margin-bottom: 2px;
  width: 20px;
`;

const StyledBonusBadge = styled(BonusBadge)`
  flex: 1 0 auto;
  height: auto;
  margin: 0 10px;
  max-height: 39px;
  max-width: 39px;
  width: auto;
`;

const BonusDesc = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.detailText};

  & span {
    margin-bottom: 5px;
  }
`;

const Dimensions = styled.div`
  display: flex;
  flex: 1 0 auto;
  flex-direction: row;
  flex-wrap: wrap;
  padding-top: 20px;
`;

const Dimension = styled.div`
  justify-content: center;
  display: flex;
  flex: 0 0 32%;
`;

const StyledDataReadout = styled(DataReadout)`
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.detailText};
`;

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();
  const sale = useSale();
  const origin = useStore(state => state.asteroids.origin);
  const asteroid = useAsteroid(origin);
  const asteroidPrice = useAsteroidPrice(asteroid.data);
  const buyAsteroid = useBuyAsteroid();
  const { startScan, finalizeScan, status: scanStatus } = useScanAsteroid();
  const dispatchOriginSelected = useStore(state => state.dispatchOriginSelected);
  const [ previousOrigin, setPreviousOrigin ] = useState(null);

  const scanStatusDesc = () => {
    if ([ 'startScanInProgress', 'startScanCompleted', 'finalizeScanInProgress' ].includes(scanStatus)) {
      return 'Scan in progress...';
    } else if (asteroid.data.scanning) {
      return 'Scan in progress...';
    } else if (asteroid.data.scanned) {
      return 'Scan completed'
    } else {
      return 'Un-scanned'
    }
  };

  const bonusElement = (b) => {
    let bonus = b.base;
    const hasResourceType = b.spectralTypes.includes(asteroid.data.spectralType);

    if (hasResourceType) {
      const found = asteroid.data.bonuses.find(f => f.type === b.base.type);
      if (found) bonus = found;
    }

    return (
      <Bonus key={b.base.type}>
        <BonusBars visible={hasResourceType}>
          <BonusBar on={bonus.level >= 3} level={bonus.level} />
          <BonusBar on={bonus.level >= 2} level={bonus.level} />
          <BonusBar on={bonus.level >= 1} level={bonus.level} />
        </BonusBars>
        <StyledBonusBadge visible={hasResourceType} bonus={bonus} />
        <BonusDesc>
          <span>{resourceNames[bonus.type]}</span>
          {hasResourceType && <span>{`+${bonus.modifier}%`}</span>}
          {!hasResourceType && <span>None present</span>}
        </BonusDesc>
      </Bonus>
    );
  };

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  useEffect(() => {
    if (asteroid.data?.i) history.push(`/asteroids/${asteroid.data.i}`);
  }, [ asteroid.data ]);

  // Checks for a origin -> null transition to close the view
  useEffect(() => {
    if (previousOrigin && !origin) history.push('/');
    if (asteroid.data) setPreviousOrigin(asteroid.data.i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ origin, asteroid ]);

  const goToOpenSeaAsteroid = (i) => {
    const url = `${process.env.REACT_APP_OPEN_SEA_URL}/assets/${process.env.REACT_APP_CONTRACT_ASTEROID_TOKEN}/{i}`;
    window.open(url, '_blank');
  };

  return (
    <Details
      title={asteroid.data ? `${asteroid.data.name} Details` : 'Asteroid Details'}>
      {asteroid.data && (
        <StyledAsteroidDetails>
          <SidePanel>
            <Rarity rarity={utils.toRarity(asteroid.data.bonuses)}>
              <div />
              <span>{utils.toRarity(asteroid.data.bonuses)}</span>
            </Rarity>
            <DataReadout label="Owner" data={formatters.assetOwner(asteroid.data.owner)} />
            {sale && !asteroid.data.owner && (
              <DataReadout label="Price" data={
                asteroidPrice.data ? `${ethersUtils.formatEther(asteroidPrice.data)} ETH` : '... ETH'
              } />
            )}
            <DataReadout label="Scan Status" data={scanStatusDesc()} />
            {asteroid.data.owner && !asteroid.data.scanned && (
              <DataReadout label="Scanning Boost" data={formatters.scanningBoost(asteroid.data.purchaseOrder)} />
            )}
            {!asteroid.data.owner && (
              <StyledButton
                data-tip="Purchase development rights"
                data-for="global"
                disabled={!account || !sale || !asteroidPrice.data}
                onClick={() => buyAsteroid.mutate(asteroid.data.i)}>
                <MdFlag /> Purchase
              </StyledButton>
            )}
            {asteroid.data.owner && (
              <StyledButton
                data-tip="Purchase on OpenSea"
                data-for="global"
                disabled={!asteroidPrice.data}
                onClick={() => goToOpenSeaAsteroid(asteroid.data.i)}>
                <MdFlag /> Purchase
              </StyledButton>
            )}
            {!asteroid.data.scanned && !asteroid.data.scanning && (
              <StyledButton
                data-tip="Scan for resource bonuses"
                data-for="global"
                onClick={() => startScan.mutate(asteroid.data.i)}
                disabled={asteroid.data.owner !== account}>
                <MdBlurOff /> Start Scan
              </StyledButton>
            )}
            {!asteroid.data.scanned && asteroid.data.scanning && (
              <StyledButton
                data-tip="Retrieve scan results"
                data-for="global"
                onClick={() => finalizeScan.mutate(asteroid.data.i)}
                disabled={asteroid.data.owner !== account}>
                <MdBlurOff /> Finalize Scan
              </StyledButton>
            )}
            <StyledButton
              data-tip="Update asteroid name"
              data-for="global"
              disabled={asteroid.data.owner !== account}>
              <AiFillEdit /> Name
            </StyledButton>
            <Log>
              <span>Log</span>
            </Log>
          </SidePanel>
          <MainPanel>
            <Resources>
              <ResourceMix>
              </ResourceMix>
              <Bonuses>{utils.BONUS_MAPS.map(b => bonusElement(b))}</Bonuses>
            </Resources>
            <Dimensions>
              <Dimension>
                <StyledDataReadout label="Orbital Period" data={formatters.period(asteroid.data.orbital.a)} />
              </Dimension>
              <Dimension>
                <StyledDataReadout label="Semi-major Axis" data={formatters.axis(asteroid.data.orbital.a)} />
              </Dimension>
              <Dimension>
                <StyledDataReadout label="Inclination" data={formatters.inclination(asteroid.data.orbital.i)} />
              </Dimension>
              <Dimension>
                <StyledDataReadout label="Eccentricity" data={asteroid.data.orbital.e} />
              </Dimension>
              <Dimension>
                <StyledDataReadout label="Radius" data={formatters.radius(asteroid.data.radius)} />
              </Dimension>
              <Dimension>
                <StyledDataReadout label="Surface Area" data={formatters.surfaceArea(asteroid.data.radius)} />
              </Dimension>
            </Dimensions>
          </MainPanel>
        </StyledAsteroidDetails>
      )}
    </Details>
  );
};

export default AsteroidDetails;
