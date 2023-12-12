import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { createPortal } from 'react-dom';
import ReactTooltip from 'react-tooltip';
import { useQuery } from 'react-query';
import { TbBellRingingFilled as AlertIcon } from 'react-icons/tb';
import { BarLoader } from 'react-spinners';
import { Asteroid, Building, Crewmate, Entity, Inventory, Lot, Process, Product, Ship, Time } from '@influenceth/sdk';
import { cloneDeep } from 'lodash';

import AsteroidRendering from '~/components/AsteroidRendering';
import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CrewCardFramed from '~/components/CrewCardFramed';
import CrewIndicator from '~/components/CrewIndicator';
import Dialog from '~/components/Dialog';
import IconButton from '~/components/IconButton';
import {
  ChevronRightIcon,
  CloseIcon,
  CrewIcon,
  DeltaVIcon,
  FastForwardIcon,
  LocationIcon,
  PlusIcon,
  WarningOutlineIcon,
  SurfaceTransferIcon,
  GasIcon,
  SwayIcon,
  RadioCheckedIcon,
  RadioUncheckedIcon,
  MyAssetIcon,
  CaptainIcon,
  EmergencyModeEnterIcon,
  CheckIcon,
  ProcessIcon,
  ShipIcon,
  BusyIcon
} from '~/components/Icons';
import LiveTimer from '~/components/LiveTimer';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import ResourceColorIcon from '~/components/ResourceColorIcon';
import ResourceThumbnail, { ResourceThumbnailWrapper, ResourceImage, ResourceProgress } from '~/components/ResourceThumbnail';
import ResourceRequirement from '~/components/ResourceRequirement';
import ResourceSelection from '~/components/ResourceSelection';
import SliderInput from '~/components/SliderInput';
import TextInput from '~/components/TextInputUncontrolled';
import useAsteroidLotData from '~/hooks/useAsteroidLotData';
import useChainTime from '~/hooks/useChainTime';
import api from '~/lib/api';
import { reactBool, formatFixed, formatTimer, nativeBool, locationsArrToObj } from '~/lib/utils';
import actionStage from '~/lib/actionStages';
import constants from '~/lib/constants';
import { getBuildingIcon, getShipIcon } from '~/lib/assetUtils';
import theme, { hexToRGB } from '~/theme';
import { theming } from '../ActionDialog';
import formatters from '~/lib/formatters';
import useCrewContext from '~/hooks/useCrewContext';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import useAccessibleAsteroidInventories from '~/hooks/useAccessibleAsteroidInventories';

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

const Tabs = styled.div`
  border-bottom: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  margin: 0 -18px 20px;
`;
const Tab = styled.div`
  align-items: center;
  border-bottom: 3px solid #555;
  border-radius: 6px 6px 0 0;
  display: flex;
  flex-direction: row;
  height: 35px;
  justify-content: center;
  margin-right: 12px;
  text-transform: uppercase;
  transition-property: background, border-color, color;
  transition-duration: 250ms;
  transition-timing-function: ease;
  width: 145px;
  ${p => p.isSelected
    ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.5);
      border-color: ${p.theme.colors.main};
      color: white;
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `
  }
`;
const TabIcon = styled.div`
  font-size: 30px;
  line-height: 1em;
  margin-right: 5px;
  margin-left: -5px;
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

export const sectionBodyCornerSize = 15;
export const FlexSectionInputBody = styled.div`
  ${p => p.theme.clipCorner(sectionBodyCornerSize)};
  padding: 8px 16px 8px 8px;
  position: relative;
  transition-properties: background, border-color;
  transition-duration: 250ms;
  transition-function: ease;
  & > svg {
    transition: stroke 250ms ease;
  }

  ${p => p.isSelected ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.22);
      border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.7);
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.7);
      }
    `
    : `
      background: ${p.subtle ? '#1c1c1c' : `rgba(${p.theme.colors.mainRGB}, 0.15)`};
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
const FlexSectionBlockInner = styled.div`
  height: 92px;
  padding: 8px 16px 8px 8px;
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
const SectionTitleRight = styled.div`
  color: white;
  font-size: 19px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: none;
  white-space: nowrap;
  max-width: 240px;
`;
const SectionTitleRightTabs = styled.div`
  display: flex;
  flex-direction: row;
`;

const SectionTitleTab = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 3px;
  color: white;
  display: flex;
  font-size: 20px;
  height: 26px;
  justify-content: center;
  margin-left: 3px;
  margin-top: -1px;
  padding: 0;
  transition: background 250ms ease, color 250ms ease;
  width: 26px;
  ${p => p.isSelected
    ? `
      background: ${p.theme.colors.main};
      cursor: ${p.theme.cursors.default};
      color: black;
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: rgba(${p.theme.colors.mainRGB}, 0.3);
      }
    `
  }
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

const ActionBar = styled.div`
  align-items: center;
  background: ${p => p.overrideColor ? `rgba(${hexToRGB(p.overrideColor)}, 0.2)` : p.headerBackground};
  display: flex;
  flex: 0 0 62px;
  justify-content: space-between;
  padding: 0 15px 0 20px;
  position: relative;
  z-index: 1;
`;

const BarLoadingContainer = styled.div`
  height: 2px;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 2;
  & > span {
    display: block;
  }
`;

const ActionLocation = styled.div`
  border-left: 3px solid ${p => p.overrideColor || p.highlight};
  color: rgba(210, 210, 210, 0.7);
  display: flex;
  font-size: 20px;
  height: 36px;
  line-height: 36px;
  padding-left: 10px;
  white-space: nowrap;
  & > b {
    color: white;
    display: inline-block;
    height: 36px;
    margin-right: 6px;
    max-width: 350px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const SublabelBanner = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.color)}, 0.3);
  color: white;
  ${p => p.theme.clipCorner(15)};
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
  background: rgba(${p => hexToRGB(p.type === 'crew' ? p.theme.colors.main : p.theme.colors.success)}, 0.4);
  border-radius: 20px;
  color: white;
  display: flex;
  margin-left: 4px;
  padding: 3px 12px;
  text-align: center;
  text-transform: none;
  & > svg {
    color: ${p => p.type === 'crew' ? p.theme.colors.brightMain : p.theme.colors.success};
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
  ${p => p.theming?.highlight && !p.overrideHighlightColor && `
    ${IconContainer}, h2 {
      color: ${p.theming.highlight};
    }
  `}
  ${p => p.overrideHighlightColor && `
    ${IconContainer}, h2 {
      color: ${p.overrideHighlightColor};
    }
  `}
  ${p => p.wide && `width: 100%;`}
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
  ${p => p.wide && `width: 100%;`}
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
  ${p => p.wide && `width: 100%;`}
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

const AsteroidThumbnailWrapper = styled(ResourceThumbnailWrapper)`
  background-color: rgba(0, 0, 0, 0.6);
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
const ShipThumbnailWrapper = styled(ResourceThumbnailWrapper)`
  height: 92px;
  width: 150px;
`;
const ThumbnailBadge = styled.div`
  position: absolute;
  left: 5px;
  top: 5px;
`;
const ThumbnailOverlay = styled.div`
  align-items: center;
  color: ${p => p.color || p.theme.colors.main};
  display: flex;
  font-size: 40px;
  height: 100%;
  line-height: 30px;
  justify-content: center;
  position: absolute;
  width: 100%;
`;
const InventoryUtilization = styled(ResourceProgress)`
  bottom: 8px;
  ${p => p.horizontal && `right: 8px;`}
  ${p => p.second && `bottom: 3px;`}
  ${p => p.overloaded && `
    &:after {
      background: ${p.theme.colors.error};
    }
  `}
`;
const InventoryLabel = styled.div`
  color: ${p => p.overloaded ? p.theme.colors.error : 'white'};
  font-size: 12px;
  position: absolute;
  left: 8px;
  bottom: 14px;
`;

const SliderLabel = styled.div`
  flex: 1;
  height: 33px;
  margin-bottom: -4px;
  & > b {
    color: white;
    font-size: 175%;
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
  font-size: 175%;
  height: 100%;
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

const ProductWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;
const ProductGridWrapper = styled.div`
  column-gap: 5px;
  display: grid;
  grid-template-columns: repeat(3, 87px);
  row-gap: 5px;
`;
const ProductSelector = styled.div`
  padding: 4px;
  position: relative;
  ${p => p.input && `
    padding-bottom: 0;
    padding-top: 0;
  `}
  ${p => p.output && p.theme.clipCorner(10)};
  ${p => p.output && p.primary && `
    background: rgba(${p.theme.colors.mainRGB}, 0.2);
    border: 1px solid ${p.theme.colors.main};
    padding: 3px;
  `}
  ${p => p.onClick && !p.primary && `
    cursor: ${p.theme.cursors.active};
    &:hover {
      background: #171717;
    }
  `}
  & > label {
    color: ${p => p.primary ? p.theme.colors.main : 'inherit'};
    display: block;
    font-size: 15px;
    font-weight: bold;
    padding-top: 3px;
    text-align: center;
    text-transform: uppercase;
    & > svg {
      font-size: 65%;
      height: 15px;
    }
  }
`;
const RecipeLabel = styled.div`
  color: white;
  font-size: 13px;
  line-height: 13px;
  margin-top: 2px;
  margin-left: 4px;
`;

const PropulsionTypeOption = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 90%;
  height: 28px;
  ${p => p.onClick && `
    cursor: ${p.theme.cursors.active};
    opacity: 0.8;
    &:hover {
      opacity: 1;
    }
  `}

  ${p => p.selected && `
    color: white;
    opacity: 1;
  `}

  & svg {
    color: ${p => p.theme.colors.main};
    font-size: 22px;
    margin-right: 5px;
  }
  & label {
    text-transform: uppercase;
  }
`;

const TugWarning = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.error)}, 0.2);
  color: ${p => p.theme.colors.error};
  display: flex;
  padding: 12px;
  white-space: pre-line;
  & svg {
    font-size: 32px;
    margin-right: 10px;
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
  grid-template-columns: repeat(${p => p.columns || 7}, 95px);
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
  & > td > small {
    color: #aaa;
  }
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
const EmptyMessage = styled.div`
  background: rgba(255, 255, 255, 0.15);
  opacity: 0.7;
  padding: 20px;
  text-align: center;
`;
const InputOutputTableCell = styled.div`
  align-items: center;
  display: flex;
  & > * {
    margin-left: 2px;
  }
  & > label {
    opacity: 0.5;
    margin-left: 0;
    padding-right: 8px;
  }
`;

const TextInputWithNote = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
`;
const TextInputNote = styled.div`
  align-items: center;
  align-self: stretch;
  background: ${p => p.error ? p.theme.colors.error : '#222'};
  color: ${p => p.error ? 'white' : '#aaa'};
  display: flex;
  font-size: 14px;
  justify-content: center;
  margin-left: 10px;
  padding: 0 20px;
  & > svg {
    font-size: 18px;
    margin-right: 6px;
  }
  transition: border-color 500ms ease, color 500ms ease;
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
  ${p => p.theme.clipCorner(selectionDialogCornerSize)};
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

const barChartHeight = 22;
const barChartPadding = 3;
const barChartRounding = barChartHeight / 2;
const BarChart = styled.div`
  background: rgba(${p => hexToRGB(p.bgColor || p.color)}, 0.3);
  border-radius: ${barChartRounding}px;
  height: ${barChartHeight}px;
  margin: ${(28 - barChartHeight) / 2}px 0;
  position: relative;
  width: 100%;
  &:before, &:after {
    content: "";
    bottom: ${barChartPadding}px;
    border-radius: ${barChartRounding - barChartPadding}px;
    position: absolute;
    top: ${barChartPadding}px;
    transition: width 500ms ease;
    z-index: 0;
  }
  &:after {
    background: ${p => p.color};
    left: ${barChartPadding}px;
    width: ${p => 100 * p.value}%;
    z-index: 1;
  }
  ${p => p.postValue !== undefined && `
    &:before {
      background: ${p.color};
      left: ${barChartPadding}px;
      opacity: 0.7;
      width: ${100 * p.postValue}%;
      z-index: 1;
    }
  `}
`;
const BarChartLimitLine = styled.div`
  border: solid ${p => p.theme.colors.red};
  border-width: 0 1px;
  top: 0;
  bottom: 0;
  position: absolute;
  left: calc(${barChartPadding + 1}px + ${p => p.position * 100}%);
  z-index: 3;
`;
const BarChartNotes = styled.div`
  color: ${p => p.color || 'inherit'};
  display: flex;
  flex-direction: row;
  font-size: 92%;
  font-weight: bold;
  line-height: 28px;
  justify-content: space-between;
  width: 100%;
  & b {
    color: white;
  }
  & > div:first-child, & > div:last-child {
    min-width: 150px;
  }
  & > div:last-child {
    text-align: right;
  }
`;

export const MiniBarChartSection = styled(FlexSectionInputBody)`
  background: transparent;
`;
const MiniBarWrapper = styled.div`
  margin-top: 15px;
  &:first-child {
    margin-top: 0;
  }
`;
const ChartLabels = styled.div`
  align-items: center;
  color: #999;
  display: flex;
  flex-direction: row;
  font-size: 14.5px;
  justify-content: space-between;
  & > label:last-child {
    color: white;
  }
`;
const UnderChartLabels = styled(ChartLabels)``;
const miniBarChartHeight = 4;
const miniBarChartRounding = miniBarChartHeight / 2;
const DeltaIcon = styled.div`
  font-size: 120%;
  position: absolute;
  top: -0.4em;
  z-index: 1;
  ${p => p.negativeDelta
    ? `
      left: calc(${100 * p.value}% - 4px);
      transform: scaleX(-1);
    `
    : `
      left: calc(${100 * p.value}% - 12px);
    `
  }
`;
const MiniBar = styled.div`
  background: #333;
  border-radius: ${miniBarChartRounding}px;
  color: ${p => p.deltaColor || p.color || p.theme.colors.brightMain};
  height: ${miniBarChartHeight}px;
  margin: 4px 0;
  position: relative;
  width: 100%;
  &:before {
    content: "";
    background: ${p => p.color || p.theme.colors.main};
    bottom: 0px;
    border-radius: ${miniBarChartRounding}px;
    left: 0px;
    opacity: ${p => p.deltaValue ? 0.5 : 1};
    position: absolute;
    top: 0px;
    transition: width 500ms ease;
    width: ${p => 100 * p.value}%;
    z-index: 1;
  }
  ${p => p.deltaValue && `
    &:after {
      content: "";
      background: ${p.deltaColor || p.color || p.theme.colors.brightMain};
      bottom: 0px;
      border-radius: ${miniBarChartRounding}px;
      position: absolute;
      top: 0px;
      transition: width 500ms ease;
      width: ${Math.abs(100 * p.deltaValue)}%;
      z-index: 1;
      ${p.deltaValue < 0
        ? `
          right: ${100 * (1 - (p.value - p.deltaValue))}%;
        `
        : `
          left: ${100 * (p.value - p.deltaValue)}%;
        `}
    }
  `}
`;

export const ProgressBarNote = styled.div`
  color: ${p => p.color || p.theme.colors[p.themeColor] || 'inherit'};
  font-size: 92%;
  margin: 10px 0;
  text-align: center;
  & b {
    color: white;
    font-weight: normal;
  }
`;

const CrewCards = styled.div`
  display: flex;
  flex-direction: row;
  & > div {
    margin-right: 5px;
    &:last-child {
      margin-right: 0;
    }
  }
`;
const CrewCardPlaceholder = styled.div`
  width: ${p => p.width}px;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.07);
    display: block;
    height: 0;
    padding-top: 128%;
  }
`;

const ShipStatus = styled.span`
  color: ${p => p.theme.colors.main};
  display: inline-block;
  margin-top: 4px;
  text-transform: uppercase;
  &:after {
    content: "${p => formatShipStatus(p.ship)}";
    color: ${p => p.theme.colors.main};
    text-transform: uppercase;
    ${p => {
      switch (p.status) {
        case 'IN_FLIGHT':
        case 'LAUNCHING':
        case 'LANDING':
          return `color: ${p.theme.colors.warning};`;
        case 'IN_ORBIT':
          return `color: ${p.theme.colors.main};`;
        case 'IN_PORT':
        case 'ON_SURFACE':
          return `color: ${p.theme.colors.purple};`;
      }
    }}
  }
`;

export const WarningAlert = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors[p.severity === 'warning' ? 'orange' : 'red'])}, 0.2);
  color: ${p => p.theme.colors[p.severity === 'warning' ? 'orange' : 'red']};
  display: flex;
  flex-direction: row;
  margin-top: 10px;
  padding: 10px;
  width: 100%;
  & > div:first-child {
    font-size: 30px;
    margin-right: 12px;
  }
  & > div:last-child {
    font-size: 96%;
    & > i {
      color: white;
      font-style: normal;
    }
  }
  &:first-child {
    margin-top: 0;
  }
`;

const SwayInputInstruction = styled.div`
  color: white;
  margin-top: -5px;
  margin-bottom: 10px;
`;
const SwayInputRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  & input {
    margin-bottom: 0;
  }
`;
const SwayInputIconWrapper = styled.div`
  color: white;
  font-size: 36px;
  line-height: 0;
`;
const SwayInputFieldWrapper = styled.div`
  flex: 1;
  position: relative;
  &:after {
    content: "SWAY";
    color: ${p => p.theme.colors.main};
    font-size: 18px;
    margin-top: -10px;
    opacity: 0.5;
    position: absolute;
    right: 12px;
    top: 50%;
  }

  & input {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
    font-size: 18px;
    padding-right: 72px;
    width: 100%;
  }
`;
const SwayInputHelp = styled.div`
  font-size: 20px;
  margin-left: 10px;
`;
const QuestionIcon = styled.div`
  align-items: center;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1.2em;
  color: white;
  display: flex;
  height: 1.2em;
  justify-content: center;
  width: 1.2em;
  &:after {
    content: "?";
  }
`;

export const TransferDistanceTitleDetails = styled.span`
  font-size: 15px;
  line-height: 15px;
  & label {
    color: ${p => p.theme.colors.main};
    font-weight: bold;
  }
`;
const FreeTransferNote = styled.div`
  color: #999;
  & > div:first-child {
    color: ${p => p.theme.colors.main};
    font-weight: bold;
    margin-bottom: 10px;
  }
`;

export const CrewLocationWrapper = styled.div`
  text-transform: none;
  & span {
    opacity: 0.6;
    &:before {
      content: ">";
      margin: 0 4px;
    }
  }
`;

export const SelectionDialog = ({ children, isCompletable, open, onClose, onComplete, style = {}, title }) => {
  if (!open) return null;
  return createPortal(
    <Dialog opaque dialogCss={dialogCss} dialogStyle={style}>
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

export const CrewSelectionDialog = ({ crews, onClose, onSelected, open }) => {
  const [selection, setSelection] = useState();

  const onComplete = useCallback(() => {
    onSelected(selection?.id);
    onClose();
  }, [onClose, onSelected, selection]);

  const nonEmptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length > 0), [crews]);
  const emptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length === 0), [crews]);
  const hydratedLocation = useHydratedLocation(nonEmptyCrews[0]?._location);

  return (
    <SelectionDialog
      isCompletable={!!selection}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title="Exchange With Crew">
      <div style={{ minHeight: 300 }}>
        {nonEmptyCrews.map((crew, i) => {
          return (
            <CrewInputBlock
              key={crew.id}
              cardWidth={64}
              crew={crew}
              inlineDetails
              isSelected={crew.id === selection?.id}
              onClick={() => setSelection(crew)}
              title={
                i === 0
                ? <CrewLocationWrapper><CrewLocationLabel hydratedLocation={hydratedLocation} /></CrewLocationWrapper>
                : ''
              }
              style={{ marginBottom: 8, width: '100%' }} />
          );
        })}
        {emptyCrews.map((crew, i) => {
          return (
            <CrewInputBlock
              key={crew.id}
              cardWidth={64}
              crew={crew}
              hideCrewmates
              inlineDetails
              isSelected={crew.id === selection?.id}
              onClick={() => setSelection(crew)}
              title={i === 0 ? <CrewLocationWrapper style={{ marginTop: 8 }}>Empty Crews</CrewLocationWrapper> : ''}
              style={{ marginBottom: 8, width: '100%' }} />
          );
        })}
      </div>
    </SelectionDialog>
  );
};

export const SitePlanSelectionDialog = ({ initialSelection, onClose, onSelected, open }) => {
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
        {Object.keys(Building.TYPES).filter((c) => c > 0).map((buildingType) => (
          <FlexSectionInputBlock
            key={buildingType}
            fullWidth
            image={<BuildingImage buildingType={buildingType} unfinished />}
            isSelected={buildingType === selection}
            label={Building.TYPES[buildingType].name}
            sublabel="Site"
            onClick={() => setSelection(buildingType)}
            style={{ width: '100%' }}
          />
        ))}
      </SelectionGrid>
    </SelectionDialog>
  );
};

export const ResourceSelectionDialog = ({ abundances, lotId, initialSelection, onClose, onSelected, open }) => {
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
      title={formatters.lotName(Lot.toIndex(lotId))}>
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
                  onClick={() => setSelection(Number(resourceId))}
                  selectedRow={selection === Number(resourceId)}>
                  <td><ResourceColorIcon category={Product.TYPES[resourceId].category} /> {Product.TYPES[resourceId].name}</td>
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

export const CoreSampleSelectionDialog = ({ lotId, options, initialSelection, onClose, onSelected, open }) => {
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
      isCompletable={selection?.id > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={formatters.lotName(Lot.toIndex(lotId))}>
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
            {options.sort((a, b) => b.Deposit.remainingYield - a.Deposit.remainingYield).map((sample) => (
              <SelectionTableRow
                key={sample.id}
                onClick={() => setSelection(sample)}
                selectedRow={selection?.id === sample.id}>
                <td><ResourceColorIcon category={Product.TYPES[sample.Deposit.resource]?.category} /> {Product.TYPES[sample.Deposit.resource]?.name} #{sample.id.toLocaleString()}</td>
                <td>{formatSampleMass(sample.Deposit.remainingYield * Product.TYPES[sample.Deposit.resource]?.massPerUnit)} tonnes</td>
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
  // TODO: this will presumably be deprecated in favor of inventory selection
  //  and/or modified for cases where moving crew or ship
  return null;

  const crewLots = [];
  // TODO: this is buildings, not lots
  // const { data: crewLots, isLoading } = useAsteroidCrewBuildings(asteroid.id);
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
      .filter((lot) => (includeDeconstruction && lot.id === originLotId) || (
        lot.building && lot.id !== originLotId && (lot.building.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE)
      ))
      .reduce((acc, lot) => {
        (lot.building.Inventories || []).forEach((inventory, slot) => {
          let usedMass = 0, usedVolume = 0, type;

          // deconstructing in place (use currently-locked inventory)
          if (includeDeconstruction && lot.id === originLotId && inventory.status !== Inventory.STATUSES.AVAILABLE) {
            type = `(construction site)`;

          // going to another lot (if unlocked)
          } else if (inventory.status === Inventory.STATUSES.AVAILABLE) {
            usedMass = ((inventory?.mass || 0) + (inventory?.reservedMass || 0));
            usedVolume = ((inventory?.volume || 0) + (inventory?.reservedVolume || 0));
            type = Building.TYPES[lot.building?.Building?.buildingType]?.name || 'Construction Site';

          // else, continue
          } else {
            return;
          }

          // TODO: use this here instead? also need to apply product restrictions in some cases
          // const { filledMass, filledVolume } = Inventory.getFilledCapacity(inventory.inventoryType);
          const inventoryConfig = Inventory.getType(inventory.inventoryType) || {};
          const availMass = inventoryConfig.massConstraint - usedMass;
          const availVolume = inventoryConfig.volumeConstraint - usedVolume;
          const fullness = Math.max(
            1 - availMass / inventoryConfig.massConstraint,
            1 - availVolume / inventoryConfig.volumeConstraint,
          ) || 0;

          acc.push({
            lot,
            slot,
            distance: Asteroid.getLotDistance(asteroid.id, Lot.toIndex(originLotId), Lot.toIndex(lot.id)) || 0,
            type,
            fullness,
            availMass,
            availVolume
          });
        });
        return acc;
      }, [])
      .sort((a, b) => a.distance - b.distance)
  }, [crewLots, originLotId]);

  return (
    <SelectionDialog
      isCompletable={selection?.id > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={`Origin ${formatters.lotName(Lot.toIndex(originLotId))}`}>
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
                  key={`${asteroid.id}_${inventory.lot.id}`}
                  disabled={inventory.fullness >= 1}
                  onClick={() => setSelection(inventory.lot)}
                  selectedRow={inventory.lot.id === Number(selection?.id)}>
                  <td>{inventory.lot.id === originLotId ? '(in place)' : formatters.lotName(Lot.toIndex(inventory.lot.id))}</td>
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

export const TransferSelectionDialog = ({ sourceEntity, requirements, inventory, initialSelection, onClose, onSelected, open }) => {
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
  const items = useMemo(() => inventory.map(({ product, amount }) => ({
    selected: selection[product],
    available: amount,
    resource: Product.TYPES[product],
    maxSelectable: requirements
      ? Math.min(amount, requirements.find((r) => Number(r.i) === Number(product))?.inNeed || 0)
      : amount
  })), [inventory, requirements, selection]);

  const { tally, totalMass, totalVolume } = useMemo(() => {
    return items.reduce((acc, { selected, resource }) => {
      acc.tally += selected > 0 ? 1 : 0;
      acc.totalMass += (selected || 0) * resource.massPerUnit;
      acc.totalVolume += (selected || 0) * (resource.volumePerUnit || 0);
      return acc;
    }, { tally: 0, totalMass: 0, totalVolume: 0 });
  }, [items]);

  // TODO: should title be inventory type name instead?

  const [title, subtitle] = useMemo(() => {
    let title = '';
    if (sourceEntity?.Ship) {
      title = Ship.TYPES[sourceEntity.Ship.shipType || 0]?.name;
    } else if (sourceEntity?.Building) {
      title = Building.TYPES[sourceEntity.Building.buildingType || 0]?.name;
    }
    return [title, formatters.lotName(Lot.toIndex(locationsArrToObj(sourceEntity?.Location?.locations || []).lotId))];
  }, [sourceEntity]);

  return (
    <SelectionDialog
      isCompletable
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={<>{title} Inventory <b>{'> '}{subtitle}</b></>}>
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

export const LandingSelectionDialog = ({ asteroid, initialSelection, onClose, onSelected, open, ship }) => {
  const [error, setError] = useState();
  const [selection, setSelection] = useState(initialSelection);

  // TODO: to get spaceport names, it will probably make more sense to have
  //  a "get spaceports" api endpoint
  const { data: lotData, isLoading: lotDataLoading } = useAsteroidLotData(asteroid?.id);

  const spaceports = useMemo(() => {
    if (!lotData) return [];
    return lotData.reduce((acc, cur, i) => {
      if (cur >> 4 === 7) acc.push(i)
      return acc;
    }, []);
  }, [lotData]);

  const onComplete = useCallback(() => {
    onSelected(selection);
    onClose();
  }, [onClose, onSelected, selection]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      const lot = parseInt(e.target.value);
      if (lot && lotData[lot] !== undefined) {
        const buildingType = lotData[lot] >> 4;
        if (buildingType === 0 || buildingType === 7) {
          onSelected(lot);
          onClose();
          return;
        }
      }
      setError(true);
      setTimeout(() => {
        setError(false);
      }, 4000);
    }
  }, [lotData]);

  return (
    <SelectionDialog
      isCompletable={selection > 0}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={`Landing Sites`}>
      {/* TODO: isLoading */}
      {/* TODO: replace with DataTable? */}
      <div style={{ minWidth: 500 }}></div>
      {ship?.landing && (
        <TextInputWithNote>
          <TextInput
            onKeyDown={handleKeyDown}
            placeholder="Specify Lot by Id..."
            type="number" />
          <TextInputNote error={!!error}>
            <WarningOutlineIcon />
            This ship may land at a Spaceport or Empty Lot.
          </TextInputNote>
        </TextInputWithNote>
      )}
      {spaceports.length > 0
        ? (
          <SelectionTableWrapper>
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Building</td>
                  <td>Lot Id</td>
                  <td>Landing Fee</td>
                </tr>
              </thead>
              <tbody>
                {spaceports.map((lotId) => {
                  return (
                    <SelectionTableRow
                      key={lotId}
                      onClick={() => setSelection(lotId)}
                      selectedRow={lotId === selection}>
                      <td>Parking @ {lotId}</td>
                      <td>Spaceport</td>
                      <td><LocationIcon /> {formatters.lotName(Lot.toIndex(lotId))}</td>
                      <td>0</td>
                    </SelectionTableRow>
                  );
                })}
              </tbody>
            </table>
          </SelectionTableWrapper>
        )
        : <EmptyMessage>There are no available spaceports.</EmptyMessage>
      }
    </SelectionDialog>
  );
};

export const ProcessSelectionDialog = ({ initialSelection, onClose, forceProcesses, processorType, onSelected, open }) => {
  const [error, setError] = useState();
  const [selection, setSelection] = useState(initialSelection);

  const processes = useMemo(() => {
    return forceProcesses || Object.values(Process.TYPES).filter((p) => p.processorType === processorType);
  }, [forceProcesses, processorType])

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
      title={`Select Process`}
      style={{ maxWidth: '90vw' }}>
      {/* TODO: isLoading */}
      {/* TODO: replace with DataTable? */}
      <SelectionTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Process Name</td>
              <td style={{ textAlign: 'left'}}>Inputs</td>
              {processes[0]?.outputs && <td style={{ textAlign: 'left'}}>Outputs</td>}
            </tr>
          </thead>
          <tbody>
            {processes.map(({ i, name, inputs, outputs }) => {
              // console.log({ i, name, inputs, outputs });
              return (
                <SelectionTableRow
                  key={i}
                  onClick={() => setSelection(i)}
                  selectedRow={i === selection}>
                  <td><div style={{ display: 'flex', alignItems: 'center' }}><ProcessIcon style={{ marginRight: 6 }} /> {name}</div></td>
                  <td>
                    <InputOutputTableCell>
                      <label>{Object.keys(inputs).length}</label>
                      {Object.keys(inputs).map((resourceId) => (
                        <ResourceThumbnail key={resourceId} resource={Product.TYPES[resourceId]} size="45px" tooltipContainer="selectionDialog" />
                      ))}
                    </InputOutputTableCell>
                  </td>
                  {outputs && (
                    <td>
                      <InputOutputTableCell>
                        <label>{Object.keys(outputs).length}</label>
                        {Object.keys(outputs).map((resourceId) => (
                          <ResourceThumbnail key={resourceId} resource={Product.TYPES[resourceId]} size="45px" tooltipContainer="selectionDialog" />
                        ))}
                      </InputOutputTableCell>
                    </td>
                  )}
                </SelectionTableRow>
              );
            })}
          </tbody>
        </table>
      </SelectionTableWrapper>
    </SelectionDialog>
  );
}

export const ShipConstructionSelectionDialog = ({ initialSelection, onClose, onSelected, open }) => {
  const [error, setError] = useState();
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
      title={`Select Process`}
      style={{ maxWidth: '90vw' }}>
      {/* TODO: isLoading */}
      {/* TODO: replace with DataTable? */}
      <SelectionTableWrapper>
        <table>
          <thead>
            <tr>
              <td>Process Name</td>
              <td style={{ textAlign: 'left'}}>Inputs</td>
              <td style={{ textAlign: 'left'}}>Outputs</td>
            </tr>
          </thead>
          <tbody>
            {Object.keys(Ship.CONSTRUCTION_TYPES).map((shipType) => {
              return (
                <SelectionTableRow
                  key={shipType}
                  onClick={() => setSelection(shipType)}
                  selectedRow={shipType === selection}>
                  <td><div style={{ display: 'flex', alignItems: 'center' }}><ProcessIcon style={{ marginRight: 6 }} /> {Ship.TYPES[shipType]?.name} Integration</div></td>
                  <td>
                    <InputOutputTableCell>
                      <label>{Object.keys(Ship.CONSTRUCTION_TYPES[shipType].requirements).length}</label>
                      {Object.keys(Ship.CONSTRUCTION_TYPES[shipType].requirements).map((resourceId) => (
                        <ResourceThumbnail key={resourceId} resource={Product.TYPES[resourceId]} size="45px" tooltipContainer="selectionDialog" />
                      ))}
                    </InputOutputTableCell>
                  </td>
                  <td>
                    <InputOutputTableCell>
                      <ShipImage shipType={shipType} style={{ height: '45px', width: '74px' }} tooltipContainer="selectionDialog" />
                    </InputOutputTableCell>
                  </td>
                </SelectionTableRow>
              );
            })}
          </tbody>
        </table>
      </SelectionTableWrapper>
    </SelectionDialog>
  );
};

// TODO: should this be in sdk?
const getInventorySublabel = (inventoryType) => {
  switch(inventoryType) {
    case Inventory.IDS.WAREHOUSE_SITE:
    case Inventory.IDS.EXTRACTOR_SITE:
    case Inventory.IDS.REFINERY_SITE:
    case Inventory.IDS.BIOREACTOR_SITE:
    case Inventory.IDS.FACTORY_SITE:
    case Inventory.IDS.SHIPYARD_SITE:
    case Inventory.IDS.SPACEPORT_SITE:
    case Inventory.IDS.MARKETPLACE_SITE:
    case Inventory.IDS.HABITAT_SITE:
      return 'Site';
    
    case Inventory.IDS.PROPELLANT_TINY:
    case Inventory.IDS.PROPELLANT_SMALL:
    case Inventory.IDS.PROPELLANT_MEDIUM:
    case Inventory.IDS.PROPELLANT_LARGE:
      return 'Propellant';
    
    default:  // others are considered "primary" for their entity
      return '';
  }
}

export const InventorySelectionDialog = ({ otherEntity, otherLotId, isSourcing, itemIds, initialSelection, onClose, onSelected, open, requirePresenceOfItemIds }) => {
  const { crew } = useCrewContext();

  const [selection, setSelection] = useState(initialSelection);

  const asteroidId = useMemo(() => Entity.toPosition({ id: otherLotId, label: Entity.IDS.LOT }).asteroidId || 0, [otherLotId]);

  const { data: inventoryData, isLoading: inventoryDataLoading } = useAccessibleAsteroidInventories(asteroidId);

  const inventories = useMemo(() => {
    if (!inventoryData) return [];

    const otherLotIndex = Lot.toIndex(otherLotId)

    const display = [];
    inventoryData.forEach((entity) => {
      if (otherEntity && entity.id === otherEntity.id && entity.label === otherEntity.label) return;
      if (!entity.Inventories) return;
      entity.Inventories.forEach((inv) => {
        // skip if locked (or inventory type is 0, which should not happen but has in staging b/c of dev bugs)
        if (inv.status !== Inventory.STATUSES.AVAILABLE || inv.inventoryType === 0) return;

        // skip if cannot contain any of the itemIds
        if (itemIds && Inventory.TYPES[inv.inventoryType].productConstraints) {
          const allowedMaterials = Object.keys(Inventory.TYPES[inv.inventoryType].productConstraints);
          if (!itemIds.find((i) => !allowedMaterials.includes(i))) return;
        }

        // skip if cannot locate entity lot
        const entityLotId = entity.Location.locations.find((l) => l.label === Entity.IDS.LOT)?.id;
        const entityLotIndex = Lot.toIndex(entityLotId);
        if (!entityLotIndex) return;

        let itemTally = 0;
        if (itemIds?.length === 1) {
          itemTally = (inv.contents || []).find((p) => p.product === Number(itemIds[0]))?.amount || 0;
        } else if (itemIds?.length) {
          itemTally = itemIds.filter((itemId) => (inv.contents || []).find((p) => p.product === Number(itemId))?.amount > 0).length;
        }
        
        // skip if non-primary and no items
        const nonPrimaryType = getInventorySublabel(inv.inventoryType);
        if (nonPrimaryType && itemIds?.length && itemTally === 0) return;

        // disable if !available or does not contain itemId
        display.push({
          disabled: requirePresenceOfItemIds && !itemTally,
          distance: Asteroid.getLotDistance(asteroidId, entityLotIndex, otherLotIndex), // distance to source + distance to destination
          isMine: entity.Control.controller.id === crew?.id,
          isShip: !!entity.Ship,
          itemTally,
          key: JSON.stringify({ id: entity.id, label: entity.label, lotId: entityLotId, asteroidId, lotIndex: entityLotIndex, slot: inv.slot }),
          label: entity.Ship ? formatters.shipName(entity) : formatters.buildingName(entity),
          sublabel: nonPrimaryType,
          lotId: entityLotId,
          lotIndex: entityLotIndex,
          slot: inv.slot,
        })
      });
    });

    return display.sort((a, b) => a.distance - b.distance);
  }, [inventoryData, itemIds]);

  const onComplete = useCallback(() => {
    onSelected(selection ? JSON.parse(selection) : null);
    onClose();
  }, [onClose, onSelected, selection]);

  const specifiedItems = !!itemIds;
  const soloItem = itemIds?.length === 1 ? itemIds[0] : null;

  return (
    <SelectionDialog
      isCompletable={!!selection}
      onClose={onClose}
      onComplete={onComplete}
      open={open}
      title={isSourcing && soloItem
        ? `Available ${Product.TYPES[soloItem].name}s`
        : 'Available Inventories'}>
      {/* TODO: isLoading */}
      {/* TODO: replace with DataTable? */}
      <div style={{ minWidth: 500 }}></div>
      {inventories.length > 0
        ? (
          <SelectionTableWrapper style={{ minHeight: 200 }}>
            <table>
              <thead>
                <tr>
                  <td></td>{/* isMine */}
                  <td style={{ textAlign: 'left' }}>Name</td>
                  <td>Distance</td>
                  {isSourcing && specifiedItems && (
                    <td>
                      {soloItem ? `# ${Product.TYPES[soloItem].name}` : 'Needed Products'}
                    </td>
                  )}
                </tr>
              </thead>
              <tbody>
                {inventories.map((inv) => {
                  return (
                    <SelectionTableRow
                      key={inv.key}
                      disabledRow={inv.disabled}
                      onClick={() => setSelection(inv.key)}
                      selectedRow={inv.key === selection}>
                      <td>{inv.isMine && <MyAssetIcon />}</td>
                      <td style={{ textAlign: 'left' }}>{inv.label}{inv.sublabel && <small> ({inv.sublabel})</small>} {inv.isShip && <ShipIcon />}</td>
                      <td>{formatSurfaceDistance(inv.distance)}</td>
                      {isSourcing && specifiedItems && <td>{inv.itemTally.toLocaleString()}</td>}
                    </SelectionTableRow>
                  );
                })}
              </tbody>
            </table>
          </SelectionTableWrapper>
        )
        : <EmptyMessage>You have no {otherEntity ? 'other ' : ''}available inventories on this asteroid.</EmptyMessage>
      }
    </SelectionDialog>
  );
};


//
//  FORMATTERS
//

export const getCapacityStats = (inventory) => {
  const capacity = {
    mass: { max: 0, used: 0, reserved: 0 },
    volume: { max: 0, used: 0, reserved: 0 },
  }
  if (inventory?.status === Inventory.STATUSES.AVAILABLE) {
    const { filledMass, filledVolume } = Inventory.getFilledCapacity(inventory.inventoryType);
    capacity.mass.max = filledMass;
    capacity.mass.isSoftMax = Inventory.TYPES[inventory.inventoryType].massConstraint === Infinity;
    capacity.volume.max = filledVolume;
    capacity.volume.isSoftMax = Inventory.TYPES[inventory.inventoryType].volumeConstraint === Infinity;

    const { reservedMass, reservedVolume, mass, volume } = inventory || {};
    capacity.mass.used = (mass || 0);
    capacity.mass.reserved = (reservedMass || 0);
    capacity.volume.used = (volume || 0);
    capacity.volume.reserved = (reservedVolume || 0);
  }
  return capacity;
}

export const getCapacityUsage = (inventories, type) => {
  return getCapacityStats((inventories || []).find((i) => i.inventoryType === type));
}

export const getBuildingRequirements = (building = {}, deliveryActions = []) => {
  const { Building: { buildingType }, Inventories = [] } = building;
  const inventory = Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE); // TODO: should this be slot?

  return Object.keys(Building.CONSTRUCTION_TYPES[buildingType]?.requirements || {}).map((productId) => {
    const totalRequired = Building.CONSTRUCTION_TYPES[buildingType].requirements[productId];
    const inInventory = (inventory?.contents || []).find((c) => Number(c.product) === Number(productId))?.amount || 0;
    const inTransit = deliveryActions
      .filter((d) => d.status !== 'FINISHED')
      .reduce((acc, d) => acc + (d.action.contents.find((c) => Number(c.product) === Number(productId))?.amount) || 0, 0);
    return {
      i: productId,
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

export const AsteroidImage = ({ asteroid, size }) => {
  return (
    <AsteroidThumbnailWrapper size={size}>
      <AsteroidRendering asteroid={asteroid} brightness={1.2} />
      <ClipCorner dimension={10} />
    </AsteroidThumbnailWrapper>
  )
}

export const ShipImage = ({ shipType, iconBadge, iconBadgeColor, iconOverlay, iconOverlayColor, inventories, showInventoryStatusForType, simulated, size = 'w150', backgroundSize = 'cover', style = {} }) => {
  const shipAsset = Ship.TYPES[Math.abs(shipType)]; // abs for simulated ships
  if (!shipAsset) return null;

  const capacity = getCapacityUsage(inventories, showInventoryStatusForType);
  return (
    <ShipThumbnailWrapper style={style}>
      <ResourceImage src={getShipIcon(shipAsset.i, size, simulated)} style={{ backgroundSize }} />
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
      {iconBadge && <ThumbnailBadge style={{ color: iconBadgeColor || 'white' }}>{iconBadge}</ThumbnailBadge>}
      {iconOverlay && <ThumbnailOverlay color={iconOverlayColor}>{iconOverlay}</ThumbnailOverlay>}
      <ClipCorner dimension={10} />
    </ShipThumbnailWrapper>
  );
};

export const BuildingImage = ({ buildingType, error, iconOverlay, iconOverlayColor, inventory, inventories, showInventoryStatusForType, unfinished }) => {
  const buildingAsset = Building.TYPES[buildingType];
  if (!buildingAsset) return null;

  const capacity = inventory ? getCapacityStats(inventory) : getCapacityUsage(inventories, showInventoryStatusForType);
  const closerLimit = (capacity.volume.used + capacity.volume.reserved) / capacity.volume.max > (capacity.mass.used + capacity.mass.reserved) / capacity.mass.max ? 'volume' : 'mass';
  return (
    <BuildingThumbnailWrapper>
      <ResourceImage src={getBuildingIcon(buildingAsset.i, 'w150', unfinished)} />
      {inventory !== false && capacity && (
        <>
          <InventoryLabel overloaded={error}>
            {formatFixed(100 * (capacity[closerLimit].reserved + capacity[closerLimit].used) / capacity[closerLimit].max, 1)}% {/*closerLimit === 'volume' ? `m³` : `t`*/}
          </InventoryLabel>
          <InventoryUtilization
            horizontal
            overloaded={error}
            progress={capacity[closerLimit].used / capacity[closerLimit].max}
            secondaryProgress={(capacity[closerLimit].reserved + capacity[closerLimit].used) / capacity[closerLimit].max} />
        </>
      )}
      {iconOverlay && <ThumbnailOverlay color={iconOverlayColor}>{iconOverlay}</ThumbnailOverlay>}
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

export const MiniBarChart = ({ color, deltaColor, deltaValue, label, valueLabel, value, valueStyle, underLabels }) => (
  <MiniBarWrapper>
    <ChartLabels>
      <label>{label}</label>
      <label style={valueStyle || {}}>{valueLabel}</label>
    </ChartLabels>
    <MiniBar color={color} value={Math.min(value, 1)} deltaColor={deltaColor} deltaValue={Math.max(-1, Math.min(deltaValue, 1))}>
      {deltaValue ? <DeltaIcon negativeDelta={deltaValue < 0} value={value}><FastForwardIcon /></DeltaIcon> : null}
    </MiniBar>
    {underLabels && <UnderChartLabels>{underLabels}</UnderChartLabels>}
  </MiniBarWrapper>
);

export const SwayInput = () => {
  return (
    <SwayInputRow>
      <SwayInputIconWrapper><SwayIcon /></SwayInputIconWrapper>
      <SwayInputFieldWrapper>
        <TextInput type="number" min={0} value={0} />
      </SwayInputFieldWrapper>
      <SwayInputHelp>{/* TODO: this doesn't do anything */}
        <QuestionIcon />
      </SwayInputHelp>
    </SwayInputRow>
  );
};

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

export const Mouseoverable = ({ children, tooltip, style = {}, themeColor }) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <>
      <span
        ref={refEl}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}>
        {children}
      </span>
      <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
        <MouseoverContent highlightColor={themeColor}>
          {tooltip}
        </MouseoverContent>
      </MouseoverInfoPane>
    </>
  );
}

//
// COMPONENTS
//

const ActionDialogActionBar = ({ location, onClose, overrideColor, stage }) => (
  <ActionBar {...theming[stage]} overrideColor={overrideColor}>
    {(stage === actionStage.STARTING || stage === actionStage.COMPLETING) && (
      <BarLoadingContainer>
        <BarLoader color={theme.colors.lightPurple} height="5" speedMultiplier={0.5} width="100%" />
      </BarLoadingContainer>
    )}
    <ActionLocation {...theming[stage]} overrideColor={overrideColor}>
      <b>{formatters.asteroidName(location?.asteroid)}</b>
      <span>{location?.lot ? `> ${formatters.lotName(Lot.toIndex(location.lot.id))}` : ''}</span>
      <span>{location?.ship && !location?.lot ? `> ${formatShipStatus(location.ship)}` : ''}</span>
    </ActionLocation>
    <IconButton backgroundColor={`rgba(0, 0, 0, 0.15)`} marginless onClick={onClose}>
      <CloseIcon />
    </IconButton>
  </ActionBar>
);

export const ActionDialogHeader = ({ action, captain, crewAvailableTime, location, onClose, overrideColor, stage, taskCompleteTime, wide }) => {
  return (
    <>
      <ActionDialogActionBar
        location={location}
        onClose={onClose}
        overrideColor={overrideColor}
        stage={stage}
      />
      <Header theming={theming[stage]} overrideHighlightColor={overrideColor} wide={wide}>
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
              {crewAvailableTime !== undefined && <TimePill type="crew"><BusyIcon /> {formatTimer(crewAvailableTime, 2)}</TimePill>}
              {taskCompleteTime !== undefined && <TimePill type="total"><AlertIcon /> {formatTimer(taskCompleteTime, 2)}</TimePill>}
            </div>
          </LabelContainer>
        </IconAndLabel>
      </Header>
    </>
  );
};

export const FlexSectionInputBlock = ({ bodyStyle, children, disabled, image, innerBodyStyle, isSelected, label, onClick, style = {}, sublabel, title, titleDetails, tooltip, ...props }) => {
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
        {title && <SectionTitle>{title}{titleDetails && <><b style={{ flex: 1 }} /><SectionTitleRight>{titleDetails}</SectionTitleRight></>}</SectionTitle>}

        <FlexSectionInputBody
          isSelected={isSelected}
          onClick={disabled ? null : onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          ref={refEl}
          style={bodyStyle}
          {...props}>
          {children && (
            <FlexSectionInputBodyInner style={innerBodyStyle}>
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

export const FlexSectionBlock = ({ bodyStyle, children, style = {}, title, titleDetails }) => {
  return (
    <FlexSectionInputContainer style={style}>
      {title && <SectionTitle>{title}{titleDetails && <><b style={{ flex: 1 }} /><SectionTitleRight>{titleDetails}</SectionTitleRight></>}</SectionTitle>}
      <FlexSectionBlockInner style={bodyStyle}>
        {children}
      </FlexSectionBlockInner>
    </FlexSectionInputContainer>
  );
};


//
// Sections
//

export const ResourceGridSectionInner = ({
  columns,
  isGathering,
  items,
  onClick,
  minCells = 0,
  noCellStyles,
  style,
  theming = 'default'
}) => {
  const { totalItems, totalMass, totalVolume } = useMemo(() => {
    return items.reduce((acc, { i, numerator, denominator, selected }) => {
      if (!Product.TYPES[i]) {
        console.error(`Product #${i} invalid`)
        return acc;
      }
      let sumValue = numerator;
      if (selected !== undefined) sumValue = selected;
      else if (denominator !== undefined) sumValue = denominator;

      acc.totalItems += (selected === undefined || selected > 0) ? 1 : 0;
      acc.totalMass += sumValue * Product.TYPES[i].massPerUnit;
      acc.totalVolume += sumValue * (Product.TYPES[i].volumePerUnit || 0);
      return acc;
    }, { totalItems: 0, totalMass: 0, totalVolume: 0 });
  }, [items]);

  return (
    <IngredientsList
      columns={columns}
      hasSummary
      theming={theming}
      isSelected={reactBool(onClick)}
      onClick={onClick}
      style={style}>
      {items.length > 0
        ? (
          <>
            {items.map((item) => (
              <ResourceRequirement
                key={item.i}
                isGathering={isGathering}
                item={item}
                resource={Product.TYPES[item.i]}
                noStyles={noCellStyles}
                size="92px"
                tooltipContainer="actionDialog" />
            ))}
            {Array.from({ length: Math.max(0, minCells - items.length) }).map((_, i) => (
              <EmptyResourceImage key={i} noIcon outlineColor="transparent" style={{ background: 'rgba(0, 0, 0, 0.25)' }} />
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
  );
};

const ResourceGridSection = ({ label, sectionProps = {}, ...props }) => (
  <Section style={{ marginBottom: 25 }}>
    <SectionTitle>{label}</SectionTitle>
    <SectionBody {...sectionProps}>
      <ResourceGridSectionInner {...props} />
    </SectionBody>
  </Section>
);

export const BuildingRequirementsSection = ({ mode, label, requirements, requirementsMet }) => {
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
      theming={requirementsMet ? undefined : 'warning'} />
  );
};

export const TransferBuildingRequirementsSection = ({ label, onClick, requirements, selectedItems }) => {
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
      onClick={onClick} />
  );
};

export const DeconstructionMaterialsSection = ({ label, itemsReturned }) => {
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
      label={label} />
  );
};

export const ItemSelectionSection = ({ columns = 7, label, items, onClick, stage, unwrapped, ...props }) => {
  const formattedItems = useMemo(() => {
    return Object.keys(items || {}).map((resourceId) => ({
      i: resourceId,
      numerator: items[resourceId]
    }));
  }, [items]);

  return unwrapped
    ? (
      <ResourceGridSectionInner
        columns={columns}
        items={formattedItems}
        minCells={columns * 2}
        noCellStyles={stage !== actionStage.NOT_STARTED}
        onClick={onClick}
        theming={stage === actionStage.READY_TO_COMPLETE ? 'success' : 'default'}
        {...props} />
    )
    : (
      <ResourceGridSection
        columns={columns}
        items={formattedItems}
        label={label}
        minCells={columns * 2}
        noCellStyles={stage !== actionStage.NOT_STARTED}
        onClick={onClick}
        theming={stage === actionStage.READY_TO_COMPLETE ? 'success' : 'default'}
        {...props} />
    );
};

export const TransferDistanceDetails = ({ distance, crewTravelBonus}) => {
  const crewFreeTransferRadius = Asteroid.FREE_TRANSPORT_RADIUS * (crewTravelBonus?.totalBonus || 1) / (crewTravelBonus?.timeMultiplier || 1);
  return (
    <TransferDistanceTitleDetails>
      {distance && distance < crewFreeTransferRadius ? (
        <Mouseoverable tooltip={(
          <FreeTransferNote>
            <div>Instant Transfer Radius</div>
            <div>Transfers less than {crewFreeTransferRadius}km in distance are instantaneous.</div>
          </FreeTransferNote>
        )}>
          <label><WarningOutlineIcon /> {Math.round(distance)}km Away</label>
        </Mouseoverable>
      ) : ''}
      {distance && distance >= crewFreeTransferRadius ? `${Math.round(distance)}km Away` : ''}
    </TransferDistanceTitleDetails>
  );
};

export const ProgressBarSection = ({
  finishTime,
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
  totalTime,
  width
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
        const isZero = chainTime > finishTime;
        const progress = startTime && finishTime && chainTime
          ? Math.max(0, 1 - (chainTime - startTime) / (finishTime - startTime))
          : 1;
        r.animating = !isZero;
        r.reverseAnimation = true;
        r.barWidth = progress;
        r.left = `${formatFixed(100 * progress, 1)}%`;
        r.right = isZero
          ? <span style={{ color: theme.colors.error }}>ABANDONED</span>
          : <><LiveTimer target={finishTime} maxPrecision={2} /> left</>;
      }
      r.color = '#AAA';
      r.left = '0.0%';

    } else if (stage === actionStage.STARTING) {
      r.animating = true;
      r.color = '#AAA';
      r.left = '0.0%';

    } else if (stage === actionStage.IN_PROGRESS) {
      const progress = startTime && finishTime && chainTime
        ? Math.min(1, (chainTime - startTime) / (finishTime - startTime))
        : 0;
      r.animating = true;
      r.barWidth = progress;
      r.color = '#FFF';
      r.left = `${formatFixed(100 * progress, 1)}%`;
      r.right = <LiveTimer target={finishTime} />

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
  }, [chainTime, finishTime, stage, startTime]);

  const totalTimeNote = useMemo(() => {
    if (!totalTime) return '';
    if ([actionStage.NOT_STARTED, actionStage.COMPLETING, actionStage.COMPLETED].includes(stage)) return '';
    return `TOTAL: ${formatTimer(totalTime, 2)}`;
  }, [stage, totalTime]);

  return (
    <Section style={{ width }}>
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
          color={overrides.barColor || theming[stage]?.highlight}
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

export const ResourceAmountSlider = ({ amount, extractionTime, min, max, resource, setAmount }) => {
  const [grams, tonnageValue] = useMemo(() => {
    const grams = amount * resource?.massPerUnit || 0;
    const tonnage = grams / 1e6;
    const tonnageValue = Math.round(1e3 * tonnage) / 1e3;
    return [grams, tonnageValue];
  }, [amount, resource]);

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
    let quanta = Math.round(1e6 * e.currentTarget.value / resource.massPerUnit);
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
              <b>{formatSampleMass(grams)}</b>
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
};

export const RecipeSlider = ({ amount, disabled, increment = 0.001, processingTime, min: rawMin, max: rawMax, overrideSliderLabel, setAmount }) => {
  const [focusOn, setFocusOn] = useState();
  const [mouseIn, setMouseIn] = useState(false);

  const [min, max] = useMemo(() => {
    return [
      Math.ceil(rawMin / increment) * increment,
      Math.floor(rawMax / increment) * increment
    ];
  }, [increment, rawMin, rawMax]);

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

  const onSetAmount = useCallback((value) => {
    // apply max, then min, then single increment
    let cleansed = Math.min(max, value);

    // apply min / single increment
    cleansed = Math.max(cleansed, min, increment);

    // round to nearest increment
    cleansed = Math.floor(cleansed / increment) * increment;

    setAmount(cleansed);
  }, [increment, min, max]);

  const onChangeInput = useCallback((e) => {
    onSetAmount(e.currentTarget.value);
  }, [onSetAmount]);

  const onRound = useCallback(() => {
    onSetAmount(Math.round(amount));
  }, [amount, onSetAmount]);

  return (
    <SliderWrapper>
      <SliderInput
        disabled={disabled}
        min={min}
        max={max}
        increment={increment}
        onChange={onSetAmount}
        value={amount || 0} />
      <SliderInfoRow style={{ alignItems: 'center' }}>
        <SliderInfo style={{ flex: 1 }}>{formatTimer(processingTime, 3)}</SliderInfo>
        {overrideSliderLabel || (
          <>
            <SliderLabel onMouseEnter={onMouseEvent} onMouseLeave={onMouseEvent} style={{ flex: 'none', fontSize: '10px', lineHeight: '29px' }}>
              {(mouseIn || focusOn) ? (
                <SliderTextInput
                  type="number"
                  disabled={disabled}
                  step={0.001}
                  value={amount}
                  onChange={onChangeInput}
                  onBlur={onFocusEvent}
                  onFocus={onFocusEvent}
                  style={{ marginTop: -2 }} />
                )
                : (
                  <b>{amount.toLocaleString(undefined, { minimumFractionDigits: 3 })}</b>
                )
              }
              {' '}
              <span style={{ fontSize: 14 }}>SRs</span>
            </SliderLabel>
            {!disabled && (
              <>
                <Button
                  disabled={amount === Math.round(amount)}
                  onClick={onRound}
                  size="small"
                  style={{ marginLeft: 10, padding: 0, minWidth: 75 }}>Round</Button>
                <Button
                  disabled={amount === max}
                  onClick={() => onSetAmount(max)}
                  size="small"
                  style={{ marginLeft: 10, padding: 0, minWidth: 75 }}>Max</Button>
              </>
            )}
          </>
        )}
      </SliderInfoRow>
    </SliderWrapper>
  );
};

export const ProcessInputOutputSection = ({ title, products, input, output, primaryOutput, setPrimaryOutput, source, ...props }) => {
  const sourceContents = useMemo(() => (source?.contents || []).reduce((acc, cur) => ({ ...acc, [cur.product]: cur.amount }), {}), [source]);
  return (
    <FlexSectionBlock title={title} {...props} bodyStyle={{ padding: 0 }}>
      <ProductWrapper>
        {products.map(({ i: resourceId, recipe, amount }) => {
          const thumbProps = {};
          if (output) {
            thumbProps.backgroundColor = `rgba(${hexToRGB(theme.colors.green)}, 0.15)`;
            thumbProps.badgeColor = theme.colors.green;
          } else if ((sourceContents[resourceId] || 0) > amount) {
            thumbProps.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.15)`;
            thumbProps.badgeColor = theme.colors.main;
            thumbProps.progress = 1;
          } else {
            thumbProps.backgroundColor = `rgba(${hexToRGB(theme.colors.error)}, 0.15)`;
            thumbProps.badgeColor = theme.colors.error;
            thumbProps.progress = (sourceContents[resourceId] || 0) / amount;
            if (source) {
              thumbProps.tooltipOverride = `[INSUFFICIENT] ${Product.TYPES[resourceId]?.name}`;
            }
          }
          const resource = Product.TYPES[resourceId];
          return (
            <ProductSelector
              key={resourceId}
              input={input}
              output={output}
              primary={primaryOutput === resourceId}
              onClick={setPrimaryOutput ? () => setPrimaryOutput(resourceId) : undefined}>
              <ResourceThumbnail
                resource={resource}
                badge={`${output ? '+' : '-'}${resource.isAtomic ? amount : formatResourceMass(amount, resourceId)}`}
                iconBadge={<RecipeLabel>{recipe.toLocaleString()}</RecipeLabel>}
                tooltipContainer="actionDialog"
                {...thumbProps}
              />
              {output && (
                <label>
                  {primaryOutput === resourceId
                    ? (
                      <>
                        <CheckIcon /> Primary
                        <ClipCorner dimension={10} color={theme.colors.main} />
                      </>
                    )
                    : `-50%`
                  }
                </label>
              )}
            </ProductSelector>
          );
        })}
      </ProductWrapper>
    </FlexSectionBlock>
  );
};

export const ProcessInputSquareSection = ({ title, products, input, output, primaryOutput, setPrimaryOutput, source, ...props }) => {
  const sourceContents = useMemo(() => (source?.contents || []).reduce((acc, cur) => ({ ...acc, [cur.product]: cur.amount }), {}), [source]);
  return (
    <FlexSectionBlock title={title} {...props} bodyStyle={{ padding: 0 }}>
      <ProductGridWrapper>
        {products.map(({ i: resourceId, recipe, amount }) => {
          const thumbProps = {};
          if (output) {
            thumbProps.backgroundColor = `rgba(${hexToRGB(theme.colors.green)}, 0.15)`;
            thumbProps.badgeColor = theme.colors.green;
          } else if ((sourceContents[resourceId] || 0) > amount) {
            thumbProps.backgroundColor = `rgba(${theme.colors.mainRGB}, 0.15)`;
            thumbProps.badgeColor = theme.colors.main;
            thumbProps.progress = 1;
          } else {
            thumbProps.backgroundColor = `rgba(${hexToRGB(theme.colors.error)}, 0.15)`;
            thumbProps.badgeColor = theme.colors.error;
            thumbProps.progress = (sourceContents[resourceId] || 0) / amount;
            if (source) {
              thumbProps.tooltipOverride = `[INSUFFICIENT] ${Product.TYPES[resourceId]?.name}`;
            }
          }
          const resource = Product.TYPES[resourceId];
          return (
            <ProductSelector
              key={resourceId}
              input={input}
              output={output}
              primary={primaryOutput === resourceId}
              onClick={setPrimaryOutput ? () => setPrimaryOutput(resourceId) : undefined}>
              <ResourceThumbnail
                resource={resource}
                badge={`${output ? '+' : '-'}${resource.isAtomic ? amount : formatResourceMass(amount, resourceId)}`}
                iconBadge={<RecipeLabel>{(recipe || 0).toLocaleString()}</RecipeLabel>}
                size="87px"
                tooltipContainer="actionDialog"
                {...thumbProps}
              />
              {output && <label>{primaryOutput === resourceId ? <><CheckIcon /> Primary</> : `-50%`}</label>}
            </ProductSelector>
          );
        })}
      </ProductGridWrapper>
    </FlexSectionBlock>
  );
};

export const PropulsionTypeSection = ({ objectLabel, propulsiveTime, tugTime, selected, onSelect, warning }) => {
  return (
    <FlexSectionBlock title={`${objectLabel} Type`} bodyStyle={{ padding: 0 }}>
      <>
        {(onSelect || selected === 'propulsive') && (
          <PropulsionTypeOption
            onClick={onSelect ? onSelect('propulsive') : undefined}
            selected={selected === 'propulsive'}>
            {onSelect && (selected === 'propulsive' ? <RadioCheckedIcon /> : <RadioUncheckedIcon />)}
            <div style={{ flex: 1 }}>
              <label>Propulsive:</label> Thruster {objectLabel}
            </div>
            <div>{formatTimer(propulsiveTime || 0, 2)}</div>
          </PropulsionTypeOption>
        )}
        {(onSelect || selected === 'tug') && (
          <PropulsionTypeOption
            onClick={onSelect ? onSelect('tug') : undefined}
            selected={selected === 'tug'}>
            {onSelect && (selected === 'tug' ? <RadioCheckedIcon /> : <RadioUncheckedIcon />)}
            <div style={{ flex: 1 }}>
              <label>Tug:</label> Hopper-Assisted {objectLabel}
            </div>
            <div>{formatTimer(tugTime || 0, 2)}</div>
          </PropulsionTypeOption>
        )}
        {warning && (
          <TugWarning>
            <WarningOutlineIcon />
            <span>{warning}</span>
          </TugWarning>
        )}
      </>
    </FlexSectionBlock>
  );
}

export const PropellantSection = ({ title, narrow, deltaVLoaded, deltaVRequired, propellantLoaded, propellantRequired }) => {
  const [deltaVMode, setDeltaVMode] = useState(false);
  // useEffect(() => ReactTooltip.rebuild(), []);

  const propellantUse = propellantLoaded > 0 ? propellantRequired / propellantLoaded : 1;
  const deltaVUse = deltaVLoaded > 0 ? deltaVRequired / deltaVLoaded : 1;

  return (
    <FlexSectionBlock
      title={title}
      titleDetails={(
        <SectionTitleRightTabs>
          <SectionTitleTab
            data-for="actionDialog"
            data-tip="Propellant Usage"
            data-place="left"
            onClick={() => setDeltaVMode(false)}
            isSelected={!deltaVMode}><GasIcon /></SectionTitleTab>
          <SectionTitleTab
            data-for="actionDialog"
            data-tip="Delta-V Usage"
            data-place="left"
            onClick={() => setDeltaVMode(true)}
            isSelected={!!deltaVMode}><DeltaVIcon /></SectionTitleTab>
        </SectionTitleRightTabs>
      )}
      bodyStyle={{ padding: '1px 0' }}
      style={narrow ? {} : { width: '100%' }}>
        {narrow && (
          <BarChartNotes color={deltaVMode ? '#aaaaaa' : theme.colors.main}>
            <div>
              <b>Required: </b>
              {propellantRequired
                ? (deltaVMode ? formatVelocity(deltaVRequired) : formatMass(propellantRequired * 1e3))
                : 'NONE'
              }
            </div>
            <div />
            <div>
              <b>Loaded:</b> {deltaVMode ? formatVelocity(deltaVLoaded) : formatMass(propellantLoaded * 1e3)}
              {/* TODO: tooltip this? <small style={{ color: '#667'}}> / {formatMass(propellantMax * 1e3)} max</small> */}
            </div>
          </BarChartNotes>
        )}
        {deltaVMode
          ? <BarChart
              color="#cccccc"
              value={deltaVUse} />
          : <BarChart
              color={theme.colors.orange}
              bgColor={theme.colors.main}
              value={propellantUse} />
        }
        {!(narrow && !propellantRequired) && (
          <BarChartNotes color={deltaVMode ? '#aaaaaa' : theme.colors.main}>
            {!narrow && (
              <div>
                <b>Required: </b>
                {propellantRequired
                  ? (deltaVMode ? formatVelocity(deltaVRequired) : formatMass(propellantRequired * 1e3))
                  : 'NONE'
                }
              </div>
            )}
            <div style={{ color: deltaVMode ? '#ccc' : theme.colors.orange, ...(narrow ? { textAlign: 'center', width: '100%'} : {}) }}>
              {formatFixed(100 * (deltaVMode ? deltaVUse : propellantUse))}% of Loaded
            </div>
            {!narrow && (
              <div>
                <b>Loaded:</b> {deltaVMode ? formatVelocity(deltaVLoaded) : formatMass(propellantLoaded * 1e3)}
                {/* TODO: tooltip this? <small style={{ color: '#667'}}> / {formatMass(propellantMax * 1e3)} max</small>*/}
              </div>
            )}
          </BarChartNotes>
        )}
    </FlexSectionBlock>
  );
};

export const EmergencyPropellantSection = ({ title, propellantPregeneration, propellantPostgeneration, propellantTankMax }) => {
  // useEffect(() => ReactTooltip.rebuild(), []);

  const propellantPre = propellantPregeneration / propellantTankMax;
  const propellantPost = propellantPostgeneration / propellantTankMax;

  return (
    <FlexSectionBlock
      title={title}
      bodyStyle={{ padding: '1px 0' }}
      style={{ width: '100%' }}>
        <BarChart
          color={theme.colors.main}
          bgColor={theme.colors.main}
          value={propellantPre}
          postValue={propellantPost}>
          <BarChartLimitLine position={0.1} />
        </BarChart>
        <BarChartNotes color={theme.colors.main}>
          <div>
            <span style={{ color: theme.colors.red }}>Emergency Limit: </span>
            <b>{formatMass(0.1 * propellantTankMax * 1e3)}</b>
          </div>
          <div style={{ color: propellantPost > 0.1 ? theme.colors.error : theme.colors.main }}>
            {propellantPost > 0.1 && <span style={{ verticalAlign: 'middle', fontSize: 20, lineHeight: '1em' }}><CloseIcon /></span>}
            {formatFixed(100 * propellantPost / 0.1)}% of Limit
          </div>
          <div>
            After Generation: <b>{formatMass(propellantPostgeneration * 1e3)}</b>
          </div>
        </BarChartNotes>
    </FlexSectionBlock>
  );
};

export const SwayInputBlockInner = ({ instruction }) => {
  return (
    <>
      {instruction && <SwayInputInstruction>{instruction}</SwayInputInstruction>}
      <SwayInput />
    </>
  )
};

export const SwayInputBlock = ({ title, ...props }) => (
  <FlexSectionInputBlock
    title={title}
    bodyStyle={{ background: 'transparent' }}>
    <SwayInputBlockInner {...props} />
  </FlexSectionInputBlock>
);

export const CrewInputBlock = ({ cardWidth, crew, hideCrewmates, highlightCrewmates, title, inlineDetails, ...props }) => (
  <FlexSectionInputBlock
    title={title}
    titleDetails={inlineDetails ? null : (
      <div>
        <CrewIcon />
        <span style={{ fontSize: '85%', marginLeft: 4 }}>
          {formatters.crewName(crew)}
        </span>
      </div>
    )}
    bodyStyle={{ paddingRight: 8, ...(hideCrewmates ? { paddingBottom: 0 } : {}) }}
    innerBodyStyle={{ height: 'auto' }}
    {...props}>
    <div>
      {inlineDetails && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <CrewIcon />
            <span style={{ marginLeft: 4 }}>
              {formatters.crewName(crew)}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <LiveFoodStatus crew={crew} style={(props.subtle && !props.isSelected) ? { color: '#777' } : {}} />
        </div>
      )}
      {!hideCrewmates && (
        <CrewCards>
          {Array.from({ length: 5 }).map((_, i) =>
            crew._crewmates[i]
              ? (
                <CrewCardFramed
                  key={i}
                  borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
                  crewmate={crew._crewmates[i]}
                  isCaptain={i === 0}
                  lessPadding
                  noArrow={i > 0}
                  style={highlightCrewmates && !highlightCrewmates.includes(crew._crewmates[i].id) ? { opacity: 0.5 } : {}}
                  width={cardWidth || 60} />
              )
              : (
                <CrewCardPlaceholder
                  key={i}
                  style={highlightCrewmates ? { opacity: 0.5 } : {}}
                  width={cardWidth || 60} />
              )
          )}
        </CrewCards>
      )}
    </div>
  </FlexSectionInputBlock>
);

export const CrewOwnerBlock = ({ title, ...innerProps }) => {
  return (
    <FlexSectionInputBlock
      title={title}
      bodyStyle={{ background: 'transparent' }}>
      <CrewIndicator {...innerProps} />
    </FlexSectionInputBlock>
  );
};

export const LotInputBlock = ({ lot, fallbackLabel = 'Select', fallbackSublabel = 'Lot', imageProps = {}, ...props }) => {
  const buildingType = lot?.building?.Building?.buildingType || 0;
  return (
    <FlexSectionInputBlock
      image={
        lot
          ? <BuildingImage buildingType={buildingType} {...imageProps} />
          : <EmptyBuildingImage {...imageProps} />
      }
      label={lot ? `${lot.building?.Name?.name || Building.TYPES[buildingType].name}` : fallbackLabel}
      sublabel={lot ? `${lot.building?.Name?.name ? Building.TYPES[buildingType].name : formatters.lotName(Lot.toIndex(lot.id))}` : fallbackSublabel}
      {...props}
    />
  );
};

const Overloaded = styled.div`
  color: ${p => p.theme.colors.error};
  font-size: 12px;
  margin-top: 6px;
  text-transform: uppercase;
`;

export const InventoryInputBlock = ({ entity, isSourcing, inventorySlot, transferMass = 0, transferVolume = 0, fallbackLabel = 'Select', fallbackSublabel = 'Inventory', imageProps = {}, sublabel, ...props }) => {
  const inventory = useMemo(() => {
    if (entity && inventorySlot) {
      return entity.Inventories.find((i) => i.slot === inventorySlot);
    }
    return null;
  }, [entity, inventorySlot]);

  const destinationOverloaded = useMemo(() => {
    if (inventory && !isSourcing) {
      const capacity = getCapacityStats(inventory);
      if (!capacity.mass.isSoftMax && (capacity.mass.used + capacity.mass.reserved + transferMass > capacity.mass.max)) {
        return true;
      }
      if (!capacity.volume.isSoftMax && (capacity.volume.used + capacity.volume.reserved + transferVolume > capacity.volume.max)) {
        return true;
      }
    }
    return false;
  }, [transferMass, transferVolume, inventory]);

  const params = useMemo(() => {
    const fullImageProps = {
      ...imageProps,
      error: destinationOverloaded,
      inventory: !isSourcing && inventory
    }
    const lotIndex = locationsArrToObj(entity?.Location?.locations || []).lotIndex;
    if (entity?.label === Entity.IDS.BUILDING) {
      const unfinished = entity?.Building?.status !== Building.CONSTRUCTION_STATUSES.OPERATIONAL;
      return {
        image: (
          <BuildingImage
            buildingType={entity?.Building?.buildingType || 0}
            unfinished={reactBool(unfinished)}
            {...fullImageProps} />
        ),
        label: `${formatters.buildingName(entity)}${unfinished ? ' (Site)' : ''}`,
        sublabel: sublabel || formatters.lotName(lotIndex),
      };
    }
    else if (entity?.label === Entity.IDS.SHIP) {
      return {
        image: <ShipImage shipType={entity?.Ship?.shipType || 0} {...fullImageProps} />,
        label: formatters.shipName(entity),
        sublabel: sublabel || formatters.lotName(lotIndex),
      };
    }
    return { image: <EmptyBuildingImage {...fullImageProps} /> };
  }, [destinationOverloaded, imageProps, isSourcing, entity, inventory, sublabel]);

  return (
    <FlexSectionInputBlock
      image={params.image}
      label={params.label || fallbackLabel}
      sublabel={(
        <>
          {params.sublabel || fallbackSublabel}
          {destinationOverloaded && <Overloaded>Insufficient Capacity</Overloaded>}
        </>
      )}
      {...props}
    />
  );
};

export const BuildingInputBlock = ({ building, imageProps = {}, ...props }) => {
  const buildingType = building?.Building?.buildingType || 0;
  return (
    <FlexSectionInputBlock
      image={
        buildingType
          ? <BuildingImage buildingType={buildingType} {...imageProps} />
          : <EmptyBuildingImage {...imageProps} />
      }
      label={building?.Name?.name || Building.TYPES[buildingType].name}
      sublabel={building?.Name?.name ? Building.TYPES[buildingType].name : formatters.lotName(Entity.toPosition(building.Location?.location)?.lotIndex || 0)}
      {...props}
    />
  );
};

export const ShipInputBlock = ({ ship, ...props }) => {
  const { crew } = useCrewContext();
  const hasMyCrew = crew && crew._location?.shipId === ship?.id;
  const isMine = crew && crew.id === ship?.Control?.controller?.id;
  const inEmergencyMode = ship?.Ship?.operationMode === Ship.MODES.EMERGENCY;
  return (
    <FlexSectionInputBlock
      image={(
        <ShipImage
          iconBadge={isMine ? <MyAssetIcon /> : null}
          iconOverlay={inEmergencyMode ? <EmergencyModeEnterIcon /> : null}
          iconOverlayColor={theme.colors.orange}
          shipType={ship?.shipType} />
      )}
      label={formatters.shipName(ship)}
      sublabel={(
        <>
          <div>{Ship.TYPES[ship?.shipType]?.name}</div>
          <ShipStatus ship={ship}>{hasMyCrew && <CaptainIcon />}</ShipStatus>
        </>
      )}
      bodyStyle={inEmergencyMode ? { backgroundColor: `rgba(${hexToRGB(theme.colors.orange)}, 0.2)` } : {}}
      {...props}
    />
  );
};

export const ShipTab = ({ pilotCrew, ship, stage, previousStats = {}, warnings = [] }) => {
  const shipConfig = Ship.TYPES[ship?.shipType] || {};

  // TODO: if want to include "reserved", it would probably make sense to use getCapacityUsage helper instead
  const inventory = useMemo(() => {
    if (!ship) return {};
    const propellantInventory = ship.Inventories.find((i) => i.slot === shipConfig.propellantSlot);
    const cargoInventory = ship.Inventories.find((i) => i.slot === shipConfig.cargoSlot);
    return {
      propellantMass: propellantInventory?.mass || 0,
      maxPropellantMass: Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint || 0,
      propellantVolume: propellantInventory?.volume || 0,
      maxPropellantVolume: Inventory.TYPES[propellantInventory?.inventoryType]?.volumeConstraint || 0,
      cargoMass: cargoInventory?.mass || 0,
      maxCargoMass: Inventory.TYPES[cargoInventory?.inventoryType]?.massConstraint || 0,
      cargoVolume: cargoInventory?.volume || 0,
      maxCargoVolume: Inventory.TYPES[cargoInventory?.inventoryType]?.volumeConstraint || 0,
    };
  }, [shipConfig, ship?.Inventories]);

  return (
    <>
      <FlexSection>
        <ShipInputBlock
          title="Ship"
          disabled={stage !== actionStage.NOT_STARTED}
          ship={ship} />

        <FlexSectionSpacer />

        <CrewInputBlock
          title="Flight Crew"
          crew={pilotCrew} />
      </FlexSection>

      <FlexSection>
        <div style={{ width: '50%'}}>
          <MiniBarChartSection>
            <MiniBarChart
              color="#8cc63f"
              label="Propellant Mass"
              valueLabel={`${formatFixed(inventory.propellantMass / 1e3)} / ${formatFixed(inventory.maxPropellantMass / 1e3)}t`}
              value={0.5}
              {...(/* TODO: would probably be more performant to do this in a memo hook */
                previousStats.propellantMass
                  ? {
                    deltaValue: previousStats.propellantMass / inventory.maxPropellantMass
                  }
                  : {}
              )}
            />
            <MiniBarChart
              color="#557826"
              label="Propellant Volume"
              valueLabel={`${formatFixed(inventory.propellantVolume / 1e3)} / ${formatFixed(inventory.maxPropellantVolume / 1e3)}m³`}
              value={0.7}
            />
            <MiniBarChart
              label="Cargo Mass"
              valueLabel={`${formatFixed(inventory.cargoMass / 1e3)} / ${formatFixed(inventory.maxCargoMass / 1e3)}t`}
              value={0.8}
            />
            <MiniBarChart
              color="#1f5f75"
              label="Cargo Volume"
              valueLabel={`${formatFixed(inventory.cargoVolume / 1e3)} / ${formatFixed(inventory.maxCargoVolume / 1e3)}m³`}
              value={0.3}
            />
            <MiniBarChart
              color="#92278f"
              label="Passengers"
              valueLabel={`${pilotCrew.Crew.roster.length} / 5`}
              value={pilotCrew.Crew.roster.length / 5}
            />
          </MiniBarChartSection>
        </div>

        <FlexSectionSpacer />

        {warnings?.length > 0 && (
          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {warnings.map(({ icon, text }) => (
              <WarningAlert>
                <div>{icon}</div>
                <div>{text}</div>
              </WarningAlert>
            ))}
          </div>
        )}
      </FlexSection>
    </>
  );
};

export const InventoryChangeCharts = ({ inventory, deltaMass, deltaVolume }) => {
  if (!inventory) return null;

  const capacity = getCapacityStats(inventory);
  const postDeltaMass = capacity.mass.used + capacity.mass.reserved + deltaMass;
  const postDeltaVolume = capacity.volume.used + capacity.volume.reserved + deltaVolume;
  const overMassCapacity = postDeltaMass > capacity.mass.max;
  const overVolumeCapacity = postDeltaVolume > capacity.volume.max;
  const massColor = overMassCapacity ? theme.colors.error : theme.colors.main;
  const volumeColor = overVolumeCapacity ? theme.colors.error : theme.colors.main;
  return (
    <>
      <div style={{ paddingBottom: 15 }}>
        <MiniBarChart
          color={massColor}
          label="Mass Capacity"
          valueStyle={{ color: massColor, fontWeight: 'bold' }}
          valueLabel={`${formatFixed(100 * postDeltaMass / capacity.mass.max, 1)}%`}
          value={postDeltaMass / capacity.mass.max}
          deltaColor={overMassCapacity ? theme.colors.error : theme.colors.brightMain}
          deltaValue={deltaMass * 1e6 / capacity.mass.max}
          underLabels={(
            <>
              <span style={{ color: massColor, opacity: deltaMass < 0 ? 0.6 : 1 }}>{deltaMass < 0 ? '-' : '+'}{formatMass(Math.abs(deltaMass))}</span>
              <span style={{ color: overMassCapacity ? theme.colors.error : 'white' }}>{formatMass(capacity.mass.max)}</span>
            </>
          )}
        />
      </div>

      <div style={{ paddingBottom: 5 }}>
        <MiniBarChart
          color={volumeColor}
          label="Volume Capacity"
          valueStyle={{ color: volumeColor, fontWeight: 'bold' }}
          valueLabel={`${formatFixed(100 * postDeltaVolume / capacity.volume.max, 1)}%`}
          value={postDeltaVolume / capacity.volume.max}
          deltaColor={overVolumeCapacity ? theme.colors.error : theme.colors.brightMain}
          deltaValue={deltaVolume * 1e6 / capacity.volume.max}
          underLabels={(
            <>
              <span style={{ color: volumeColor, opacity: deltaVolume < 0 ? 0.6 : 1 }}>{deltaVolume < 0 ? '-' : '+'}{formatVolume(Math.abs(deltaVolume * 1e6))}</span>
              <span style={{ color: overVolumeCapacity ? theme.colors.error : 'white' }}>{formatVolume(capacity.volume.max)}</span>
            </>
          )}
        />
      </div>
    </>
  );
}

const ActionDialogStat = ({ stat: { isTimeStat, label, value, direction, tooltip, warning }}) => {
  const refEl = useRef();
  const [hovered, setHovered] = useState();
  return (
    <StatRow
      key={label}
      direction={value === '' ? null : direction}
      isTimeStat={reactBool(isTimeStat)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={refEl}>
      <label>{label}</label>
      <span>
        {value}
      </span>
      {value !== '' && tooltip && (
        <MouseoverInfoPane referenceEl={refEl.current} visible={hovered}>
          <MouseoverContent>
            {tooltip}
          </MouseoverContent>
        </MouseoverInfoPane>
      )}
      {value !== '' && warning && (
        <MouseoverIcon icon={<WarningOutlineIcon />} iconStyle={{ fontSize: '125%', marginLeft: 5 }} themeColor={theme.colors.error}>
          {warning}
        </MouseoverIcon>
      )}
    </StatRow>
  );
};

export const ActionDialogStats = ({ stage, stats, wide }) => {
  const [open, setOpen] = useState();

  useEffect(() => {
    setOpen(stage === actionStage.NOT_STARTED);
  }, [stage]);

  if (!stats?.length) return null;
  return (
    <StatSection actionStage={stage} wide={wide}>
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

const CrewBusyButton = ({ crew }) => {
  return (
    <Button
      isTransaction
      disabled={nativeBool(true)}
      loading={reactBool(true)}>
      Crew Busy
    </Button>
  );
};

export const ActionDialogFooter = ({ buttonsLoading, disabled, finalizeLabel, goLabel, onClose, onFinalize, onGo, stage, waitForCrewReady, wide }) => {
  const { crew } = useCrewContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // TODO: connect notifications to top-level state
  //  and use that state to evaluate which timers should be passed to service worker
  //  (we'll also need the ability to cancel those timers)

  // show unless already enabled
  const enableNotifications = useCallback(async () => {
    setNotificationsEnabled((x) => !x);
  }, []);

  return (
    <Footer wide={wide}>
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
                loading={reactBool(buttonsLoading)}
                onClick={onClose}>Cancel</Button>
              {waitForCrewReady && !crew?._ready
                ? <CrewBusyButton crew={crew} />
                : (
                  <Button
                    isTransaction
                    disabled={nativeBool(disabled)}
                    loading={reactBool(buttonsLoading)}
                    onClick={onGo}>{goLabel}</Button>
                )
              }
            </>
          )
          : (
              stage === actionStage.READY_TO_COMPLETE
              ? (
                <>
                  <Button
                    loading={reactBool(buttonsLoading)}
                    onClick={onClose}>Close</Button>
                  <Button
                    isTransaction
                    disabled={nativeBool(disabled)}
                    loading={reactBool(buttonsLoading)}
                    onClick={onFinalize}>{finalizeLabel || 'Accept'}</Button>
                </>
              )
              : (
                <Button
                  loading={reactBool(buttonsLoading)}
                  onClick={onClose}>Close</Button>
              )
          )}
      </SectionBody>
    </Footer>
  );
};

export const ActionDialogTabs = ({ tabs, selected, onSelect }) => (
  <Section>
    <Tabs>
      {tabs.map((tab, i) => (
        <Tab key={i} onClick={() => onSelect(i)} isSelected={reactBool(i === selected)}>
          {tab.icon && <TabIcon style={tab.iconStyle || {}}>{tab.icon}</TabIcon>}
          <div>{tab.label}</div>
        </Tab>
      ))}
    </Tabs>
  </Section>
);

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

export const BonusTooltip = ({ bonus, crewRequired, details, title, titleValue, isTimeStat }) => {
  const { titles, traits, others, foodMultiplier, stationMultiplier, timeMultiplier, totalBonus } = bonus;
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
    if (foodMultiplier < 1) {
      x.push({
        text: `Food Rationing Penalty`,
        multiplier: foodMultiplier,
        direction: getBonusDirection({ totalBonus: foodMultiplier })
      });
    }
    if (stationMultiplier !== 1) {
      x.push({
        text: `Station Capacity ${stationMultiplier > 1 ? 'Bonus' : 'Penalty'}`,
        multiplier: stationMultiplier,
        direction: getBonusDirection({ totalBonus: stationMultiplier })
      });
    }
    (others || []).forEach(({ text, bonus, direction }) => {
      x.push({ text, bonus, direction });
    });
    if (timeMultiplier > 0 && timeMultiplier !== 1) {
      x.push({
        text: `Time Acceleration`,
        multiplier: timeMultiplier,
        direction: getBonusDirection({ totalBonus: timeMultiplier })
      });
    }

    return x
      .filter((b) => (b.multiplier !== undefined && b.multiplier !== 1) || (b.bonus !== undefined && b.bonus !== 0))
      .sort((a, b) => b.bonus - a.bonus);
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
      {/*
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
      */}
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

export const formatSampleMass = (grams) => {
  return formatFixed(grams / 1e6, 1);
};

export const formatSampleVolume = (volume) => {
  return formatFixed(volume, 1);
};

export const getBonusDirection = ({ totalBonus }, biggerIsBetter = true) => {
  if (totalBonus === 1) return 0;
  return (biggerIsBetter === (totalBonus > 1)) ? 1 : -1;
};

export const getTripDetails = (asteroidId, crewTravelBonus, originLotIndex, steps, timeAcceleration) => {
  let currentLotIndex = originLotIndex;
  let totalDistance = 0;
  let totalTime = 0;

  const tripDetails = steps.map(({ label, lotIndex, skipToLotIndex }) => {
    const stepDistance = Asteroid.getLotDistance(asteroidId, currentLotIndex, lotIndex) || 0;
    const stepTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroidId, currentLotIndex, lotIndex, crewTravelBonus.totalBonus) || 0,
      timeAcceleration
    );
    currentLotIndex = skipToLotIndex || lotIndex;

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
  if (!Product.TYPES[resourceId].isAtomic) {
    return formatResourceMass(units, resourceId, { abbrev, minPrecision, fixedPrecision });
  }
  // granular units
  return units.toLocaleString();
};

export const formatResourceMass = (units, resourceId, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  return formatMass(
    resourceId
      ? units * Product.TYPES[resourceId].massPerUnit
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
      ? units * Product.TYPES[resourceId].volumePerUnit
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

export const formatSurfaceDistance = (km) => {
  return `${Math.round(km).toLocaleString()} km`;
};

export const formatBeltDistance = (m) => {
  if (m > constants.AU) {
    return `${(Math.round(100 * m / constants.AU) / 100).toLocaleString()} AU`;
  } else if (m > 1e9) {
    return `${(Math.round(m / 1e8) / 10).toLocaleString()}m km`;
  } else if (m > 1e6) {
    return `${(Math.round(m / 1e5) / 10).toLocaleString()}k km`;
  }
  return `${Math.round(m / 1e3).toLocaleString()} km`;
}

export const formatVelocity = (metersPerSecond, { abbrev = true, minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (metersPerSecond >= 1e3) {
    scale = 1e3;
    unitLabel = abbrev ? 'km/s' : 'kilometers / second';
  } else {
    scale = 1;
    unitLabel = abbrev ? 'm/s' : 'meters / second';
  }

  const workingUnits = (metersPerSecond / scale);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)} ${unitLabel}`;
};

export const formatShipStatus = (ship) => {
  if (ship?.Ship?.status === Ship.STATUSES.IN_FLIGHT) {
    return 'In Flight'; // TODO: do we need to distinguish Launching, Landing
  }

  const loc = ship?.Location.location;

  if (loc.label === Entity.IDS.SHIP) {
    return 'In Port';
  } else if (loc.label === Entity.IDS.LOT) {
    return 'On Surface';
  } else if (loc.label === Entity.IDS.ASTEROID) {
    return 'In Orbit';
  }

  console.warn('Unknown ship status', ship)
  return '';
}
