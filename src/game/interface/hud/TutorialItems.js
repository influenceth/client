import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { TbBellRingingFilled as AlertIcon } from 'react-icons/tb';
import { Building } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CollapsibleSection from '~/components/CollapsibleSection';
import IconButton from '~/components/IconButton';
import { CloseIcon, TutorialIcon } from '~/components/Icons';
import { ZOOM_IN_ANIMATION_TIME, ZOOM_OUT_ANIMATION_TIME, ZOOM_TO_PLOT_ANIMATION_TIME } from '~/game/scene/Asteroid';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewmate from '~/hooks/useCrewmate';
import useStore from '~/hooks/useStore';
import { reactBool } from '~/lib/utils';
import theme from '~/theme';

const ICON_WIDTH = 34;
const ITEM_WIDTH = 410;
const SECTION_WIDTH = 450;
const TRANSITION_TIME = 400;
const DELAY_MESSAGE = 1000;

const COLOR = '51, 170, 255';

const TitleWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;

const IconWrapper = styled.span`
  color: rgb(${COLOR});
  font-size: 24px;
  line-height: 0;
  margin-right: 6px;
`;

const ActionItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  transition: width 0.15s ease;
  user-select: none;
  width: ${ITEM_WIDTH}px;
`;

const Filters = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  width: 100%;
`;
const Filter = styled.div`
  border-radius: 20px;
  font-size: 90%;
  padding: 3px 20px 3px 15px;
`;
const TutorialFilter = styled(Filter)`
  background: rgba(${COLOR}, 0.5);
  border: 1px solid rgba(${COLOR}, 0.5);
  &:before {
    content: "${p => p.tally}";
    color: white;
    margin-right: 10px;
  }
  &:after {
    content: "Welcome Tour";
    color: ${COLOR};
  }
`;

const OuterWrapper = styled.div`
  flex: 1;
  height: 0;
  pointer-events: none;
  position: relative;
  width: 100%;
`;

const ActionItemContainer = styled.div`
  max-height: 275px;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  width: ${ITEM_WIDTH}px;
`;

const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;
const Icon = styled.div`
  & svg {
    filter: drop-shadow(1px 1px 1px #333);
    ${p => p.animate && css`
      animation: ${opacityKeyframes} 1000ms ease infinite;
    `}
  }
`;

const Status = styled.div`
  text-shadow: none;
`;
const Label = styled.div`
  white-space: nowrap;
`;
const ActionItemRow = styled.div`
  align-items: center;
  overflow: hidden;
  pointer-events: all;
  text-shadow: 1px 1px 2px black;

  background: rgba(${COLOR}, ${p => p.isCurrent ? 0.4 : 0.2});
  color: rgb(${COLOR});
  height: 34px;
  margin-bottom: 2px;
  opacity: ${p => p.isCurrent ? 1 : 0.5};
  transform: translateX(0);
  &:hover {
    background: rgba(${COLOR}, 0.4);
  }

  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 85%;
  position: relative;
  transition:
    opacity ${TRANSITION_TIME * 0.75}ms ease,
    transform ${TRANSITION_TIME * 0.75}ms ease,
    height ${TRANSITION_TIME * 0.25}ms ease ${TRANSITION_TIME * 0.75}ms,
    margin-bottom 1ms ease ${TRANSITION_TIME * 0.75}ms;
  ${Icon} {
    align-items: center;
    background: rgba(${COLOR}, 0.2);
    display: flex;
    font-size: ${ICON_WIDTH}px;
    height: ${ICON_WIDTH}px;
    justify-content: center;
    margin-right: 8px;
    width: ${ICON_WIDTH}px;
    & span {
      font-size: 24px;
      line-height: 0;
    }
  }
  ${Status} {
    margin-right: 8px;
    text-transform: uppercase;
  }
  ${Label} {
    color: white;
    white-space: nowrap;
  }
`;

const messageOffset = 65;
const messageHeight = 175;
const messageWidth = 600;
const crewmateOverflow = 80;
const crewmateWidth = 180;
const borderColor = `rgba(${theme.colors.mainRGB}, 0.33)`;
const TutorialMessage = styled.div`
  display: flex;
  flex-direction: row;
  position: fixed;
  bottom: ${messageOffset}px;
  height: ${messageHeight}px;
  left: calc(50% - ${messageWidth/2}px);
  pointer-events: all;
  transition: transform 250ms ease;
  transform: translateY(${p => p.in ? 0 : (messageHeight + messageOffset + crewmateOverflow)}px);
  width: ${messageWidth}px;
  z-index: 1000000;
  &:before {
    content: "";
    ${p => p.theme.clipCorner(25)};
    background: rgba(13, 33, 41, 0.8);
    border: 1px solid ${borderColor};
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: -1;
  }
`;
const TutorialContent = styled.div`
  padding: 0 15px;
  & > h3 {
    align-items: center;
    display: flex;
    font-size: 18px;
    font-weight: normal;
    text-transform: uppercase;
    margin: 0;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    & > span {
      flex: 1;
    }
    & > button {
      margin-right: 0;
    }
  }
  & > div {
    color: ${p => p.theme.colors.main};
    font-size: 85%;
    padding: 12px 0;
  }
`;

const CrewmateWrapper = styled.div`
  margin: 1px;
  background: linear-gradient(
    to top,
    rgba(${p => p.theme.colors.mainRGB}, 0.5) 0%,
    rgba(0, 0, 0, 0.5) 70%
  );
  flex: 0 0 ${crewmateWidth}px;
`;
const CrewmateOverflow = styled.div`
  height: ${messageHeight + crewmateOverflow}px;
  overflow: hidden;
  position: relative;
  top: -${crewmateOverflow}px;
`;
const CrewmateImage = styled.div`
  background-image: url("${process.env.REACT_APP_IMAGES_URL}/v1/crew/${p => p.crewmateId}/image.svg?bustOnly=true");
  background-position: top center;
  background-repeat: no-repeat;
  background-size: cover;
  padding-top: 140%;
  width: 100%;
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  & > * {
    margin-left: 6px;
  }
`;

const useTutorial = () => {
  const resetAsteroidFilters = useStore(s => s.dispatchFiltersReset('asteroidsMapped'));
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const openHudMenu = useStore(s => s.asteroids.openHudMenu);
  const destination = useStore(s => s.asteroids.destination);
  const origin = useStore(s => s.asteroids.origin);
  const lot = useStore(s => s.asteroids.lot);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [transitioning, setTransitioning] = useState();
  const [hideMessage, setHideMessage] = useState();

  // TODO: use useLotLink instead of all this extra?  

  const tutorialParts = useMemo(() => ([
    {
      title: 'The Star System Adalia',
      content: `Welcome to the star system Adalia, which was first discovered by
        the wayward colony ship Arvad in the year 2335.`,
      crewmate: 7539,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        if (destination) dispatchDestinationSelected();
        if (openHudMenu) dispatchHudMenuOpened();
        resetAsteroidFilters();
        setTimeout(() => {
          const delay = zoomStatus === 'out' ? 0 : ZOOM_OUT_ANIMATION_TIME;
          if (!['out', 'zooming-out'].includes(zoomStatus)) updateZoomStatus('zooming-out');

          setTimeout(() => {
            dispatchReorientCamera();
            dispatchOriginSelected(1);
            setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'The Belt',
      content: `The Adalian belt is divided into 250,000 individually colonizable
        asteroids which form the extent of the Prime Council's federated territories.`,
      crewmate: 6891,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        if (destination) dispatchDestinationSelected();
        if (openHudMenu) dispatchHudMenuOpened();
        if (lot) dispatchLotSelected();
        dispatchOriginSelected(15);
        setTimeout(() => {
          const delay = zoomStatus === 'in' ? 0 : ZOOM_IN_ANIMATION_TIME;
          if (!['in', 'zooming-in'].includes(zoomStatus)) updateZoomStatus('zooming-in');

          setTimeout(() => {
            dispatchReorientCamera();
            dispatchHudMenuOpened('ASTEROID_INFO');
            setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Space Travel',
      content: `Skillful pilots and navigators are a foundational pillar of Adalian
        society. Successfully traversing a vast system of individually orbiting
        locations require care and planning.`,
      crewmate: 6877,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(15);
        dispatchDestinationSelected(1);
        setTimeout(() => {
          const delay = zoomStatus === 'out' ? 0 : ZOOM_OUT_ANIMATION_TIME;
          if (!['out', 'zooming-out'].includes(zoomStatus)) updateZoomStatus('zooming-out');

          setTimeout(() => {
            dispatchReorientCamera();
            dispatchHudMenuOpened('BELT_PLAN_FLIGHT');
            setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Asteroid Mining',
      content: `The foundations of the asteroid economy begin with raw ore. Everything
        from volatile gases, to organic compounds, and heavy metallic elements may be
        targeted for mining.`,
      crewmate: 7422,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(1);
        dispatchDestinationSelected();
        setTimeout(() => {
          const delay = zoomStatus === 'in' ? 300 : ZOOM_IN_ANIMATION_TIME;
          if (!['in', 'zooming-in'].includes(zoomStatus)) updateZoomStatus('zooming-in');

          setTimeout(() => {
            dispatchLotSelected('6882899840204801'); // stand-in lot (there are no seeded extractors)
            setTimeout(() => {
              dispatchZoomScene({ type: 'LOT', overrides: { buildingType: Building.IDS.EXTRACTOR } });
              setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
            }, ZOOM_TO_PLOT_ANIMATION_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Warehousing',
      content: `After extraction, raw materials are packaged for transport to storage or refining facilities elsewhere in the colony.`,
      crewmate: 7305,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(1);
        dispatchDestinationSelected();
        setTimeout(() => {
          const delay = zoomStatus === 'in' ? 300 : ZOOM_IN_ANIMATION_TIME;
          if (!['in', 'zooming-in'].includes(zoomStatus)) updateZoomStatus('zooming-in');

          setTimeout(() => {
            dispatchLotSelected('6911100595470337'); // warehouse
            setTimeout(() => {
              dispatchZoomScene({ type: 'LOT', overrides: { buildingType: Building.IDS.WAREHOUSE } });
              setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
            }, ZOOM_TO_PLOT_ANIMATION_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Markets',
      content: `The Adalian economy also relies heavily on thriving commercial
        Marketplaces bringing together buyers and sellers of goods.`,
      crewmate: 7538,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(1);
        dispatchDestinationSelected();
        setTimeout(() => {
          const delay = zoomStatus === 'in' ? 300 : ZOOM_IN_ANIMATION_TIME;
          if (!['in', 'zooming-in'].includes(zoomStatus)) updateZoomStatus('zooming-in');

          setTimeout(() => {
            dispatchLotSelected('6933915461746689'); // marketplace
            setTimeout(() => {
              dispatchZoomScene({ type: 'LOT', overrides: { buildingType: Building.IDS.MARKETPLACE } });
              setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
            }, ZOOM_TO_PLOT_ANIMATION_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Habitation',
      content: `Habitats serve as schooling and recruitment hubs for new Adalian
        Citizens coming of age and starting their journeys as functioning members
        of a new stellar society still in its infancy.`,
      crewmate: 6980,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(1);
        dispatchDestinationSelected();
        setTimeout(() => {
          const delay = zoomStatus === 'in' ? 300 : ZOOM_IN_ANIMATION_TIME;
          if (!['in', 'zooming-in'].includes(zoomStatus)) updateZoomStatus('zooming-in');

          setTimeout(() => {
            dispatchLotSelected('6881662889623553'); // lucinda's landing
            setTimeout(() => {
              dispatchZoomScene({ type: 'LOT', overrides: { buildingType: Building.IDS.HABITAT } });
              setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
            }, ZOOM_TO_PLOT_ANIMATION_TIME);
          }, delay);
        }, 0);
      },
    }
  ]), [currentZoomScene, destination, lot, openHudMenu, resetAsteroidFilters, zoomStatus]);

  const previousStep = useRef(currentStepIndex);
  
  const updateStep = useCallback((newStep) => {
    if (transitioning) return;
    setTransitioning(true);

    setCurrentStepIndex(newStep);
    const { initialize } = tutorialParts[newStep];

    initialize();
    setHideMessage(false);
  }, [transitioning, tutorialParts]);

  useEffect(() => {
    console.log('update step');
    updateStep(0);
  }, []);

  useEffect(() => {
    if (!transitioning) previousStep.current = currentStepIndex;
  }, [currentStepIndex, transitioning]);

  const currentStep = useMemo(() => {
    return tutorialParts[transitioning ? previousStep.current : currentStepIndex];
  }, [currentStepIndex, transitioning, tutorialParts]);

  return useMemo(() => ({
    updateStep,
    currentStep,
    currentStepIndex,
    hideMessage: hideMessage,
    isTransitioning: transitioning,
    setHideMessage,
    steps: tutorialParts
  }), [currentStepIndex, hideMessage, transitioning, tutorialParts, updateStep]);
}

const TutorialItems = () => {
  const { account, authenticating, login } = useAuth();
  const { crews, loading } = useCrewContext();
  const history = useHistory();
  const { updateStep, currentStep, currentStepIndex, hideMessage, isTransitioning, setHideMessage, steps } = useTutorial();
  const { data: arvadLeader } = useCrewmate(currentStep?.crewmate);

  const handlePrevious = useCallback(() => {
    updateStep(Math.max(0, currentStepIndex - 1));
  }, [currentStepIndex, updateStep]);

  const handleNext = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      if (account) history.push('/crew')
      else login();
    } else {
      updateStep(currentStepIndex + 1);
    }
  }, [account, currentStepIndex, history, login, updateStep]);

  // hide if i have crews with crewmates on them
  const hide = useMemo(() => {
    if (loading || (crews || []).find((c) => c._crewmates?.length > 0)) return true;
    return false;
  }, [crews, loading])

  // TODO: ideally, would not zoom out when account changes (unless stay logged out and click "explore")
  if (hide) return null;
  return (
    <>
      <OuterWrapper>
        <CollapsibleSection
          borderless
          collapsibleProps={{ style: { width: SECTION_WIDTH - 32 } }}
          forceClose={hideMessage}
          title={(
            <TitleWrapper>
              <IconWrapper><AlertIcon /></IconWrapper>
              <Filters>
                <TutorialFilter tally={steps.length} />
              </Filters>
            </TitleWrapper>
          )}>
          <ActionItemWrapper>
            <ActionItemContainer>
              {steps.map(({ title }, i) => (
                <ActionItemRow key={i}
                  color="4, 112, 165"
                  isCurrent={currentStepIndex === i}
                  isPast={currentStepIndex > i}
                  onClick={() => updateStep(i)}>
                  <Icon><span><TutorialIcon /></span></Icon>
                  <Status>Part {i + 1}</Status>
                  <Label>{title}</Label>
                </ActionItemRow>
              ))}
            </ActionItemContainer>
          </ActionItemWrapper>
        </CollapsibleSection>
      </OuterWrapper>

      <TutorialMessage in={reactBool(!isTransitioning && !hideMessage)}>
        <CrewmateWrapper>
          <CrewmateOverflow>
            <CrewmateImage crewmateId={arvadLeader?.id} />
          </CrewmateOverflow>
        </CrewmateWrapper>
        
        <TutorialContent>
          <h3>
            <span>{currentStep?.title}</span>
            <IconButton onClick={() => setHideMessage(true)} scale={0.75}><CloseIcon /></IconButton>
          </h3>
          <div style={{ height: 70 }}>{currentStep?.content}</div>
          <Buttons>
            {currentStepIndex > 0 && (
              <Button flip size="small" subtle onClick={handlePrevious}>Previous</Button>
            )}
            {currentStepIndex < steps.length - 1 && (
              <Button size="small" subtle onClick={handleNext}>Next Section</Button>
            )}
            {currentStepIndex === steps.length - 1 && (
              <Button
                color={theme.colors.success}
                disabled={authenticating}
                onClick={handleNext}
                size="small"
                subtle>Start Your Crew</Button>
            )}
          </Buttons>
        </TutorialContent>

        <ClipCorner dimension={25} color={borderColor} />
      </TutorialMessage>
    </>
  );
};

export default TutorialItems;