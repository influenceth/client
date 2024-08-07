import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { TbBellRingingFilled as AlertIcon } from 'react-icons/tb';
import { Building } from '@influenceth/sdk';

import CollapsibleSection from '~/components/CollapsibleSection';
import { TutorialIcon } from '~/components/Icons';
import { ZOOM_IN_ANIMATION_TIME, ZOOM_OUT_ANIMATION_TIME, ZOOM_TO_PLOT_ANIMATION_MAX_TIME, ZOOM_TO_PLOT_ANIMATION_MIN_TIME } from '~/game/scene/Asteroid';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import { ICON_WIDTH, TRANSITION_TIME } from './ActionItem';
import TutorialMessage from './TutorialMessage';

const ITEM_WIDTH = 410;
const SECTION_WIDTH = 450;
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
  max-height: 300px;
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

const useWelcomeTour = () => {
  const resetAsteroidFilters = useStore(s => s.dispatchFiltersReset('asteroidsMapped'));
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchWelcomeTourStep = useStore(s => s.dispatchWelcomeTourStep);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const welcomeTourStep = useStore(s => s.welcomeTourStep);
  const openHudMenu = useStore(s => s.openHudMenu);
  const destination = useStore(s => s.asteroids.destination);
  const lot = useStore(s => s.asteroids.lot);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const [transitioning, setTransitioning] = useState();
  const [hideMessage, setHideMessage] = useState();

  // TODO: use useLotLink instead of all this extra?

  const tutorialParts = useMemo(() => ([
    {
      title: 'Welcome to Influence',
      content: (
        <>
          Influence is a massively multiplayer simulation set in the asteroid belt surrounding the star <b>Adalia</b>.
          <br /><br />
          Click NEXT to continue the Welcome Tour, or visit our
          {' '}<a href="https://wiki.influenceth.io/en/docs/user-guides" target="_blank" rel="noopener noreferrer">Wiki</a>
          {' '}or <a href="https://discord.com/invite/influenceth" target="_blank" rel="noopener noreferrer">Discord</a> for help getting started!
        </>
      ),
      crewmateId: 7539,
      initialize: () => {
        setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE / 2);
      },
    },
    {
      title: 'The Asteroid Belt',
      content: `Located partly inside the star's habitable "Goldilocks Zone," the Adalian asteroid belt is
        comprised of 250,000 asteroids with unique orbits & resource compositions. Aspiring colonists may
        purchase development rights to entire asteroids, or join with larger organizations attempting to
        develop their own tracts of land in the belt.`,
      crewmateId: 7539,
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
      title: 'Adalia Prime - The First Colony',
      content: `Adalia Prime is the single largest asteroid in the belt and the oldest hub of commerce and
        human activity. Every Adalian owes their life to The Arvad, the wayward colony ship that was moored
        and dismantled here to form the first permanent settlements.`,
      crewmateId: 6891,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        if (destination) dispatchDestinationSelected();
        if (openHudMenu) dispatchHudMenuOpened();
        if (lot) dispatchLotSelected();
        dispatchOriginSelected(1);
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
      title: 'Navigating The Belt',
      content: `Adalian pilots burn from asteroid to asteroid using nuclear-powered torch ships. Traversing
        this vast network of individually orbiting bodies requires careful planning and preparation. Click
        on the Ballistic Transfer Graph to simulate possible routes, and consider re-fueling for the return
        journey!`,
      crewmateId: 6877,
      initialize: () => {
        if (currentZoomScene) dispatchZoomScene();
        dispatchOriginSelected(1);
        dispatchDestinationSelected(15);
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
      title: 'Resource Extraction',
      content: `Raw asteroid ore contains all the basic ingredients to support life and create products
        for a thriving deep-space economy. Extractors such as this can harvest everything from frozen
        volatile gases to organic compounds. Deposits of metal, rare-earth, or fissile materials may
        also be discovered depending on an asteroid's composition and abundances.`,
      crewmateId: 7422,
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
            }, ZOOM_TO_PLOT_ANIMATION_MAX_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Warehousing & Logistics',
      content: `Warehouses are another key component of the supply chain, providing secure storage
        facilities for stockpiling and construction. Most goods are shipped across the surface by
        low-velocity tug-boats called Hoppers, and travel distances are a critical factor to ensuring
        shipments arrive on time.`,
      crewmateId: 7305,
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
            }, ZOOM_TO_PLOT_ANIMATION_MIN_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Markets & Economy',
      content: `The Adalian economy also heavily depends on Marketplaces to establish prices for goods,
        and the ever-shifting distances between asteroids provides nonstop opportunities for savvy
        merchants or intrepid haulers running trade routes. Click the Marketplace listings icon on the
        right to check this location's products and prices.`,
      crewmateId: 7538,
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
            }, ZOOM_TO_PLOT_ANIMATION_MIN_TIME);
          }, delay);
        }, 0);
      },
    },
    {
      title: 'Habitation & Life Support',
      content: (
        <>
          Finally, Habitats are the beating heart of life in Adalia. These giant rotating structures
          serve as vibrant social hubs for the Crews stationed there, as well as recruitment centers
          for new Adalians.
          <br /><br />
          You are now ready to begin your Adalian journey! <b>Starter Packs</b> contain everything needed to form your first crew and start
          your own mining operation on Adalia Prime. Join up today!
        </>
      ),
      crewmateId: 6980,
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
            }, ZOOM_TO_PLOT_ANIMATION_MIN_TIME);
          }, delay);
        }, 0);
      },
    }
  ]), [currentZoomScene, destination, lot, openHudMenu, resetAsteroidFilters, zoomStatus]);

  const previousStep = useRef(welcomeTourStep || -1);
  const updateStep = useCallback((newStep) => {
    if (transitioning) return;
    setTransitioning(true);

    dispatchWelcomeTourStep(newStep);
    const { initialize } = tutorialParts[newStep];

    initialize();
    setHideMessage(false);
  }, [dispatchWelcomeTourStep, transitioning, tutorialParts]);

  useEffect(() => {
    if (!(welcomeTourStep >= 0)) dispatchWelcomeTourStep(0);
  }, []);

  useEffect(() => {
    if (!transitioning) previousStep.current = welcomeTourStep;
  }, [welcomeTourStep, transitioning]);

  const currentStep = useMemo(() => {
    return tutorialParts[transitioning ? previousStep.current : welcomeTourStep];
  }, [welcomeTourStep, transitioning, tutorialParts]);

  return useMemo(() => ({
    updateStep,
    currentStep,
    currentStepIndex: welcomeTourStep,
    hideMessage: hideMessage,
    isTransitioning: transitioning,
    setHideMessage,
    steps: tutorialParts
  }), [hideMessage, transitioning, tutorialParts, welcomeTourStep, updateStep]);
}

const WelcomeTourItems = () => {
  const { authenticating, authenticated, login } = useSession();
  const { crews, loading } = useCrewContext();
  const history = useHistory();
  const { updateStep, currentStep, currentStepIndex, hideMessage, isTransitioning, setHideMessage, steps } = useWelcomeTour();

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const handlePrevious = useCallback(() => {
    updateStep(Math.max(0, currentStepIndex - 1));
  }, [currentStepIndex, updateStep]);

  const handleNext = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      // TODO: prompt to login first?
      // login().then(() => dispatchLauncherPage('store', 'packs'));
      dispatchLauncherPage('store', 'packs');
    } else {
      updateStep(currentStepIndex + 1);
    }
  }, [authenticated, currentStepIndex, history, login, updateStep]);

  // hide if i have crews with crewmates on them
  const hide = useMemo(() => {
    if (loading || (crews || []).find((c) => c._crewmates?.length > 0)) return true;
    return false;
  }, [crews, loading]);

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
                <TutorialFilter />
              </Filters>
            </TitleWrapper>
          )}>
          <ActionItemWrapper>
            <ActionItemContainer>
              {steps.map(({ title }, i) => (
                <ActionItemRow key={i}
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

      <TutorialMessage
        crewmateId={currentStep?.crewmateId}
        isIn={currentStep && !isTransitioning && !hideMessage}
        leftButton={currentStepIndex > 0 ? { onClick: handlePrevious, children: "Previous" } : null}
        onClose={() => setHideMessage(true)}
        rightButton={currentStepIndex < steps.length - 1
          ? { onClick: handleNext, children: "Next Section" }
          : (currentStepIndex === steps.length - 1
            ? {
              color: theme.colors.success,
              disabled: authenticating,
              onClick: handleNext,
              children: "See Starter Packs"
            }
            : null
          )
        }
        step={currentStep}
      />
    </>
  );
};

export default WelcomeTourItems;