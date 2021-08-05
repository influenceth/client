import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import utils from 'influence-utils';
import { utils as ethersUtils } from 'ethers';
import { MdFlag, MdBlurOff, MdClose } from 'react-icons/md';
import { BsCheckCircle } from 'react-icons/bs';
import { AiFillEdit } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidPrice from '~/hooks/useAsteroidPrice';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useScanAsteroid from '~/hooks/useScanAsteroid';
import useNameAsteroid from '~/hooks/useNameAsteroid';
import Details from '~/components/Details';
import Button from '~/components/Button';
import TextInput from '~/components/TextInput';
import IconButton from '~/components/IconButton';
import BonusBadge from '~/components/BonusBadge';
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';
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
  margin: 10px 15px;

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

const Subtitle = styled.h2`
  border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
  font-size: 18px;
  height: 40px;
  line-height: 40px;
  margin: 10px 0 0 0;
  padding-left: 15px;
`;

const Data = styled.div`
  display: flex;
  flex-direction: column;
  margin: 20px 10px 5px 15px;
`;

const GeneralData = styled(DataReadout)`
  margin: 5px 0;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const NameForm = styled.div`
  display: flex;
  margin: 15px 20px 0 20px;

  & input {
    margin-right: 10px;
  }
`;

const StyledButton = styled(Button)`
  margin: 15px 20px 0 20px;
`;

const Log = styled.div`
  flex: 0 1 33%;
  min-height: 300px;

  & ul {
    display: flex;
    flex-direction: column-reverse;
    list-style-type: none;
    margin: 10px 0 0 5px;
    overflow-y: hidden;
    padding: 0;
  }
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
    if (props.shown) return props.theme.colors.bonus[`level${props.level}`];
    if (!props.shown) return props.theme.colors.disabledText;
  }};
  border-radius: 2px;
  height: 12px;
  margin-bottom: 2px;
  width: 15px;
`;

const StyledBonusBadge = styled(BonusBadge)`
  flex: 0 1 auto;
  margin: 0 8px;
  height: 30px;
  width: 30px;
`;

const BonusDesc = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.detailText};

  & span {
    margin-bottom: 5px;
  }

  & span:last-child {
    font-size: ${props => props.theme.fontSizes.mainText};
  }
`;

const Dimensions = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0 auto;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 20px;
`;

const Dimension = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 32%;
  flex-direction: column;
  justify-content: center;
`;

const DimensionIcon = styled.svg`
  fill: transparent;
  flex: 0 1 auto;
  stroke: white;
  margin-bottom: 10px;
  max-width: 100px;
`;

const DimensionData = styled(DataReadout)`
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.detailText};
`;

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();
  const sale = useSale();
  const origin = useStore(state => state.asteroids.origin);
  const { data: asteroid } = useAsteroid(origin);
  const { data: asteroidPrice } = useAsteroidPrice(asteroid);
  const buyAsteroid = useBuyAsteroid();
  const { startScan, finalizeScan, status: scanStatus } = useScanAsteroid();
  const nameAsteroid = useNameAsteroid();
  const dispatchOriginSelected = useStore(state => state.dispatchOriginSelected);
  const [ previousOrigin, setPreviousOrigin ] = useState(null);
  const [ naming, setNaming ] = useState(false);
  const [ newName, setNewName ] = useState('');

  const scanStatusDesc = () => {
    if ([ 'startScanInProgress', 'startScanCompleted', 'finalizeScanInProgress' ].includes(scanStatus)) {
      return 'Scan in progress...';
    } else if (asteroid.scanning) {
      return 'Scan in progress...';
    } else if (asteroid.scanned) {
      return 'Scan completed'
    } else {
      return 'Un-scanned'
    }
  };

  const bonusElement = (b) => {
    let bonus = b.base;
    const hasResourceType = b.spectralTypes.includes(asteroid.spectralType);

    if (hasResourceType) {
      const found = asteroid.bonuses.find(f => f.type === b.base.type);
      if (found) bonus = found;
    }

    return (
      <Bonus key={b.base.type}>
        <BonusBars visible={hasResourceType}>
          <BonusBar shown={bonus.level >= 3} level={bonus.level} />
          <BonusBar shown={bonus.level >= 2} level={bonus.level} />
          <BonusBar shown={bonus.level >= 1} level={bonus.level} />
        </BonusBars>
        <StyledBonusBadge visible={hasResourceType} bonus={bonus} />
        <BonusDesc>
          <span>{resourceNames[bonus.type]}</span>
          {hasResourceType && <span>{`+${bonus.modifier}%`}</span>}
          {!hasResourceType && <span>Not present</span>}
        </BonusDesc>
      </Bonus>
    );
  };

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  useEffect(() => {
    if (asteroid?.i) history.push(`/asteroids/${asteroid.i}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroid ]);

  // Checks for a origin -> null transition to close the view
  useEffect(() => {
    if (previousOrigin && !origin) history.push('/');
    if (!!asteroid) setPreviousOrigin(asteroid.i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ origin, asteroid ]);

  const goToOpenSeaAsteroid = (i) => {
    const url = `${process.env.REACT_APP_OPEN_SEA_URL}/assets/${process.env.REACT_APP_CONTRACT_ASTEROID_TOKEN}/${i}`;
    window.open(url, '_blank');
  };

  return (
    <Details
      title={!!asteroid ? `${asteroid.name} - Details` : 'Asteroid Details'}>
      {!!asteroid && (
        <StyledAsteroidDetails>
          <SidePanel>
            <Rarity rarity={utils.toRarity(asteroid.bonuses)}>
              <div />
              <span>{utils.toRarity(asteroid.bonuses)}</span>
            </Rarity>
            <Data>
              <GeneralData label="Owner" data={formatters.assetOwner(asteroid.owner)} />
              {sale && !asteroid.owner && (
                <GeneralData label="Price" data={
                  asteroidPrice ? `${ethersUtils.formatEther(asteroidPrice)} ETH` : '... ETH'
                } />
              )}
              <GeneralData label="Scan Status" data={scanStatusDesc()} />
              {asteroid.owner && !asteroid.scanned && (
                <GeneralData label="Scanning Boost" data={formatters.scanningBoost(asteroid.purchaseOrder)} />
              )}
            </Data>
            <Controls>
              <Subtitle>Manage</Subtitle>
              {!asteroid.owner && (
                <StyledButton
                  data-tip="Purchase development rights"
                  data-for="global"
                  disabled={!account || !sale || !asteroidPrice}
                  onClick={() => buyAsteroid.mutate({ i: asteroid.i })}>
                  <MdFlag /> Purchase
                </StyledButton>
              )}
              {asteroid.owner && asteroid.owner !== account && (
                <StyledButton
                  data-tip="Purchase on OpenSea"
                  data-for="global"
                  disabled={!asteroidPrice}
                  onClick={() => goToOpenSeaAsteroid(asteroid.i)}>
                  <MdFlag /> Purchase
                </StyledButton>
              )}
              {asteroid.owner === account && (
                <StyledButton
                  data-tip="List on OpenSea"
                  data-for="global"
                  disabled={!asteroidPrice}
                  onClick={() => goToOpenSeaAsteroid(asteroid.i)}>
                  <MdFlag /> List for Sale
                </StyledButton>
              )}
              {!asteroid.scanned && !asteroid.scanning && (
                <StyledButton
                  data-tip="Scan for resource bonuses"
                  data-for="global"
                  onClick={() => startScan.mutate({ i: asteroid.i })}
                  disabled={asteroid.owner !== account || scanStatus === 'startScanInProgress'}>
                  <MdBlurOff /> Start Scan
                </StyledButton>
              )}
              {!asteroid.scanned && asteroid.scanning && (
                <StyledButton
                  data-tip="Retrieve scan results"
                  data-for="global"
                  onClick={() => finalizeScan.mutate({ i: asteroid.i })}
                  disabled={asteroid.owner !== account}>
                  <MdBlurOff /> Finalize Scan
                </StyledButton>
              )}
              <StyledButton
                data-tip="Update asteroid name"
                data-for="global"
                onClick={() => setNaming(true)}
                disabled={asteroid.owner !== account || naming}>
                <AiFillEdit /> Name
              </StyledButton>
              {naming && (
                <NameForm>
                  <TextInput
                    pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                    initialValue=""
                    onChange={(v) => setNewName(v)} />
                  <IconButton
                    data-tip="Submit"
                    data-for="global"
                    onClick={() => {
                      nameAsteroid.mutate({ i: asteroid.i, name: newName });
                      setNewName('');
                      setNaming(false);
                    }}>
                    <BsCheckCircle />
                  </IconButton>
                  <IconButton
                    data-tip="Cancel"
                    data-for="global"
                    onClick={() => setNaming(false)}>
                    <MdClose />
                  </IconButton>
                </NameForm>
              )}
            </Controls>
            <Log>
              <Subtitle>Logs</Subtitle>
              <ul>
                {asteroid.events.map(e => <LogEntry key={e.transactionHash} type={'asteroid'} tx={e} />)}
              </ul>
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
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Orbital Period" data={formatters.period(asteroid.orbital.a)} />
              </Dimension>
              <Dimension>
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Semi-major Axis" data={formatters.axis(asteroid.orbital.a)} />
              </Dimension>
              <Dimension>
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Inclination" data={formatters.inclination(asteroid.orbital.i)} />
              </Dimension>
              <Dimension>
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Eccentricity" data={asteroid.orbital.e} />
              </Dimension>
              <Dimension>
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Radius" data={formatters.radius(asteroid.radius)} />
              </Dimension>
              <Dimension>
                <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" />
                </DimensionIcon>
                <DimensionData label="Surface Area" data={formatters.surfaceArea(asteroid.radius)} />
              </Dimension>
            </Dimensions>
          </MainPanel>
        </StyledAsteroidDetails>
      )}
    </Details>
  );
};

export default AsteroidDetails;
