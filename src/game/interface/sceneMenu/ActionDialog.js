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
import { ChevronRightIcon, CloseIcon, CoreSampleIcon, ResourceIcon } from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import useAssets from '~/hooks/useAssets';
import useOwnedCrew from '~/hooks/useOwnedCrew';
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
  padding: 0 15px;
  width: 675px;
`;
const SectionTitle = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderColor};
  display: flex;
  flex-direction: row;
  font-size: 85%;
  line-height: 1.5em;
  padding: 0 5px 10px;
  text-transform: uppercase;
  & > svg {
    font-size: 175%;
    margin-left: -13px;
  }
`;
const SectionBody = styled.div`
  display: flex;
  flex-direction: row;
`;
const SectionBodyWithSelector = styled(SectionBody)`
  align-items: center;
  padding: 15px 0;
`;
const Stretcher = styled.div`
  display: flex;
  flex: 1;
  justify-content: center;
`;
const Header = styled(Section)`
  padding-bottom: 15px;
  padding-top: 15px;
  position: relative;
  ${p => p.backgroundSrc && `
    &:before {
      content: "";
      background: url("${p.backgroundSrc}") center center;
      background-size: cover;
      bottom: 0;
      mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
      
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      z-index: 0;
    }
  `}
`;
const HeaderThumbnail = styled.div`
  height: 115px;
  width: 115px;
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
  padding-left: 20px;
  position: relative;
  & b {
    color: white;
    font-weight: normal;
  }
`;
const Title = styled.div`
  color: white;
  font-size: 32px;
  line-height: 32px;
`;
const Subtitle = styled.div`

`;
const Footnote = styled.div`
  
`;
const CrewInfo = styled.div`
  align-items: flex-end;
  display: flex;
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
const StatSection = styled(Section)`
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
`;
const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 5px 15px;
  & > label {
    
  }
  & > span {
    color: white;
    &:after {
      content: " ▴";
      color: ${p => p.theme.colors.success};
    }
  }
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

const RawMaterial = styled.div`
  align-items: center;
  display: flex;
  & > label {
    padding-left: 15px;
    & > h3 {
      color: white;
      font-weight: normal;
      margin: 0;
    }
    & > div {
      & > b {
        color: ${p => p.theme.colors.main};
        font-weight: bold;
        & > svg {
          vertical-align: middle;
        }
      }
    }
    & > h3, 
    & > div > b {
      font-size: 25px;
    }
  }
`;

const Destination = styled.div`
  & > h3 {
    color: white;
    font-size: 25px;
    font-weight: normal;
    margin: 0;
  }
  & b {
    color: white;
    font-weight: normal;
  }
  & > *:last-child {
    margin-top: 1em;
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
  background: ${p => p.theme.colors.main};
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

// TODO: componentize

const ActionDialog = ({ asteroid/*, plot*/ }) => {
  const { data: assets } = useAssets();
  const { data: crew } = useOwnedCrew();

  const [amount, setAmount] = useState(74990);
  const onClose = useCallback(() => {}, []);  // TODO: ...
  
  // TODO: ...
  // const captain = useMemo(() => (crew || []).find((c) => c.activeSlot === 0), [crew]);
  const captain = {
    name: 'Spartacus'
  };

  const resources = (assets || []).filter((a) => a.assetType === 'Resource');
  const buildings = (assets || []).filter((a) => a.assetType === 'Building');
  const plot = {  // TODO: use plot above
    i: 12332,
    building: buildings[0]
  };
  const destinationPlot = {
    i: 23441,
    building: buildings[1]
  };

  const action = {
    resource: resources[0]
  };

  const inProgress = false;
  // console.log({ asteroid, plot });
  return (
    <Dialog>
      <div style={{ position: 'relative' }}>
        {inProgress && (
          <LoadingBar>Core Sample: 15.4%</LoadingBar>
        )}
        <CloseButton backgroundColor={inProgress && 'black'} onClick={onClose} borderless>
          <CloseIcon />
        </CloseButton>
        <Header backgroundSrc={coreSampleBackground}>
          <SectionBody>
            <HeaderThumbnail src="/maskable-logo-192x192.png">
              {inProgress && <HeaderThumbnailOverlay><CoreSampleIcon /></HeaderThumbnailOverlay>}
            </HeaderThumbnail>
            <HeaderInfo>
              {!inProgress && (
                <>
                  <Title style={{ textTransform: 'uppercase' }}>
                    <CoreSampleIcon /> Core Sample
                  </Title>
                  <Subtitle>
                    {asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()} ({plot.building.label})</b>
                  </Subtitle>
                  <Spacer />
                  <Footnote>
                    Consumes:<br/>
                    <b>1 Core Sampler</b>
                  </Footnote>
                </>
              )}
              {inProgress && (
                <>
                  <Title>
                    {/* TODO: tick */}
                    <RingLoader color={theme.colors.main} size="1em" /> <span style={{ marginLeft: 40 }}>31m 25s</span>
                  </Title>
                  <Subtitle>
                    {asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()} ({plot.building.label})</b>
                  </Subtitle>
                </>
              )}
              {captain && (
                <CrewInfo>
                  <div>
                    Crew:<br/>
                    <b>Required for Duration</b>
                  </div>
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
          </SectionBody>
        </Header>

        <Section>
          <SectionTitle><ChevronRightIcon /> Raw Material</SectionTitle>
          <SectionBodyWithSelector>
            <Stretcher>
              {action?.resource && (
                <RawMaterial>
                  <ResourceImage badge={12} progress={0.5} resource={action.resource} />
                  <label>
                    <h3>{action.resource.label}</h3>
                    <div><b>43%</b> Abundance at lot</div>
                    {/*<div><b><ResourceIcon /> 2,435</b> tonnes</div>*/}
                  </label>
                </RawMaterial>
              )}
            </Stretcher>
            <div>
              <Poppable label="Select" buttonWidth="135px">
                
              </Poppable>
            </div>
          </SectionBodyWithSelector>
        </Section>

        <Section>
          <SectionTitle><ChevronRightIcon /> Destination</SectionTitle>
          <SectionBodyWithSelector>
            <Destination>
              <h3>{destinationPlot.building.label}</h3>
              <div>{asteroid.customName ? `'${asteroid.customName}'` : asteroid.baseName} &gt; <b>Lot {plot.i.toLocaleString()}</b></div>
              <div> </div>
              <div><b>650,000</b> / 1,000,000 m<sup>3</sup></div>
            </Destination>
            <Stretcher>
              <BuildingImage building={destinationPlot.building} progress={0.3} secondaryProgress={0.7} />
            </Stretcher>
            <div style={{ display: 'flex' }}>
              <IconButtonRounded style={{ marginRight: 6 }}>
                <TargetIcon />
              </IconButtonRounded>
              <Poppable label="Select" buttonWidth="135px">
                
              </Poppable>
            </div>
          </SectionBodyWithSelector>
        </Section>

        <Section>
          <SectionTitle><ChevronRightIcon /> Slider</SectionTitle>
          <SectionBody style={{ padding: '15px 0'}}>
            <div>
              <SliderLabel>
                <b>{Math.round(amount).toLocaleString()}</b> tonnes
              </SliderLabel>
            </div>
            <SliderWrapper>
              <SliderInfoRow>
                <ButtonRounded disabled={amount === 4200} onClick={() => setAmount(4200)}>Min</ButtonRounded>
                <ButtonRounded disabled={amount === 120000} onClick={() => setAmount(120000)}>Max</ButtonRounded>
              </SliderInfoRow>
              <SliderInput min={4200} max={120000} value={amount} onChange={setAmount} />
              <SliderInfoRow>
                <div>4,200 m<sup>3</sup><br/>(100 tonnes)</div>
                <div>120,000 m<sup>3</sup><br/>(3,200 tonnes)</div>
              </SliderInfoRow>
            </SliderWrapper>
          </SectionBody>
        </Section>

        <StatSection>
          <SectionBody>
            <div>
              <StatRow>
                <label>Discovery Minimum:</label>
                <span>0 tonnes</span>
              </StatRow>
              <StatRow>
                <label>Discovery Minimum:</label>
                <span>10,000 tonnes</span>
              </StatRow>
            </div>
            <div>
              <StatRow>
                <label>Discovery Average:</label>
                <span>5,000 tonnes</span>
              </StatRow>
              <StatRow>
                <label>Sample Time:</label>
                <span>47m 30s</span>
              </StatRow>
            </div>
          </SectionBody>
        </StatSection>
        <Footer>
          <SectionBody>
            <Button>Cancel</Button>
            <Button isTransaction>Take Sample</Button>
          </SectionBody>
        </Footer>
      </div>
    </Dialog>
  );
};

export default ActionDialog;