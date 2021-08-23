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
import useStartAsteroidScan from '~/hooks/useStartAsteroidScan';
import useFinalizeAsteroidScan from '~/hooks/useFinalizeAsteroidScan';
import useNameAsteroid from '~/hooks/useNameAsteroid';
import Details from '~/components/Details';
import Button from '~/components/Button';
import TextInput from '~/components/TextInput';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';
import Ether from '~/components/Ether';
import AddressLink from '~/components/AddressLink';
import ResourceMix from './asteroidDetails/ResourceMix';
import ResourceBonuses from './asteroidDetails/ResourceBonuses';
import Dimensions from './asteroidDetails/Dimensions';
import formatters from '~/lib/formatters';

const StyledAsteroidDetails = styled.div`
  align-items: stretch;
  display: flex;
  height: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const SidePanel = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 325px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    padding: 15px;
    width: 100%;
  }
`;

const Rarity = styled.div`
  display: flex;
  margin: 10px 15px;

  & span {
    color: ${p => p.theme.colors.rarity[p.rarity]};
    font-size: ${p => p.theme.fontSizes.featureText};
    line-height: ${p => p.theme.fontSizes.featureText};
    margin-left: 10px;
  }

  & div {
    background-color: ${p => p.theme.colors.rarity[p.rarity]};
    border-radius: 50%;
    height: ${p => p.theme.fontSizes.featureText};
    width: ${p => p.theme.fontSizes.featureText};
  }
`;

const Subtitle = styled.h2`
  border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
  font-size: 18px;
  height: 40px;
  line-height: 40px;
  margin: 10px 0 0 0;
`;

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 0 20px 15px;
`;

const GeneralData = styled(DataReadout)`
  margin: 5px 0;
`;

const NameForm = styled.div`
  display: flex;
  margin: 15px 20px 0 20px;

  & input {
    margin-right: 10px;
  }
`;

const StyledButton = styled(Button)`
  margin-top: 15px;
  width: 150px;
`;

const Log = styled.div`
  flex: 0 1 33%;

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

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    padding: 15px;
    margin: 0;
    width: 100%;
  }
`;

const Resources = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
  display: flex;
  flex: 0 1 40%;
  padding-bottom: 20px;
  max-height: 40%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    flex-direction: column;
    max-height: none;
  }
`;

const StyledResourceMix = styled(ResourceMix)`
  align-items: center;
  display: flex;
  flex: 0 1 33%;
  margin: 20px 25px;
  justify-content: center;
  max-width: 33%;

  & svg {
    flex: 1 1 0;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    flex: 1 1 0;
    max-width: 100%;
  }
`;

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();
  const sale = useSale();
  const { data: asteroid } = useAsteroid(Number(i));
  const { data: asteroidPrice } = useAsteroidPrice(asteroid);
  const buyAsteroid = useBuyAsteroid(Number(i));
  const startScan = useStartAsteroidScan(Number(i));
  const finalizeScan = useFinalizeAsteroidScan(Number(i));
  const nameAsteroid = useNameAsteroid(Number(i));
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const [ naming, setNaming ] = useState(false);
  const [ newName, setNewName ] = useState('');
  const [ scanStatus, setScanStatus ] = useState('unscanned');

  useEffect(() => {
    if (finalizeScan.isSuccess) {
      setScanStatus('retrieved');
    } else if (finalizeScan.isLoading) {
      setScanStatus('retrieving')
    } else if (startScan.isSuccess) {
      setScanStatus('scanned');
    } else if (startScan.isLoading) {
      setScanStatus('scanning');
    } else if (asteroid?.scanned) {
      setScanStatus('retrieved');
    } else if (asteroid?.scanning) {
      setScanStatus('scanned');
    } else {
      setScanStatus('unscanned');
    }
  }, [ startScan, finalizeScan, asteroid?.scanning, asteroid?.scanned ]);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  useEffect(() => {
    if (asteroid?.i) {
      const url = `/asteroids/${asteroid.i}`;
      if (history.pathname === url) return;
      history.push(url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroid ]);

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
            <Pane>
              <Subtitle>Asteroid Info</Subtitle>
              <GeneralData label="Owner"><AddressLink address={asteroid.owner} /></GeneralData>
              {sale && !asteroid.owner && (
                <GeneralData label="Price">
                  {asteroidPrice && <>{ethersUtils.formatEther(asteroidPrice)} <Ether /></>}
                  {!asteroidPrice && <>... <Ether /></>}
                </GeneralData>
              )}
              <GeneralData label="Scan Status">
                {scanStatus === 'unscanned' && 'Un-scanned'}
                {scanStatus === 'scanning' && 'Starting scan...'}
                {scanStatus === 'scanned' && 'Awaiting scan results...'}
                {scanStatus === 'retrieving' && 'Retrieving scan results...'}
                {scanStatus === 'retrieved' && 'Scan complete'}
              </GeneralData>
              {asteroid.owner && !asteroid.scanned && (
                <GeneralData label="Scanning Boost">
                  {formatters.scanningBoost(asteroid.purchaseOrder)}
                </GeneralData>
              )}
            </Pane>
            <Pane>
              <Subtitle>Manage Asteroid</Subtitle>
              {!asteroid.owner && (
                <StyledButton
                  data-tip="Purchase development rights"
                  data-for="global"
                  disabled={!account || !sale || !asteroidPrice}
                  onClick={() => buyAsteroid.mutate()}>
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
              {[ 'unscanned', 'scanning' ].includes(scanStatus) && (
                <StyledButton
                  data-tip="Scan for resource bonuses"
                  data-for="global"
                  onClick={() => startScan.mutate()}
                  disabled={asteroid.owner !== account || scanStatus === 'scanning'}>
                  <MdBlurOff /> Start Scan
                </StyledButton>
              )}
              {[ 'scanned', 'retrieving' ].includes(scanStatus) && (
                <StyledButton
                  data-tip="Retrieve scan results"
                  data-for="global"
                  onClick={() => finalizeScan.mutate()}
                  disabled={asteroid.owner !== account || scanStatus === 'retrieving'}>
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
                      nameAsteroid.mutate({ name: newName });
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
            </Pane>
            <Pane>
              <Subtitle>Asteroid Events</Subtitle>
              <Log>
                <ul>
                  {asteroid.events.map(e => (
                    <LogEntry key={e.transactionHash} type={`Asteroid_${e.event}`} data={e} />
                  ))}
                </ul>
              </Log>
            </Pane>
          </SidePanel>
          <MainPanel>
            <Resources>
              <StyledResourceMix spectralType={asteroid.spectralType} />
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
