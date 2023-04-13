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
import { Asteroid, Construction, Crewmate, Inventory } from '@influenceth/sdk';

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
  WarningOutlineIcon
} from '~/components/Icons';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import Poppable from '~/components/Popper';
import ResourceColorIcon from '~/components/ResourceColorIcon';
import ResourceThumbnail, { ResourceThumbnailWrapper, ResourceImage, ResourceProgress } from '~/components/ResourceThumbnail';
import ResourceRequirement from '~/components/ResourceRequirement';
import SliderInput from '~/components/SliderInput';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import theme, { hexToRGB } from '~/theme';
import useChainTime from '~/hooks/useChainTime';
import { formatFixed, formatTimer } from '~/lib/utils';
import LiveTimer from '~/components/LiveTimer';
import NavIcon from '~/components/NavIcon';
import CrewCardFramed from '~/components/CrewCardFramed';
import { usePopper } from 'react-popper';
import { createPortal } from 'react-dom';
import ClipCorner from '~/components/ClipCorner';
import Dialog from '~/components/Dialog';
import actionStage from '~/lib/actionStages';
import { theming } from '../ActionDialog';

const SECTION_WIDTH = 780;

const borderColor = '#333';

const Spacer = styled.div`
  flex: 1;
`;
const Section = styled.div`
  color: #777;
  margin-top: 15px;
  padding: 0 36px;
  width: ${SECTION_WIDTH}px;
`;

const FlexSectionInputContainer = styled.div`
  width: 50%;
`;

export const FlexSectionSpacer = styled.div`
  width: 32px;
`;

const sectionBodyCornerSize = 15;
const FlexSectionInputBody = styled.div`
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 15px),
    calc(100% - 15px) 100%,
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
      background: rgba(${p => p.theme.colors.mainRGB}, 0.25);
      border-color: rgba(${p => p.theme.colors.mainRGB}, 0.9);
      & > svg {
        stroke: rgba(${p => p.theme.colors.mainRGB}, 0.9);
      }
    }
  `};
`;


export const FlexSection = styled(Section)`
  align-items: center;
  display: flex;
`;
const SectionTitle = styled.div`
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
const SectionBody = styled.div`
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

const SelectionPopperContent = styled.div`
  background: black;
  border: 1px solid #222;
  box-shadow: 0 0 10px rgba(${p => p.theme.colors.mainRGB}, 0.8);
  margin-left: -180px;
  margin-top: 20px;
  padding: 15px;
  width: 540px;
  & > div:first-child {
    h1 {
      border-left: 3px solid ${p => p.theme.colors.main};
      color: white;
      font-size: 20px;
      font-weight: normal;
      margin: 0 0 15px;
      padding: 5px 12px;
      text-transform: uppercase;
    }
    border-bottom: 1px solid ${borderColor};
  }
  & > h1 {
  }
  & > div:last-child {
    max-height: 400px;
    overflow-x: hidden;
    overflow-y: auto;
  }
`;
const PoppableInner = styled.div`
  pointer-events: all;
`;

const ClickAwayListener = styled.div`
  background: transparent;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
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
      if (p.isTimeStat && p.direction > 0) return p.theme.colors.error;
      if (p.isTimeStat && p.direction < 0) return p.theme.colors.success;
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
const InventoryUtilization = styled(ResourceProgress)`
  bottom: 8px;
  &:last-child {
    bottom: 3px;
  }
`;

const SliderLabel = styled.div`
  height: 33px;
  margin-bottom: -4px;
  & > b {
    color: white;
    font-size: 28px;
    font-weight: normal;
  }
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

const ReadyIconWrapper = styled.div`
  align-self: stretch;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: column;
  font-size: 30px;
  justify-content: center;
  margin-bottom: -15px;
  margin-top: -15px;
  margin-right: 20px;
  position: relative;
`;
const CompletedIconWrapper = styled(ReadyIconWrapper)`
  font-size: 36px;
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
const IngredientsList = styled.div`
  background: rgba(${p => hexToRGB(p.theme.colors.lightOrange)}, 0.15);
  clip-path: polygon(
    0 0, 
    100% 0,
    100% calc(100% - 20px),
    calc(100% - 20px) 100%,
    0 100%
  );
  column-gap: 5px;
  display: grid;
  grid-template-columns: repeat(7, 95px);
  padding: 5px;
  position: relative;
  row-gap: 5px;
  width: 100%;
  ${p => p.hasSummary && `padding-bottom: 36px;`}
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
    background: rgba(${p => hexToRGB(p.mode === 'warning' ? p.theme.colors.lightOrange : p.theme.colors.main)}, 0.45);
    color: white;
    padding: 5px 32px;
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
const PopperFooter = styled.div`
  border-top: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding-top: 6px;
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
const PoppableTableRow = styled(SelectionTableRow);
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
const PoppableTableWrapper = styled(SelectionTableWrapper);
const TitleCell = styled.td`
  &:after {
    content: '${p => p.title}';
  }
`;
const TransferSelectionBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  max-height: calc(100% - 47px);
`;
const TransferSelectionTableWrapper = styled(PoppableTableWrapper)`
  border-width: 0;
  flex: 1 0 auto;
  max-height: 200px;

  &:first-child {
    border-top-width: 1px;
    flex: 0 1 100%;
    max-height: 100%;
  }
  &:not(:first-child) tbody {
    color: ${p => p.theme.colors.main};
  }

  td:nth-child(2) { width: 100px; }
  td:nth-child(3) { width: 112px; }
  td:nth-child(4) { width: 98px; }
  td:nth-child(5) { width: 135px; }
  td:nth-child(6) { width: 48px; }

  td {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & > table > thead > tr > ${TitleCell} {
    border-bottom: 0;
    padding: 0;
    &:before {
      content: '';
      border-top: 1px solid ${borderColor};
      display: block;
      height: 4px;
      margin-top: 24px;
    }
    &:after {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
      color: ${p => p.theme.colors.main};
      display: block;
      margin-bottom: 4px;
      padding: 4px 6px;
    }
  }
`;
const QuantaInput = styled.input`
  background: transparent;
  border: 1px solid white;
  color: white;
  font-family: inherit;
  text-align: right;
  width: 100px;
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
      animation: ${actionProgressBarAnimation} 1s linear infinite reverse;
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

export const CoreSampleSelectionDialog = ({ lotId, improvableSamples, resources, initialSelection, onClose, onSelected, open }) => {
  const [selection, setSelection] = useState(initialSelection);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  console.log(selection, improvableSamples);

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
            {improvableSamples.sort((a, b) => b.remainingYield - a.remainingYield).map((sample) => (
              <SelectionTableRow
                key={`${sample.resourceId}_${sample.sampleId}`}
                onClick={() => setSelection(sample)}
                selectedRow={selection.resourceId === sample.resourceId && selection.sampleId === sample.sampleId}>
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




const ingredients = [
  [700, 5, 700], [700, 19, 500], [400, 22, 0],
  // [700, 2, 0], [700, 7, 0], [400, 23, 0], [700, 24, 0], [700, 69, 0], [400, 45, 0],
];

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

const formatCapacity = (value) => {
  return formatFixed(value / 1e6, 1);
}


//
// SUB-COMPONENTS
//

export const BuildingImage = ({ building, inventories, showInventoryStatusForType, unfinished }) => {
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
            horizontal />
          <InventoryUtilization
            progress={capacity.mass.used / capacity.mass.max}
            secondaryProgress={(capacity.mass.reserved + capacity.mass.used) / capacity.mass.max}
            horizontal />
        </>
      )}
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

const ReadyHighlight = () => <ReadyIconWrapper><div><NavIcon animate selected /></div></ReadyIconWrapper>;

const CompletedHighlight = () => <CompletedIconWrapper><CheckIcon /></CompletedIconWrapper>;

export const EmptyResourceImage = ({ iconOverride }) => (
  <ResourceThumbnailWrapper>
    <EmptyThumbnail>{iconOverride || <PlusIcon />}</EmptyThumbnail>
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
// SELECTORS
//

export const SelectionPopper = ({ children, onClose, open, position = 'right', referenceEl, title, ...styleProps }) => {
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: `${position}-start`,
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: [position, position === 'right' ? 'left' : 'right'],
        },
      },
    ],
  });

  if (!children) return null;
  if (!open) return null;
  return (
    <>
      <ClickAwayListener onClick={onClose} />
      {createPortal(
        <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000 }} {...attributes.popper}>
          <SelectionPopperContent {...styleProps}>
            <div><h1>{title}</h1></div>
            <div>{children}</div>
          </SelectionPopperContent>
        </div>,
        document.body
      )}
    </>
  );
};

export const BuildingPlanSelection = ({ onBuildingSelected }) => {
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

const CoreSampleSelection = ({ onClick, options, lot, resources }) => {
  return (
    <PopperBody>
      <PoppableTitle>
        <h3>Lot #{(lot?.i || 0).toLocaleString()}</h3>
        <div>{(options.length || 0).toLocaleString()} Available Sample{options.length === 1 ? '' : 's'}</div>
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
              <tr key={`${sample.resourceId}_${sample.sampleId}`} onClick={onClick(sample)}>
                <td><ResourceColorIcon category={resources[sample.resourceId].category} /> {resources[sample.resourceId].name} #{sample.sampleId.toLocaleString()}</td>
                <td>{formatSampleMass(sample.remainingYield * resources[sample.resourceId].massPerUnit)} tonnes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
};

const DestinationSelection = ({ asteroid, inventoryType = 1, onClick, originLotId }) => {
  const { data: crewLots, isLoading } = useAsteroidCrewLots(asteroid.i);

  const inventories = useMemo(() => {
    return (crewLots || [])
      .filter((lot) => (
        lot.building
        && lot.i !== originLotId // not the origin
        && Inventory.CAPACITIES[lot.building.capableType][inventoryType] // building has inventoryType
        && ( // building is built (or this is construction inventory and building is planned)
          (inventoryType === 0 && lot.building.construction?.status === Construction.STATUS_PLANNED)
          || (inventoryType !== 0 && lot.building.construction?.status === Construction.STATUS_OPERATIONAL)
        )
      ))
      .map((lot) => {
        const capacity = { ...Inventory.CAPACITIES[lot.building.capableType][inventoryType] };

        const inventory = (lot.building?.inventories || {})[inventoryType];
        const usedMass = ((inventory?.mass || 0) + (inventory?.reservedMass || 0)) / 1e6;
        const usedVolume = ((inventory?.volume || 0) + (inventory?.reservedVolume || 0)) / 1e6;

        const availMass = capacity.mass - usedMass;
        const availVolume = capacity.volume - usedVolume;
        const fullness = Math.max(
          1 - availMass / capacity.mass,
          1 - availVolume / capacity.volume,
        );

        return {
          lot,
          distance: Asteroid.getLotDistance(asteroid.i, originLotId, lot.i) || 0,
          type: lot.building?.__t || 'Empty Lot',
          fullness,
          availMass,
          availVolume
        };
      })
      .sort((a, b) => a.distance - b.distance)
  }, [crewLots]);

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
                <tr key={`${asteroid.i}_${inventory.lot.i}`} onClick={onClick(inventory.lot)}>
                  <td>Lot #{inventory.lot.i}</td>
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

const ResourceSelection = ({ abundances, onSelect, lotId, resources }) => {
  const nonzeroAbundances = useMemo(() => Object.values(abundances).filter((x) => x > 0).length, [abundances]);
  return (
    <PopperBody>
      <PoppableTitle>
        <h3>Lot #{(lotId || 0).toLocaleString()}</h3>
        <div>{(nonzeroAbundances || 0).toLocaleString()} Available Resource{nonzeroAbundances === 1 ? '' : 's'}</div>
      </PoppableTitle>
      {/* TODO: replace with DataTable? */}
      <PoppableTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Resource</td>
              <td>Abundance at Lot</td>
            </tr>
          </thead>
          <tbody>
            {Object.keys(abundances)
              .sort((a, b) => abundances[b] - abundances[a])
              .map((resourceId) => (
              <PoppableTableRow key={`${resourceId}`} disabledRow={abundances[resourceId] === 0} onClick={onSelect(resourceId)}>
                <td><ResourceColorIcon category={resources[resourceId].category} /> {resources[resourceId].name}</td>
                <td>{(100 * abundances[resourceId]).toFixed(1)}%</td>
              </PoppableTableRow>
            ))}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
};

const TransferSelectionRow = ({ onUpdate, quanta, resource, selecting }) => {
  const [focusOn, setFocusOn] = useState();
  const [mouseIn, setMouseIn] = useState(false);
  const [amount, setAmount] = useState(quanta);

  const resourceId = Number(resource.i);

  useEffect(() => {
    setAmount(quanta);
  }, [quanta]);

  const onFocusEvent = useCallback((e) => {
    if (e.type === 'focus') {
      setFocusOn(true);
      setAmount(quanta);
      e.target.select();
    } else {
      setFocusOn(false);
    }
  }, [quanta]);

  const onMouseEvent = useCallback((e) => {
    setMouseIn(e.type === 'mouseenter')
  }, []);

  const onChange = useCallback((e) => {
    let newValue = parseInt(e.target.value.replace(/^0+/g, '').replace(/[^0-9]/g, ''));
    if (!(newValue > -1)) newValue = 0;
    if (newValue > quanta) newValue = quanta;
    setAmount(newValue);
  }, [quanta]);

  const onSubmit = useCallback(() => {
    const nAmount = parseInt(amount);
    if (nAmount > 0 && nAmount <= quanta) {
      onUpdate(resourceId, nAmount, selecting);
    }
  }, [amount, quanta, resourceId]);

  return (
    <tr key={resourceId} onMouseEnter={onMouseEvent} onMouseLeave={onMouseEvent}>
      <td>{resource.name}</td>
      <td>{resource.category}</td>
      <td>{formatResourceVolume(quanta, resourceId)}</td>
      <td>{formatResourceMass(quanta, resourceId)}</td>
      <td>
        {!(mouseIn || focusOn) && (
          <>
            {quanta.toLocaleString()}
          </>
        )}
        {(mouseIn || focusOn) && (
          <QuantaInput
            type="number"
            max={quanta}
            min={0}
            onBlur={onFocusEvent}
            onChange={onChange}
            onFocus={onFocusEvent}
            step={1}
            value={amount} />
        )}
        {resource.massPerUnit === 0.001 ? ' kg' : ''}
      </td>
      <td>
        <IconButtonRounded flatter onClick={onSubmit}>
          {selecting ? <ChevronDoubleDownIcon /> : <ChevronDoubleUpIcon />}
        </IconButtonRounded>
      </td>
    </tr>
  );
};

const TransferSelection = ({ inventory, onComplete, resources, selectedItems }) => {
  const [newSelectedItems, setNewSelectedItems] = useState({ ...selectedItems });

  const onUpdate = useCallback((resourceId, amount, isSelected) => {
    setNewSelectedItems((currentlySelected) => {
      const updated = {...currentlySelected};

      if (isSelected) {
        if (!updated[resourceId]) updated[resourceId] = 0;
        updated[resourceId] += amount;
      } else {
        updated[resourceId] -= amount;
        if (updated[resourceId] <= 0) delete updated[resourceId];
      }
      return updated;
    });
  }, []);

  const unselectedItems = useMemo(() => {
    return Object.keys(inventory).reduce((acc, cur) => {
      acc[cur] -= newSelectedItems[cur] || 0;
      if (acc[cur] <= 0) delete acc[cur];
      return acc;
    }, { ...inventory });
  }, [inventory, newSelectedItems]);

  return (
    <PopperBody>
      {/* TODO: see mockup for title area */}
      <TransferSelectionBody>
        <TransferSelectionTableWrapper>
          <table>
            <thead>
              <tr>
                <td>Item</td>
                <td>Category</td>
                <td>Volume</td>
                <td>Mass</td>
                <td>Quanta</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {Object.keys(unselectedItems).map((resourceId) => (
                <TransferSelectionRow
                  key={resourceId}
                  onUpdate={onUpdate}
                  quanta={unselectedItems[resourceId]}
                  resource={resources[resourceId]}
                  selecting={true}
                  />
              ))}
            </tbody>
          </table>
        </TransferSelectionTableWrapper>
        {Object.keys(newSelectedItems).length > 0 && (
          <TransferSelectionTableWrapper>
            <table>
              <thead>
                <tr><TitleCell colSpan="6" title="Selected" /></tr>
              </thead>
              <tbody>
                {Object.keys(newSelectedItems).map((resourceId) => (
                  <TransferSelectionRow
                    key={resourceId}
                    onUpdate={onUpdate}
                    quanta={newSelectedItems[resourceId]}
                    resource={resources[resourceId]}
                    selecting={false}
                    />
                ))}
              </tbody>
            </table>
          </TransferSelectionTableWrapper>
        )}
      </TransferSelectionBody>
      <PopperFooter>
        <Button onClick={() => onComplete(newSelectedItems)}>Done</Button>
      </PopperFooter>
    </PopperBody>
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

export const FlexSectionInputBlock = ({ disabled, image, isSelected, label, onClick, sublabel, title, style = {} }) => {
  return (
    <FlexSectionInputContainer style={style}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <FlexSectionInputBody onClick={disabled ? null : onClick} isSelected={isSelected}>
        <ThumbnailWithData>
          {image}
          <label>
            <h3>{label}</h3>
            {sublabel && <b>{sublabel}</b>}
          </label>
        </ThumbnailWithData>
        <ClipCorner dimension={sectionBodyCornerSize} />
      </FlexSectionInputBody>
    </FlexSectionInputContainer>
  );

};



//
// Sections
//

export const ExistingSampleSection = ({ improvableSamples, lot, onSelectSample, selectedSample, resources, overrideTonnage, status }) => {
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
            <ResourceThumbnail resource={resource} />
            <label>
              <h3>{resource?.name} Deposit #{selectedSample.sampleId.toLocaleString()}{(status === 'AFTER' && overrideTonnage) ? ' (Improved)' : ''}</h3>
              <div>
                <b><ResourceIcon /> {formatSampleMass(overrideTonnage || (selectedSample?.remainingYield * resource.massPerUnit))}</b>
                {' '}tonnes {status !== 'BEFORE' && !overrideTonnage ? ' (before improvement)' : ''}
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
            <Poppable label="Select" closeOnChange={clicked} title="Select Improvable Sample">
              <CoreSampleSelection lot={lot} onClick={onClick} options={improvableSamples} resources={resources} />
            </Poppable>
          </div>
        )}

        {status === 'AFTER' && !overrideTonnage && <ReadyHighlight />}
        {status === 'AFTER' && overrideTonnage && <CompletedHighlight />}
      </SectionBody>
    </Section>
  );
};

export const ExtractSampleSection = ({ amount, lot, resources, onSelectSample, selectedSample, status, usableSamples }) => {
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
      <SectionTitle><ChevronRightIcon /> Extraction Target</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {selectedSample ? (
          <ResourceWithData>
            <ResourceThumbnail resource={resources[selectedSample.resourceId]} />
            <label>
              <h3>
                {resources[selectedSample.resourceId].name} Deposit #{selectedSample.sampleId.toLocaleString()}
              </h3>
              <div>
                {status === 'BEFORE' && (
                  <>
                    <b style={{ color: 'white', fontWeight: 'normal' }}>
                      <ResourceIcon /> {formatSampleMass(getTonnage(selectedSample.remainingYield))}
                    </b> tonnes {selectedSample.remainingYield < selectedSample.initialYield ? 'remaining' : ''}
                  </>
                )}
                {status !== 'BEFORE' && (
                  <>
                    <b><ResourceIcon /> {formatSampleMass(getTonnage(amount))}</b> tonnes
                  </>
                )}
              </div>
              <footer style={status === 'BEFORE' ? {} : { color: '#777' }}>
                {remainingAfterExtraction === 0
                    ? 'Deposit will be depleted following this Extraction'
                    : `${formatSampleMass(getTonnage(remainingAfterExtraction))} tonnes will remain following this Extraction`}
              </footer>
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
            <Poppable label="Select" closeOnChange={clicked} title="Select Core Sample">
              <CoreSampleSelection lot={lot} onClick={onClick} options={usableSamples} resources={resources} />
            </Poppable>
          </div>
        )}
        {status === 'AFTER' && (
          <ReadyHighlight />
        )}
      </SectionBody>
    </Section>
  );
};

export const RawMaterialSection = ({ abundances, goToResourceMap, lotId, resourceId, resources, onSelectResource, tonnage, status }) => {
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((resourceId) => () => {
    setClicked((x) => x + 1);
    if (onSelectResource) onSelectResource(resourceId);
  }, []);
  const resource = resources[resourceId] || null;
  const abundance = abundances[resourceId] || 0;

  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Target Resource</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource
          ? (
            <ResourceWithData>
              <ResourceThumbnail resource={resource} />
              <label>
                {/* TODO: adding sampleId here might be most consistent with other dialogs */}
                <h3>{resource.name}{tonnage !== undefined ? ' Deposit Discovered' : ''}</h3>
                {tonnage !== undefined
                  ? <div><b><ResourceIcon /> {formatSampleMass(tonnage)}</b> tonnes</div>
                  : <div><b>{formatFixed(100 * abundance, 1)}%</b> Abundance at lot</div>
                }
              </label>
            </ResourceWithData>
          )
          : (
            <EmptyResourceWithData>
              <EmptyResourceImage />
              <label>
                <div>Sample Resource</div>
                <h3>Select</h3>
              </label>
            </EmptyResourceWithData>
          )
        }
        {status === 'BEFORE' && (
          <div style={{ display: 'flex' }}>
            {goToResourceMap && (
              <IconButtonRounded
                data-for="actionDialog"
                data-place="left"
                data-tip="View Resource Map"
                onClick={goToResourceMap}
                style={{ marginRight: 6 }}>
                <TargetIcon />
              </IconButtonRounded>
            )}
            <Poppable label="Select" title="Select Target Resource" closeOnChange={clicked} contentHeight={360}>
              <ResourceSelection abundances={abundances} onSelect={onClick} lotId={lotId} resources={resources} />
            </Poppable>
          </div>
        )}
        {status === 'AFTER' && tonnage === undefined && <ReadyHighlight />}
        {status === 'AFTER' && tonnage !== undefined && <CompletedHighlight />}
      </SectionBody>
    </Section>
  );
};

// TODO: this needs an empty state if source is not yet selected
export const ToolSection = ({ resource, sourceLot }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Tool</SectionTitle>
      <SectionBody>
        <FutureSectionOverlay />
        {resource && (
          <ResourceWithData>
            <ResourceThumbnail badge="∞" resource={resource} />{/* TODO: badge */}
            <label>
              <h3>{resource.name}</h3>
              {sourceLot && sourceLot.building && (
                <div>{sourceLot.building.__t} (Lot {sourceLot.i.toLocaleString()})</div>
              )}
              <footer>NOTE: This item will be consumed.</footer>
            </label>
          </ResourceWithData>
        )}
        {/*
        <div>
          <Poppable label="Source">
            TODO: select where to get the tool from
          </Poppable>
        </div>
        */}
      </SectionBody>
    </Section>
  );
}

const TransferSelectionPopper = ({ closeOnChange, inventory, onSelectionCompleted, resources, selectedItems }) => (
  <Poppable label="Select" title="Items to Transfer" closeOnChange={closeOnChange} contentHeight={360} contentWidth={700}>
    <TransferSelection
      inventory={inventory}
      onComplete={onSelectionCompleted}
      resources={resources}
      selectedItems={selectedItems} />
  </Poppable>
);

export const ItemSelectionSection = ({ inventory, onSelectItems, resources, selectedItems, status }) => {
  const selectedItemKeys = Object.keys(selectedItems || {});

  const [completed, setCompleted] = useState(0);
  const onSelectionCompleted = useCallback((items) => {
    setCompleted((x) => x + 1);
    if (onSelectItems) onSelectItems(items);
  }, [onSelectItems]);

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
              <TransferSelectionPopper
                closeOnChange={completed}
                inventory={inventory}
                onSelectionCompleted={onSelectionCompleted}
                resources={resources}
                selectedItems={selectedItems} />
            </div>
          </>
        )}
        {selectedItemKeys.length > 0 && (
          <ItemSelectionWrapper>
            <div>
              <ItemsList>
                {selectedItemKeys.map((resourceId, x) => (
                  <ResourceThumbnail
                    key={resourceId}
                    badge={formatResourceAmount(selectedItems[resourceId], resourceId)}
                    resource={resources[resourceId]}
                    progress={selectedItems[resourceId] / inventory[resourceId]} />
                ))}
              </ItemsList>
            </div>
            <div>
              <div>{selectedItemKeys.length} item{selectedItemKeys.length === 1 ? '' : 's'}</div>
              {status === 'BEFORE' && (
                <TransferSelectionPopper
                  closeOnChange={completed}
                  inventory={inventory}
                  onSelectionCompleted={onSelectionCompleted}
                  resources={resources}
                  selectedItems={selectedItems} />
              )}
            </div>
          </ItemSelectionWrapper>
        )}
      </SectionBody>
    </Section>
  );
};

export const DestinationLotSection = ({ asteroid, destinationLot, futureFlag, onDestinationSelect, originLot, status }) => {
  const buildings = useBuildingAssets();  // TODO: probably more consistent to move this up a level
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((lot) => () => {
    setClicked((x) => x + 1);
    if (onDestinationSelect) onDestinationSelect(lot);
  }, []);

  const destinationBuilding = useMemo(() => {
    if (destinationLot?.building) {
      return buildings[destinationLot.building?.capableType];
    }
    return null;
  }, [destinationLot?.building]);

  const capacity = getCapacityUsage(destinationBuilding, destinationLot?.building?.inventories, 1);
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
                inventories={destinationLot?.building?.inventories}
                showInventoryStatusForType={1} />
              <label>
                <h3>{destinationBuilding?.name}</h3>
                <div>{asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {destinationLot.i.toLocaleString()}</b></div>
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
            <Poppable label="Select" title="Select Destination" closeOnChange={clicked}>
              <DestinationSelection asteroid={asteroid} onClick={onClick} originLotId={originLot.i} />
            </Poppable>
          </div>
        )}
      </SectionBody>
    </Section>
  );
};

export const BuildingPlanSection = ({ building, canceling, gracePeriodEnd, onBuildingSelected, status }) => {
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
            <EmptyBuildingImage iconOverride={<PlanBuildingIcon />} />
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
            {canceling && (
              <>
                <span style={{ color: theme.colors.error, textAlign: 'right' }}>On-site materials<br/>will be abandoned</span>
                <span style={{ color: theme.colors.error, fontSize: '175%', lineHeight: '1em', marginLeft: 8, marginRight: 8 }}><WarningOutlineIcon /></span>
              </>
            )}
            {gracePeriodEnd && !canceling && (
              <AbandonmentTimer>
                <div>Abandonment Timer:</div>
                <h3><LiveTimer target={gracePeriodEnd} /> <WarningOutlineIcon /></h3>
              </AbandonmentTimer>
            )}
            {!gracePeriodEnd && !canceling && (
              <Poppable label="Select" closeOnChange={clicked} title="Site Plan">
                <BuildingPlanSelection onBuildingSelected={_onBuildingSelected} />
              </Poppable>
            )}
          </>
        )}
        {status === 'AFTER' && (
          <ReadyHighlight />
        )}
      </SectionBody>
    </Section>
  );
}

export const BuildingRequirementsSection = ({ isGathering, label, building, resources }) => {
  const gatheringComplete = isGathering && !ingredients.find(([tally, i, hasTally]) => hasTally < tally);
  const { totalMass, totalVolume } = useMemo(() => {
    return ingredients.reduce((acc, [units, i]) => {
      acc.totalMass += units * resources[i].massPerUnit * 1e6;
      acc.totalVolume += units * (resources[i].volumePerUnit || 0) * 1e6;
      return acc;
    }, { totalMass: 0, totalVolume: 0 });
  }, [ingredients]);
  return (
    <Section>
      <SectionTitle>{label}</SectionTitle>
      <SectionBody>
        {/* TODO: <FutureSectionOverlay /> */}
        <IngredientsList hasSummary>
          {ingredients.map(([tally, i, hasTally]) => (
            <ResourceRequirement
              key={i}
              isGathering={isGathering}
              hasTally={hasTally}
              needsTally={tally}
              resource={resources[i]}
              size="95px" />
          ))}
          <IngredientSummary mode="warning">
            <span>
              {ingredients.length} Items: {formatMass(totalMass)} | {formatVolume(totalVolume)}
            </span>
          </IngredientSummary>
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
            <ResourceThumbnail key={i}
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

export const ProgressBarSection = ({
  completionTime,
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
  
  const { animating, barWidth, color, left, right } = useMemo(() => {
    const r = {
      animating: false,
      barWidth: 0,
      color: null,
      left: '',
      right: '',
    }
    if (stage === actionStage.NOT_STARTED) {
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
          ref={refEl}>
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
    <Section>
      <SectionTitle><ChevronRightIcon /> Extraction Amount</SectionTitle>
      <SectionBody>
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
            <ButtonRounded disabled={amount === max} onClick={() => setAmount(max)}>Max</ButtonRounded>
          </SliderInfoRow>
          <SliderInput
            min={min}
            max={max}
            increment={resource ? (0.1 / resource?.massPerUnit) : 1}
            onChange={setAmount}
            value={amount || 0} />
          <SliderInfoRow style={{ marginTop: -5 }}>
            <div>{resource ? formatResourceVolume(amount, resource?.i, { fixedPrecision: 1 }) : `0 L`}</div>
            <div>{formatTimer(extractionTime)}</div>
          </SliderInfoRow>
        </SliderWrapper>
      </SectionBody>
    </Section>
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

const BonusTooltip = ({ bonus, crewRequired, details, hideFooter, title, titleValue, isTimeStat }) => {
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
  if (grams >= 1e12) {
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