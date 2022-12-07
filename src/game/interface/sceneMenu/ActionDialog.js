import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import CrewCard from '~/components/CrewCard';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  CancelBlueprintIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CoreSampleIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
  LocationPinIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
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
  height: 125px;
  justify-content: center;
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
    padding: 20px 0;
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
        width: ${p.progress * 100}%;
      `
      : `
        bottom: 0;
        height: ${p.progress * 100}%;
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
          width: ${p.secondaryProgress * 100}%;
        `
        : `
          bottom: 0;
          height: ${p.secondaryProgress * 100}%;
          width: 100%;
        `
      }
    }
  `}
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
  background: #26718c;
  color: white;
  font-size: 18px;
  padding: 9px 15px;
  text-transform: uppercase;
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
    outline: 1px dashed ${p => p.theme.colors.main};
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

const ingredients = [
  [700, 5, 700], [700, 19, 500], [400, 22, 0],
  // [700, 5, 0], [700, 19, 0], [400, 22, 0], [700, 5, 0], [700, 19, 0], [400, 22, 0],
];

const formatTimer = (seconds) => {
  let remaining = seconds;
  const out = [];

  let days = Math.floor(remaining / 86400);
  remaining -= days * 86400;
  if (days > 0) out.push(`${days}d`);
  
  let hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  if (out.length > 0 || hours > 0) out.push(`${hours}h`);

  let minutes = Math.floor(remaining / 60);
  remaining -= minutes * 60;
  if (out.length > 0 || minutes > 0) out.push(`${minutes}m`);

  out.push(`${Math.round(remaining)}s`);

  return out.join(' ');
};

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

const BuildingImage = ({ building, progress, secondaryProgress }) => {
  return (
    <BuildingThumbnailWrapper>
      <ResourceThumbnail src={building.iconUrls.w150} />
      {progress !== undefined && (
        <ResourceProgress
          progress={progress}
          secondaryProgress={secondaryProgress}
          horizontal />
      )}
    </BuildingThumbnailWrapper>
  );
};
const EmptyBuildingImage = ({ iconOverride }) => (
  <BuildingThumbnailWrapper><EmptyImage>{iconOverride || <LocationPinIcon />}</EmptyImage></BuildingThumbnailWrapper>
);

const CompletedHighlight = () => <CompletedIconWrapper><CheckIcon /></CompletedIconWrapper>;

const RawMaterialSection = ({ resource, tonnage, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Target Resource</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource && (
          <ResourceWithData>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource.name}{status === 'AFTER' ? ' Deposit' : ''}</h3>
              {tonnage /* TODO: ... */
                ? <div><b><ResourceIcon /> {tonnage.toLocaleString()}</b> tonnes</div>
                : <div><b>43%</b> Abundance at lot</div>
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
}

const PopperBody = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
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

    & td {
      padding: 4px 8px 6px;
      text-align: right;
      vertical-align: middle;
      &:first-child {
        text-align: left;
      }
    }

    & thead {
      & > tr > td {
        border-bottom: 1px solid ${borderColor};
      }
    }

    & tbody {
      color: white;
      & > tr {
        cursor: ${p => p.theme.cursors.active};
        &:hover > td {
          background: #444;
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

const CoreSampleSelection = ({ onClick, resources, sampleTally }) => {
  const existingSamples = useMemo(() => {
    return [...Array(sampleTally).keys()]
      .map((i) => ({
        resource: resources[140 + i],
        deposit: 1000 * (sampleTally - i) + Math.round(Math.random() * 999)
      }));
  }, [sampleTally]);
  return (
    <PopperBody>
      <PoppableTitle>
        <h3>Lot #23,234</h3>
        <div>{sampleTally.toLocaleString()} Samples at lot</div>
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
            {existingSamples.map((sample, i) => (
              <tr key={i} onClick={onClick(i)}>
                <td><ResourceColorIcon category={sample.resource.bucket} /> {sample.resource.name}</td>
                <td>{sample.deposit.toLocaleString()} tonnes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
}

const DestinationSelection = ({ asteroid, onClick }) => {
  const inventories = [
    { plot: 12, distance: 7, type: 'Warehouse', fullness: 0.94, remaining: 4932 },
    { plot: 2312, distance: 27, type: 'Warehouse', fullness: 0.74, remaining: 8932 },
    { plot: 452, distance: 57, type: 'Warehouse', fullness: 0.32, remaining: 17932 },
    { plot: 2345, distance: 437, type: 'Ship', fullness: 0.94, remaining: 932 },
    { plot: 7328, distance: 1027, type: 'Warehouse', fullness: 0.04, remaining: 24302 },
  ];
  return (
    <PopperBody>
      <PoppableTitle>
        <h3>{asteroid.customName || asteroid.baseName}</h3>
        <div>12 inventories available</div>
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
              <td>Rem. Volume</td>
            </tr>
          </thead>
          <tbody>
            {inventories.map((inventory, i) => {
              const warningColor = inventory.fullness > 0.8
                ? theme.colors.error
                : (inventory.fullness > 0.5 ? theme.colors.yellow : theme.colors.success);
              return (
                <tr key={i} onClick={onClick(i)}>
                  <td>Lot #{inventory.plot}</td>
                  <td>{inventory.distance.toLocaleString()} km</td>
                  <td>{inventory.type}</td>
                  <td style={{ color: warningColor }}>{(100 * inventory.fullness).toFixed(1)}%</td>
                  <td style={{ color: warningColor }}>{inventory.remaining.toLocaleString()} m<sup>3</sup></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PoppableTableWrapper>
    </PopperBody>
  );
};

const ExistingSampleSection = ({ resources, resource, tonnage, onSelectSample, overrideTonnage, sampleTally, status }) => {
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onSelectSample) onSelectSample(id);
  }, []);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Core Sample</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource && (
          <ResourceWithData>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource.name} Deposit</h3>
              <div>
                <b><ResourceIcon /> {(overrideTonnage || tonnage).toLocaleString()}</b> tonnes
              </div>
            </label>
          </ResourceWithData>
        )}
        {status === 'BEFORE' && (
          <div>
            <Poppable label="Select" buttonWidth="135px" closeOnChange={clicked} title="Select Improvable Sample">
              <CoreSampleSelection onClick={onClick} resources={resources} sampleTally={sampleTally} />
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

const ExtractSampleSection = ({ resource, resources, tonnage, onSelectSample, overrideTonnage, remainingAfterExtraction, status }) => {
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onSelectSample) onSelectSample(id);
  }, []);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Core Sample</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource && (
          <ResourceWithData>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource.name} Deposit</h3>
              <div>
                <b style={status === 'BEFORE' ? { color: 'white', fontWeight: 'normal' } : {}}><ResourceIcon /> {(overrideTonnage || tonnage).toLocaleString()}</b> tonnes
              </div>
              {status === 'BEFORE' && (
                <footer>
                  {remainingAfterExtraction === 0
                      ? 'Deposit will be depleted after Extraction'
                      : `${Math.floor(remainingAfterExtraction).toLocaleString()} tonnes will remain after Extraction`}
                </footer>
              )}
            </label>
          </ResourceWithData>
        )}
        {status === 'BEFORE' && (
          <div>
            <Poppable label="Select" buttonWidth="135px" closeOnChange={clicked} title="Select Core Sample">
              <CoreSampleSelection onClick={onClick} resources={resources} sampleTally={8} />
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

// TODO: this needs an empty state if source is not yet selected
const ToolSection = ({ resource, sourcePlot }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Tool</SectionTitle>
      <SectionBody>
        {resource && (
          <ResourceWithData>
            <ResourceImage badge="∞" resource={resource} />
            <label>
              <h3>{resource.name}</h3>
              <div>{sourcePlot.building.name} (Lot {sourcePlot.i.toLocaleString()})</div>
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

const ItemSelectionSection = ({ items, resources, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Items</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {items.length === 0 && (
          <>
            <EmptyResourceWithData>
              <EmptyResourceImage />
              <label>
                <div>Items:</div>
                <h3>Select</h3>
              </label>
            </EmptyResourceWithData>
            <div>
              <Poppable label="Select" buttonWidth="135px">
                {/* TODO: ... */}
              </Poppable>
            </div>
          </>
        )}
        {items.length > 0 && (
          <ItemSelectionWrapper>
            <div>
              <ItemsList>
                {items.map(([tally, i], x) => (
                  <ResourceImage key={i} badge={tally} resource={resources[i]} progress={(x + 1) / (items.length + 1)} />
                ))}
              </ItemsList>
            </div>
            <div>
              <div>{items.length} item{items.length === 1 ? '' : 's'}</div>
              {status === 'BEFORE' && (
                <Poppable label="Select" buttonWidth="135px">
                  {/* TODO: ... */}
                </Poppable>
              )}
            </div>
          </ItemSelectionWrapper>
        )}
      </SectionBody>
    </Section>
  );
};

const DestinationPlotSection = ({ asteroid, destinationPlot, onDestinationSelect, status }) => {
  const [clicked, setClicked] = useState(0);
  const onClick = useCallback((id) => () => {
    setClicked((x) => x + 1);
    if (onDestinationSelect) onDestinationSelect(id);
  }, []);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Destination</SectionTitle>
      <SectionBody>
        {destinationPlot
          ? (
            <Destination status={status}>
              <BuildingImage building={destinationPlot.building} progress={0.3} secondaryProgress={0.7} />{/* TODO: ... */}
              <label>
                <h3>{destinationPlot.building.name}</h3>
                <div>{asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {destinationPlot.i.toLocaleString()}</b></div>
                <div />
                {status === 'BEFORE' && (<div><b>650,000</b> / 1,000,000 m<sup>3</sup></div>)}{/* TODO: ... */}
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
            <IconButtonRounded style={{ marginRight: 6 }}>{/* TODO: ... */}
              <TargetIcon />
            </IconButtonRounded>
            <Poppable label="Select" buttonWidth="135px" title="Select Destination" closeOnChange={clicked}>
              <DestinationSelection asteroid={asteroid} onClick={onClick} />
            </Poppable>
          </div>
        )}
      </SectionBody>
    </Section>
  );
};

const BuildingPlanSection = ({ abandonedIn, building, cancelling, status }) => {
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
            <BuildingImage building={building} />
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
                <span style={{ color: theme.colors.error }}>Any materials left on lot will be abandoned.</span>
                <span style={{ color: theme.colors.error, fontSize: '125%', lineHeight: '1em', marginLeft: 8 }}><WarningOutlineIcon /></span>
              </>
            )}
            {abandonedIn && !cancelling && (
              <AbandonmentTimer>
                <div>Abandonment Timer:</div>
                <h3>{formatTimer(abandonedIn)} <WarningOutlineIcon /></h3>
              </AbandonmentTimer>
            )}
            {!abandonedIn && !cancelling && (
              <div style={{ display: 'flex' }}>
                <Poppable label="Select" buttonWidth="135px">
                  {/* TODO: ... */}
                </Poppable>
              </div>
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

const MouseoverContent = styled.div`
  & b {
    color: ${p => p.highlightColor || 'white'};
  }
  color: #999;
  font-size: 90%;
  padding-bottom: 15px;
`;

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

const BuildingRequirementsSection = ({ isGathering, label, building, resources }) => {
  const gatheringComplete = isGathering && !ingredients.find(([tally, i, hasTally]) => hasTally < tally);
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> {label}</SectionTitle>
      <SectionBody>
        <IngredientsList>
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

const DeconstructionMaterialsSection = ({ label, resources, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> {label}</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
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

const ExtractionAmountSection = ({ min, max, amount, setAmount }) => {
  const tonnageToVolume = (tonnage) => {
    return tonnage * 2.5;  // TODO: ...
  };
  const tonnageToExtractionTime = (tonnage) => {
    return tonnage * 1.64;  // TODO: ...
  };
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Slider</SectionTitle>
      <SectionBody>
        <SliderWrapper>
          <SliderInfoRow>
            <SliderLabel>
              <b>{Math.round(amount).toLocaleString()}</b> tonnes
            </SliderLabel>
            <ButtonRounded disabled={amount === max} onClick={() => setAmount(max)}>Max</ButtonRounded>
          </SliderInfoRow>
          <SliderInput min={min} max={max} value={amount} onChange={setAmount} />
          <SliderInfoRow style={{ marginTop: -5 }}>
            <div>{Math.round(tonnageToVolume(amount)).toLocaleString()} m<sup>3</sup></div>
            <div>{formatTimer(tonnageToExtractionTime(amount))}</div>
          </SliderInfoRow>
        </SliderWrapper>
      </SectionBody>
    </Section>
  );
}

// TODO: componentize

const ActionDialog = ({ actionType, asteroid, plot, onClose }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { captain, crew } = useCrew();
  const activeResourceMap = useStore(s => s.asteroids.showResourceMap);

  const [amount, setAmount] = useState(11000);
  const [status, setStatus] = useState('BEFORE');
  const [resource, setResource] = useState(activeResourceMap);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // show unless already enabled
  const enableNotifications = useCallback(async () => {
    setNotificationsEnabled((x) => !x);
  }, []);

  // const plot = {  // TODO: use plot above
  //   i: 12332,
  //   building: buildings[0]
  // };
  const destinationPlot = {
    i: 23441,
    building: buildings[1]
  };

  const actions = {
    'NEW_CORE_SAMPLE': {
      actionIcon: <CoreSampleIcon />,
      headerBackground: coreSampleBackground,
      label: 'Core Sample',
      completeLabel: 'Sample',
      completeStatus: 'Ready',
      crewRequirement: 'duration',
      goButtonLabel: 'Begin Sample',
      stats: [
        { label: 'Discovery Minimum', value: '0 tonnes', direction: -1 },
        { label: 'Discovery Maximum', value: '10,000 tonnes', direction: 1 },
        { label: 'Crew Travel', value: '4m 0s', direction: 1 },
        { label: 'Sample Time', value: '47m 30s', direction: 1 },
      ]
    },
    'IMPROVE_CORE_SAMPLE': {
      actionIcon: <ImproveCoreSampleIcon />,
      headerBackground: coreSampleBackground,
      label: 'Improve Core Sample',
      completeLabel: 'Improved Sample',
      completeStatus: 'Ready',
      crewRequirement: 'duration',
      goButtonLabel: 'Improve Sample',
      stats: [
        { label: 'Discovery Minimum', value: '0 tonnes', direction: -1 },
        { label: 'Discovery Maximum', value: '10,000 tonnes', direction: 1 },
        { label: 'Crew Travel', value: '4m 0s', direction: 1 },
        { label: 'Sample Time', value: '47m 30s', direction: 1 },
      ]
    },
    'EXTRACT_RESOURCE': {
      actionIcon: <ExtractionIcon />,
      headerBackground: extractionBackground,
      label: 'Extract Resource',
      completeLabel: 'Extraction',
      completeStatus: 'Complete',
      crewRequirement: 'start',
      goButtonLabel: 'Begin Extraction',
      stats: [
        { label: 'Extraction Mass', value: '120,500 tonnes', direction: 1 },
        { label: 'Extraction Volume', value: '4,200 m³', direction: 1 },
        { label: 'Crew Travel', value: '6m 00s', direction: 1 },
        { label: 'Extraction Time', value: '2d 14h 24m 30s', direction: 0 },
      ]
    },
    'SURFACE_TRANSFER': {
      actionIcon: <SurfaceTransferIcon />,
      headerBackground: surfaceTransferBackground,
      label: 'Surface Transfer',
      completeLabel: 'Transfer',
      completeStatus: 'Complete',
      crewRequirement: 'start',
      goButtonLabel: 'Transfer',
      stats: [
        { label: 'Total Volume', value: '4,200 m³', direction: 1 },
        { label: 'Total Mass', value: '120,500 tonnes', direction: 1 },
        { label: 'Transfer Distance', value: '18 km', direction: 0 },
        { label: 'Crew Travel', value: '6m 00s', direction: 1 },
        { label: 'Transport Time', value: '24m 30s', direction: 0 },
      ]
    },
    'BLUEPRINT': {
      actionIcon: <LayBlueprintIcon />,
      headerBackground: constructionBackground,
      label: 'Place Building Site',
      completeLabel: 'Building Site',
      completeStatus: 'Ready',
      goButtonLabel: 'Place Site',
      stats: [
        { label: 'Abandonment Timer', value: '48h', warning: (
          <>
            Building sites become <b>Abandoned</b> if they have not started construction by the time the <b>Abandonment Timer</b> expires.
            <br/><br/>
            Any items left on an <b>Abandoned Site</b> may be claimed by other players!
          </>
        ) },
      ]
    },
    'CANCEL_BLUEPRINT': {
      actionIcon: <CancelBlueprintIcon />,
      headerBackground: constructionBackground,
      label: 'Cancel Building Site',
      goButtonLabel: 'Remove Site',
    },
    'CONSTRUCT': {
      actionIcon: <ConstructIcon />,
      headerBackground: constructionBackground,
      label: 'Construct Building',
      completeLabel: 'Construction',
      completeStatus: 'Complete',
      crewRequirement: 'start',
      goButtonLabel: 'Construct Building',
      stats: [
        { label: 'Crew Travel', value: '6m 0s', direction: 0 },
        { label: 'Construction Time', value: '47m 30s', direction: 1 },
      ]
    },
    'DECONSTRUCT': {
      actionIcon: <DeconstructIcon />,
      headerBackground: constructionBackground,
      label: 'Deconstruct Building',
      completeLabel: 'Deconstruction',
      completeStatus: 'Complete',
      crewRequirement: 'start',
      goButtonLabel: 'Deconstruct',
      stats: [
        { label: 'Total Volume', value: '4,200 m³', direction: 1 },
        { label: 'Total Mass', value: '120,500 tonnes', direction: 1 },
        { label: 'Transfer Distance', value: '18 km', direction: 0 },
        { label: 'Crew Travel', value: '6m 00s', direction: 1 },
        { label: 'Deconstruction Time', value: '1h 10m 15s', direction: 0 },
        { label: 'Transport Time', value: '24m 30s', direction: 0 },
      ]
    }
  };

  const action = actions[actionType];

  useEffect(() => {
    setResource(resources[0])
  }, []);

  // TODO: usecallback
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const onSubmit = () => {
    // setStatus('DURING');
    execute(
      'PLAN_CONSTRUCTION',
      // 'START_CONSTRUCTION',
      {
        capableId: 2,
        asteroidId: asteroid.i,
        plotId: plot.i,
        crewId: crew.i
      }
    )
  };


  const beforeStart = status === 'BEFORE';
  const inProgress = status === 'DURING';
  const complete = status === 'AFTER';
  // console.log({ asteroid, plot });
  return (
    <Dialog backdrop="rgba(30, 30, 35, 0.5)" opaque>
      <div style={{ position: 'relative' }}>
        {inProgress /* TODO: ... */ && (
          <LoadingBar>{action.label}: 15.4%</LoadingBar>
        )}
        {complete && (
          <LoadingBar>Finalize {action.completeLabel}</LoadingBar>
        )}
        <CloseButton backgroundColor={!beforeStart && 'black'} onClick={onClose} borderless>
          <CloseIcon />
        </CloseButton>
        <Header backgroundSrc={action.headerBackground}>
          <HeaderSectionBody>
            <HeaderInfo>
              <Title>
                {status === 'BEFORE' && <>{action.actionIcon} {action.label.toUpperCase()}</>}
                {status === 'DURING' && <><RingLoader color={theme.colors.main} size="1em" /> <span style={{ marginLeft: 40 }}>31m 25s</span></>/* TODO: tick */}
                {status === 'AFTER' && `${action.completeLabel.toUpperCase()} ${action.completeStatus.toUpperCase()}`}
              </Title>
              <Subtitle>
                {asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()} ({plot.building?.name || buildings[0].name})</b>
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

        {actionType === 'NEW_CORE_SAMPLE' && (
          <>
            <RawMaterialSection resource={resource || resources[8]} status={status} tonnage={complete && 2345} />
            {beforeStart && <ToolSection resource={resources[2]} sourcePlot={destinationPlot} />}
          </>
        )}

        {actionType === 'IMPROVE_CORE_SAMPLE' && (
          <>
            <ExistingSampleSection
              sampleTally={plot.coreSamplesExist}
              resources={resources}
              resource={resource || resources[8]}
              status={status}
              tonnage={2345}
              overrideTonnage={complete && 3456}
            />
            {beforeStart && <ToolSection resource={resources[2]} sourcePlot={destinationPlot} />}
          </>
        )}

        {actionType === 'EXTRACT_RESOURCE' && (
          <>
            <ExtractSampleSection resource={resource} resources={resources} status={status} tonnage={12000} overrideTonnage={status !== 'BEFORE' && amount} remainingAfterExtraction={12000 - amount} />
            <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />
            {beforeStart && <ExtractionAmountSection amount={amount} min={4200} max={12000} setAmount={setAmount} />}
          </>
        )}

        {actionType === 'SURFACE_TRANSFER' && (
          <>
            <ItemSelectionSection items={ingredients} resources={resources} status={status} />
            <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />
          </>
        )}

        {actionType === 'BLUEPRINT' && (
          <>
            <BuildingPlanSection building={buildings[1]} status={status} />
            {beforeStart && <BuildingRequirementsSection building={buildings[1]} label="Required for Construction" resources={resources} />}
          </>
        )}

        {actionType === 'CANCEL_BLUEPRINT' && (
          <>
            <BuildingPlanSection building={buildings[1]} status={status} cancelling />
          </>
        )}

        {actionType === 'CONSTRUCT' && (
          <>
            <BuildingPlanSection building={buildings[1]} status={status} abandonedIn={45678} />
            {beforeStart && <BuildingRequirementsSection isGathering building={buildings[1]} label="Construction Materials" resources={resources} />}
          </>
        )}

        {actionType === 'DECONSTRUCT' && (
          <>
            <DeconstructionMaterialsSection label="Recovered Materials" resources={resources} status={status} />
            {status !== 'AFTER' && <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />}
          </>
        )}
        
        {action.stats?.length > 0 && (
          <StatSection status={status}>
            <SectionBody>
              {[0,1].map((statGroup) => (
                <div key={statGroup}>
                  {(
                    statGroup === 0
                      ? action.stats.slice(0, Math.ceil(action.stats.length / 2))
                      : action.stats.slice(Math.ceil(action.stats.length / 2))
                    ).map(({ label, value, direction, warning }) => (
                      <StatRow key={label} direction={direction}>
                        <label>{label}</label>
                        <span>
                          {value}
                        </span>
                        {warning && (
                          <MouseoverIcon icon={<WarningOutlineIcon />} iconStyle={{ fontSize: '125%', marginLeft: 5 }} themeColor={theme.colors.error}>
                            {warning}
                          </MouseoverIcon>
                        )}
                      </StatRow>
                    ))}
                </div>
              ))}
            </SectionBody>
          </StatSection>
        )}
        <Footer>
          <SectionBody>
            {beforeStart
              ? (
                <>
                  <NotificationEnabler onClick={enableNotifications}>
                    {notificationsEnabled ? <CheckedIcon /> : <UncheckedIcon />}
                    Notify on Completion
                  </NotificationEnabler>
                  <Spacer />
                  <Button onClick={onClose}>Cancel</Button>
                  <Button isTransaction onClick={onSubmit}>{action.goButtonLabel}</Button>
                </>
              ) : (
                <Button onClick={() => setStatus('AFTER')}>Accept</Button>
              )}
          </SectionBody>
        </Footer>
      </div>
    </Dialog>
  );
};

export default ActionDialog;