import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import { Group, Vector3 } from 'three';
import styled from 'styled-components';
import utils from 'influence-utils';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroid from '~/hooks/useAsteroid';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useCreateReferral from '~/hooks/useCreateReferral';
import useScanAsteroid from '~/hooks/useScanAsteroid';
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
import { DownloadModelIcon, EditIcon, CheckCircleIcon, ClaimIcon, ScanIcon, SwayIcon } from '~/components/Icons';
import QuadtreeTerrainCube from '~/game/scene/asteroid/helpers/QuadtreeTerrainCube';
import ResourceMix from './asteroidDetails/ResourceMix';
import ResourceBonuses from './asteroidDetails/ResourceBonuses';
import Dimensions from './asteroidDetails/Dimensions';
import ReactTooltip from 'react-tooltip';

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
  UNSCANNED: 'Scanning requires two steps which *must* be mined within ~45 minutes of each other. ' +
    'Combined cost is under 140,000 gas.',
  SCANNING: 'Scan in progress. Waiting for scan to be ready for retrieval...',
  SCAN_READY: 'Scan ready for retrieval. You *must* finalize scan and have transaction mined ' +
    'within 256 block (~45 minutes).',
  RETRIEVING: 'Retrieving resource scan results...'
};

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const { account } = useWeb3React();
  const { data: sale } = useSale();
  const { data: asteroid } = useAsteroid(Number(i));
  const createReferral = useCreateReferral(Number(i));
  const { buyAsteroid, buying } = useBuyAsteroid(Number(i));
  const { nameAsteroid, naming } = useNameAsteroid(Number(i));
  const { startAsteroidScan, finalizeAsteroidScan, scanStatus } = useScanAsteroid(asteroid);

  const saleIsActive = useStore(s => s.sale);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const webWorkerPool = useWebWorker();

  const [ newName, setNewName ] = useState('');
  const [ exportingModel, setExportingModel ] = useState(false);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  // on asteroid change, reset name input field on asteroid change
  useEffect(() => {
    setNewName('');
  }, [i]);

  const updateAsteroidName = useCallback(() => {
    if (newName) {
      nameAsteroid(newName);
    }
  }, [nameAsteroid, newName]);

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;

    setExportingModel(true);
    const exportable = new Group();
    const manager = new QuadtreeTerrainCube(
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

      exportGLTF(exportable, `asteroid_${asteroid.asteroidId}`, () => {

        // dispose of resources
        manager.groups.forEach((g) => exportable.remove(g));
        manager.dispose();

        // restore button state
        setExportingModel(false);
      });
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asteroid, exportingModel]);

  const goToOpenSeaAsteroid = useCallback((i) => {
    const url = `${process.env.REACT_APP_OPEN_SEA_URL}/assets/${process.env.REACT_APP_CONTRACT_ASTEROID_TOKEN}/${i}`;
    window.open(url, '_blank');
  }, []);

  const claimableSway = useMemo(() => {
    if (!asteroid) return 0;
    if (!asteroid.purchaseOrder || asteroid.purchaseOrder > 11100) return 0;
    if (asteroid.creditClaimed) return 0;
    const factor = BigInt('231808622658467920000'); // 4 * PI * 2^64
    const radius = BigInt(asteroid.r.toString());
    const area = (factor * (radius * radius)) / BigInt('1000000'); // area convert m2 to km2
    return Number((area / BigInt('18446744073709552000')) * BigInt('6922'));
  }, [asteroid]);
  
  useEffect(() => ReactTooltip.rebuild(), []);

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
                {scanStatus === 'UNSCANNED' && 'Un-scanned'}
                {scanStatus === 'SCANNING' && 'Starting scan...'}
                {scanStatus === 'SCAN_READY' && 'Awaiting scan results...'}
                {scanStatus === 'RETRIEVING' && 'Retrieving scan results...'}
                {scanStatus === 'RETRIEVED' && 'Scan complete'}
                {scanStatus === 'ABANDONED' && '(results unclaimed)'}
              </GeneralData>
              {asteroid.owner && !asteroid.scanned && (
                <GeneralData label="Scanning Boost">
                  {formatters.scanningBoost(asteroid.purchaseOrder)}
                </GeneralData>
              )}
              <GeneralData label="Size">{utils.toSize(asteroid.r)}</GeneralData>
              <GeneralData label="Claimable SWAY">
                {asteroid?.creditClaimed
                  ? `CLAIMED`
                  : <><SwayIcon /> {(claimableSway || 0).toLocaleString()}</>
                }
              </GeneralData>
            </Pane>
            <Pane>
              <Subtitle>Manage Asteroid</Subtitle>
              {sale && !asteroid.owner && (
                <span
                  data-for="global"
                  data-place="right"
                  data-tip={(
                    !account
                      ? 'Connect your Wallet to Purchase'
                      : (
                        !saleIsActive
                          ? 'Asteroid sales are currently inactive'
                          : 'Purchase development rights'
                      )
                  )}
                  style={{ marginTop: 15, width: 175 }}>
                  <Button
                    disabled={!account || !saleIsActive || buying}
                    loading={buying}
                    onClick={() => {
                      buyAsteroid();
                      createReferral.mutate();
                    }}
                    style={{ display: 'inline-flex', marginTop: 0 }}>
                    <ClaimIcon /> Purchase
                  </Button>
                </span>
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
              {asteroid.owner && asteroid.owner === account && !asteroid.scanned && (
                <Form
                  title={<><ScanIcon /><span>Resource Scan</span></>}
                  data-tip="Scan surface for resources"
                  data-for="global"
                  loading={[ 'SCANNING', 'RETRIEVING' ].includes(scanStatus)}>
                  <Text>{scanMessages[scanStatus]}</Text>
                  {[ 'UNSCANNED', 'SCANNING' ].includes(scanStatus) && (
                    <Button
                      data-tip="Scan for resource bonuses"
                      data-for="global"
                      onClick={() => startAsteroidScan()}
                      loading={scanStatus === 'SCANNING'}
                      disabled={asteroid.owner !== account || scanStatus === 'SCANNING'}>
                      <ScanIcon /> Start Scan
                    </Button>
                  )}
                  {[ 'SCAN_READY', 'RETRIEVING' ].includes(scanStatus) && (
                    <Button
                      data-tip="Retrieve scan results"
                      data-for="global"
                      onClick={() => finalizeAsteroidScan()}
                      loading={scanStatus === 'RETRIEVING'}
                      disabled={asteroid.owner !== account || scanStatus === 'RETRIEVING'}>
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
                      disabled={naming}
                      initialValue=""
                      pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                      resetOnChange={i}
                      onChange={(v) => setNewName(v)} />
                    <IconButton
                      data-tip="Submit"
                      data-for="global"
                      disabled={naming}
                      onClick={updateAsteroidName}>
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
