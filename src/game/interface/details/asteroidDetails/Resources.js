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
  ResourceGroupIcons,
  SemiMajorAxisIcon,
  SurfaceAreaIcon
} from '~/components/Icons';
import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import ResourceMix from './ResourceMix';
import ResourceBonuses from './ResourceBonuses';
import Dimensions from './Dimensions';
import theme, { hexToRGB } from '~/theme';
import AsteroidComposition from './Composition';

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
  border-radius: 6px;
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
  align-items: center;
  display: flex;
  flex-direction: row;
  width: 100%;
  & > label {
    font-size: 90%;
    width: 40px;
  }
  & > div {
    flex: 1;
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
const ResourceGroup = styled.div`
  align-items: center;
  background: transparent;
  display: flex;
  flex-direction: row;
  padding: 10px 5px;
  & ${ResourceGroupIcon} {
    background: rgba(${p => hexToRGB(p.color)}, 0.2);
    color: ${p => p.color};
  }
  & ${ResourceGroupLabel} {
    color: ${p => p.color};
  }
  &:hover {
    background: rgba(${p => hexToRGB(p.color)}, 0.2);
  }
`;

const NextLabel = styled.div`
  color: white;
  font-size: 22px;
  text-align: right;
  width: 40px;
`;

const Bonuses = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  & > div {
    align-items: center;
    display: flex;
    width: 48%;
    padding: 6px 0;
  }
`;

const BonusItem = styled.div`
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









const categories = {
  'Volatiles': {
    label: 'Volatiles',
    resources: [
      'Ammonia',
      'Carbon Dioxide',
      'Carbon Monoxide',
      'Hydrogen',
      'Methan',
      'Nitrogen',
      'Surfur Dioxide',
      'Water',
    ]
  },
  'Organic': {
    label: 'Organic',
    resources: [
      'Bitumen',
      'Calcite',
      'Magnesite'
    ]
  },
  'Metal': {
    label: 'Metal',
    resources: [
      'Graphite',
      'Rhabdite',
      'Taenite',
      'Troilite',
    ]
  },
  'RareEarth': {
    label: 'Rare-Earth',
    resources: [
      'Merrillite',
      'Xenotime',
    ]
  },
  'Fissile': {
    label: 'Fissile',
    resources: [
      'Coffinite',
      'Uranite'
    ]
  },
};

const inputResources = [
  { category: 'Volatiles', value: 0.4 },
  { category: 'Organic', value: 0.2 },
  { category: 'Metal', value: 0.2 },
  { category: 'RareEarth', value: 0.15 },
  { category: 'Fissile', value: 0.05 },
];

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

const ResourceDetails = ({ asteroid }) => {
  const [frameloop, setFrameloop] = useState();
  const [focus, setFocus] = useState();
  const [highlight, setHighlight] = useState();
  const onStatic = () => {
    setFrameloop('demand');
  };

  const handleClick = (category) => () => {
    setFrameloop();
    setFocus(category);
  };

  const handleHover = (category, isHovering) => () => {
    setFrameloop();
    setHighlight(isHovering ? category : null);
  };

  useEffect(() => ReactTooltip.rebuild(), []);

  return (
    <Wrapper>
      <LeftPane>
      <SpectralLegend>
        {utils.toSpectralType(asteroid.spectralType).split('').map((l) => (
          <div key={l}>
            <span>{l}</span>
            <span>{spectralLabels[l.toLowerCase()]}</span>
          </div>
        ))}
      </SpectralLegend>
      <GraphicSection>
          <GraphicWrapper>
            <Graphic>
              <div>
                <Canvas antialias frameloop={frameloop} outputEncoding={sRGBEncoding}>
                  <AsteroidComposition
                    asteroid={asteroid}
                    focus={focus}
                    highlight={highlight}
                    inputResources={inputResources}
                    onReady={onStatic} />
                </Canvas>
              </div>
              <GraphicData>
                <div>
                  {utils.toSize(asteroid.radius)}
                </div>
                <AsteroidType>
                  {utils.toSpectralType(asteroid.spectralType)}-type
                </AsteroidType>
                <div style={{ color: 'white' }}>
                  {utils.toRarity(asteroid.bonuses)}
                </div>
              </GraphicData>
            </Graphic>
          </GraphicWrapper>
        </GraphicSection>
      </LeftPane>
      <RightPane>
        <div>
          <SectionHeader>Resource Groups</SectionHeader>
          <SectionBody style={{ overflowY: 'auto' }}>
            {inputResources.map(({ category, value }) => (
              <ResourceGroup
                key={category}
                color={theme.colors.resources[category]}
                onClick={handleClick(category)}
                onMouseEnter={handleHover(category, true)}
                onMouseLeave={handleHover(category, false)}>
                <ResourceGroupIcon>
                  {ResourceGroupIcons[category.toLowerCase()]}
                </ResourceGroupIcon>
                <ResourceGroupLabel>
                  <label>{categories[category].label}</label>
                  <BarChart value={value} maxValue={inputResources[0].value}>
                    <label>
                      {value * 100}%
                    </label>
                    <div />
                  </BarChart>
                </ResourceGroupLabel>
                <ResourceGroupItems>
                  <label>{categories[category].resources.length} Resources</label>
                  <div>
                    {/* TODO: will be thumbnail */}
                    {categories[category].resources.map((resource) => (
                      <div data-place="left" data-tip={resource} data-for="global" />
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
        <div>
          <SectionHeader>Yield Bonuses</SectionHeader>
          <SectionBody>
            <Bonuses>
              <BonusItem>
                <BonusBar bonus={1} />
                <label>Overall Yield: +3%</label>
              </BonusItem>
              {inputResources.map(({ category }) => (
                <BonusItem category={category}>
                  <BonusBar bonus={1} />
                  <label>{categories[category].label} Yield: +3%</label>
                </BonusItem>
              ))}
            </Bonuses>
          </SectionBody>
        </div>
      </RightPane>
    </Wrapper>
  );
};

export default ResourceDetails;