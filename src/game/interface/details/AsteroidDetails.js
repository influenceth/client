import { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import { Group, Vector3 } from 'three';
import styled from 'styled-components';
import utils from 'influence-utils';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroid from '~/hooks/useAsteroid';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useCreateReferral from '~/hooks/useCreateReferral';
import useStartAsteroidScan from '~/hooks/useStartAsteroidScan';
import useFinalizeAsteroidScan from '~/hooks/useFinalizeAsteroidScan';
import useNameAsteroid from '~/hooks/useNameAsteroid';
import useWebWorker from '~/hooks/useWebWorker';
import Config from '~/lib/asteroidConfig';
import constants from '~/lib/constants';
import formatters from '~/lib/formatters';
import exportGLTF from '~/lib/graphics/exportGLTF';

import Details from '~/components/Details';
import Form from '~/components/Form';
import Text from '~/components/Text';
import Button from '~/components/Button';
import TextInput from '~/components/TextInput';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';
import Ether from '~/components/Ether';
import AddressLink from '~/components/AddressLink';
import { DownloadModelIcon, EditIcon, CheckCircleIcon, ClaimIcon, ScanIcon } from '~/components/Icons';
import QuadtreeCubeSphere from '~/game/scene/asteroid/helpers/QuadtreeCubeSphere';
import ResourceMix from './asteroidDetails/ResourceMix';
import ResourceBonuses from './asteroidDetails/ResourceBonuses';
import Dimensions from './asteroidDetails/Dimensions';

const StyledAsteroidDetails = styled.div`
  align-items: stretch;
  display: flex;
  height: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex-direction: column;
  }
`;

const SidePanel = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 325px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
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
  margin-top: 15px;

  & input {
    margin-right: 10px;
  }
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

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
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

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
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

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1 1 0;
    max-width: 100%;
  }
`;

const scanMessages = {
  unscanned: 'Scanning requires two steps which *must* be mined within ~45 minutes of each other. ' +
    'Combined cost is under 140,000 gas.',
  scanning: 'Scan in progress. Waiting for scan to be ready for retrieval...',
  scanned: 'Scan ready for retrieval. You *must* finalize scan and have transaction mined ' +
    'within 256 block (~45 minutes).',
  retrieving: 'Retrieving resource scan results...'
};

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();
  const { data: sale } = useSale();
  const { data: asteroid } = useAsteroid(Number(i));
  const buyAsteroid = useBuyAsteroid(Number(i));
  const createReferral = useCreateReferral(Number(i));
  const startScan = useStartAsteroidScan(Number(i));
  const finalizeScan = useFinalizeAsteroidScan(Number(i));
  const nameAsteroid = useNameAsteroid(Number(i));
  const saleIsActive = useStore(s => s.sale);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const webWorkerPool = useWebWorker();

  const [ buying, setBuying ] = useState(false);
  const [ naming, setNaming ] = useState(false);
  const [ newName, setNewName ] = useState('');
  const [ scanStatus, setScanStatus ] = useState('unscanned');
  const [ exportingModel, setExportingModel ] = useState(false);

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

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;

    setExportingModel(true);
    const exportable = new Group();
    const manager = new QuadtreeCubeSphere(
      asteroid.asteroidId,
      new Config(asteroid),
      constants.MODEL_EXPORT_RESOLUTION,
      webWorkerPool
    );
    manager.groups.forEach((g) => exportable.add(g));
    manager.setCameraPosition(new Vector3(0, 0, constants.AU));  // make sure one quad per side

    const waitUntilReady = (callback) => {
      if (manager.builder.isPreparingUpdate()) {
        if (!manager.builder.isReadyToFinish()) {
          manager.builder.updateMaps();
        } else {
          manager.builder.update();
          callback();
        }
      }
      setTimeout(waitUntilReady, 100, callback);
    };
    new Promise(waitUntilReady).then(() => {
      Object.values(manager.chunks).forEach(({ chunk }) => {
        chunk.makeExportable();
      });

      exportGLTF(exportable, `asteroid_${i}`, () => {

        // dispose of resources
        manager.groups.forEach((g) => exportable.remove(g));
        manager.dispose();

        // restore button state
        setExportingModel(false);
      });
    });
  }, [asteroid, exportingModel]);

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
                  <span>{formatters.asteroidPrice(asteroid.r, sale)} <Ether /></span>
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
              <GeneralData label="Size">{utils.toSize(asteroid.r)}</GeneralData>
            </Pane>
            <Pane>
              <Subtitle>Manage Asteroid</Subtitle>
              {sale && !asteroid.owner && (
                <Button
                  data-tip="Purchase development rights"
                  data-for="global"
                  disabled={!account || !saleIsActive}
                  loading={buying}
                  onClick={() => {
                    setBuying(true);
                    buyAsteroid.mutate(null, { onSettled: () => setBuying(false) });
                    createReferral.mutate();
                  }}>
                  <ClaimIcon /> Purchase
                </Button>
              )}
              {asteroid.owner && asteroid.owner !== account && (
                <Button
                  data-tip="Purchase on OpenSea"
                  data-for="global"
                  onClick={() => goToOpenSeaAsteroid(asteroid.i)}>
                  <ClaimIcon /> Purchase
                </Button>
              )}
              {asteroid.owner && asteroid.owner === account && (
                <Button
                  data-tip="List on OpenSea"
                  data-for="global"
                  onClick={() => goToOpenSeaAsteroid(asteroid.i)}>
                  <ClaimIcon /> List for Sale
                </Button>
              )}
              {asteroid.owner && asteroid.owner === account && scanStatus !== 'retrieved' && (
                <Form
                  title={<><ScanIcon /><span>Resource Scan</span></>}
                  data-tip="Scan surface for resources"
                  data-for="global"
                  loading={[ 'scanning', 'retrieving' ].includes(scanStatus)}>
                  <Text>{scanMessages[scanStatus]}</Text>
                  {[ 'unscanned', 'scanning' ].includes(scanStatus) && (
                    <Button
                      data-tip="Scan for resource bonuses"
                      data-for="global"
                      onClick={() => startScan.mutate()}
                      loading={scanStatus === 'scanning'}
                      disabled={asteroid.owner !== account || scanStatus === 'scanning'}>
                      <ScanIcon /> Start Scan
                    </Button>
                  )}
                  {[ 'scanned', 'retrieving' ].includes(scanStatus) && (
                    <Button
                      data-tip="Retrieve scan results"
                      data-for="global"
                      onClick={() => finalizeScan.mutate()}
                      loading={scanStatus === 'retrieving'}
                      disabled={asteroid.owner !== account || scanStatus === 'retrieving'}>
                      <ScanIcon /> Finalize Scan
                    </Button>
                  )}
                </Form>
              )}
              {asteroid.owner && asteroid.owner === account && (
                <Form
                  title={<><EditIcon /><span>Change Name</span></>}
                  data-tip="Update asteroid name"
                  data-for="global"
                  loading={naming}>
                  <Text>Names must be unique, and can only include letters, numbers, and single spaces.</Text>
                  <NameForm>
                    <TextInput
                      pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                      initialValue=""
                      disabled={naming}
                      onChange={(v) => setNewName(v)} />
                    <IconButton
                      data-tip="Submit"
                      data-for="global"
                      onClick={() => {
                        setNaming(true);
                        nameAsteroid.mutate({ name: newName }, { onSettled: () => setNaming(false) });
                      }}>
                      <CheckCircleIcon />
                    </IconButton>
                  </NameForm>
                </Form>
              )}
              {asteroid.owner && asteroid.owner === account && (
                <Button
                  data-tip="Download 3d Model"
                  data-for="global"
                  disabled={exportingModel}
                  loading={exportingModel}
                  onClick={download3dModel}>
                  <DownloadModelIcon /> Download Model
                </Button>
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
