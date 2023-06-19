import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { createPortal } from 'react-dom';
import ReactTooltip from 'react-tooltip';
import { useQuery } from 'react-query';
import api from '~/lib/api';
import {
  TbBellRingingFilled as AlertIcon,
} from 'react-icons/tb';
import { Asteroid, Capable, Construction, Crewmate, Inventory } from '@influenceth/sdk';

import AsteroidRendering from '~/game/interface/details/asteroidDetails/components/AsteroidRendering';
import Button from '~/components/ButtonAlt';
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
  InfoIcon,
  EmergencyModeEnterIcon
} from '~/components/Icons';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import ResourceColorIcon from '~/components/ResourceColorIcon';
import { ResourceThumbnailWrapper, ResourceImage, ResourceProgress } from '~/components/ResourceThumbnail';
import ResourceRequirement from '~/components/ResourceRequirement';
import ResourceSelection from '~/components/ResourceSelection';
import SliderInput from '~/components/SliderInput';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import theme, { hexToRGB } from '~/theme';
import LiveTimer from '~/components/LiveTimer';
import CrewCardFramed from '~/components/CrewCardFramed';
import ClipCorner from '~/components/ClipCorner';
import Dialog from '~/components/Dialog';
import TextInput from '~/components/TextInputUncontrolled';
import useChainTime from '~/hooks/useChainTime';
import { formatFixed, formatTimer } from '~/lib/utils';
import actionStage from '~/lib/actionStages';
import constants from '~/lib/constants';
import { theming } from '../ActionDialog';
import useCrewMember from '~/hooks/useCrewMember';

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
      background: rgba(${p.theme.colors.mainRGB}, 0.22);
      border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.7);
      & > svg {
        stroke: rgba(${p.theme.colors.mainRGB}, 0.7);
      }
    `
    : `
      background: rgba(${p.theme.colors.mainRGB}, 0.15);
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
const EmptyMessage = styled.div`
  background: rgba(255, 255, 255, 0.15);
  opacity: 0.7;
  padding: 20px;
  text-align: center;
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

const CrewLabel = styled.div`
  align-self: center;
  margin-left: 5px;
  margin-top: -10px;
  & h3 {
    color: white;
    margin: 4px 0;
    & label {
      color: ${p => p.theme.colors.main};
      margin-left: 5px;
    }
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
  width: 60px;
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
    content: "${p => formatShipStatus(p.status)}";
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
  background: rgba(${p => hexToRGB(p.theme.colors.red)}, 0.2);
  color: ${p => p.theme.colors.red};
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

export const LandingSelectionDialog = ({ asteroid, initialSelection, onClose, onSelected, open, ship }) => {
  const [error, setError] = useState();
  const [selection, setSelection] = useState(initialSelection);

  // TODO: to get spaceport names, it will probably make more sense to have
  //  a "get spaceports" api endpoint
  const { data: lotData, isLoading: lotDataLoading } = useQuery(
    [ 'asteroidLots', asteroid?.i ],
    () => api.getAsteroidLotData(asteroid?.i),
    { enabled: !!asteroid?.i }
  );

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
        const capableType = lotData[lot] >> 4;
        if (capableType === 0 || capableType === 7) {
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
      {!ship?.spaceportRequired && (
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
                      <td><LocationIcon /> {lotId}</td>
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


//
//  FORMATTERS
//

export const getCapacityUsage = (building, inventories, type) => {
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

export const AsteroidImage = ({ asteroid }) => {
  return (
    <AsteroidThumbnailWrapper>
      <AsteroidRendering asteroid={asteroid} brightness={1.2} />
      <ClipCorner dimension={10} />
    </AsteroidThumbnailWrapper>
  )
}

export const ShipImage = ({ ship, iconBadge, iconBadgeColor, iconOverlay, iconOverlayColor, inventories, showInventoryStatusForType, simulated, square }) => {
  if (!ship) return null;
  // TODO: getCapacityUsage is intended for buildings
  const capacity = getCapacityUsage(ship, inventories, showInventoryStatusForType);
  return (
    <ShipThumbnailWrapper>
      <ResourceImage src={ship[simulated ? 'simIconUrls' : 'iconUrls']?.w150} />
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

export const BuildingImage = ({ building, error, iconOverlay, iconOverlayColor, inventories, showInventoryStatusForType, unfinished }) => {
  if (!building) return null;
  const capacity = getCapacityUsage(building, inventories, showInventoryStatusForType);
  const closerLimit = (capacity.volume.used + capacity.volume.reserved) / capacity.volume.max > (capacity.mass.used + capacity.mass.reserved) / capacity.mass.max ? 'volume' : 'mass';
  return (
    <BuildingThumbnailWrapper>
      <ResourceImage src={building[unfinished ? 'siteIconUrls' : 'iconUrls']?.w150} />
      {showInventoryStatusForType !== undefined && (
        <>
          <InventoryLabel overloaded={error}>
            {formatFixed(100 * (capacity[closerLimit].reserved + capacity[closerLimit].used) / capacity[closerLimit].max, 1)}% {closerLimit === 'volume' ? `m³` : `t`}
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

export const ActionDialogHeader = ({ action, captain, crewAvailableTime, overrideColor, stage, taskCompleteTime }) => {
  return (
    <Header theming={theming[stage]} overrideHighlightColor={overrideColor}>
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

export const FlexSectionInputBlock = ({ bodyStyle, children, disabled, image, isSelected, label, onClick, style = {}, sublabel, title, titleDetails, tooltip }) => {
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

const ResourceGridSection = ({
  isGathering,
  items,
  label,
  onClick,
  resources,
  minCells = 0,
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
    <Section style={{ marginBottom: 25 }}>
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
      minCells={14}
      noCellStyles={stage !== actionStage.NOT_STARTED}
      onClick={onClick}
      resources={resources}
      theming={stage === actionStage.READY_TO_COMPLETE ? 'success' : 'default'} />
  );
};

export const TransferDistanceDetails = ({ distance }) => (
  <TransferDistanceTitleDetails>
    {distance && distance < Asteroid.FREE_TRANSPORT_RADIUS ? (
      <Mouseoverable tooltip={(
        <FreeTransferNote>
          <div>Instant Transfer Radius</div>
          <div>Transfers less than {Asteroid.FREE_TRANSPORT_RADIUS}km in distance are instantaneous.</div>
        </FreeTransferNote>
      )}>
        <label><WarningOutlineIcon /> {Math.round(distance)}km Away</label>
      </Mouseoverable>
    ) : ''}
    {distance && distance >= Asteroid.FREE_TRANSPORT_RADIUS ? `${Math.round(distance)}km Away` : ''}
  </TransferDistanceTitleDetails>
);

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

export const ResourceAmountSlider = ({ amount, extractionTime, min, max, resource, setAmount }) => {
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
  console.log({propellantPre ,propellantPost});
  
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
          <div style={{ color: theme.colors.main }}>
            {formatFixed(100 * propellantPost / 0.1)}% of Limit
          </div>
          <div>
            After Generation: <b>{formatMass(propellantPostgeneration * 1e3)}</b>
          </div>
        </BarChartNotes>
    </FlexSectionBlock>
  );
};

export const SwayInputBlock = ({ title, instruction }) => {
  return (
    <FlexSectionInputBlock
      title={title}
      bodyStyle={{ background: 'transparent' }}>
      {instruction && <SwayInputInstruction>{instruction}</SwayInputInstruction>}
      <SwayInput />
    </FlexSectionInputBlock>
  );
}

export const CrewInputBlock = ({ crew, title }) => (
  <FlexSectionInputBlock
    title={title}
    titleDetails={(
      <div>
        <CrewIcon />
        <span style={{ fontSize: '85%', marginLeft: 4 }}>
          {crew?.name || `Crew #${crew?.i}`}
        </span>
      </div>
    )}
    bodyStyle={{ paddingRight: 8 }}>
    <CrewCards>
      {Array.from({ length: 5 }).map((_, i) => 
        crew.members[i]
          ? (
            <CrewCardFramed
              key={i}
              borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
              crewmate={crew.members[i]}
              isCaptain={i === 0}
              lessPadding
              noArrow={i > 0}
              width={60} />
          )
          : <CrewCardPlaceholder key={i} />
      )}
    </CrewCards>
  </FlexSectionInputBlock>
);

export const CrewOwnerInner = ({ crew, isMe }) => {
  const { data: captain } = useCrewMember((crew?.crewMembers || [])[0]);
  return (
    <CrewCards>
      <CrewCardFramed
        borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
        crewmate={captain}
        isCaptain
        lessPadding
        width={60} />
      <CrewLabel>
        <div>Owned by</div>
        <h3>
          {crew?.name || `Crew #${crew?.i}`}
          {isMe ? <label>(Me)</label> : null}
        </h3>
      </CrewLabel>
    </CrewCards>
  );
};

export const CrewOwnerBlock = ({ title, ...innerProps }) => {
  return (
    <FlexSectionInputBlock
      title={title}
      bodyStyle={{ background: 'transparent' }}>
      <CrewOwnerInner {...innerProps} />
    </FlexSectionInputBlock>
  );
};

export const ShipInputBlock = ({ ship, hasMyCrew, isMine, ...props }) => {
  return (
    <FlexSectionInputBlock
      image={(
        <ShipImage
          iconBadge={isMine ? <MyAssetIcon /> : null}
          iconOverlay={ship.inEmergencyMode ? <EmergencyModeEnterIcon /> : null}
          iconOverlayColor={theme.colors.orange}
          ship={ship} />
      )}
      label={ship.name}
      sublabel={(
        <>
          <div>{ship.className}</div>
          <ShipStatus status={ship.status}>
            {hasMyCrew && <CaptainIcon />}
          </ShipStatus>
        </>
      )}
      bodyStyle={ship.inEmergencyMode ? { backgroundColor: `rgba(${hexToRGB(theme.colors.orange)}, 0.2)` } : {}}
      {...props}
    />
  );
};

export const ShipTab = ({ pilotCrew, ship, stage, previousStats = {}, warnings = [] }) => {
  return (
    <>
      <FlexSection>
        <ShipInputBlock
          title="Ship"
          disabled={stage !== actionStage.NOT_STARTED}
          ship={ship}
          hasMyCrew
          isMine />

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
              valueLabel={`${formatFixed(0.5 * ship.maxPropellantMass / 1e3)} / ${formatFixed(ship.maxPropellantMass / 1e3)}t`}
              value={0.5}
              {...(/* TODO: would probably be more performant to do this in a memo hook */
                previousStats.propellantMass
                  ? {
                    deltaValue: previousStats.propellantMass / ship.maxPropellantMass
                  }
                  : {}
              )}
            />
            <MiniBarChart
              color="#557826"
              label="Propellant Volume"
              valueLabel={`${formatFixed(0.5 * ship.maxPropellantMass / 1e3)} / ${formatFixed(ship.maxPropellantMass / 1e3)}m³`}
              value={0.7}
            />
            <MiniBarChart
              label="Cargo Mass"
              valueLabel={`${formatFixed(0.5 * ship.maxCargoMass / 1e3)} / ${formatFixed(ship.maxCargoMass / 1e3)}t`}
              value={0.8}
            />
            <MiniBarChart
              color="#1f5f75"
              label="Cargo Volume"
              valueLabel={`${formatFixed(0.5 * ship.maxCargoMass / 1e3)} / ${formatFixed(ship.maxCargoMass / 1e3)}m³`}
              value={0.3}
            />
            <MiniBarChart
              color="#92278f"
              label="Passengers"
              valueLabel={`${pilotCrew.members.length} / 5`}
              value={pilotCrew.members.length / 5}
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

export const InventoryChangeCharts = ({ building, inventoryType, deltaMass, deltaVolume }) => {
  const buildings = useBuildingAssets();

  if (!(building && building.inventories && inventoryType !== undefined)) return null;
  
  const capacity = getCapacityUsage(buildings[building?.capableType], building?.inventories, inventoryType);
  const postDeltaMass = capacity.mass.used + capacity.mass.reserved + deltaMass * 1e6;
  const postDeltaVolume = capacity.volume.used + capacity.volume.reserved + deltaVolume * 1e6;
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
              <span style={{ color: massColor, opacity: deltaMass < 0 ? 0.6 : 1 }}>{deltaMass < 0 ? '-' : '+'}{formatMass(Math.abs(deltaMass * 1e6))}</span>
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

export const ActionDialogTabs = ({ tabs, selected, onSelect }) => (
  <Section>
    <Tabs>
      {tabs.map((tab, i) => (
        <Tab key={i} onClick={() => onSelect(i)} isSelected={i === selected}>
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
  switch (ship?.status || ship) {
    case 'IN_FLIGHT':
      return 'In Flight';
    case 'LAUNCHING':
      return 'Launching';
    case 'LANDING':
      return 'Landing';
    case 'IN_ORBIT':
      return 'In Orbit';
    case 'IN_PORT':
      return 'In Port';
    case 'ON_SURFACE':
      return 'On Surface';
  }
  return '';
}