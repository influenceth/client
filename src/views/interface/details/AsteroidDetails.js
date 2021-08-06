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
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';
import Ether from '~/components/Ether';
import ResourceBonuses from './asteroidDetails/ResourceBonuses';
import Dimensions from './asteroidDetails/Dimensions';
import formatters from '~/lib/formatters';

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
                  asteroidPrice ? <>{ethersUtils.formatEther(asteroidPrice)} <Ether /></> : <>... <Ether /></>
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
              <ResourceBonuses asteroid={asteroid} />
            </Resources>
            <Dimensions asteroid={asteroid} />
          </MainPanel>
        </StyledAsteroidDetails>
      )}
    </Details>
  );
};

export default AsteroidDetails;
