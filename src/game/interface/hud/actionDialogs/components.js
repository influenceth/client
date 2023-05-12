import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { FiCrosshair as TargetIcon } from 'react-icons/fi';
import {
  BsChevronDoubleDown as ChevronDoubleDownIcon,
  BsChevronDoubleUp as ChevronDoubleUpIcon,
} from 'react-icons/bs';
import {
  TbBellRingingFilled as AlertIcon
} from 'react-icons/tb';
import { RingLoader, PuffLoader } from 'react-spinners';
import { Asteroid, Capable, Construction, Crewmate, Inventory } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import ButtonRounded, { IconButtonRounded } from '~/components/ButtonRounded';
import CrewCard from '~/components/CrewCard';
import IconButton from '~/components/IconButton';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CrewIcon,
  PlanBuildingIcon,
  LocationIcon,
  PlusIcon,
  ResourceIcon,
  TimerIcon,
  WarningOutlineIcon,
  SurfaceTransferIcon
} from '~/components/Icons';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import Poppable from '~/components/Popper';
import ResourceColorIcon from '~/components/ResourceColorIcon';
import { ResourceThumbnailWrapper, ResourceImage, ResourceProgress } from '~/components/ResourceThumbnail';
import ResourceRequirement from '~/components/ResourceRequirement';
import ResourceSelection from '~/components/ResourceSelection';
import SliderInput from '~/components/SliderInput';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import theme, { hexToRGB } from '~/theme';
import useChainTime from '~/hooks/useChainTime';
import { formatFixed, formatTimer, keyify } from '~/lib/utils';
import LiveTimer from '~/components/LiveTimer';
import NavIcon from '~/components/NavIcon';
import CrewCardFramed from '~/components/CrewCardFramed';
import { usePopper } from 'react-popper';
import { createPortal } from 'react-dom';
import ClipCorner from '~/components/ClipCorner';
import Dialog from '~/components/Dialog';
import actionStage from '~/lib/actionStages';
import { theming } from '../ActionDialog';
import ReactTooltip from 'react-tooltip';

const SECTION_WIDTH = 780;

const borderColor = '#333';

const Spacer = styled.div`
  flex: 1;
`;
export const Section = styled.div`
  color: #777;
  margin-top: 15px;
  padding: 0 36px;
  width: ${SECTION_WIDTH}px;
`;

const FlexSectionInputContainer = styled.div`
  width: 50%;
`;

export const FlexSectionSpacer = styled.div`
  align-items: center;
  align-self: stretch;
  display: flex;
  font-size: 20px;
  justify-content: center;
  margin-top: 26px;
  width: 32px;
`;

const sectionBodyCornerSize = 15;
const FlexSectionInputBody = styled.div`
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${sectionBodyCornerSize}px),
    calc(100% - ${sectionBodyCornerSize}px) 100%,
    0 100%
  );
  padding: 8px 16px 8px 8px;
  position: relative;
  transition-properties: background, border-color;
  transition-duration: 250ms;
  transition-function: ease;
  & > svg {
    transition: stroke 250ms ease;
  }

  ${p => p.isSelected ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.18);
      border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.7);
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.7);
      }
    `
    : `
      background: rgba(${p.theme.colors.mainRGB}, 0.1);
      border: 1px solid transparent;
      & > svg {
        stroke: transparent;
      }
    `
  }

  ${p => p.onClick && `
    cursor: ${p.theme.cursors.active};
    &:hover {
      background: rgba(${p.theme.colors.mainRGB}, 0.25) !important;
      border-color: rgba(${p.theme.colors.mainRGB}, 0.9) !important;
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.9) !important;
      }
    }
  `};

  ${p => p.style?.borderColor && `
    & > svg {
      stroke: ${p.style?.borderColor};
    }
  `}
`;
const FlexSectionInputBodyInner = styled.div`
  height: 92px;
`;


export const FlexSection = styled(Section)`
  align-items: flex-end;
  display: flex;
`;
export const SectionTitle = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  font-size: 90%;
  line-height: 1.5em;
  margin-bottom: 8px;
  padding: 0 2px 4px;
  text-transform: uppercase;
  transition: border-color 250ms ease, margin-bottom 250ms ease;
  white-space: nowrap;
  & > svg {
    font-size: 150%;
    margin-left: -26px;
    transform: rotate(0);
    transition: transform 250ms ease;
  }

  ${p => p.isDetailsHeader && `
    border-color: transparent;
    color: white;
    cursor: ${p.theme.cursors.active};
    font-size: 18px;
    margin-bottom: 0;
    &:hover {
      opacity: 0.9;
    }

    ${p.isOpen && `
      border-color: ${borderColor};
      margin-bottom: 8px;
      & > svg { transform: rotate(90deg); }
    `}
  `}

  ${p => p.note && `
    &:after {
      content: "${p.note}";
      display: block;
      flex: 1;
      text-align: right;
      text-transform: none;
    }
  `}
`;
export const SectionBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  position: relative;
  transition: max-height 250ms ease;
  ${p => p.highlight && `
    background: rgba(${p.theme.colors.mainRGB}, 0.2);
    border-radius: 10px;
    margin: 10px 0;
    padding-left: 15px;
    padding-right: 15px;
  `}
  ${p => p.collapsible && `
    overflow: hidden;
    max-height: ${p.isOpen ? '400px' : '0'};
  `}
`;

export const SublabelBanner = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.color)}, 0.3);
  color: white;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 15px),
    calc(100% - 15px) 100%,
    0 100%
  );
  display: flex;
  flex-direction: row;
  font-size: 26px;
  margin-top: 8px;
  padding: 10px 10px;
  width: 100%;

  b {
    color: rgba(${p => hexToRGB(p.color)}, 0.8);
    padding-right: 10px;
  }
`;

const IconAndLabel = styled.div`
  display: flex;
  flex: 1;
`;
const IconContainer = styled.div`
  font-size: 48px;
  padding: 0 10px;
`;
const TimePill = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.type === 'crew' ? p.theme.colors.purple : p.theme.colors.success)}, 0.4);
  border-radius: 20px;
  color: white;
  display: flex;
  margin-left: 4px;
  padding: 3px 12px;
  text-align: center;
  text-transform: none;
  & > svg {
    color: ${p => p.type === 'crew' ? p.theme.colors.purple : p.theme.colors.success};
    opacity: 0.7;
    margin-right: 4px;
  }
`;
const LabelContainer = styled.div`
  flex: 1;
  text-transform: uppercase;
  h1 {
    align-items: flex-end;
    color: white;
    display: flex;
    font-weight: normal;
    font-size: 36px;
    height: 48px;
    line-height: 36px;
    margin: 0;
  }
  & > div {
    align-items: center;
    display: flex;
    h2 {
      font-size: 18px;
      flex: 1;
      margin: 6px 0 0;
    }
    ${TimePill} {
      margin-top: 3px;
    }
  }
`;
const Header = styled(Section)`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding-bottom: 5px;
  padding-top: 5px;
  position: relative;
  ${p => p.theming?.highlight && `
    ${IconContainer}, h2 {
      color: ${p.theming.highlight};
    }
  `}
`;

export const ActionDialogBody = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
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
    color: ${p => {
      if (p.isTimeStat && p.direction < 0) return p.theme.colors.error;
      if (p.isTimeStat && p.direction > 0) return p.theme.colors.success;
      if (p.direction > 0) return p.theme.colors.success;
      if (p.direction < 0) return p.theme.colors.error;
      return 'white';
    }};
    font-weight: bold;
    white-space: nowrap;
    &:after {
      content: "${p => {
        if (!p.direction) return ' —';
        if ((p.isTimeStat ? -1 : 1) * p.direction > 0) return ' ▲';
        return ' ▼';
      }}";
      font-size: 50%;
      padding-left: 2px;
      vertical-align: middle;
    }
  }
`;
const StatSection = styled(Section)`
  min-height: 0;
  & ${SectionBody} {
    align-items: flex-start;
    display: flex;
    font-size: 15px;
    & > div {
      flex: 1;
      &:last-child {
        border-left: 1px solid ${borderColor};
        margin-left: 15px;
        padding-left: 15px;
      }
    }
  }
`;

const Footer = styled(Section)`
  margin-top: 8px;
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
  color: #777;
  display: flex;
  flex: 1;
  position: relative;
  & > label {
    flex: 1;
    font-size: 14px;
    padding-left: 15px;
    & > h3 {
      color: white;
      font-size: 18px;
      font-weight: normal;
      margin: 0 0 4px;
    }
    & > footer {
      bottom: 0;
      color: ${p => p.theme.colors.main};
      position: absolute;
    }
  }
`;

const EmptyThumbnail = styled.div`
  color: ${borderColor};
  font-size: 40px;
  & > svg {
    left: 50%;
    margin-left: -20px;
    margin-top: -20px;
    position: absolute;
    top: 50%;
  }
`;
const BuildingThumbnailWrapper = styled(ResourceThumbnailWrapper)`
  height: 92px;
  width: 150px;
  & ${EmptyThumbnail} {
    font-size: 50px;
    & > svg {
      margin-left: -25px;
      margin-top: -25px;
    }
  }
`;
const ThumbnailOverlay = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  position: absolute;
  width: 100%;
`;
const InventoryUtilization = styled(ResourceProgress)`
  bottom: 8px;
  &:last-child {
    bottom: 3px;
  }
`;

const SliderLabel = styled.div`
  flex: 1;
  height: 33px;
  margin-bottom: -4px;
  & > b {
    color: white;
    font-size: 28px;
    font-weight: normal;
  }
`;
const SliderInfo = styled.div`
  color: white;
  font-size: 22px;
  line-height: 1em;
  margin-right: 8px;
`;

const SliderTextInput = styled.input`
  background: transparent;
  border: 1px solid ${borderColor};
  color: white;
  font-family: inherit;
  font-size: 26px;
  height: 33px;
  text-align: right;
  width: 120px;
`;

const SliderWrapper = styled.div`
  flex: 1;
`;
const SliderInfoRow = styled.div`
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  & > button {
    padding: 5px 25px;
  }
  & > div:last-child {
    text-align: right;
  }
`;

const IngredientsList = styled(FlexSectionInputBody)`
  ${p => p.theming === 'warning' && `
    background: rgba(${hexToRGB(p.theme.colors.lightOrange)}, 0.15);
  `}
  ${p => p.theming === 'success' && `
    background: rgba(${p.theme.colors.successRGB}, 0.15);
  `}
  column-gap: 5px;
  display: grid;
  grid-template-columns: repeat(7, 95px);
  padding: 5px;
  position: relative;
  row-gap: 5px;
  width: 100%;
  ${p => p.hasSummary && `padding-bottom: 36px;`}
  ${p => p.onClick && `
    ${ResourceThumbnailWrapper} {
      background: rgba(0, 0, 0, 0.5);
    }
  `}
`;

const DialogIngredientsList = styled(IngredientsList)`
  background: transparent;
  grid-template-columns: repeat(6, 95px);
`;

const IngredientSummary = styled.div`
  display: flex;
  justify-content: center;
  pointer-events: none;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  & > span {
    background:
      ${p => p.theming === 'warning' && `rgba(${hexToRGB(p.theme.colors.lightOrange)}, 0.45)`}
      ${p => p.theming === 'success' && `rgba(${p.theme.colors.successRGB}, 0.2)`}
      ${p => (!p.theming || p.theming === 'default') && `rgba(${p.theme.colors.mainRGB}, 0.45)`}
    ;
    color: white;
    padding: 5px 32px;
  }
`;
const SelectionTableRow = styled.tr`
  ${p => p.disabledRow && `
    opacity: 0.33;
    pointer-events: none;
  `}
  ${p => p.selectedRow && `
    & > td,
    &:hover > td {
      background: rgba(${p.theme.colors.mainRGB}, 0.3) !important;
    }
  `}
`;
const SelectionTableWrapper = styled.div`
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
      color: #aaa;
      font-size: 14px;
      & > tr > td {
        border-bottom: 1px solid ${borderColor};
      }
    }

    & tbody {
      color: white;
      font-size: 16px;
      & > tr {
        cursor: ${p => p.theme.cursors.active};
        &:hover > td {
          background: #222;
        }
      }
    }
  }
`;

export const MouseoverContent = styled.div`
  & b {
    color: ${p => p.highlightColor || 'white'};
    white-space: nowrap;
  }
  color: #999;
  font-size: 90%;
  padding-bottom: 15px;
`;

const SelectionTitle = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderColor};
  display: flex;
  flex: 0 0 60px;
  justify-content: space-between;
  margin: 0 20px 0 20px;
  position: relative;
  z-index: 1;
  & > div {
    border-left: 2px solid ${p => p.theme.colors.main};
    font-size: 20px;
    height: 36px;
    line-height: 36px;
    padding-left: 10px;
    text-transform: uppercase;
    & > b {
      font-weight: normal;
      opacity: 0.5;
    }
  }
`;
const SelectionBody = styled.div`
  flex: 1;
  overflow: hidden auto;
  margin: 10px 0;
  padding: 0 20px;
`;

const SelectionButtons = styled.div`
  align-items: center;
  border-top: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  flex: 0 0 60px;
  justify-content: flex-end;
  padding-right: 0px;
  margin: 0 20px 0 20px;
  & > button {
    margin-top: 0;
    margin-left: 10px;
    &:first-child {
      margin-left: 0;
    }
  }
`;

const selectionDialogCornerSize = 20;
const dialogCss = css`
  border: 1px solid ${borderColor};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${selectionDialogCornerSize}px),
    calc(100% - ${selectionDialogCornerSize}px) 100%,
    0 100%
  );
  display: flex;
  flex-direction: column;
  max-height: 80%;
  max-width: ${SECTION_WIDTH - 60}px;
  overflow: hidden;
  position: relative;
`;

const SelectionGrid = styled.div`
  column-gap: 10px;
  display: grid;
  grid-template-columns: calc(50% - 5px) calc(50% - 5px);
  row-gap: 10px;
  width: 100%;
`;


const gradientWidth = 23;
const gradientAngle = 135;
const gradientAngleSine = Math.sin(Math.PI * gradientAngle / 180);
const widthOverSine = gradientWidth / gradientAngleSine;
const actionProgressBarAnimation = keyframes`
  0% { background-position: ${widthOverSine}px 0; }
`;
const ActionProgress = styled.div.attrs((p) => ({
  style: {
    filter: p.progress >= 1 ? 'brightness(0.45)' : undefined,
    opacity: p.progress >= 1 ? '1' : undefined,
    width: `${100 * p.progress}%`
  }
}))`
  transition: all 250ms ease;
`;
const ActionProgressLabels = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 20px;
  justify-content: space-between;
  padding: 0 12px;
  & > div:first-child {
    text-transform: uppercase;
  }
`;
const ActionProgressWrapper = styled.div`
  border: 1px solid ${borderColor};
  padding: 8px;
`;
const ActionProgressContainer = styled.div`
  height: 34px;
  width: 100%;
  position: relative;
  z-index: 0;

  &:before, ${ActionProgress}, ${ActionProgressLabels} {
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: -1;
  }

  &:before {
    content: "";
    ${p => p.animating && css`
      animation: ${actionProgressBarAnimation} 1s linear infinite ${p.reverseAnimation ? '' : 'reverse'};
    `}
    background: repeating-linear-gradient(
      ${gradientAngle}deg,
      ${p => p.color || '#ffffff'} 0,
      ${p => p.color || '#ffffff'} 16px,
      transparent 16px,
      transparent ${gradientWidth}px
    );
    background-size: ${widthOverSine}px 100%;
    opacity: 0.1;
  }

  ${ActionProgress} {
    background: ${p => p.color};
    opacity: 0.4;
  }
  ${ActionProgressLabels} {
    color: ${p => p.labelColor || p.color};
  }
`;

export const SelectionDialog = ({ children, isCompletable, open, onClose, onComplete, title }) => {
  if (!open) return null;
  return createPortal(
    <Dialog opaque dialogCss={dialogCss}>
      <ReactTooltip id="selectionDialog" effect="solid" />
      <SelectionTitle>
        <div>{title}</div>
        <IconButton backgroundColor={`rgba(0, 0, 0, 0.15)`} marginless onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </SelectionTitle>
      <SelectionBody>
        <div>{children}</div>
      </SelectionBody>
      <SelectionButtons style={{ position: 'relative'}}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onComplete} disabled={!isCompletable}>Done</Button>
      </SelectionButtons>
      <ClipCorner color={borderColor} dimension={selectionDialogCornerSize} />
    </Dialog>,
    document.body
  );
};

export const SitePlanSelectionDialog = ({ initialSelection, onClose, onSelected, open }) => {
  const buildings = useBuildingAssets();

  const [selection, setSelection] = useState(initialSelection);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  return (
    <SelectionDialog
      isCompletable={selection > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title="Select Site Type">
      <SelectionGrid>
        {Object.keys(buildings).filter((c) => c > 0).map((capableType) => (
          <FlexSectionInputBlock
            key={capableType}
            fullWidth
            image={<BuildingImage building={buildings[capableType]} unfinished />}
            isSelected={capableType === selection}
            label={buildings[capableType].name}
            sublabel="Site"
            onClick={() => setSelection(capableType)}
            style={{ width: '100%' }}
          />
        ))}
      </SelectionGrid>
    </SelectionDialog>
  );
};

export const ResourceSelectionDialog = ({ abundances, lotId, resources, initialSelection, onClose, onSelected, open }) => {
  const [selection, setSelection] = useState(initialSelection);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  const nonzeroAbundances = useMemo(() => Object.values(abundances).filter((x) => x > 0).length, [abundances]);

  return (
    <SelectionDialog
      isCompletable={selection > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={`Lot #${(lotId || 0).toLocaleString()}`}>
      {/* TODO: replace with DataTable? */}
      <SelectionTableWrapper>
        <table>
          <thead>
            <tr>
              <td>{(nonzeroAbundances || 0).toLocaleString()} Available Resource{nonzeroAbundances === 1 ? '' : 's'}</td>
              <td>Abundance at Lot</td>
            </tr>
          </thead>
          <tbody>
            {Object.keys(abundances)
              .sort((a, b) => abundances[b] - abundances[a])
              .map((resourceId) => (
                <SelectionTableRow
                  key={`${resourceId}`}
                  disabledRow={abundances[resourceId] === 0}
                  onClick={() => setSelection(resourceId)}
                  selectedRow={selection === Number(resourceId)}>
                  <td><ResourceColorIcon category={resources[resourceId].category} /> {resources[resourceId].name}</td>
                  <td>{(100 * abundances[resourceId]).toFixed(1)}%</td>
                </SelectionTableRow>
              ))
            }
          </tbody>
        </table>
      </SelectionTableWrapper>
    </SelectionDialog>
  );
}

export const CoreSampleSelectionDialog = ({ lotId, options, resources, initialSelection, onClose, onSelected, open }) => {
  const [selection, setSelection] = useState(initialSelection);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  return (
    <SelectionDialog
      isCompletable={selection?.sampleId > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={`Lot #${(lotId || 0).toLocaleString()}`}>
      {/* TODO: replace with DataTable? */}
      <SelectionTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Resource</td>
              <td>Deposit Amount</td>
            </tr>
          </thead>
          <tbody>
            {options.sort((a, b) => b.remainingYield - a.remainingYield).map((sample) => (
              <SelectionTableRow
                key={`${sample.resourceId}_${sample.sampleId}`}
                onClick={() => setSelection(sample)}
                selectedRow={selection?.resourceId === sample.resourceId && selection?.sampleId === sample.sampleId}>
                <td><ResourceColorIcon category={resources[sample.resourceId].category} /> {resources[sample.resourceId].name} #{sample.sampleId.toLocaleString()}</td>
                <td>{formatSampleMass(sample.remainingYield * resources[sample.resourceId].massPerUnit)} tonnes</td>
              </SelectionTableRow>
            ))}
          </tbody>
        </table>
      </SelectionTableWrapper>
    </SelectionDialog>
  );
};

// TODO: pass options?
export const DestinationSelectionDialog = ({
  asteroid,
  includeDeconstruction, // includes deconstructed origin's site plan as an option
  originLotId,
  initialSelection,
  onClose,
  onSelected,
  open
}) => {
  const { data: crewLots, isLoading } = useAsteroidCrewLots(asteroid.i);
  const [selection, setSelection] = useState(initialSelection);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);
  
  const inventories = useMemo(() => {
    return (crewLots || [])
      .filter((lot) => (includeDeconstruction && lot.i === originLotId) || (
        lot.building
        && lot.i !== originLotId // not the origin

        && Inventory.CAPACITIES[lot.building.capableType][1]
        && lot.building.construction?.status === Construction.STATUS_OPERATIONAL
        // && Inventory.CAPACITIES[lot.building.capableType][inventoryType] // building has inventoryType
        // && ( // building is built (or this is construction inventory and building is planned)
        //   (inventoryType === 0 && lot.building.construction?.status === Construction.STATUS_PLANNED)
        //   || (inventoryType !== 0 && lot.building.construction?.status === Construction.STATUS_OPERATIONAL)
        // )
      ))
      .map((lot) => {
        let capacity, usedMass = 0, usedVolume = 0, type;
        if (includeDeconstruction && lot.i === originLotId) {
          capacity = { ...Inventory.CAPACITIES[lot.building.capableType][0] };
          type = `(empty lot)`;
        } else {
          const inventory = (lot.building?.inventories || {})[1];
          capacity = { ...Inventory.CAPACITIES[lot.building.capableType][1] };
          usedMass = ((inventory?.mass || 0) + (inventory?.reservedMass || 0)) / 1e6;
          usedVolume = ((inventory?.volume || 0) + (inventory?.reservedVolume || 0)) / 1e6;
          type = lot.building?.__t || 'Empty Lot';
        }

        const availMass = capacity.mass - usedMass;
        const availVolume = capacity.volume - usedVolume;
        const fullness = Math.max(
          1 - availMass / capacity.mass,
          1 - availVolume / capacity.volume,
        ) || 0;

        return {
          lot,
          distance: Asteroid.getLotDistance(asteroid.i, originLotId, lot.i) || 0,
          type,
          fullness,
          availMass,
          availVolume
        };
      })
      .sort((a, b) => a.distance - b.distance)
  }, [crewLots, originLotId]);

  return (
    <SelectionDialog
      isCompletable={selection?.i > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={`Origin Lot #${(originLotId || 0).toLocaleString()}`}>
      {/* TODO: isLoading */}
      {/* TODO: replace with DataTable? */}
      <SelectionTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Destination</td>
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
                <SelectionTableRow
                  key={`${asteroid.i}_${inventory.lot.i}`}
                  disabled={inventory.fullness >= 1}
                  onClick={() => setSelection(inventory.lot)}
                  selectedRow={inventory.lot.i === Number(selection?.i)}>
                  <td>{inventory.lot.i === originLotId ? '(in place)' : `Lot #${inventory.lot.i}`}</td>
                  <td>{formatFixed(inventory.distance, 1)} km</td>
                  <td>{inventory.type}</td>
                  <td style={{ color: warningColor }}>{(100 * inventory.fullness).toFixed(1)}%</td>
                  <td style={{ color: warningColor }}>{formatFixed(inventory.availMass)} t</td>
                  <td style={{ color: warningColor }}>{formatFixed(inventory.availVolume)} m<sup>3</sup></td>
                </SelectionTableRow>
              );
            })}
          </tbody>
        </table>
      </SelectionTableWrapper>
    </SelectionDialog>
  );
}

export const TransferSelectionDialog = ({ requirements, inventory, lot, resources, initialSelection, onClose, onSelected, open }) => {
  const [selection, setSelection] = useState({});

  useEffect(() => {
    setSelection({ ...initialSelection });
  }, [initialSelection]);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  const onSelectItem = useCallback((resourceId) => (selectedAmount) => {
    setSelection((currentlySelected) => {
      const updated = {...currentlySelected};
      if (selectedAmount > 0) {
        updated[resourceId] = selectedAmount;
      } else {
        delete updated[resourceId];
      }
      return updated;
    });
  }, []);

  const cells = useMemo(() => [...Array(6 * Math.max(2, Math.ceil(Object.keys(inventory).length / 6))).keys()], [inventory]);
  const items = useMemo(() => Object.keys(inventory).map((resourceId) => ({
    selected: selection[resourceId],
    available: inventory[resourceId],
    resource: resources[resourceId],
    maxSelectable: requirements
      ? Math.min(inventory[resourceId], requirements.find((r) => r.i === Number(resourceId))?.inNeed || 0)
      : inventory[resourceId]
  })), [inventory, requirements, selection]);

  const { tally, totalMass, totalVolume } = useMemo(() => {
    return items.reduce((acc, { selected, resource }) => {
      acc.tally += selected > 0 ? 1 : 0;
      acc.totalMass += (selected || 0) * resource.massPerUnit * 1e6;
      acc.totalVolume += (selected || 0) * (resource.volumePerUnit || 0) * 1e6;
      return acc;
    }, { tally: 0, totalMass: 0, totalVolume: 0 });
  }, [items]);

  return (
    <SelectionDialog
      isCompletable
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={<>{lot?.building?.__t} Inventory <b>{'> '}Lot {(lot?.i || 0).toLocaleString()}</b></>}>
      <DialogIngredientsList>
        {cells.map((i) => (
          items[i]
            ? (
              <ResourceSelection
                key={i}
                item={items[i]}
                onSelectItem={onSelectItem(items[i].resource.i)} />
            )
            : (
              <EmptyResourceImage
                key={i}
                backgroundColor="#111"
                outlineColor="#111"
                noIcon />
            )
        ))}
        <IngredientSummary>
          <span>
            {tally > 0
              ? `${tally} Items: ${formatMass(totalMass)} | ${formatVolume(totalVolume)}`
              : `None Selected`
            }
          </span>
        </IngredientSummary>
      </DialogIngredientsList>
    </SelectionDialog>
  );
};


//
//  FORMATTERS
//

const getCapacityUsage = (building, inventories, type) => {
  const capacity = {
    mass: { max: 0, used: 0, reserved: 0 },
    volume: { max: 0, used: 0, reserved: 0 },
  }
  if (building && type !== undefined) {
    let { mass: maxMass, volume: maxVolume } = Inventory.CAPACITIES[building.i][type];
    capacity.mass.max = maxMass * 1e6; // TODO: it seems like this mult should be handled in CAPACITIES
    capacity.volume.max = maxVolume * 1e6;

    const { reservedMass, reservedVolume, mass, volume } = (inventories || {})[type] || {};
    capacity.mass.used = (mass || 0);
    capacity.mass.reserved = (reservedMass || 0);
    capacity.volume.used = (volume || 0);
    capacity.volume.reserved = (reservedVolume || 0);
  }
  return capacity;
}

export const getBuildingRequirements = (building) => {
  const { capableType, inventories = [], deliveries = [] } = building || {};
  
  // TODO: remove this fallback (just for dev)
  const ingredients = Capable.TYPES[capableType || 0].buildingRequirements || [
    [700, 5, 700], [700, 9, 500], [400, 22, 0],
    // [700, 2, 0], [700, 7, 0], [400, 23, 0], [700, 24, 0], [700, 69, 0], [400, 45, 0],
  ];

  // TODO: presumably ingredients will come from sdk per building
  return ingredients.map(([tally, i]) => {
    const totalRequired = tally;
    const inInventory = i === 5 ? tally : //tally || // TODO: remove `tally ||`
      (inventories[0]?.resources || [])[i] || 0;
    const inTransit = deliveries
      .filter((d) => d.status === 'IN_PROGRESS')
      .reduce((acc, cur) => acc + cur.resources[i] || 0, 0);
    return {
      i,
      totalRequired,
      inInventory,
      inTransit,
      inNeed: Math.max(0, totalRequired - inInventory - inTransit)
    };
  })
};


//
// SUB-COMPONENTS
//

export const BuildingImage = ({ building, iconOverlay, inventories, showInventoryStatusForType, unfinished }) => {
  if (!building) return null;
  const capacity = getCapacityUsage(building, inventories, showInventoryStatusForType);
  return (
    <BuildingThumbnailWrapper>
      <ResourceImage src={building[unfinished ? 'siteIconUrls' : 'iconUrls']?.w150} />
      {showInventoryStatusForType !== undefined && (
        <>
          <InventoryUtilization
            progress={capacity.volume.used / capacity.volume.max}
            secondaryProgress={(capacity.volume.reserved + capacity.volume.used) / capacity.volume.max}
             />
          <InventoryUtilization
            progress={capacity.mass.used / capacity.mass.max}
            secondaryProgress={(capacity.mass.reserved + capacity.mass.used) / capacity.mass.max}
             />
        </>
      )}
      {iconOverlay && <ThumbnailOverlay>{iconOverlay}</ThumbnailOverlay>}
      <ClipCorner dimension={10} />
    </BuildingThumbnailWrapper>
  );
};

export const EmptyBuildingImage = ({ iconOverride }) => (
  <BuildingThumbnailWrapper>
    <EmptyThumbnail>{iconOverride || <LocationIcon />}</EmptyThumbnail>
    <ClipCorner dimension={10} />
  </BuildingThumbnailWrapper>
);

export const EmptyResourceImage = ({ iconOverride, noIcon, ...props }) => (
  <ResourceThumbnailWrapper {...props}>
    <EmptyThumbnail>{noIcon ? null : (iconOverride || <PlusIcon />)}</EmptyThumbnail>
    <ClipCorner dimension={10} />
  </ResourceThumbnailWrapper>
);

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

//
// COMPONENTS
//

export const ActionDialogHeader = ({ action, captain, crewAvailableTime, stage, taskCompleteTime }) => {
  return (
    <Header theming={theming[stage]}>
      {captain && (
        <CrewCardFramed
          crewmate={captain}
          isCaptain
          width={75} />
      )}
      <IconAndLabel>
        <IconContainer>{action.icon}</IconContainer>
        <LabelContainer>
          <h1>{action.label}</h1>
          <div>
            <h2>{action.status || theming[stage]?.label}</h2>
            {crewAvailableTime !== undefined && <TimePill type="crew"><CrewIcon /> {formatTimer(crewAvailableTime, 2)}</TimePill>}
            {taskCompleteTime !== undefined && <TimePill type="total"><AlertIcon /> {formatTimer(taskCompleteTime, 2)}</TimePill>}
          </div>
        </LabelContainer>
      </IconAndLabel>
    </Header>
  );
};

export const FlexSectionInputBlock = ({ bodyStyle, children, disabled, image, isSelected, label, onClick, style = {}, sublabel, title, tooltip }) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <>
      {tooltip && (
        <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
          <MouseoverContent highlightColor={theme.colors.lightOrange}>
            {tooltip}
          </MouseoverContent>
        </MouseoverInfoPane>
      )}
      <FlexSectionInputContainer style={style}>
        {title && <SectionTitle>{title}</SectionTitle>}
        <FlexSectionInputBody
          isSelected={isSelected}
          onClick={disabled ? null : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          ref={refEl}
          style={bodyStyle}>
          {children && (
            <FlexSectionInputBodyInner>
              {children}
            </FlexSectionInputBodyInner>
          )}
          {!children && (
            <ThumbnailWithData>
              {image}
              <label>
                <h3>{label}</h3>
                {sublabel && <b>{sublabel}</b>}
              </label>
            </ThumbnailWithData>
          )}
          <ClipCorner dimension={sectionBodyCornerSize} />
        </FlexSectionInputBody>
      </FlexSectionInputContainer>
    </>
  );
};



//
// Sections
//

const ResourceGridSection = ({
  isGathering,
  items,
  label,
  onClick,
  resources,
  noCellStyles,
  theming = 'default'
}) => {
  const { totalItems, totalMass, totalVolume } = useMemo(() => {
    return items.reduce((acc, { i, numerator, denominator, selected }) => {
      let sumValue = numerator;
      if (selected !== undefined) sumValue = selected;
      else if (denominator !== undefined) sumValue = denominator;

      acc.totalItems += (selected === undefined || selected > 0) ? 1 : 0;
      acc.totalMass += sumValue * resources[i].massPerUnit * 1e6;
      acc.totalVolume += sumValue * (resources[i].volumePerUnit || 0) * 1e6;
      return acc;
    }, { totalItems: 0, totalMass: 0, totalVolume: 0 });
  }, [items]);

  return (
    <Section>
      <SectionTitle>{label}</SectionTitle>
      <SectionBody>
        {/* TODO: <FutureSectionOverlay /> */}
        <IngredientsList
          hasSummary
          theming={theming}
          isSelected={onClick || undefined}
          onClick={onClick}>
          {items.length > 0
            ? (
              <>
                {items.map((item) => (
                  <ResourceRequirement
                    key={item.i}
                    isGathering={isGathering}
                    item={item}
                    resource={resources[item.i]}
                    noStyles={noCellStyles}
                    size="95px"
                    tooltipContainer="actionDialog" />
                ))}
                <IngredientSummary theming={theming}>
                  <span>
                    {totalItems} Items: {formatMass(totalMass)} | {formatVolume(totalVolume)}
                  </span>
                </IngredientSummary>
              </>
            )
            : (
              <>
                <div style={{ height: 92 }}>
                  <ThumbnailWithData style={{ marginLeft: 4, position: 'absolute' }}>
                    <EmptyResourceImage />
                    <label>
                      <h3>Select</h3>
                      <b>Items</b>
                    </label>
                  </ThumbnailWithData>
                </div>
                <IngredientSummary>
                  <span>None Selected</span>
                </IngredientSummary>
              </>
            )}
          <ClipCorner dimension={sectionBodyCornerSize} />
        </IngredientsList>
      </SectionBody>
    </Section>
  );
};

export const BuildingRequirementsSection = ({ mode, label, requirements, requirementsMet, resources }) => {
  const items = useMemo(() => {
    return requirements.map((item) => ({
      i: item.i,
      numerator: item.inInventory + item.inTransit,
      denominator: item.totalRequired,
      customIcon: item.inTransit > 0
        ? {
          animated: true,
          icon: <SurfaceTransferIcon />
        }
        : undefined
    }));
  }, [requirements]);

  return (
    <ResourceGridSection
      isGathering={mode === 'gathering'}
      items={items}
      label={label}
      resources={resources}
      theming={requirementsMet ? undefined : 'warning'} />
  );
};

export const TransferBuildingRequirementsSection = ({ label, onClick, requirements, resources, selectedItems }) => {
  const items = useMemo(() => requirements.map((item) => ({
    i: item.i,
    numerator: item.inInventory + item.inTransit + (selectedItems[item.i] || 0),
    denominator: item.totalRequired,
    requirementMet: (item.inInventory + item.inTransit) >= item.totalRequired,
    selected: selectedItems[item.i] || 0,
    customIcon: item.inTransit > 0
      ? {
        animated: true,
        icon: <SurfaceTransferIcon />
      }
      : undefined
  })), [requirements, selectedItems]);

  return (
    <ResourceGridSection
      isGathering
      items={items}
      selectedItems={selectedItems}
      label={label}
      onClick={onClick}
      resources={resources} />
  );
};

export const DeconstructionMaterialsSection = ({ label, itemsReturned, resources }) => {
  const items = useMemo(() => {
    return itemsReturned.map((item) => ({
      i: item.i,
      customIcon: { icon: <PlusIcon /> },
      numerator: item.totalRequired
    }));
  }, [itemsReturned]);

  return (
    <ResourceGridSection
      items={items}
      label={label}
      resources={resources} />
  );
};

export const ItemSelectionSection = ({ label, items, onClick, resources, stage }) => {
  const formattedItems = useMemo(() => {
    return Object.keys(items || {}).map((resourceId) => ({
      i: resourceId,
      numerator: items[resourceId]
    }));
  }, [items]);

  return (
    <ResourceGridSection
      items={formattedItems}
      label={label}
      noCellStyles={stage !== actionStage.NOT_STARTED}
      onClick={onClick}
      resources={resources}
      theming={stage === actionStage.READY_TO_COMPLETE ? 'success' : 'default'} />
  );
};

export const ProgressBarSection = ({
  completionTime,
  isCountDown,
  overrides = {
    barColor: null,
    color: null,
    left: '',
    right: ''
  },
  stage,
  startTime,
  title,
  tooltip,
  totalTime
}) => {
  const chainTime = useChainTime();

  const refEl = useRef();
  const [hovered, setHovered] = useState();
  
  const { animating, barWidth, color, left, reverseAnimation, right } = useMemo(() => {
    const r = {
      animating: false,
      reverseAnimation: false,
      barWidth: 0,
      color: null,
      left: '',
      right: '',
    }
    if (stage === actionStage.NOT_STARTED) {
      if (isCountDown) {
        const isZero = chainTime > completionTime;
        const progress = startTime && completionTime && chainTime
          ? Math.max(0, 1 - (chainTime - startTime) / (completionTime - startTime))
          : 1;
        r.animating = !isZero;
        r.reverseAnimation = true;
        r.barWidth = progress;
        r.left = `${formatFixed(100 * progress, 1)}%`;
        r.right = isZero
          ? <span style={{ color: theme.colors.error }}>ABANDONED</span>
          : <><LiveTimer target={completionTime} maxPrecision={2} /> left</>;
      }
      r.color = '#AAA';
      r.left = '0.0%';
    } else if (stage === actionStage.STARTING) {
      r.animating = true;
      r.color = '#AAA';
      r.left = '0.0%';
    } else if (stage === actionStage.IN_PROGRESS) {
      const progress = startTime && completionTime && chainTime
        ? Math.min(1, (chainTime - startTime) / (completionTime - startTime))
        : 0;
      r.animating = true;
      r.barWidth = progress;
      r.color = '#FFF';
      r.left = `${formatFixed(100 * progress, 1)}%`;
      r.right = <LiveTimer target={completionTime} />
    } else if (stage === actionStage.READY_TO_COMPLETE) {
      r.barWidth = 1;
      r.color = '#FFF';
      r.left = '100%';
    } else if (stage === actionStage.COMPLETING) {
      r.animating = true;
    } else if (stage === actionStage.COMPLETED) {
      r.barWidth = 1;
      r.color = '#FFF';
    }
    return r;
  }, [chainTime, completionTime, stage, startTime]);

  const totalTimeNote = useMemo(() => {
    if (!totalTime) return '';
    if ([actionStage.NOT_STARTED, actionStage.COMPLETING, actionStage.COMPLETED].includes(stage)) return '';
    return `TOTAL: ${formatTimer(totalTime, 2)}`;
  }, [stage, totalTime]);

  return (
    <Section>
      <SectionTitle note={totalTimeNote}>{title}</SectionTitle>
      {tooltip && (
        <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
          <MouseoverContent>
            {tooltip}
          </MouseoverContent>
        </MouseoverInfoPane>
      )}
      <ActionProgressWrapper>
        <ActionProgressContainer
          animating={animating}
          color={overrides.barColor || theming[stage].highlight}
          labelColor={overrides.color || color || undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          ref={refEl}
          reverseAnimation={reverseAnimation}>
          <ActionProgress progress={barWidth || 0} />
          <ActionProgressLabels>
            <div>{overrides.left || left}</div>
            <div>{overrides.right || right}</div>
          </ActionProgressLabels>
        </ActionProgressContainer>
      </ActionProgressWrapper>
    </Section>
  );
};

export const ExtractionAmountSection = ({ amount, extractionTime, min, max, resource, setAmount }) => {
  const tonnage = useMemo(() => amount * resource?.massPerUnit || 0, [amount, resource]);
  const tonnageValue = useMemo(() => Math.round(1e3 * tonnage) / 1e3, [tonnage]);

  const [focusOn, setFocusOn] = useState();
  const [mouseIn, setMouseIn] = useState(false);

  const onFocusEvent = useCallback((e) => {
    if (e.type === 'focus') {
      setFocusOn(true);
      e.target.select();
    } else {
      setFocusOn(false);
    }
  }, []);

  const onMouseEvent = useCallback((e) => {
    setMouseIn(e.type === 'mouseenter')
  }, []);

  const onChangeInput = (e) => {
    let quanta = Math.round(e.currentTarget.value / resource.massPerUnit);
    if (quanta > max) quanta = max;
    if (quanta < min) quanta = min;
    setAmount(quanta);
  };
  return (
    <SliderWrapper>
      <SliderInfoRow>
        <SliderLabel onMouseEnter={onMouseEvent} onMouseLeave={onMouseEvent}>
          {(mouseIn || focusOn) ? (
            <SliderTextInput
              type="number"
              step={0.1}
              value={tonnageValue}
              onChange={onChangeInput}
              onBlur={onFocusEvent}
              onFocus={onFocusEvent} />
            )
            : (
              <b>{formatSampleMass(tonnage)}</b>
            )
          }
          {' '}
          tonnes
        </SliderLabel>
        <SliderInfo>{formatTimer(extractionTime, 3)}</SliderInfo>
        <Button
          disabled={amount === max}
          onClick={() => setAmount(max)}
          size="small"
          style={{ padding: 0, minWidth: 75 }}>Max</Button>
      </SliderInfoRow>
      <SliderInput
        min={min}
        max={max}
        increment={resource ? (0.1 / resource?.massPerUnit) : 1}
        onChange={setAmount}
        value={amount || 0} />
    </SliderWrapper>
  );
}


const ActionDialogStat = ({ stat: { isTimeStat, label, value, direction, tooltip, warning }}) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <StatRow
      key={label}
      direction={direction}
      isTimeStat={isTimeStat || undefined}
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

export const ActionDialogStats = ({ stage, stats }) => {
  const [open, setOpen] = useState();

  useEffect(() => {
    setOpen(stage === actionStage.NOT_STARTED);
  }, [stage]);

  if (!stats?.length) return null;
  return (
    <StatSection actionStage={stage}>
      <SectionTitle
        isDetailsHeader
        isOpen={open}
        onClick={() => setOpen((o) => !o)}>
        <ChevronRightIcon /> Details
      </SectionTitle>
      <SectionBody collapsible isOpen={open}>
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
  );
};

export const ActionDialogFooter = ({ buttonsLoading, disabled, finalizeLabel, goLabel, onClose, onFinalize, onGo, stage }) => {
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
        {/* TODO: ...
          <NotificationEnabler onClick={enableNotifications}>
            {notificationsEnabled ? <CheckedIcon /> : <UncheckedIcon />}
            Notify on Completion
          </NotificationEnabler>
        */}
        <Spacer />
        
        {stage === actionStage.NOT_STARTED
          ? (
            <>
              <Button
                loading={buttonsLoading}
                onClick={onClose}>Cancel</Button>
              <Button
                isTransaction
                disabled={disabled}
                loading={buttonsLoading}
                onClick={onGo}>{goLabel}</Button>
            </>
          )
          : (
              stage === actionStage.READY_TO_COMPLETE
              ? (
                <>
                  <Button
                    loading={buttonsLoading}
                    onClick={onClose}>Close</Button>
                  <Button
                    isTransaction
                    disabled={disabled}
                    loading={buttonsLoading}
                    onClick={onFinalize}>{finalizeLabel || 'Accept'}</Button>
                </>
              )
              : (
                <Button
                  loading={buttonsLoading}
                  onClick={onClose}>Close</Button>
              )
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
          content: "${(p.flip ? -1 : 1) * p.direction > 0 ? '▲' : '▼'}";
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

const BonusTooltip = ({ bonus, crewRequired, details, title, titleValue, isTimeStat }) => {
  const { titles, traits, others, totalBonus } = bonus;
  const timeMult = isTimeStat ? -1 : 1;
  const titleDirection = getBonusDirection({ totalBonus });

  const bonuses = useMemo(() => {
    const x = [];
    if (bonus.class?.classId) {
      const { matches, multiplier, classId } = bonus.class;
      x.push({
        text: `${Crewmate.getClass(classId)?.name} on Crew (x${matches})`,
        multiplier,
        direction: getBonusDirection({ totalBonus: multiplier })
      });
    }
    Object.keys(titles || {}).map((titleId) => {
      const { matches, bonus, /* bonusPerMatch */ } = titles[titleId];
      x.push({
        text: `${Crewmate.getTitle(titleId)?.name} on Crew (x${matches})`,
        bonus,
        direction: getBonusDirection({ totalBonus: 1 + timeMult * bonus }, !isTimeStat)
      });
    });
    Object.keys(traits || {}).map((traitId) => {
      const { matches, bonus, /* bonusPerMatch */ } = traits[traitId];
      x.push({
        text: `${Crewmate.getTrait(traitId)?.name} (x${matches})`,
        bonus,
        direction: getBonusDirection({ totalBonus: 1 + timeMult * bonus }, !isTimeStat)
      });
    });
    (others || []).forEach(({ text, bonus, direction }) => {
      x.push({ text, bonus, direction });
    });

    return x.sort((a, b) => b.bonus - a.bonus);
  }, [titles, traits]);

  return (
    <Bonuses>
      {(bonus !== 1 || !details) && (
        <>
          <BonusesHeader>Bonuses</BonusesHeader>
          <BonusesSection>
            <BonusesSectionHeader direction={titleDirection} flip={isTimeStat}>
              <label>{title}</label>
              <span>{titleValue}</span>
            </BonusesSectionHeader>
            {bonuses.map(({ text, bonus, multiplier, direction }) => {
              let bonusLabel;
              if (multiplier) {
                bonusLabel = `x${isTimeStat ? (Math.round(1000 / multiplier) / 1000) : multiplier}`;
              } else {
                bonusLabel = `${timeMult > 0 ? '+' : '-'}${formatFixed(100 * bonus, 1)}%`;
              }
              return (
                <BonusItem key={text} direction={direction} noIcon>
                  <label>{text}</label>
                  <span>{bonusLabel}</span>
                </BonusItem>
              );
            })}
          </BonusesSection>
        </>
      )}
      {details && details.rows && (
        <>
          <BonusesHeader>{details.title}</BonusesHeader>
          <BonusesSection>
            <table>
              <tbody>
                {(details.rows || []).map(([label, ...items]) => (
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
    isTimeStat
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
      isTimeStat
      title="Crew Travel Time"
      titleValue={formatTimer(totalTime)}
    />
  );
};


//
// utils
//

export const formatSampleMass = (tonnage) => {
  return formatFixed(tonnage, 1);
};

export const formatSampleVolume = (volume) => {
  return formatFixed(volume, 1);
};

export const getBonusDirection = ({ totalBonus }, biggerIsBetter = true) => {
  if (totalBonus === 1) return 0;
  return (biggerIsBetter === (totalBonus > 1)) ? 1 : -1;
};

export const getTripDetails = (asteroidId, crewTravelBonus, startingLotId, steps) => {
  let currentLocation = startingLotId;
  let totalDistance = 0;
  let totalTime = 0;

  const tripDetails = steps.map(({ label, lot, skipTo }) => {
    const stepDistance = Asteroid.getLotDistance(asteroidId, currentLocation, lot) || 0;
    const stepTime = Asteroid.getLotTravelTime(asteroidId, currentLocation, lot, crewTravelBonus) || 0;
    currentLocation = skipTo || lot;

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

export const formatResourceAmount = (units, resourceId, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  const { massPerUnit } = Inventory.RESOURCES[resourceId];

  if (massPerUnit === 0.001) {
    return formatResourceMass(units, resourceId, { abbrev, minPrecision, fixedPrecision });
  }
  // granular units
  return units.toLocaleString();
};

export const formatResourceMass = (units, resourceId, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  return formatMass(
    resourceId
      ? units * Inventory.RESOURCES[resourceId].massPerUnit * 1e6
      : 0,
    { abbrev, minPrecision, fixedPrecision }
  );
}

export const formatMass = (grams, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (grams >= 1e18) {
    return `${(grams / 1e3).toExponential((fixedPrecision || minPrecision || 1) - 1)} ${abbrev ? 'kg' : 'kilograms'}`;
  } else if (grams >= 1e15) {
    scale = 1e15;
    unitLabel = abbrev ? 'Gt' : 'gigatonnes';
  } else if (grams >= 1e12) {
    scale = 1e12;
    unitLabel = abbrev ? 'Mt' : 'megatonnes';
  } else if (grams >= 1e9) {
    scale = 1e9;
    unitLabel = abbrev ? 'kt' : 'kilotonnes';
  } else if (grams >= 1e6 || grams === 0) {
    scale = 1e6;
    unitLabel = abbrev ? 't' : 'tonnes';
  } else if (grams >= 1e3) {
    scale = 1e3;
    unitLabel = abbrev ? 'kg' : 'kilograms';
  } else {
    scale = 1;
    unitLabel = abbrev ? 'g' : 'grams';
  }

  const workingUnits = (grams / scale);
  // console.log('workingUnits', workingUnits);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      // console.log('x', workingUnits * 10 ** fixedPlaces, 10 ** minPrecision);
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)} ${unitLabel}`;
};

export const formatResourceVolume = (units, resourceId, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  return formatVolume(
    resourceId
      ? units * Inventory.RESOURCES[resourceId].volumePerUnit * 1e6
      : 0,
    { abbrev, minPrecision, fixedPrecision }
  );
}

export const formatVolume = (ml, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (ml >= 1e6 || ml === 0) {
    scale = 1e6;
    unitLabel = abbrev ? 'm³' : 'cubic meters';
  } else if (ml >= 1e3) {
    scale = 1e3;
    unitLabel = abbrev ? 'L' : 'liters';
  } else {
    scale = 1;
    unitLabel = abbrev ? 'mL' : 'milliliters';
  }

  const workingUnits = (ml / scale);
  // console.log('workingUnits', workingUnits);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      // console.log('x', workingUnits * 10 ** fixedPlaces, 10 ** minPrecision);
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)} ${unitLabel}`;
};