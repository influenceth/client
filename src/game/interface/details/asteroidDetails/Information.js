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
import Form from '~/components/Form';
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
  EccentricityIcon, 
  InclinationIcon, 
  OrbitalPeriodIcon,
  RadiusIcon,
  SemiMajorAxisIcon,
  SurfaceAreaIcon,
  ScanIcon
} from '~/components/Icons';
import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import ResourceMix from './ResourceMix';
import ResourceBonuses from './ResourceBonuses';
import Dimensions from './Dimensions';
import theme from '~/theme';
import RenderedAsteroid from './RenderedAsteroid';

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
`;
const BasicPane = styled.div`
  flex: 0 1 450px;
  padding-top: 30px;
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
`;
const GraphicSection = styled.div`
  flex: 1;
  justify-contents: center;
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
`;

const HighlightOwnership = styled.div`
  font-size: 115%;
  font-weight: bold;
  color: ${p => p.theme.colors.main};
  margin-bottom: 1.5em;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  & > * {
    flex: 1;
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

const Attributes = styled.div`
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
    max-width: 50%;
    padding: 6px 0;
    width: 360px;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 150%;
      margin-right: 10px;
    }
    & > label {
      flex: 1;
    }
    & > span {
      color: white;
    }
  }
`;

const AsteroidInformation = ({ asteroid }) => {
  const { account } = useAuth();
  const { data: sale } = useSale();
  const createReferral = useCreateReferral(Number(asteroid.i));
  const { buyAsteroid, buying } = useBuyAsteroid(Number(asteroid.i));
  const { nameAsteroid, naming } = useNameAsteroid(Number(asteroid.i));
  const { /*startAsteroidScan, finalizeAsteroidScan,*/ scanStatus } = useScanAsteroid(asteroid);
  const webWorkerPool = useWebWorker();

  const saleIsActive = useStore(s => s.sale);

  const userIsOwner = account && asteroid.owner && Address.areEqual(account, asteroid.owner);

  const [exportingModel, setExportingModel] = useState(false);

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;
    renderDummyAsteroid(asteroid, constants.MODEL_EXPORT_RESOLUTION, webWorkerPool, (asteroidModel, dispose) => {
      exportGLTF(asteroidModel, `asteroid_${asteroid.asteroidId}`, () => {
        try {
          dispose();
        } catch (e) { console.warn(e); }
        setExportingModel(false);
      });
    });
  }, [asteroid, exportingModel]);

  return (
    <Wrapper>
      <BasicPane>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Asteroid ID#">{asteroid.i}</DataReadout>
        <DataReadout style={{ fontSize: '18px', padding: '0 0 5px' }} label="Owner">
          <AddressLink address={asteroid.owner} chain={asteroid.chain} />
        </DataReadout>
        <GraphicSection>
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
              <Canvas antialias frameloop="demand" style={{ width: 450, height: 450 }}>
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
        </GraphicSection>
        <div>
          <SectionHeader>Management</SectionHeader>
          <SectionBody>
            {userIsOwner && <HighlightOwnership>You own this asteriod.</HighlightOwnership>}
            <ButtonRow>
              {userIsOwner && (
                <Button>Re-Name</Button>
              )}

              {userIsOwner && (
                <Button
                  data-tip="Download 3d Model"
                  data-for="global"
                  disabled={exportingModel}
                  loading={exportingModel}
                  onClick={download3dModel}>
                  Download Model
                </Button>
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
          <SectionHeader>Attributes</SectionHeader>
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
        </div>
      </DetailPane>
    </Wrapper>
  );
};

export default AsteroidInformation;