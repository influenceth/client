import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import {
  BsChevronDoubleDown as ChevronDoubleDownIcon,
  BsChevronDoubleUp as ChevronDoubleUpIcon,
} from 'react-icons/bs';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, Crewmate, Inventory, Lot } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import CrewCard from '~/components/CrewCard';
import IconButton from '~/components/IconButton';
import {
  CancelBlueprintIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
  LocationPinIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { getAdjustedNow, getCrewAbilityBonus } from '~/lib/utils';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';

// TODO: remove this after sdk updated
Inventory.CAPACITIES = {
  1: {
    0: { name: 'Construction Site', mass: 0, volume: 0 },
    1: { name: 'Storage', mass: 1500000, volume: 75000 }
  },
  2: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  3: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  4: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  5: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  6: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  7: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  8: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  },
  9: {
    0: { name: 'Construction Site', mass: 0, volume: 0 }
  }
};

const borderColor = '#333';

const CloseButton = styled(IconButton)`
  opacity: 0.6;
  position: absolute !important;
  top: 5px;
  right: -5px;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;
const Section = styled.div`
  color: #777;
  min-height: 100px;
  padding: 0 36px;
  width: 780px;
`;
const SectionTitle = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  font-size: 90%;
  line-height: 1.5em;
  padding: 0 5px 10px;
  text-transform: uppercase;
  & > svg {
    font-size: 175%;
    margin-left: -30px;
  }
`;
const SectionBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding: 15px 0px;
  position: relative;
  ${p => p.highlight && `
    background: rgba(${p.theme.colors.mainRGB}, 0.2);
    border-radius: 10px;
    margin: 10px 0;
    padding-left: 15px;
    padding-right: 15px;
  `}
`;

const Header = styled(Section)`
  padding-bottom: 20px;
  padding-top: 20px;
  position: relative;
  ${p => p.backgroundSrc && `
    &:before {
      content: "";
      background: url("${p.backgroundSrc}") center center;
      background-size: cover;
      bottom: 0;
      mask-image: linear-gradient(to bottom, black 95%, transparent 100%);
      
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      z-index: 0;
    }
  `}
`;
const HeaderSectionBody = styled(SectionBody)`
  padding: 0;
`;
const HeaderInfo = styled.div`
  flex: 1;
  color: #999;
  display: flex;
  flex-direction: column;
  font-size: 90%;
  justify-content: center;
  ${p => p.padTop
    ? `height: 140px; padding-top: 15px;`
    : 'height: 125px;'}
  position: relative;
  & b {
    color: white;
    font-weight: normal;
  }
`;
const Title = styled.div`
  color: white;
  font-size: 36px;
  line-height: 48px;
  & svg {
    font-size: 150%;
    margin-bottom: -5px;
  }
`;
const Subtitle = styled.div`

`;
const CrewRequirement = styled.div``;
const CrewInfo = styled.div`
  align-items: flex-end;
  display: ${p => (p.status === 'BEFORE' || p.requirement === 'duration') ? 'flex' : 'none'};
  flex-direction: row;
  position: absolute;
  right: 0;
  bottom: 0;
  & > div:first-child {
    text-align: right;
    & b {
      color: orange;
      font-weight: bold;
    }
  }
  ${CrewRequirement} {
    &:before {
      content: ${p => p.status === 'BEFORE' ? '"Crew: "' : '""'};
    }
    &:after {
      display: block;
      font-weight: bold;
      ${p => {
        if (p.status === 'BEFORE') {
          if (p.requirement === 'duration') {
            return `
              content: "Required for Duration";
              color: ${p.theme.colors.orange};
            `;
          }
          return `
            content: "Required to Start";
            color: ${p.theme.colors.main};
          `;
        }
      }}
    }
  }
`;

const CardContainer = styled.div`
  border: 1px solid #555;
  margin-left: 8px;
  padding: 2px;
  width: 75px;
  & > div {
    background-color: #111;
  }
`;
const StatRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  & > label {
    flex: 1;
  }
  & > span {
    color: ${p => p.theme.colors.main};
    font-weight: bold;
    white-space: nowrap;
    &:after {
      display: none;
      ${p => p.direction >= 0 && `
        content: " ▲";
        color: ${p.direction > 0 ? p.theme.colors.success : 'transparent'};
      `}
      ${p => p.direction < 0 && `
        content: " ▼";
        color: ${p.theme.colors.error};
      `}
    }
  }
`;
const StatSection = styled(Section)`
  min-height: 0;
  & ${SectionBody} {
    align-items: flex-start;
    border-top: 1px solid ${borderColor};
    display: flex;
    font-size: 15px;
    padding: 10px 0;
    & > div {
      flex: 1;
      &:last-child {
        border-left: 1px solid ${borderColor};
        margin-left: 15px;
        padding-left: 15px;
      }
    }
  }

  ${p => p.status === 'BEFORE' && `
    ${StatRow} > span {
      color: white;
      &:after {
        display: inline;
        font-size: 50%;
        padding-left: 2px;
        vertical-align: middle;
      }
    }
  `}
`;

const TimerRow = styled.div`
  align-items: center;
  border: none !important;
  display: flex;
  margin-left: 0 !important;
  padding-left: 0 !important;
  justify-content: space-between;
  padding: 5px 0;
  & > div {
    flex: 1;
    text-align: left;
    &:last-child {
      padding-left: 30px;
    }
    & > h6 {
      align-items: center;
      color: white;
      font-size: 24px;
      font-weight: normal;
      display: flex;
      margin: 8px 0 0;
      & > svg {
        color: ${p => p.theme.colors.main};
        margin-right: 10px;
      }
    }
  }
`;

const Footer = styled(Section)`
  min-height: 0;
  & > div {
    border-top: 1px solid ${borderColor};
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    & > * {
      margin: 15px 5px;
    }
  }
`;

const ThumbnailWithData = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  position: relative;
  & > label {
    font-size: 14px;
    padding-left: 15px;
    & > h3 {
      color: white;
      font-size: 25px;
      font-weight: normal;
      margin: 0;
    }
    & > footer {
      bottom: 0;
      color: ${p => p.theme.colors.main};
      position: absolute;
    }
  }
`;
const ResourceWithData = styled(ThumbnailWithData)`
  & > label {
    & > div {
      & > b {
        color: ${p => p.theme.colors.main};
        font-size: 25px;
        font-weight: bold;
        & > svg {
          vertical-align: middle;
        }
      }
    }
  }
`;
const EmptyResourceWithData = styled(ResourceWithData)`
  & > label {
    & > h3 {
      font-size: 32px;
      opacity: 0.3;
      text-transform: uppercase;
    }
  }
`;

const Destination = styled(ThumbnailWithData)`
  & > label {
    & b {
      color: ${p => p.status === 'BEFORE' ? 'white' : p.theme.colors.main};
      font-weight: normal;
    }
    & > *:last-child {
      font-size: 85%;
      margin-top: 1em;
    }
  }
`;

const BuildingPlan = styled(ThumbnailWithData)`
  & b {
    color: ${p => p.theme.colors.main};
    font-weight: normal;
  }
`;

const EmptyThumbnail = styled.div`
  color: ${borderColor};
  font-size: 56px;
  & > svg {
    left: 50%;
    margin-left: -28px;
    margin-top: -28px;
    position: absolute;
    top: 50%;
  }
  & > div {
    border: 0px solid ${borderColor};
    height: 10px;
    position: absolute;
    width: 10px;
  }
  & > div:nth-child(1) {
    border-width: 1px 0 0 1px;
    top: 5px;
    left: 5px;
  }
  & > div:nth-child(2) {
    border-width: 1px 1px 0 0;
    top: 5px;
    right: 5px;
  }
  & > div:nth-child(3) {
    border-width: 0 1px 1px 0;
    bottom: 5px;
    right: 5px;
  }
  & > div:nth-child(4) {
    border-width: 0 0 1px 1px;
    bottom: 5px;
    left: 5px;
  }
`;
const ResourceBadge = styled.div`
  position: absolute;
  bottom: 5px;
  color: white;
  font-size: 80%;
  left: 5px;
  line-height: 1em;
  &:before {
    content: "${p => p.badge !== undefined ? p.badge.toLocaleString() : ''}";
    position: relative;
    z-index: 3;
  }
  &:after {
    content: "${p => p.badgeDenominator ? `/ ${p.badgeDenominator.toLocaleString()}` : ''}";
    display: block;
  }
`;
const ResourceThumbnailWrapper = styled.div`
  border: 2px solid transparent;
  outline: 1px solid ${borderColor};
  height: 115px;
  position: relative;
  width: 115px;
  ${p => `
    ${p.outlineColor ? `outline-color: ${p.outlineColor} !important;` : ''}
    ${p.outlineStyle ? `outline-style: ${p.outlineStyle} !important;` : ''}
    ${p.badgeColor && p.hasDenominator ? `${ResourceBadge} { &:after { color: ${p.badgeColor} !important; } }` : ''}
    ${p.badgeColor && !p.hasDenominator ? `${ResourceBadge} { &:before { color: ${p.badgeColor} !important; } }` : ''}
  `}
`;
const ThumbnailIconOverlay = styled.div`
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: ${p => p.theme.colors.main};
  font-size: 40px;
  display: flex;
  justify-content: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;
const BuildingThumbnailWrapper = styled(ResourceThumbnailWrapper)`
  height: 92px;
  width: 150px;
  & ${EmptyThumbnail} {
    font-size: 40px;
    & > svg {
      margin-left: -20px;
      margin-top: -20px;
    }
  }
`;
const ResourceThumbnail = styled.div`
  background: black url("${p => p.src}") center center;
  background-size: cover;
  background-repeat: no-repeat;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 0;
`;
const ResourceProgress = styled.div`
  background: #333;
  border-radius: 2px;
  position: absolute;
  right: 5px;
  bottom: 5px;
  ${p => p.horizontal
    ? `
      height: 4px;
      width: calc(100% - 10px);
    `
    : `
      height: calc(100% - 10px);
      width: 4px;
    `
  }
  &:after {
    content: "";
    background: ${p => p.theme.colors.main};
    border-radius: 2px;
    position: absolute;
    ${p => p.horizontal
      ? `
        left: 0;
        height: 100%;
        width: ${Math.min(1, p.progress) * 100}%;
      `
      : `
        bottom: 0;
        height: ${Math.min(1, p.progress) * 100}%;
        width: 100%;
      `
    }
  }
  ${p => p.secondaryProgress && `
    &:before {
      content: "";
      background: white;
      border-radius: 2px;
      position: absolute;
      ${p.horizontal
        ? `
          left: 0;
          height: 100%;
          width: ${Math.min(1, p.secondaryProgress) * 100}%;
        `
        : `
          bottom: 0;
          height: ${Math.min(1, p.secondaryProgress) * 100}%;
          width: 100%;
        `
      }
    }
  `}
`;
const InventoryUtilization = styled(ResourceProgress)`
  bottom: 8px;
  &:last-child {
    bottom: 3px;
  }
`;

const IconButtonRounded = styled(ButtonRounded)`
  padding: 10px;
  & > svg {
    font-size: 20px;
    margin-right: 0;
  }
`;

const SliderLabel = styled.div`
  margin-bottom: -4px;
  & > b {
    color: white;
    font-size: 28px;
    font-weight: normal;
  }
`;

const SliderWrapper = styled.div`
  flex: 1;
`;
const SliderInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  & > button {
    padding: 5px 25px;
  }
  & > div:last-child {
    text-align: right;
  }
`;

const LoadingBar = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
  color: white;
  font-size: 18px;
  left: 0;
  padding: 9px 15px;
  position: absolute;
  right: 0;
  text-transform: uppercase;
  top: 0;
  z-index: 1;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.7);
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: ${p => Math.min(100, Math.max(0.02, p.progress))}%;
    z-index: -1;
  }
`;

const NotificationEnabler = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  transition: color 250ms ease;
  & > svg {
    color: ${p => p.theme.colors.main};
    margin-right: 6px;
  }

  &:hover {
    color: white;
  }
`;

const CompletedIconWrapper = styled.div`
  align-self: stretch;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: column;
  font-size: 36px;
  margin-bottom: -15px;
  margin-top: -15px;
  margin-right: 20px;
  position: relative;
  & > svg {
    flex: 1;
  }
  &:before, &:after {
    content: '';
    border: 4px solid transparent;
    width: 32px;
  }
  &:before {
    border-top: 5px solid ${p => p.theme.colors.main};
  }
  &:after {
    border-bottom: 5px solid ${p => p.theme.colors.main};
  }
`;

const ItemSelectionWrapper = styled.div`
  width: 100%;
  & > div:first-child {
    overflow: auto visible;
    padding: 1px 5px 5px 1px;
    & > div:after {
      content: " ";
      flex-shrink: 0;
      width: 1px;
    }
  }
  & > div:last-child {
    align-items: center;
    display: flex;
    flex-direction: row;
    height: 32px;
    justify-content: space-between;
    & > div:first-child {
      color: white;
    }
  }
`;

const ItemsList = styled.div`
  display: flex;
  white-space: nowrap;
  & > div {
    flex-shrink: 0;
    outline: 1px solid ${borderColor};
    margin-right: 10px;
    &:last-child {
      margin-right: 0;
    }
  }
`;
const IngredientsList = styled(ItemsList)`
  & > div {
    outline: 1px dashed ${p => p.empty ? borderColor : p.theme.colors.main};
  }
`;

const AbandonmentTimer = styled.div`
  text-align: right;
  & > div {
    color: ${p => p.theme.colors.error};
    font-size: 17px;
  }
  & > h3 {
    color: white;
    font-size: 28px;
    margin: 5px 0 0;
    & > svg {
      color: ${p => p.theme.colors.error};
    }
  }
`;
const PopperBody = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
`;
const PopperList = styled.div`
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  margin-left: -20px;
  width: calc(100% + 40px);
`;
const PopperListItem = styled.div`
  cursor: ${p => p.theme.cursors.active};
  margin: 0 8px;
  padding: 8px 12px;
  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;
const PoppableTitle = styled.div`
  align-items: flex-end;
  color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
  & > h3 {
    font-size: 30px;
    font-weight: normal;
    margin: 0;
  }
`;
const PoppableTableWrapper = styled.div`
  border: solid ${borderColor};
  border-width: 1px 0;
  flex: 1;
  overflow: auto;
  & > table {
    border-spacing: 0;
    border-collapse: separate;
    width: 100%;

    & td, & th {
      white-space: nowrap;
    }

    & td {
      padding: 4px 8px 6px;
      text-align: right;
      vertical-align: middle;
      &:first-child {
        text-align: left;
      }
    }

    & thead {
      font-size: 12px;
      & > tr > td {
        border-bottom: 1px solid ${borderColor};
      }
    }

    & tbody {
      color: white;
      font-size: 14px;
      & > tr {
        cursor: ${p => p.theme.cursors.active};
        &:hover > td {
          background: #222;
        }
      }
    }
  }
`;
const ResourceColorIcon = styled.div`
  background-color: ${p => p.theme.colors.resources[p.category]};
  border-radius: 2px;
  display: inline-block;
  height: 10px;
  margin-right: 4px;
  width: 10px;
`;

const MouseoverContent = styled.div`
  & b {
    color: ${p => p.highlightColor || 'white'};
  }
  color: #999;
  font-size: 90%;
  padding-bottom: 15px;
`;

const FutureSectionOverlay = styled.div`
  align-items: center;
  background: rgba(150, 150, 150, 0.1);
  backdrop-filter: blur(5px);
  border-radius: 2px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: -3px;
  right: -3px;
  z-index: 30;
  &:before {
    background: black;
    border: 1px solid #665600;
    border-radius: 4px;
    content: 'This section will be enabled in a future release.';
    display: block;
    padding: 10px 20px;
    text-align: center;
  }
`;

const ingredients = [
  [700, 5, 700], [700, 19, 500], [400, 22, 0],
  // [700, 5, 0], [700, 19, 0], [400, 22, 0], [700, 5, 0], [700, 19, 0], [400, 22, 0],
];

const EmptyImage = ({ children }) => (
  <EmptyThumbnail>
    <div />
    <div />
    <div />
    <div />
    {children}
  </EmptyThumbnail>
);

// TODO: this component is functionally overloaded... create more components so not trying to use in so many different ways
const ResourceImage = ({ resource, badge, badgeColor, badgeDenominator, outlineColor, outlineStyle, overlayIcon, progress }) => {
  return (
    <ResourceThumbnailWrapper
      badgeColor={badgeColor}
      hasDenominator={!!badgeDenominator}
      outlineColor={outlineColor}
      outlineStyle={outlineStyle}>
      <ResourceThumbnail src={resource.iconUrls.w125} />
      {badge !== undefined && <ResourceBadge badge={badge} badgeDenominator={badgeDenominator} />}
      {progress !== undefined && <ResourceProgress progress={progress} />}
      {overlayIcon && <ThumbnailIconOverlay>{overlayIcon}</ThumbnailIconOverlay>}
    </ResourceThumbnailWrapper>
  );
};

const EmptyResourceImage = ({ iconOverride }) => (
  <ResourceThumbnailWrapper><EmptyImage>{iconOverride || <PlusIcon />}</EmptyImage></ResourceThumbnailWrapper>
);

const getCapacityUsage = (building, inventories, type) => {
  const capacity = {
    mass: { max: 0, used: 0, reserved: 0 },
    volume: { max: 0, used: 0, reserved: 0 },
  }
  if (building && inventories && type !== undefined) {
    let { mass: maxMass, volume: maxVolume } = Inventory.CAPACITIES[building.i][type];
    capacity.mass.max = maxMass * 1e6; // TODO: it seems like this mult should be handled in CAPACITIES
    capacity.volume.max = maxVolume * 1e6;

    const { reservedMass, reservedVolume, mass, volume } = inventories.find((i) => i.type === type) || {};
    capacity.mass.used = (mass || 0);
    capacity.mass.reserved = (reservedMass || 0);
    capacity.volume.used = (volume || 0);
    capacity.volume.reserved = (reservedVolume || 0);
  }
  return capacity;
}
const formatCapacity = (value) => {
  return formatFixed(value / 1e6, 1);
}

const BuildingImage = ({ building, inventories, showInventoryStatusForType, unfinished }) => {
  if (!building) return null;
  const capacity = getCapacityUsage(building, inventories, showInventoryStatusForType);
  return (
    <BuildingThumbnailWrapper>
      <ResourceThumbnail src={building[unfinished ? 'siteIconUrls' : 'iconUrls']?.w150} />
      {showInventoryStatusForType !== undefined && (
        <>
          <InventoryUtilization
            progress={capacity.volume.used / capacity.volume.max}
            secondaryProgress={(capacity.volume.reserved + capacity.volume.used) / capacity.volume.max}
            horizontal />
          <InventoryUtilization
            progress={capacity.mass.used / capacity.mass.max}
            secondaryProgress={(capacity.mass.reserved + capacity.mass.used) / capacity.mass.max}
            horizontal />
        </>
      )}
    </BuildingThumbnailWrapper>
  );
};
const EmptyBuildingImage = ({ iconOverride }) => (
  <BuildingThumbnailWrapper><EmptyImage>{iconOverride || <LocationPinIcon />}</EmptyImage></BuildingThumbnailWrapper>
);

const CompletedHighlight = () => <CompletedIconWrapper><CheckIcon /></CompletedIconWrapper>;

const MouseoverIcon = ({ children, icon, iconStyle = {}, themeColor }) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <>
      <span
        ref={refEl}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={themeColor ? { ...iconStyle, color: themeColor } : iconStyle}>
        {icon}
      </span>
      <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
        <MouseoverContent highlightColor={themeColor}>
          {children}
        </MouseoverContent>
      </MouseoverInfoPane>
    </>
  );
};

const ResourceRequirement = ({ resource, hasTally, isGathering, needsTally }) => {
  const props = { resource };
  if (isGathering) {
    props.badge = hasTally;
    if (hasTally >= needsTally) {
      props.badgeColor = theme.colors.main;
      props.overlayIcon = <CheckIcon />;
    } else {
      props.badgeDenominator = needsTally;
      props.badgeColor = theme.colors.yellow;
      props.outlineColor = theme.colors.yellow;
      props.outlineStyle = 'dashed';
    }
  } else {
    props.badge = needsTally;
    props.badgeDenominator = null;
  }
  return (
    <ResourceImage {...props} />
  );
};

const getTimeRemaining = (target) => Math.max(0, target - getAdjustedNow());
export const LiveTimer = ({ target }) => {
  const [remaining, setRemaining] = useState(getTimeRemaining(target));
  useInterval(() => {
    setRemaining(getTimeRemaining(target));
  }, 1000);
  return isNaN(remaining) ? 'Initializing...' : <>{formatTimer(remaining)}</>;
};

// 
// Selectors
//
const BlueprintSelection = ({ onBuildingSelected }) => {
  const buildings = useBuildingAssets();
  return (
    <PopperBody style={{ paddingBottom: 5, paddingTop: 5 }}>
      <PopperList>
        {buildings.filter(({i}) => i > 0).filter(({i}) => [1, 2].includes(i)).map((building) => (
          <PopperListItem key={building.i} onClick={onBuildingSelected(building.i)}>
            <BuildingPlan>
              <BuildingImage building={building} unfinished />
              <label>
                <h3>{building.name}</h3>
                <b>Site Plan</b>
              </label>
            </BuildingPlan>
          </PopperListItem>
        ))}
      </PopperList>
    </PopperBody>
  );
};

const CoreSampleSelection = ({ onClick, options, plot, resources }) => {
  return (
    <PopperBody>
      <PoppableTitle>
        <h3>Lot #{(plot?.i || 0).toLocaleString()}</h3>
        <div>{(options.length || 0).toLocaleString()} Samples at lot</div>
      </PoppableTitle>
      {/* TODO: replace with DataTable? */}
      <PoppableTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Resource</td>
              <td>Deposit Amount</td>
            </tr>
          </thead>
          <tbody>
            {options.sort((a, b) => b.remainingYield - a.remainingYield).map((sample, i) => (
              <tr key={sample.id} onClick={onClick(sample)}>
                <td><ResourceColorIcon category={resources[sample.resourceId].category} /> {resources[sample.resourceId].name}</td>
                <td>{formatSampleMass(sample.remainingYield * resources[sample.resourceId].massPerUnit)} tonnes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
};

const DestinationSelection = ({ asteroid, inventoryType = 1, onClick, originPlotId }) => {
  const { data: crewPlots, isLoading } = useAsteroidCrewPlots(asteroid.i);

  const inventories = useMemo(() => {
    return (crewPlots || [])
      .filter((plot) => (
        plot.building
        && plot.i !== originPlotId // not the origin
        && Inventory.CAPACITIES[plot.building.assetId][inventoryType] // building has inventoryType
        && ( // building is built (or this is construction inventory and building is planned)
          (inventoryType === 0 && plot.building.constructionStatus === Construction.STATUS_PLANNED)
          || (inventoryType !== 0 && plot.building.constructionStatus === Construction.STATUS_OPERATIONAL)
        )
      ))
      .map((plot) => {
        const capacity = Inventory.CAPACITIES[plot.building.assetId][inventoryType];

        const inventory = plot.building?.inventories.find((i) => i.type === inventoryType);
        const usedMass = ((inventory?.mass || 0) + (inventory?.reservedMass || 0)) / 1e6;
        const usedVolume = ((inventory?.volume || 0) + (inventory?.reservedVolume || 0)) / 1e6;

        const availMass = capacity.mass - usedMass;
        const availVolume = capacity.volume - usedVolume;
        const fullness = Math.max(
          1 - availMass / capacity.mass,
          1 - availVolume / capacity.volume,
        );

        return {
          plot,
          distance: Asteroid.getLotDistance(asteroid.i, originPlotId, plot.i),
          type: plot.building?.__t || 'Empty Lot',
          fullness,
          availMass,
          availVolume
        };
      })
  }, [crewPlots]);

  // TODO: use isLoading
  return (
    <PopperBody>
      <PoppableTitle style={{ marginTop: -10 }}>
        <h3>{asteroid.customName || asteroid.baseName}</h3>
        <div>{inventories.length.toLocaleString()} Inventor{inventories.length === 1 ? 'y': 'ies'} Available</div>
      </PoppableTitle>
      {/* TODO: replace with DataTable? */}
      <PoppableTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Location</td>
              <td>Distance</td>
              <td>Type</td>
              <td>% Full</td>
              <td>Avail. Mass</td>
              <td>Avail. Volume</td>
            </tr>
          </thead>
          <tbody>
            {inventories.map((inventory, i) => {
              const warningColor = inventory.fullness > 0.8
                ? theme.colors.error
                : (inventory.fullness > 0.5 ? theme.colors.yellow : theme.colors.success);
              return (
                <tr key={inventory.plot.i} onClick={onClick(inventory.plot)}>
                  <td>Lot #{inventory.plot.i}</td>
                  <td>{formatFixed(inventory.distance, 1)} km</td>
                  <td>{inventory.type}</td>
                  <td style={{ color: warningColor }}>{(100 * inventory.fullness).toFixed(1)}%</td>
                  <td style={{ color: warningColor }}>{formatFixed(inventory.availMass)} t</td>
                  <td style={{ color: warningColor }}>{formatFixed(inventory.availVolume)} m<sup>3</sup></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
};

const TransferSelection = ({ inventory, onComplete, resources, selectedItems }) => {
  const unselected = useMemo(() => {
    return Object.keys(inventory).reduce((acc, cur) => {
      acc[cur] -= selectedItems[cur] || 0;
      return acc;
    }, { ...inventory });
  }, [inventory, selectedItems]);
  return (
    <PopperBody>
      {/* TODO: see mockup for title area */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
        <PoppableTableWrapper>
          <table>
            <thead>
              <tr>
                <td>Item</td>
                <td>Category</td>
                <td>Volume</td>
                <td>Mass</td>
                <td>Quanta</td>
                <td width="48"></td>
              </tr>
            </thead>
            <tbody>
              {Object.keys(unselected).map((resourceId) => {
                console.log();
                const quanta = unselected[resourceId] / resources[resourceId].massPerUnit;
                const mass = unselected[resourceId];
                const volume = quanta * resources[resourceId].volumePerUnit;
                return (
                  <tr key={resourceId}>
                    <td>{resources[resourceId].name}</td>
                    <td>{resources[resourceId].category}</td>
                    <td>{formatSampleVolume(volume)} m<sup>3</sup></td>
                    <td>{formatSampleVolume(mass)} t</td>
                    <td>{formatSampleVolume(mass)} t</td>
                    <td><ButtonRounded style={{ padding: '5px 16px' }}><ChevronDoubleDownIcon style={{ marginRight: 0 }} /></ButtonRounded></td>
                  </tr>
                );
              })}

              <tr>
                <td colspan="6" style={{ height: 24 }}></td>
              </tr>
              <tr>
                <td colspan="6" style={{ borderTop: '1px solid #444', padding: 0, height: 6 }}></td>
              </tr>
              <tr>
                <td colspan="6" style={{ backgroundColor: 'rgba(100, 100, 100, 0.2)'}}>
                  Selected
                </td>
              </tr>

              {Object.keys(unselected).map((resourceId) => {
                const quanta = unselected[resourceId] / resources[resourceId].massPerUnit;
                const mass = unselected[resourceId];
                const volume = quanta * resources[resourceId].volumePerUnit;
                return (
                  <tr key={resourceId}>
                    <td>{resources[resourceId].name}</td>
                    <td>{resources[resourceId].category}</td>
                    <td>{formatSampleVolume(volume)} m<sup>3</sup></td>
                    <td>{formatSampleVolume(mass)} t</td>
                    <td>{formatSampleVolume(mass)} t</td>
                    <td><ButtonRounded style={{ padding: '5px 16px' }}><ChevronDoubleUpIcon style={{ marginRight: 0 }} /></ButtonRounded></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PoppableTableWrapper>
        <div>
          <Button onClick={onComplete}>Done</Button>
        </div>
      </div>
    </PopperBody>
  );
};

// 
// Sections
//

export const ExistingSampleSection = ({ improvableSamples, plot, onSelectSample, selectedSample, resources, overrideTonnage, status }) => {
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onSelectSample) onSelectSample(id);
  }, []);
  const resource = useMemo(() => resources[selectedSample?.resourceId], [selectedSample]);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Core Sample</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {selectedSample ? (
          <ResourceWithData>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource?.name} Deposit{overrideTonnage ? ' (Improved)' : ''}</h3>
              <div>
                <b><ResourceIcon /> {formatSampleMass(overrideTonnage || (selectedSample?.remainingYield * resource.massPerUnit))}</b> tonnes
              </div>
            </label>
          </ResourceWithData>
        ) : (
          <EmptyResourceWithData>
            <EmptyResourceImage />
            <label>
              <div>Existing Deposit</div>
              <h3>Select</h3>
            </label>
          </EmptyResourceWithData>
        )}
        {status === 'BEFORE' && improvableSamples?.length > 1 && (
          <div>
            <Poppable label="Select" buttonWidth="135px" closeOnChange={clicked} title="Select Improvable Sample">
              <CoreSampleSelection plot={plot} onClick={onClick} options={improvableSamples} resources={resources} />
            </Poppable>
          </div>
        )}
        {status === 'AFTER' && (
          <CompletedHighlight />
        )}
      </SectionBody>
    </Section>
  );
};

export const ExtractSampleSection = ({ amount, plot, resources, onSelectSample, selectedSample, status, usableSamples }) => {

  const remainingAfterExtraction = useMemo(() => selectedSample
    ? selectedSample.remainingYield - amount
    : null
  , [amount, selectedSample]);
  const getTonnage = useCallback((y) => y * resources[selectedSample.resourceId].massPerUnit, [selectedSample?.resourceId]);

  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onSelectSample) onSelectSample(id);
  }, []);
  
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Core Sample</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {selectedSample ? (
          <ResourceWithData>
            <ResourceImage resource={resources[selectedSample.resourceId]} />
            <label>
              <h3>{resources[selectedSample.resourceId].name} Deposit</h3>
              <div>
                <b style={status === 'BEFORE' ? { color: 'white', fontWeight: 'normal' } : {}}><ResourceIcon /> {formatSampleMass(getTonnage(amount))}</b> tonnes
              </div>
              {status === 'BEFORE' && (
                <footer>
                  {remainingAfterExtraction === 0
                      ? 'Deposit will be depleted after Extraction'
                      : `${formatSampleMass(getTonnage(remainingAfterExtraction))} tonnes will remain after Extraction`}
                </footer>
              )}
            </label>
          </ResourceWithData>
        ) : (
          <EmptyResourceWithData>
            <EmptyResourceImage />
            <label>
              <div>Extract from Deposit</div>
              <h3>Select</h3>
            </label>
          </EmptyResourceWithData>
        )}
        {status === 'BEFORE' && (
          <div>
            <Poppable label="Select" buttonWidth="135px" closeOnChange={clicked} title="Select Core Sample">
              <CoreSampleSelection plot={plot} onClick={onClick} options={usableSamples} resources={resources} />
            </Poppable>
          </div>
        )}
        {status === 'AFTER' && (
          <CompletedHighlight />
        )}
      </SectionBody>
    </Section>
  );
};

export const RawMaterialSection = ({ abundance, resource, tonnage, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Target Resource</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource && (
          <ResourceWithData>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource.name}{tonnage !== undefined ? ' Deposit Discovered' : ''}</h3>
              {tonnage !== undefined
                ? <div><b><ResourceIcon /> {formatSampleMass(tonnage)}</b> tonnes</div>
                : <div><b>{formatFixed(100 * abundance, 1)}%</b> Abundance at lot</div>
              }
            </label>
          </ResourceWithData>
        )}
        {status === 'AFTER' && (
          <CompletedHighlight />
        )}
      </SectionBody>
    </Section>
  );
};

// TODO: this needs an empty state if source is not yet selected
export const ToolSection = ({ resource, sourcePlot }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Tool</SectionTitle>
      <SectionBody>
        {resource && (
          <ResourceWithData>
            <ResourceImage badge="∞" resource={resource} />
            <label>
              <h3>{resource.name}</h3>
              {sourcePlot && sourcePlot.building && (
                <div>{sourcePlot.building.__t} (Lot {sourcePlot.i.toLocaleString()})</div>
              )}
              <footer>NOTE: This item will be consumed.</footer>
            </label>
          </ResourceWithData>
        )}
        {/* 
        <div>
          <Poppable label="Source" buttonWidth="135px">
            TODO: select where to get the tool from
          </Poppable>
        </div>
        */}
      </SectionBody>
    </Section>
  );
}

export const ItemSelectionSection = ({ inventory, onSelectItems, resources, selectedItems, status }) => {
  const selectedItemKeys = Object.keys(selectedItems || {});

  const [completed, setCompleted] = useState(0);
  const onSelectionCompleted = useCallback((items) => () => {
    setCompleted((x) => x + 1);
    if (onSelectItems) onSelectItems(items);
  }, []);

  const SelectionPopper = () => (
    <Poppable label="Select" buttonWidth="135px" title="Items to Transfer" closeOnChange={completed}>
      <TransferSelection
        inventory={inventory}
        onComplete={onSelectionCompleted}
        resources={resources}
        selectedItems={selectedItems} />
    </Poppable>
  );
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Items</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {selectedItemKeys.length === 0 && (
          <>
            <EmptyResourceWithData>
              <EmptyResourceImage />
              <label>
                <div>Items:</div>
                <h3>Select</h3>
              </label>
            </EmptyResourceWithData>
            <div>
              <SelectionPopper />
            </div>
          </>
        )}
        {selectedItemKeys.length > 0 && (
          <ItemSelectionWrapper>
            <div>
              <ItemsList>
                {selectedItemKeys.map((resourceId, x) => (
                  <ResourceImage
                    key={resourceId}
                    badge={`${selectedItems[resourceId].toLocaleString()} t`}
                    resource={resources[resourceId]}
                    progress={selectedItems[resourceId] / inventory[resourceId]} />
                ))}
              </ItemsList>
            </div>
            <div>
              <div>{selectedItemKeys.length} item{selectedItemKeys.length === 1 ? '' : 's'}</div>
              {status === 'BEFORE' && <SelectionPopper />}
            </div>
          </ItemSelectionWrapper>
        )}
      </SectionBody>
    </Section>
  );
};

export const DestinationPlotSection = ({ asteroid, destinationPlot, futureFlag, onDestinationSelect, originPlot, status }) => {
  const buildings = useBuildingAssets();  // TODO: probably more consistent to move this up a level
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((plot) => () => {
    setClicked((x) => x + 1);
    if (onDestinationSelect) onDestinationSelect(plot);
  }, []);

  const destinationBuilding = useMemo(() => {
    if (destinationPlot?.building) {
      return buildings[destinationPlot.building?.assetId];
    }
    return null;
  }, [destinationPlot?.building]);

  const capacity = getCapacityUsage(destinationBuilding, destinationPlot?.building?.inventories, 1);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Destination</SectionTitle>
      <SectionBody>
        {futureFlag && <FutureSectionOverlay />}
        {destinationBuilding
          ? (
            <Destination status={status}>
              <BuildingImage
                building={destinationBuilding}
                inventories={destinationPlot?.building?.inventories}
                showInventoryStatusForType={1} />
              <label>
                <h3>{destinationBuilding?.name}</h3>
                <div>{asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {destinationPlot.i.toLocaleString()}</b></div>
                <div />
                {status === 'BEFORE' && (
                  <div>
                    <b>{formatCapacity(capacity.volume.reserved + capacity.volume.used)}</b> / {formatCapacity(capacity.volume.max)} m<sup>3</sup>
                    <br/>
                    <b>{formatCapacity(capacity.mass.reserved + capacity.mass.used)}</b> / {formatCapacity(capacity.mass.max)} tonnes
                  </div>
                )}
              </label>
            </Destination>
          )
          : (
            <EmptyResourceWithData>
              <EmptyBuildingImage />
              <label>
                <div>Location:</div>
                <h3>Select</h3>
              </label>
            </EmptyResourceWithData>
          )
        }
        {status === 'BEFORE' && (
          <div style={{ display: 'flex' }}>
            {/* TODO: (select on map)
              <IconButtonRounded style={{ marginRight: 6 }}>
                <TargetIcon />
              </IconButtonRounded>
            */}
            <Poppable label="Select" buttonWidth="135px" title="Select Destination" closeOnChange={clicked}>
              <DestinationSelection asteroid={asteroid} onClick={onClick} originPlotId={originPlot.i} />
            </Poppable>
          </div>
        )}
      </SectionBody>
    </Section>
  );
};

export const BuildingPlanSection = ({ building, cancelling, gracePeriodEnd, onBuildingSelected, status }) => {
  const [clicked, setClicked] = useState(0);
  const _onBuildingSelected = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onBuildingSelected) onBuildingSelected(id);
  }, []);

  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Building Plan</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {!building && (
          <EmptyResourceWithData>
            <EmptyBuildingImage iconOverride={<LayBlueprintIcon />} />
            <label>
              <div>Site Plan:</div>
              <h3>Select</h3>
            </label>
          </EmptyResourceWithData>
        )}
        {building && (
          <BuildingPlan>
            <BuildingImage building={building} unfinished />
            <label>
              <h3>{building.name}</h3>
              <b>Site Plan</b>
            </label>
          </BuildingPlan>
        )}
        {status === 'BEFORE' && (
          <>
            {cancelling && (
              <>
                <span style={{ color: theme.colors.error, textAlign: 'right' }}>On-site materials<br/>will be abandoned</span>
                <span style={{ color: theme.colors.error, fontSize: '175%', lineHeight: '1em', marginLeft: 8, marginRight: 8 }}><WarningOutlineIcon /></span>
              </>
            )}
            {gracePeriodEnd && !cancelling && (
              <AbandonmentTimer>
                <div>Abandonment Timer:</div>
                <h3><LiveTimer target={gracePeriodEnd} /> <WarningOutlineIcon /></h3>
              </AbandonmentTimer>
            )}
            {!gracePeriodEnd && !cancelling && (
              <Poppable label="Select" closeOnChange={clicked} buttonWidth="135px" title="Site Plan">
                <BlueprintSelection onBuildingSelected={_onBuildingSelected} />
              </Poppable>
            )}
          </>
        )}
        {status === 'AFTER' && (
          <CompletedHighlight />
        )}
      </SectionBody>
    </Section>
  );
}

export const BuildingRequirementsSection = ({ isGathering, label, building, resources }) => {
  const gatheringComplete = isGathering && !ingredients.find(([tally, i, hasTally]) => hasTally < tally);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> {label}</SectionTitle>
      <SectionBody>
        <FutureSectionOverlay />
        <IngredientsList empty={!building}>
          {building && (
            <>
              {ingredients.map(([tally, i, hasTally]) => (
                <ResourceRequirement
                  key={i}
                  isGathering={isGathering}
                  hasTally={hasTally}
                  needsTally={tally}
                  resource={resources[i]} />
              ))}
              {!gatheringComplete && (
                <MouseoverIcon
                  icon={(<WarningOutlineIcon />)}
                  iconStyle={{ alignSelf: 'center', fontSize: '150%', marginLeft: 5 }}
                  themeColor={isGathering ? theme.colors.yellow : theme.colors.main}>
                  After placing a site, the required construction materials must be transfered to the location before construction can begin.
                </MouseoverIcon>
              )}
            </>
          )}
          {!building && [0,1,2].map((i) => (
            <EmptyResourceImage key={i} iconOverride={<ConstructIcon />} />
          ))}
        </IngredientsList>
      </SectionBody>
    </Section>
  );
};

export const DeconstructionMaterialsSection = ({ label, resources, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> {label}</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        <FutureSectionOverlay />
        <IngredientsList>
          {ingredients.map(([tally, i, hasTally]) => (
            <ResourceImage key={i}
              badge={`+${tally}`}
              badgeColor={theme.colors.main}
              outlineColor={borderColor}
              resource={resources[i]} />
          ))}
        </IngredientsList>
        {status === 'AFTER' && <><Spacer /><CompletedHighlight /></>}
      </SectionBody>
    </Section>
  );
};

export const ExtractionAmountSection = ({ extractionTime, min, max, amount, resource, setAmount }) => {
  const tonnage = useMemo(() => amount * resource?.massPerUnit || 0, [amount, resource]);
  const volume = useMemo(() => amount * resource?.volumePerUnit || 0, [amount, resource]);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Slider</SectionTitle>
      <SectionBody>
        <SliderWrapper>
          <SliderInfoRow>
            <SliderLabel>
              <b>{formatSampleMass(tonnage)}</b> tonnes
            </SliderLabel>
            <ButtonRounded disabled={amount === max} onClick={() => setAmount(max)}>Max</ButtonRounded>
          </SliderInfoRow>
          <SliderInput
            min={min}
            max={max}
            increment={resource ? (0.1 / resource?.massPerUnit) : 1}
            onChange={setAmount}
            value={amount} />
          <SliderInfoRow style={{ marginTop: -5 }}>
            <div>{formatSampleVolume(volume)} m<sup>3</sup></div>
            <div>{formatTimer(extractionTime)}</div>
          </SliderInfoRow>
        </SliderWrapper>
      </SectionBody>
    </Section>
  );
}

export const ActionDialogHeader = ({ action, asteroid, onClose, plot, status, startTime, targetTime }) => {
  const { captain } = useCrew();

  const timer = useRef();
  const [progress, setProgress] = useState(0);
  const updateProgress = useCallback(() => {
    if (startTime && targetTime) {
      const newProgress = Math.min(100, 100 * (getAdjustedNow() - startTime) / (targetTime - startTime));
      setProgress(newProgress);

      // NOTE: targetTime, startTime are in seconds, so below is already 1/1000th of progress interval
      // (which is appropriate since displayed in 0.1% increments)
      if (newProgress < 100) {
        timer.current = setTimeout(updateProgress, Math.max(10, Math.ceil(targetTime - startTime)));
      }
    } else {
      setProgress(0);
    }
  }, [startTime, targetTime]);
  useEffect(() => {
    updateProgress();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    }
  }, [updateProgress]);
  
  return (
    <>
      {status === 'DURING' && (
        <LoadingBar progress={progress}>{action.label}: {(progress || 0).toFixed(1)}%</LoadingBar>
      )}
      {status === 'AFTER' && (
        <LoadingBar progress={progress}>Finalize {action.completeLabel}</LoadingBar>
      )}
      <CloseButton backgroundColor={status !== 'BEFORE' && 'black'} onClick={onClose} borderless>
        <CloseIcon />
      </CloseButton>
      <Header backgroundSrc={action.headerBackground}>
        <HeaderSectionBody>
          <HeaderInfo padTop={status !== 'BEFORE'}>
            <Title>
              {status === 'BEFORE' && <>{action.actionIcon} {action.label.toUpperCase()}</>}
              {status === 'DURING' && <><RingLoader color={theme.colors.main} size="1em" /> <span style={{ marginLeft: 40 }}><LiveTimer target={targetTime} /></span></>}
              {status === 'AFTER' && `${action.completeLabel.toUpperCase()} ${action.completeStatus.toUpperCase()}`}
            </Title>
            <Subtitle>
              {asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()} ({plot.building?.name || 'Empty Lot'})</b>
            </Subtitle>
            {captain && action.crewRequirement && (
              <CrewInfo requirement={action.crewRequirement} status={status}>
                <CrewRequirement />
                <CardContainer>
                  <CrewCard
                    crew={captain}
                    hideHeader
                    hideFooter
                    hideMask />
                </CardContainer>
              </CrewInfo>
            )}
          </HeaderInfo>
        </HeaderSectionBody>
      </Header>
    </>
  );
};

const ActionDialogStat = ({ stat: { label, value, direction, tooltip, warning }}) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <StatRow
      key={label}
      direction={direction}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={refEl}>
      <label>{label}</label>
      <span>
        {value}
      </span>
      {tooltip && (
        <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
          <MouseoverContent>
            {tooltip}
          </MouseoverContent>
        </MouseoverInfoPane>
      )}
      {warning && (
        <MouseoverIcon icon={<WarningOutlineIcon />} iconStyle={{ fontSize: '125%', marginLeft: 5 }} themeColor={theme.colors.error}>
          {warning}
        </MouseoverIcon>
      )}
    </StatRow>
  );
};

export const ActionDialogStats = ({ stats, status }) => (
  <>
    {stats?.length > 0 && (
      <StatSection status={status}>
        <SectionBody>
          {[0,1].map((statGroup) => (
            <div key={statGroup}>
              {(statGroup === 0
                ? stats.slice(0, Math.ceil(stats.length / 2))
                : stats.slice(Math.ceil(stats.length / 2))
              ).map((stat) => <ActionDialogStat key={stat.label} stat={stat} />)}
            </div>
          ))}
        </SectionBody>
      </StatSection>
    )}
  </>
);


export const ActionDialogTimers = ({ actionReadyIn, crewAvailableIn }) => (
  <StatSection status="BEFORE">
    <SectionBody>
      <TimerRow>
        <div>
          <label>Crew Available In:</label>
          <h6>
            <CrewIcon />
            <span>{crewAvailableIn > 0 ? formatTimer(crewAvailableIn) : 'Immediately'}</span>
          </h6>
        </div>
        <div>
          <label>Action Ready In:</label>
          <h6>
            <TimerIcon />
            <span>{actionReadyIn > 0 ? formatTimer(actionReadyIn) : 'Immediately'}</span>
          </h6>
        </div>
      </TimerRow>
    </SectionBody>
  </StatSection>
);

export const ActionDialogFooter = ({ buttonsDisabled, buttonsLoading, buttonsOverride, finalizeLabel, goLabel, onClose, onFinalize, onGo, status }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // TODO: connect notifications to top-level state
  //  and use that state to evaluate which timers should be passed to service worker
  //  (we'll also need the ability to cancel those timers)

  // show unless already enabled
  const enableNotifications = useCallback(async () => {
    setNotificationsEnabled((x) => !x);
  }, []);

  return (
    <Footer>
      <SectionBody>
        {buttonsOverride
          ? buttonsOverride.map(({ label, onClick }) => (
            <Button key={label} disabled={buttonsDisabled} loading={buttonsLoading} onClick={onClick}>{label}</Button>
          ))
          : (
            <>
              {status === 'BEFORE' && (
                  <>
                    <NotificationEnabler onClick={enableNotifications}>
                      {notificationsEnabled ? <CheckedIcon /> : <UncheckedIcon />}
                      Notify on Completion
                    </NotificationEnabler>
                    <Spacer />
                    <Button disabled={buttonsDisabled} loading={buttonsLoading} onClick={onClose}>Cancel</Button>
                    <Button disabled={buttonsDisabled} loading={buttonsLoading} isTransaction onClick={onGo}>{goLabel}</Button>
                  </>
                )}
              {status === 'DURING' && (
                <Button disabled={buttonsDisabled} loading={buttonsLoading} onClick={onClose}>{'Close'}</Button>
              )}
              {status === 'AFTER' && (
                <Button disabled={buttonsDisabled} loading={buttonsLoading} onClick={onFinalize}>{finalizeLabel || 'Accept'}</Button>
              )}
            </>
          )}
        
      </SectionBody>
    </Footer>
  );
};

//
// bonus tooltips
//

const Bonuses = styled.div`
  font-size: 95%;
  padding: 0px 15px;
`;
const BonusesHeader = styled.div`
  border-bottom: 1px solid ${borderColor};
  color: white;
  font-weight: bold;
  padding-bottom: 12px;
  text-transform: uppercase;
`;
const BonusesSection = styled.div`
  margin: 0 0 20px;
  &:last-child {
    margin-bottom: 0;
  }
  & table {
    border-collapse: collapse;
    width: 100%;
    & th {
      font-weight: normal;
      text-align: left;
    }
    & td {
      color: white;
      text-align: right;
      &:last-child {
        padding-right: 0;
      }
    }
    & th, & td {
      padding: 5px 10px 5px 0;
      white-space: nowrap;
    }
  }
`;
const BonusItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 5px 0;

  & > span {
    font-weight: bold;
    white-space: nowrap;

    ${p => p.direction !== 0 && `
      color: ${p.direction > 0 ? p.theme.colors.success : p.theme.colors.error};
      ${!p.noIcon && `
        &:after {
          content: "${p.direction > 0 ? '▲' : '▼'}";
          display: inline-block;
          font-size: 7px;
          padding-left: 3px;
          vertical-align: middle;
        }
      `}
    `}
  }
`;
const BonusesSectionHeader = styled(BonusItem)`
  border-bottom: 1px solid ${borderColor};
  color: white;
`;

const BonusesFootnote = styled.div`
  color: ${p => p.warning ? p.theme.colors.orange : p.theme.colors.main};
  font-size: 95%;
  margin-top: -5px;
`;

const BonusTooltip = ({ bonus, crewRequired, details, hideFooter, title, titleValue }) => {
  const { titles, traits, totalBonus } = bonus;
  const titleDirection = getBonusDirection({ totalBonus });

  const bonuses = useMemo(() => {
    const x = [];
    if (bonus.class?.classId) {
      const { matches, multiplier, classId } = bonus.class;
      x.push({
        text: `${Crewmate.getClass(classId)?.name} on Crew (x${matches})`,
        multiplier,
        direction: 1
      });
    }
    Object.keys(titles || {}).map((titleId) => {
      const { matches, bonus, /* bonusPerMatch */ } = titles[titleId];
      x.push({
        text: `${Crewmate.getTitle(titleId)?.name} on Crew (x${matches})`,
        bonus,
        direction: getBonusDirection({ totalBonus: 1 - bonus }, false)
      });
    });
    Object.keys(traits || {}).map((traitId) => {
      const { matches, bonus, /* bonusPerMatch */ } = traits[traitId];
      x.push({
        text: `${Crewmate.getTrait(traitId)?.name} (x${matches})`,
        bonus,
        direction: getBonusDirection({ totalBonus: 1 - bonus }, false)
      });
    });
    return x.sort((a, b) => b.bonus - a.bonus);
  }, [titles, traits]);

  return (
    <Bonuses>
      {(bonus !== 1 || !details) && (
        <>
          <BonusesHeader>Bonuses</BonusesHeader>
          <BonusesSection>
            <BonusesSectionHeader direction={titleDirection}>
              <label>{title}</label>
              <span>{titleValue}</span>
            </BonusesSectionHeader>
            {bonuses.map(({ text, bonus, multiplier, direction }) => (
              <BonusItem key={text} direction={direction} noIcon>
                <label>{text}</label>
                <span>{multiplier ? `x${multiplier}` : `${-100 * bonus}%`}</span>
              </BonusItem>
            ))}
          </BonusesSection>
        </>
      )}
      {details && (
        <>
          <BonusesHeader>{details.title}</BonusesHeader>
          <BonusesSection>
            <table>
              <tbody>
                {details.rows.map(([label, ...items]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {items.map((item) => <td key={item}>{item}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </BonusesSection>
        </>
      )}
      {crewRequired === 'duration' && (
        <BonusesFootnote warning>
          NOTE: Actions requiring a crew for the duration begin as soon as your crew reaches its destination and end once the crew has finished the task.
        </BonusesFootnote>
      )}
      {crewRequired === 'start' && (
        <BonusesFootnote>
          NOTE: Actions requiring a crew to start will begin as soon as your crew reaches its destination.
        </BonusesFootnote>
      )}
    </Bonuses>
  );
};

export const MaterialBonusTooltip = ({ bonus, title, titleValue, ...props }) => (
  <BonusTooltip
    {...props}
    bonus={bonus}
    title={title}
    titleValue={titleValue}
  />
);

export const TimeBonusTooltip = ({ bonus, title, totalTime, ...props }) => (
  <BonusTooltip
    {...props}
    bonus={bonus}
    title={title}
    titleValue={formatTimer(totalTime)}
  />
);

export const TravelBonusTooltip = ({ bonus, totalTime, tripDetails, ...props }) => {
  return (
    <BonusTooltip
      {...props}
      bonus={bonus}
      details={{ title: "Trip Details", rows: tripDetails }}
      title="Crew Travel Time"
      titleValue={formatTimer(totalTime)}
    />
  );
};


//
// utils
// 

const timerIncrements = {
  d: 86400,
  h: 3600,
  m: 60,
  s: 1
};
export const formatTimer = (secondsRemaining, maxPrecision = null) => {
  let remainder = secondsRemaining;
  const parts = Object.keys(timerIncrements).reduce((acc, k) => {
    if (acc.length > 0 || remainder >= timerIncrements[k] || timerIncrements[k] === 1) {
      const unit = Math.floor(remainder / timerIncrements[k]);
      remainder = remainder % timerIncrements[k];
      acc.push(`${unit}${k}`);
    }
    return acc;
  }, []);
  if (maxPrecision) return parts.slice(0, maxPrecision).join(' ');
  return parts.join(' ');
};

export const formatFixed = (value, maxPrecision = 0) => {
  const div = 10 ** maxPrecision;
  return (Math.round((value || 0) * div) / div).toLocaleString();
};

export const formatSampleMass = (tonnage) => {
  return formatFixed(tonnage, 1);
};

export const formatSampleVolume = (volume) => {
  return formatFixed(volume, 1);
};

export const getBonusDirection = ({ totalBonus }, biggerIsBetter = true) => {
  if (totalBonus === 1) return 0;
  return (biggerIsBetter === totalBonus > 1) ? 1 : -1;
};

export const getTripDetails = (asteroidId, crewTravelBonus, startingLotId, steps) => {
  let currentLocation = startingLotId;
  let totalDistance = 0;
  let totalTime = 0;

  const tripDetails = steps.map(({ label, plot, skipTo }) => {
    const stepDistance = Asteroid.getLotDistance(asteroidId, currentLocation, plot);
    const stepTime = Asteroid.getLotTravelTime(asteroidId, currentLocation, plot, crewTravelBonus);
    currentLocation = skipTo || plot;

    // agg
    totalDistance += stepDistance;
    totalTime += stepTime;

    // format
    return [
      `${label}:`,
      `${Math.round(stepDistance)}km`,
      formatTimer(stepTime)
    ];
  });
  return { totalDistance, totalTime, tripDetails };
};