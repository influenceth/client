import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AmbientLight,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  LinearMipMapLinearFilter,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import utils from 'influence-utils';
import { Canvas, useThree } from '@react-three/fiber';
import { Address } from 'influence-utils';
import { BsChevronRight as NextIcon } from 'react-icons/bs';
import { RiVipDiamondFill as BonusIcon } from 'react-icons/ri';
import LoadingIcon from 'react-spinners/PulseLoader';

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

import ButtonPill from '~/components/ButtonPill';
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
  ResourceGroupIcons,
  SemiMajorAxisIcon,
  SurfaceAreaIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import { categoryDefs, resourceDefs } from '../AsteroidDetails';
import ResourceMix from './ResourceMix';
import ResourceBonuses from './ResourceBonuses';
import Dimensions from './Dimensions';
import theme, { hexToRGB } from '~/theme';
import AsteroidComposition from './Composition';
import AsteroidGraphic from './AsteroidGraphic';

// TODO: if these stay the same, then should just export from Information or extract to shared component vvv
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
const LeftPane = styled.div`
  flex: 0 1 640px;
  overflow: hidden;
  padding-top: 30px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1;
  }
`;
const RightPane = styled.div`
  flex: 1;
  margin-left: 30px;
  padding-top: 40px;
  & > div:first-child {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
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
// TODO: ^^^

const SpectralLegend = styled.div`
  position: absolute;
  & > div {
    color: white;
    margin-bottom: 6px;
    & > span:first-child {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2em;
      display: inline-block;
      font-weight: bold;
      height: 1.25em;
      margin-right: 8px;
      text-align: center;
      text-transform: uppercase;
      width: 1.25em;
    }
    & > span:last-child {
      font-size: 90%;
      opacity: 0.7;
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

const AsteroidType = styled.div`
  border: 1px solid ${p => p.theme.colors.borderBottom};
  border-radius: 1em;
  color: white;
  font-size: 28px;
  padding: 4px 12px;
  text-align: center;
  text-transform: none !important;
  min-width: 40%;
`;

const ResourceGroupIcon = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.2);
  border-radius: 6px;
  color: ${p => p.theme.colors.resources[p.category]};
  display: flex;
  justify-content: center;
  height: 50px;
  width: 50px;

  & > svg {
    fill: currentColor;
    height: 40px;
    width: 40px;
  }
`;
const ResourceGroupLabel = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  font-weight: bold;
  justify-content: center;
  padding: 0 8px;
  text-transform: uppercase;
  & > label {
    font-size: 115%;
    line-height: 1em;
  }
`;
const BarChart = styled.div`
  display: flex;
  ${p => p.twoLine
    ? `
      align-items: flex-start;
      flex-direction: column;
      & > div {
        padding: 6px 0;
      }
    `
    : `
      align-items: center;
      flex-direction: row;
    `}
  & > label {
    font-size: 90%;
    margin-right: 6px;
    width: 48px;
  }
  & > div {
    flex: 1;
    width: 100%;
    &:before {
      background-color: currentColor;
      border-radius: 3px;
      content: '';
      display: block;
      height: 6px;
      width: ${p => (p.value / p.maxValue) * 90}%;
    }
  }
`;
const ResourceGroupItems = styled.div`
  color: white;
  overflow: visible;
  position: relative;
  text-align: right;
  width: 210px;
  & > div {
    margin-top: 3px;
    white-space: nowrap;
    & > div {
      border: 1px solid ${p => p.theme.colors.borderBottom};
      height: 24px;
      display: inline-block;
      width: 24px;
      &:not(:last-child) {
        margin-right: 2px;
      }
    }
  }
`;
const NextLabel = styled.div`
  color: white;
  font-size: 22px;
  text-align: right;
  transition: color 250ms ease;
  width: 40px;
`;
const ResourceGroup = styled.div`
  align-items: center;
  background-color: transparent;
  display: flex;
  flex-direction: row;
  padding: 10px 5px;
  transition: background-color 250ms ease;
  & ${ResourceGroupLabel} {
    color: ${p => p.color};
  }
  &:hover {
    background-color: rgba(${p => hexToRGB(p.color)}, 0.2);
    & ${NextLabel} {
      color: ${p => p.color};
    }
  }
`;

const Bonuses = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  & > div {
    width: 48%;
  }
`;

const BonusItem = styled.div`
  align-items: center;
  display: flex;
  padding: 6px 0;
  color: ${p => p.theme.colors.resources[p.category] || 'white'};
  & > label {
    font-size: 90%;
    font-weight: bold;
    margin-left: 10px;
  }
`;

const Bonus = styled.div`
  & > * {
    margin-right: 3px;
    opacity: 0.2;
    vertical-align: middle;
  }
  & > *:nth-child(1) {
    ${p => p.bonus >= 1 && 'opacity: 1;'}
  }
  & > *:nth-child(2) {
    ${p => p.bonus >= 2 && 'opacity: 1;'}
  }
  & > *:nth-child(3) {
    ${p => p.bonus >= 3 && 'opacity: 1;'}
  }
`;

const SelectedCategoryTitle = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.resources[p.category]};
  color: ${p => p.theme.colors.resources[p.category]};
  display: flex;
  font-size: 40px;
  font-weight: bold;
  padding-bottom: 10px;
  position: relative;
  text-transform: uppercase;
  & > *:first-child {
    margin-right: 12px;
  }
  &:before {
    content: '';
    border-bottom: 1px solid ${p => p.theme.colors.resources[p.category]};
    bottom: -1px;
    left: -35px;
    position: absolute;
    transform: rotate(-45deg);
    transform-origin: right;
    width: 35px;
  }
`;

const ResourceRow = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.resources[p.category]};
  display: flex;
  flex-direction: row;
  margin-bottom: 15px;
`;
const ResourceIcon = styled.div`
  border: 1px solid ${p => p.theme.colors.borderBottomAlt};
  height: 85px;
  width: 85px;
`;
const ResourceInfo = styled.div`
  flex: 1;
  padding: 0 8px;
  & > label {
    color: white;
    font-size: 120%;
  }
  & > div {
    margin-top: 8px;
  }
`;
const ResourceAction = styled.div`
  padding-right: 6px;
`;

const UnscannedWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
`;
const UnscannedContainer = styled.div`
  max-width: 540px;
  width: 100%;
`;
const UnscannedHeader = styled.div`
  background: ${p => p.isOwner ? p.theme.colors.main : '#3d3d3d'};
  color: ${p => p.isOwner ? 'black' : 'white'};
  font-size: 20px;
  line-height: 1.8em;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  & > svg {
    font-size: 24px;
    left: 6px;
    position: absolute;
    top: 6px;
  }
`;
const UnscannedBody = styled.div`
  border: solid ${p => p.theme.colors.borderBottom};
  border-width: 1px 0;
  color: #ccc;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 10px;
  min-height: 150px;
  padding: 25px 20px;
  text-align: center;
  & h3 {
    margin: 0 0 12px;
  }
  & p {
    margin: 0;
  }
  & b {
    color: ${p => p.theme.colors.main};
  }
  & button {
    margin: 20px auto 0;
  }
`;


const spectralLabels = {
  c: 'Carbonaceous',
  i: 'Icy',
  s: 'Silicaceous',
  m: 'Metallic'
};

const BonusBar = ({ bonus }) => (
  <Bonus bonus={bonus}>
    <BonusIcon />
    <BonusIcon />
    <BonusIcon />
  </Bonus>
);

const ResourceDetails = ({ abundances, asteroid, isOwner }) => {
  const [selected, setSelected] = useState();
  const [hover, setHover] = useState();

  const handleClick = (categoryIndex) => () => {
    setSelected(categoryIndex >= 0 ? abundances[categoryIndex] : null);
    setHover(null);
  };

  const handleHover = (category, isHovering) => () => {
    setHover(isHovering ? category : null);
  };

  useEffect(() => ReactTooltip.rebuild(), [selected]);

  return (
    <Wrapper>
      <LeftPane>
        <SpectralLegend>
          {utils.toSpectralType(asteroid.spectralType).toLowerCase().split('').map((l) => (
            <div key={l}>
              <span>{l}</span>
              <span>{spectralLabels[l]}</span>
            </div>
          ))}
        </SpectralLegend>
        <GraphicSection>
          <GraphicWrapper>
            <AsteroidGraphic
              abundances={abundances}
              asteroid={asteroid}
              focus={selected?.category}
              hover={hover}
              noColor={!asteroid.scanned} />
            {/* 
            <Graphic>
              <div>
                <Canvas antialias frameloop={frameloop} outputEncoding={sRGBEncoding}>
                  <AsteroidComposition
                    asteroid={asteroid}
                    focus={selected?.category}
                    grayscale
                    highlight={highlight}
                    inputResourceGroups={inputResourceGroups}
                    onAnimationChange={onAnimationChange} />
                </Canvas>
              </div>
              <GraphicData>
                <div>
                  {utils.toSize(asteroid.radius)}
                </div>
                <AsteroidType>
                  {utils.toSpectralType(asteroid.spectralType).toUpperCase()}-type
                </AsteroidType>
                <div style={{ color: 'white' }}>
                  {utils.toRarity(asteroid.bonuses)}
                </div>
              </GraphicData>
            </Graphic>
            */}
          </GraphicWrapper>
        </GraphicSection>
      </LeftPane>
      <RightPane>
        {!asteroid.scanned && (
          <UnscannedWrapper>
            {isOwner && (
              <UnscannedContainer>
                {asteroid.scanStatus === 'SCAN_READY' && (
                  <UnscannedHeader isOwner>
                    <WarningOutlineIcon />
                    Un-Scanned Asteroid
                  </UnscannedHeader>
                )}
                <UnscannedBody>
                  {asteroid.scanStatus === 'UNSCANNED' && (
                    <>
                      <p><b>You own this asteroid.</b> Perform a scan to determine its final resource composition and bonuses.</p>
                      <Button isTransaction>Start Scan</Button>
                    </>
                  )}
                  {asteroid.scanStatus === 'SCANNING' && (
                    <>
                      <h3>SCANNING</h3>
                      <LoadingIcon color="white" size={12} />
                    </>
                  )}
                  {asteroid.scanStatus === 'SCAN_READY' && (
                    <>
                      <p>Asteroid scan is complete. Ready to finalize.</p>
                      <Button isTransaction>Finalize</Button>
                    </>
                  )}
                </UnscannedBody>
              </UnscannedContainer>
            )}
            {!isOwner && (
              <UnscannedContainer>
                <UnscannedHeader>
                  <WarningOutlineIcon />
                  Un-Scanned Asteroid
                </UnscannedHeader>
                <UnscannedBody isOwner={isOwner}>
                  You do not own this asteroid. The owner must complete a scan to determine its final resource composition and bonuses.
                </UnscannedBody>
              </UnscannedContainer>
            )}
          </UnscannedWrapper>
        )}
        {asteroid.scanned && selected && (
          <div>
            <SelectedCategoryTitle category={selected.category} onClick={handleClick(-1)}>
              <ResourceGroupIcon category={selected.category}>
                {ResourceGroupIcons[selected.category.toLowerCase()]}
              </ResourceGroupIcon>
              {selected.label}
            </SelectedCategoryTitle>
            <SectionBody style={{ overflowY: 'auto', paddingLeft: 65 }}>
              <BonusItem category={selected.category} style={{ marginBottom: 15, padding: 0 }}>
                <BonusBar bonus={1} />
                <label>Bonus Yield: +3%</label>
              </BonusItem>
              {selected.resources.map(({ resource, abundance }, i) => (
                <ResourceRow key={resource} category={selected.category}>
                  <ResourceIcon>

                  </ResourceIcon>
                  <ResourceInfo>
                    <label>{resourceDefs[resource]}</label> 
                    <BarChart value={abundance} maxValue={selected.resources[0].abundance} twoLine>
                      <label>
                        {(abundance * 100).toFixed(1)}%
                      </label>
                      <div />
                    </BarChart>
                  </ResourceInfo>
                  <ResourceAction>
                    <ButtonPill>
                      Resource Map
                    </ButtonPill>
                  </ResourceAction>
                </ResourceRow>
              ))}
            </SectionBody>
          </div>
        )}
        {asteroid.scanned && !selected && (
          <>
            <div>
              <SectionHeader>Resource Groups</SectionHeader>
              <SectionBody>
                {abundances.map(({ category, label, resources, abundance }, i) => (
                  <ResourceGroup
                    key={category}
                    color={theme.colors.resources[category]}
                    onClick={handleClick(i)}
                    onMouseEnter={handleHover(category, true)}
                    onMouseLeave={handleHover(category, false)}>
                    <ResourceGroupIcon category={category}>
                      {ResourceGroupIcons[category.toLowerCase()]}
                    </ResourceGroupIcon>
                    <ResourceGroupLabel>
                      <label>{label}</label>
                      <BarChart value={abundance} maxValue={abundances[0].abundance}>
                        <label>
                          {Math.round(abundance * 100).toFixed(1)}%
                        </label>
                        <div />
                      </BarChart>
                    </ResourceGroupLabel>
                    <ResourceGroupItems>
                      <label>{resources.length} Resources</label>
                      <div>
                        {/* TODO: will be thumbnail */}
                        {resources.map(({ resource }) => (
                          <div key={resource} data-place="left" data-tip={resourceDefs[resource]} data-for="global" />
                        ))}
                      </div>
                    </ResourceGroupItems>
                    <NextLabel>
                      <NextIcon />
                    </NextLabel>
                  </ResourceGroup>
                ))}
              </SectionBody>
            </div>

            {/* TODO: for L1-scanned asteroids, these bonuses will already be set even though "unscanned" */}
            <div>
              <SectionHeader>Yield Bonuses</SectionHeader>
              <SectionBody>
                <Bonuses>
                  <BonusItem>
                    <BonusBar bonus={1} />
                    <label>Overall Yield: +3%</label>
                  </BonusItem>
                  {abundances.map(({ category, label }) => (
                    <BonusItem key={category} category={category}>
                      <BonusBar bonus={1} />
                      <label>{label} Yield: +3%</label>
                    </BonusItem>
                  ))}
                </Bonuses>
              </SectionBody>
            </div>
          </>
        )}
      </RightPane>
    </Wrapper>
  );
};

export default ResourceDetails;