import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AmbientLight,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  LinearMipMapLinearFilter,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import styled from 'styled-components';
import utils from 'influence-utils';
import { Canvas, useThree } from '@react-three/fiber';
import { Address } from 'influence-utils';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import useAsteroid from '~/hooks/useAsteroid';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useCreateReferral from '~/hooks/useCreateReferral';
import useScanAsteroid from '~/hooks/useScanAsteroid';
import useNameAsteroid from '~/hooks/useNameAsteroid';
import useWebWorker from '~/hooks/useWebWorker';
import constants from '~/lib/constants';
import formatters from '~/lib/formatters';
import exportGLTF from '~/lib/graphics/exportGLTF';

import Details from '~/components/DetailsModal';
import StaticForm from '~/components/StaticForm';
import Text from '~/components/Text';
import Button from '~/components/ButtonAlt';
import TextInput from '~/components/TextInput';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';
import MarketplaceLink from '~/components/MarketplaceLink';
import Ether from '~/components/Ether';
import AddressLink from '~/components/AddressLink';
import {
  CheckCircleIcon,
  EccentricityIcon,
  EditIcon,
  InclinationIcon, 
  OrbitalPeriodIcon,
  RadiusIcon,
  SemiMajorAxisIcon,
  SurfaceAreaIcon
} from '~/components/Icons';
import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import ResourceMix from './ResourceMix';
import ResourceBonuses from './ResourceBonuses';
import Dimensions from './Dimensions';
import theme from '~/theme';
import RenderedAsteroid from './RenderedAsteroid';

const paneStackBreakpoint = 720;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-right: 4px;
  & > div {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  @media (max-width: ${paneStackBreakpoint}px) {
    display: block;
    height: auto;
    & > div {
      height: auto;
    }
  }
`;
const BasicPane = styled.div`
  flex: 0 1 540px;
  overflow: hidden;
  padding-top: 30px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1;
  }
`;
const DetailPane = styled.div`
  flex: 2;
  margin-left: 30px;
  padding-top: 40px;
  & > div:first-child {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1;
  }

  @media (max-width: ${p => paneStackBreakpoint}px) {
    margin-left: 0;
    & > div:first-child {
      flex: 0;
    }
  }
`;
const GraphicSection = styled.div`
  flex: 1;
  min-height: 150px;
  @media (max-width: ${paneStackBreakpoint}px) {
    min-height: unset;
  }
`;
const GraphicWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
`;
const Graphic = styled.div`
  padding-top: 100%;
  position: relative;
  width: 100%;
  & > * {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
`;
const Composition = styled.div`
  & > svg {
    height: 100%;
    width: 100%;
  }
`;
const GraphicData = styled.div`
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  font-size: 20px;
  justify-content: center;
  & b {
    color: white;
  }
  & div {
    margin: 8px 0;
  }
  & div {
    text-transform: uppercase;
  }
`;

const AsteroidName = styled.div`
  background: black;
  border: 1px solid ${p => p.theme.colors.borderBottom};
  border-radius: 1em;
  color: white;
  font-size: 28px;
  padding: 4px 12px;
  text-align: center;
  text-transform: none !important;
  min-width: 60%;
`;

const Attributes = styled.div`
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: -12px;
  & > div {
    align-items: center;
    display: flex;
    border-bottom: 1px solid ${p => p.theme.colors.borderBottomAlt};
    margin-bottom: 12px;
    max-width: 48%;
    padding: 6px 0;
    width: 360px;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 150%;
      margin-right: 10px;
    }
    & > label {
      flex: 1;
      white-space: nowrap;
    }
    & > span {
      color: white;
      white-space: nowrap;
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background: transparent;
  }
  @media (min-width: 800px) and (max-width: 1140px) {
    & > div {
      & > label { display: none; }
      & > span { flex: 1; text-align: center; }
    }
  }
  @media (min-width: ${paneStackBreakpoint + 1}px) and (max-width: 799px) {
    & > div {
      max-width: none;
      width: 100%;
    }
  }
  @media (max-width: 520px) {
    & > div {
      max-width: none;
      width: 100%;
    }
  }
`;

const SectionHeader = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.borderBottom};
  color: white;
  font-size: 125%;
  padding-bottom: 4px;
`;

const SectionBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  overflow: hidden;
  position: relative;
  @media (max-width: ${paneStackBreakpoint}px) {
    overflow: visible;
  }
`;

const ModelButton = styled(Button)`
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const HighlightOwnership = styled.div`
  font-size: 115%;
  font-weight: bold;
  color: ${p => p.theme.colors.main};
  margin-top: 0.25em;
  margin-bottom: 1.25em;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  & > button {
    flex: 1;
    max-width: 250px;
    white-space: nowrap;
    &:not(:first-child) {
      margin-left: 6px;
    }
  }
`;

// TODO: componentize this (shared w/ crewmemberdetails)
const breakpoint = 1375;
const LogHeader = styled.ul``;
const Log = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  & ul {
    display: flex;
    flex-direction: column-reverse;
    list-style-type: none;
    margin: 0;
    padding: 5px 0;
  }
  & ${LogHeader} {
    @media (max-width: ${breakpoint}px) {
      display: none;
    }
  }

  & > div {
    border-top: 1px solid ${p => p.theme.colors.borderBottomAlt};
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    & ul {
      margin-right: -5px;
      padding-top: 16px;
      @media (max-width: ${breakpoint}px) {
        margin-right: 0;
      }
    }

    @media (max-width: ${breakpoint}px) {
      border-top: none;
      height: auto;
      max-height: calc(100vh - 200px);
    }
  }

  @media (max-width: ${breakpoint}px) {
    display: block;
    margin: 0 -10px;
  }
`;
const EmptyLogEntry = styled.li`
  padding-top: 50px;
  text-align: center;
`;

const NameForm = styled.div`
  display: flex;
  & input {
    margin-right: 10px;
  }
`;


const AsteroidInformation = ({ asteroid }) => {
  const { account } = useAuth();
  const { data: sale } = useSale();
  const createReferral = useCreateReferral(Number(asteroid.i));
  const { buyAsteroid, buying } = useBuyAsteroid(Number(asteroid.i));
  const { nameAsteroid, naming } = useNameAsteroid(Number(asteroid.i));
  const webWorkerPool = useWebWorker();

  const saleIsActive = useStore(s => s.sale);

  const [exportingModel, setExportingModel] = useState(false);
  const [newName, setNewName] = useState('');
  const [openNameChangeForm, setOpenNameChangeForm] = useState(false);

  const userIsOwner = account && asteroid.owner && Address.areEqual(account, asteroid.owner);

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;
    setExportingModel(true);
    renderDummyAsteroid(asteroid, constants.MODEL_EXPORT_RESOLUTION, webWorkerPool, (asteroidModel, dispose) => {
      exportGLTF(asteroidModel, `asteroid_${asteroid.asteroidId}`, () => {
        try {
          dispose();
        } catch (e) { console.warn(e); }
        setExportingModel(false);
      });
    });
  }, [asteroid, exportingModel]);

  // on asteroid change, reset name input field on asteroid change
  useEffect(() => {
    setNewName('');
    setOpenNameChangeForm(false);
  }, [asteroid.customName]);

  const updateAsteroidName = useCallback(() => {
    if (newName) {
      nameAsteroid(newName);
    }
  }, [nameAsteroid, newName]);

  return (
    <Wrapper>
      <BasicPane>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Asteroid ID#">{asteroid.i}</DataReadout>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Owner">
          <AddressLink address={asteroid.owner} chain={asteroid.chain} />
        </DataReadout>
        <GraphicSection>
          <GraphicWrapper>
            <Graphic>
              <Composition>
                <svg xmlns="http://www.w3.org/2000/svg" width="285" height="249.929" viewBox="0 0 285 249.929">
                  <g id="Ci-type" transform="translate(-0.051 15)">
                    <g id="Group_347" data-name="Group 347" transform="translate(35.598 0)">
                      <g id="Group_343" data-name="Group 343" transform="translate(0)">
                        <path id="Path_271" data-name="Path 271" d="M268.385,468.428a3.826,3.826,0,0,0-3.561-3.813,102.584,102.584,0,0,1,0-204.636,3.826,3.826,0,0,0,3.561-3.812h0a3.828,3.828,0,0,0-4.087-3.824,110.239,110.239,0,0,0,0,219.909,3.828,3.828,0,0,0,4.087-3.824Z" transform="translate(-161.968 -252.333)" fill="#5bc0f5"/>
                        <path id="Path_272" data-name="Path 272" d="M311,256.167h0a3.826,3.826,0,0,0,3.561,3.813,102.584,102.584,0,0,1,0,204.636A3.826,3.826,0,0,0,311,468.428h0a3.828,3.828,0,0,0,4.087,3.824,110.239,110.239,0,0,0,0-219.909A3.828,3.828,0,0,0,311,256.167Z" transform="translate(-196.929 -252.333)" fill="#78d356"/>
                        <path id="Path_288" data-name="Path 288" d="M268.385,468.428a3.826,3.826,0,0,0-3.561-3.813,102.584,102.584,0,0,1,0-204.636,3.826,3.826,0,0,0,3.561-3.812h0a3.828,3.828,0,0,0-4.087-3.824,110.239,110.239,0,0,0,0,219.909,3.828,3.828,0,0,0,4.087-3.824Z" transform="translate(-161.968 -252.333)" fill="#5bc0f5" opacity="0.5"/>
                        <path id="Path_289" data-name="Path 289" d="M311,256.167h0a3.826,3.826,0,0,0,3.561,3.813,102.584,102.584,0,0,1,0,204.636A3.826,3.826,0,0,0,311,468.428h0a3.828,3.828,0,0,0,4.087,3.824,110.239,110.239,0,0,0,0-219.909A3.828,3.828,0,0,0,311,256.167Z" transform="translate(-196.929 -252.333)" fill="#78d356" opacity="0.5"/>
                      </g>
                    </g>
                  </g>
                </svg>
              </Composition>
              <div>
                <Canvas antialias frameloop="demand" style={{ width: '100%', height: '100%' }}>
                  <RenderedAsteroid asteroid={asteroid} webWorkerPool={webWorkerPool} />
                </Canvas>
              </div>
              <GraphicData>
                <div>
                  {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
                </div>
                <AsteroidName>
                  {asteroid.customName ? `\`${asteroid.customName}\`` : asteroid.baseName}
                </AsteroidName>
                <div>
                  {Number(Math.floor(4 * Math.PI * Math.pow(asteroid.radius / 1000, 2))).toLocaleString()} lots
                </div>
              </GraphicData>
            </Graphic>
          </GraphicWrapper>
        </GraphicSection>

        <SectionBody>
          <Attributes>
            <div>
              <OrbitalPeriodIcon />
              <label>Orbital Period</label>
              <span>{formatters.period(asteroid.orbital.a)}</span>
            </div>
            <div>
              <InclinationIcon />
              <label>Inclination</label>
              <span>{formatters.inclination(asteroid.orbital.i)}</span>
            </div>
            <div>
              <SemiMajorAxisIcon />
              <label>Semi-Major Axis</label>
              <span>{formatters.axis(asteroid.orbital.a)}</span>
            </div>
            <div>
              <EccentricityIcon />
              <label>Eccentricity</label>
              <span>{asteroid.orbital.e}</span>
            </div>
            <div>
              <RadiusIcon />
              <label>Radius</label>
              <span>{formatters.radius(asteroid.radius)}</span>
            </div>
            <div>
              <SurfaceAreaIcon />
              <label>Surface Area</label>
              <span>{formatters.surfaceArea(asteroid.radius)}</span>
            </div>
          </Attributes>
        </SectionBody>
      </BasicPane>

      <DetailPane>
        <div>
          <SectionHeader>Asteroid Log</SectionHeader>
          <SectionBody>
            <Log>
              <LogHeader>
                <LogEntry isHeaderRow isTabular css={{ fontSize: '14px' }} />
              </LogHeader>
              <div>
                <ul>
                  {asteroid.events.length > 0
                    ? asteroid.events.map(e => (
                      <LogEntry
                        key={`${e.transactionHash}_${e.logIndex}`}
                        css={{ fontSize: '13px', fontWeight: 'bold', padding: '6px 4px' }}
                        data={{ ...e, i: asteroid.i }}
                        timestampBreakpoint="1400px"
                        type={`Asteroid_${e.event}`}
                        isTabular />
                    ))
                    : <EmptyLogEntry>No logs recorded yet.</EmptyLogEntry>
                  }
                </ul>
              </div>
            </Log>
          </SectionBody>
        </div>

        <div>
          <SectionHeader>Management</SectionHeader>
          <SectionBody>
            {userIsOwner && <HighlightOwnership>You own this asteriod.</HighlightOwnership>}
            <ButtonRow>
              {userIsOwner && (
                <>
                  <StaticForm
                    css={{
                      bottom: 1,
                      height: openNameChangeForm ? 'calc(100% - 10px)' : 0,
                      left: 0,
                      opacity: openNameChangeForm ? 1 : 0,
                      overflow: openNameChangeForm ? 'auto' : 'hidden',
                      position: 'absolute',
                      width: openNameChangeForm ? '100%' : 0,
                      transition: 'height 300ms ease, opacity 300ms ease, width 300ms ease',
                      zIndex: 1
                    }}
                    onClose={() => setOpenNameChangeForm(false)}
                    title={<><EditIcon /><span>Change Name</span></>}
                    loading={naming}>
                    <Text>Names must be unique, and can only include letters, numbers, and single spaces.</Text>
                    <NameForm>
                      <TextInput
                        disabled={naming}
                        initialValue=""
                        maxlength={31}
                        pattern="^(([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+){1,31}$"
                        onChange={(v) => setNewName(v)} />
                      <IconButton
                        data-tip="Submit"
                        data-for="global"
                        disabled={naming}
                        onClick={updateAsteroidName}>
                        <CheckCircleIcon />
                      </IconButton>
                    </NameForm>
                  </StaticForm>
                  <Button
                    disabled={naming}
                    loading={naming}
                    onClick={() => setOpenNameChangeForm(true)}>
                    Re-Name
                  </Button>
                </>
              )}

              {userIsOwner && (
                <ModelButton
                  disabled={exportingModel}
                  loading={exportingModel}
                  onClick={download3dModel}>
                  Download 3D Model
                </ModelButton>
              )}

              {sale && !asteroid.owner && (
                <Button
                  data-tip="Purchase development rights"
                  data-for="global"
                  disabled={!account || !saleIsActive || buying}
                  loading={buying}
                  onClick={() => {
                    buyAsteroid();
                    createReferral.mutate();
                  }}>
                  Purchase
                </Button>
              )}
              {asteroid.owner && (
                <MarketplaceLink
                  chain={asteroid.chain}
                  assetType="asteroid"
                  id={asteroid.i}>
                  {(onClick, setRefEl) => (
                    <Button setRef={setRefEl} onClick={onClick}>
                      {userIsOwner ? 'List for Sale' : 'Purchase'}
                    </Button>  
                  )}
                </MarketplaceLink>
              )}
            </ButtonRow>
          </SectionBody>
        </div>
      </DetailPane>
    </Wrapper>
  );
};

export default AsteroidInformation;