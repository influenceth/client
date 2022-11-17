import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FiCrosshair as TargetIcon } from 'react-icons/fi';
import { RingLoader } from 'react-spinners';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransportBackground from '~/assets/images/modal_headers/SurfaceTransport.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import CrewCard from '~/components/CrewCard';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CoreSampleIcon,
  LayBlueprintIcon,
  ResourceIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import useAssets from '~/hooks/useAssets';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';


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
  padding: 0 20px;
  width: 750px;
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
    margin-left: -13px;
  }
`;
const SectionBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding: 15px 0;
  ${p => p.highlight && `
    margin: 10px 0;
    background: rgba(${p.theme.colors.mainRGB}, 0.2);
    border-radius: 10px;
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
  align-items: stretch;
  padding: 0;
  position: static;
`;
const HeaderThumbnail = styled.div`
  height: 125px;
  width: 125px;
  border: 1px solid #555;
  padding: 3px;
  position: relative;
  z-index: 1;
  &:before {
    background: url("${p => p.src}") center center;
    background-size: contain;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
  }
  ${p => p.badge && `
    &:after {
      content: "${p.badge.toLocaleString()}";
      bottom: 5px;
      color: white;
      left: 6px;
      line-height: 1em;
      position: absolute;
    }
  `}
`;
const HeaderThumbnailOverlay = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 1px;
  bottom: 3px;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 44px;
  justify-content: center;
  left: 3px;
  position: absolute;
  right: 3px;
  top: 3px;
  &:after,
  &:before {
    content: "";
    border: 4px solid transparent;
    height: 0;
    position: absolute;
    width: 32px;
  }
  &:after {
    bottom: 0;
    border-bottom: 5px solid ${p => p.theme.colors.main};
  }
  &:before {
    top: 0;
    border-top: 5px solid ${p => p.theme.colors.main};
  }
`;
const HeaderInfo = styled.div`
  flex: 1;
  color: #999;
  display: flex;
  flex-direction: column;
  font-size: 90%;
  justify-content: center;
  padding-left: 10px;
  position: relative;
  & b {
    color: white;
    font-weight: normal;
  }
`;
const Title = styled.div`
  color: white;
  font-size: 32px;
  line-height: 40px;
`;
const Subtitle = styled.div`

`;
const Footnote = styled.div`
  
`;
const CrewRequirement = styled.div``;
const CrewInfo = styled.div`
  align-items: flex-end;
  display: ${p => (p.status === 'BEFORE' || (p.requirement === 'duration' && p.status !== 'AFTER')) ? 'flex' : 'none'};
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
      content: "Crew: ";
    }
    &:after {
      display: block;
      font-weight: bold;
      ${p => {
        if (p.requirement === 'duration') {
          if (p.status === 'DURING') {
            return `
              content: "Performing Action";
              color: ${p.theme.colors.main};
            `;
          }
          return `
            content: "Required for Duration";
            color: ${p.theme.colors.orange};
          `;
        }
        return `
          content: "Required to Start";
          color: ${p.theme.colors.main};
        `;
      }}
    }
  }
`;

const CardContainer = styled.div`
  border: 1px solid #555;
  margin-left: 8px;
  padding: 2px;
  width: 65px;
  & > div {
    background: #111;
  }
`;
const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 5px 40px 5px 15px;
  & > label {
    
  }
  & > span {
    color: ${p => p.theme.colors.main};
    font-weight: bold;
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
    border-top: 1px solid ${borderColor};
    display: flex;
    padding: 20px 0;
    & > div {
      flex: 1;
      &:first-child {
        border-right: 1px solid ${borderColor};
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
    justify-content: center;
    & > * {
      margin: 15px 5px;
    }
  }
`;

const ThumbnailWithData = styled.div`
  flex: 1;
  align-items: center;
  display: flex;
  padding-left: 15px;
  & > label {
    padding-left: 15px;
    & > h3 {
      color: white;
      font-size: 25px;
      font-weight: normal;
      margin: 0;
    }
  }
`;
const RawMaterial = styled(ThumbnailWithData)`
  & > label {
    ${p => p.complete && `
      & > h3:after {
        content: " Deposit";
      }
    `}
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

const Destination = styled(ThumbnailWithData)`
  & > label {
    & b {
      color: white;
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

const ResourceThumbnailWrapper = styled.div`
  border: 2px solid transparent;
  outline: 1px solid ${borderColor};
  height: 100px;
  position: relative;
  width: 100px;
`;
const BuildingThumbnailWrapper = styled(ResourceThumbnailWrapper)`
  height: 92px;
  width: 150px;
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
const ResourceBadge = styled.div`
  position: absolute;
  bottom: 5px;
  color: white;
  font-size: 80%;
  left: 5px;
  line-height: 1em;
  &:before {
    content: "${p => p.badge.toLocaleString()}";
  }
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
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 3px;
  margin-right: 15px;
  padding: 10px 15px;
  text-align: left;
  width: 210px;
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

const ResourceImage = ({ resource, badge, progress }) => {
  return (
    <ResourceThumbnailWrapper>
      <ResourceThumbnail src={resource.iconUrls.w125} />
      {badge !== undefined && <ResourceBadge badge={badge} />}
      {progress !== undefined && <ResourceProgress progress={progress} />}
    </ResourceThumbnailWrapper>
  );
};

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

const RawMaterialSection = ({ resource, tonnage, status }) => {
  // TODO: empty state
  // TODO: default resource to current emissive settings (if none, then show empty state)
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Raw Material</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        {resource && (
          <RawMaterial complete={status === 'AFTER'}>
            <ResourceImage resource={resource} />
            <label>
              <h3>{resource.label}</h3>
              {tonnage /* TODO: ... */
                ? <div><b><ResourceIcon /> {tonnage.toLocaleString()}</b> tonnes</div>
                : <div><b>43%</b> Abundance at lot</div>
              }
            </label>
          </RawMaterial>
        )}
        {/* TODO: drop select here, doesn't make sense... however, we do need a screen to select source of core sampler (eventually, currently they are free) */}
        {status === 'BEFORE' && (
          <div>
            <Poppable label="Select" buttonWidth="135px">
              {/* TODO: ... */}
            </Poppable>
          </div>
        )}
      </SectionBody>
    </Section>
  );
}

const DestinationPlotSection = ({ asteroid, destinationPlot }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Destination</SectionTitle>
      <SectionBody>
        <Destination>
          <BuildingImage building={destinationPlot.building} progress={0.3} secondaryProgress={0.7} />
          <label>
            <h3>{destinationPlot.building.label}</h3>
            <div>{asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {destinationPlot.i.toLocaleString()}</b></div>
            <div />
            <div><b>650,000</b> / 1,000,000 m<sup>3</sup></div> {/* TODO: ... */}
          </label>
        </Destination>
        <div style={{ display: 'flex' }}>
          <IconButtonRounded style={{ marginRight: 6 }}>{/* TODO: ... */}
            <TargetIcon />
          </IconButtonRounded>
          <Poppable label="Select" buttonWidth="135px">
            {/* TODO: ... */}
          </Poppable>
        </div>
      </SectionBody>
    </Section>
  );
}

const BuildingPlanSection = ({ building, status }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Building Plan</SectionTitle>
      <SectionBody highlight={status === 'AFTER'}>
        <BuildingPlan>
          <BuildingImage building={building} />
          <label>
            <h3>{building.label}</h3>
            <b>Site Plan</b>
          </label>
        </BuildingPlan>
        {status === 'BEFORE' && (
          <div style={{ display: 'flex' }}>
            <Poppable label="Select" buttonWidth="135px">
              {/* TODO: ... */}
            </Poppable>
          </div>
        )}
      </SectionBody>
    </Section>
  );
}

const ingredients = [[700, 5], [700, 19], [400, 22]];
const IngredientsList = styled.div`
  display: flex;
  padding: 0 15px;
  & > * {
    outline: 1px dashed #666;
    margin-right: 10px;
    &:last-child {
      margin-right: 0;
    }
  }
`;
const BuildingRequirementsSection = ({ label, building, resources }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> {label}</SectionTitle>
      <SectionBody>
        <IngredientsList>
          {ingredients.map(([tally, i]) => (
            <ResourceImage key={i} badge={tally} resource={resources[i]} />
          ))}
        </IngredientsList>
      </SectionBody>
    </Section>
  );
};

const ExtractionAmountSection = ({ min, max, amount, setAmount }) => {
  return (
    <Section>
      <SectionTitle><ChevronRightIcon /> Slider</SectionTitle>
      <SectionBody>
        <div>
          <SliderLabel>
            <b>{Math.round(amount).toLocaleString()}</b> tonnes
          </SliderLabel>
        </div>
        <SliderWrapper>
          <SliderInfoRow>
            <ButtonRounded disabled={amount === min} onClick={() => setAmount(min)}>Min</ButtonRounded>
            <ButtonRounded disabled={amount === max} onClick={() => setAmount(max)}>Max</ButtonRounded>
          </SliderInfoRow>
          <SliderInput min={min} max={max} value={amount} onChange={setAmount} />
          <SliderInfoRow>
            <div>{min.toLocaleString()} m<sup>3</sup><br/>({(min/2).toLocaleString()} tonnes)</div>{/* TODO: tonnage */}
            <div>{max.toLocaleString()} m<sup>3</sup><br/>({(max/2).toLocaleString()} tonnes)</div>{/* TODO: tonnage */}
          </SliderInfoRow>
        </SliderWrapper>
      </SectionBody>
    </Section>
  );
}

// TODO: componentize

const ActionDialog = ({ actionType, asteroid, plot, onClose }) => {
  const { data: assets } = useAssets();
  const { data: crew } = useOwnedCrew();
  const activeResourceMap = useStore(s => s.asteroids.showResourceMap);

  const [amount, setAmount] = useState(11000);
  const [status, setStatus] = useState('BEFORE');
  const [resource, setResource] = useState(activeResourceMap);
  
  // TODO: ...
  // const captain = useMemo(() => (crew || []).find((c) => c.activeSlot === 0), [crew]);
  const captain = {
    name: 'Spartacus'
  };

  const resources = (assets || []).filter((a) => a.assetType === 'Resource');
  const buildings = (assets || []).filter((a) => a.assetType === 'Building');
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
      headerThumbnail: '/maskable-logo-192x192.png', // TODO: ...
      headerThumbnailBadge: '∞',
      label: 'Core Sample',
      completeLabel: 'Sample',
      consumes: {
        tally: 1,
        resource: {
          label: 'Core Sampler'
          /* TODO: ... */
        }
      },
      crewRequirement: 'duration',
      goButtonLabel: 'Take Sample',
      stats: [
        { label: 'Discovery Minimum', value: '0 tonnes', direction: -1 },
        { label: 'Discovery Maximum', value: '10,000 tonnes', direction: 1 },
        { label: 'Discovery Average', value: '5,000 tonnes', direction: 1 },
        { label: 'Sample Time', value: '47m 30s', direction: 1 },
      ]
    },
    'EXTRACTION': {
      // TODO: ...
    },
    'IMPROVE_CORE_SAMPLE': {
      // TODO: ...
    },
    'BLUEPRINT': {
      actionIcon: <LayBlueprintIcon />,
      headerBackground: extractionBackground, // TODO: ...
      headerThumbnail: '/maskable-logo-192x192.png', // TODO: ...
      label: 'Plan Building',
      completeLabel: 'Building Plan',
      crewRequirement: 'start',
      goButtonLabel: 'Plan Building',
      stats: [
        { label: 'Planning Time', value: '47m 30s', direction: 1 },
        { label: 'Grace Period', value: '2d' },
      ]
    },
    'CONSTRUCT': {
      actionIcon: <LayBlueprintIcon />, // TODO: ...
      headerBackground: extractionBackground, // TODO: ...
      headerThumbnail: '/maskable-logo-192x192.png', // TODO: ...
      label: 'Construct Building',
      completeLabel: 'Construction',
      crewRequirement: 'start',
      goButtonLabel: 'Construct Building',
      stats: [
        { label: 'Construction Time', value: '47m 30s', direction: 1 },
      ]
    },
    'DECONSTRUCT': {
      // TODO: ...
    }
  };

  const action = actions[actionType];

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
            <HeaderThumbnail src={action.headerThumbnail} badge={beforeStart && action.headerThumbnailBadge}>
              {inProgress && <HeaderThumbnailOverlay>{action.actionIcon}</HeaderThumbnailOverlay>}
              {complete && <HeaderThumbnailOverlay><CheckIcon /></HeaderThumbnailOverlay>}
            </HeaderThumbnail>
            <HeaderInfo>
              <Title>
                {status === 'BEFORE' && <>{action.actionIcon} {action.label.toUpperCase()}</>}
                {status === 'DURING' && <><RingLoader color={theme.colors.main} size="1em" /> <span style={{ marginLeft: 40 }}>31m 25s</span></>/* TODO: tick */}
                {status === 'AFTER' && `${action.completeLabel.toUpperCase()} COMPLETE`}
              </Title>
              <Subtitle>
                {asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()} ({plot.building?.label || buildings[0].label})</b>
              </Subtitle>
              {beforeStart && <Spacer />}
              {beforeStart && action.consumes && (
                <Footnote>
                  Consumes:<br/>
                  <b>{action.consumes.tally} {action.consumes.resource.label}</b>
                </Footnote>
              )}
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
          <RawMaterialSection resource={resource} status={status} tonnage={complete && 2345} />
        )}

        {actionType === 'SURFACE_TRANSFER' && (
          <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />
        )}

        {actionType === 'BLUEPRINT' && (
          <BuildingPlanSection building={buildings[1]} status={status} />
        )}
        {actionType === 'BLUEPRINT' && beforeStart && (
          <BuildingRequirementsSection label="Required for Construction" resources={resources} />
        )}

        {actionType === 'CONSTRUCT' && (
          <BuildingPlanSection />
        )}

        {actionType === 'EXTRACT' && (
          <ExtractionAmountSection amount={amount} min={4200} max={12000} setAmount={setAmount} status={status} />
        )}
        
        {action.stats?.length > 0 && (
          <StatSection status={status}>
            <SectionBody>
              <div>
                {action.stats.slice(0, Math.ceil(action.stats.length / 2)).map(({ label, value, direction }) => (
                  <StatRow key={label} direction={direction}>
                    <label>{label}</label>
                    <span>{value}</span>
                  </StatRow>
                ))}
              </div>
              <div>
                {action.stats.slice(Math.ceil(action.stats.length / 2)).map(({ label, value, direction }) => (
                  <StatRow key={label} direction={direction}>
                    <label>{label}</label>
                    <span>{value}</span>
                  </StatRow>
                ))}
              </div>
            </SectionBody>
          </StatSection>
        )}
        <Footer>
          <SectionBody>
            {beforeStart
              ? (
                <>
                  <Button onClick={onClose}>Cancel</Button>
                  <Button isTransaction onClick={() => setStatus('DURING')}>{action.goButtonLabel}</Button>
                </>
              ) : (
                <Button onClick={() => setStatus('AFTER')}>Close</Button>
              )}
          </SectionBody>
        </Footer>
      </div>
    </Dialog>
  );
};

export default ActionDialog;