import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { FaYoutube as YoutubeIcon } from 'react-icons/fa';
import { TbBellRingingFilled as AlertIcon } from 'react-icons/tb';
import { Building, Permission, Inventory, Product } from '@influenceth/sdk';

import CollapsibleSection from '~/components/CollapsibleSection';
import { TutorialIcon } from '~/components/Icons';
import { ZOOM_IN_ANIMATION_TIME, ZOOM_OUT_ANIMATION_TIME, ZOOM_TO_PLOT_ANIMATION_MAX_TIME, ZOOM_TO_PLOT_ANIMATION_MIN_TIME } from '~/game/scene/Asteroid';
import { getBuildingRequirements } from '~/game/interface/hud/actionDialogs/components';
import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewBuildings from '~/hooks/useCrewBuildings';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewSamples from '~/hooks/useCrewSamples';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import TutorialMessage from './TutorialMessage';
import { COACHMARK_IDS } from '~/Coachmarks';
import useLot from '~/hooks/useLot';

const DELAY_MESSAGE = 1000;

export const WELCOME_CONFIG = {
  accountAddress: '0x1234567890',
  crewId: Number.MAX_SAFE_INTEGER,
  crewmateId: Number.MAX_SAFE_INTEGER,
  resourceId: Product.IDS.BITUMEN,
  crewmates: {
    engineer: 7422,
    miner: 7535,
    merchant: 7538,
    pilot: 7539,
    scientist: 6891
  }
}

const STEPS = {
  INTRO: 1,
  BELT: 2,
  AP: 3,
  RECRUIT: 4,
  LEASE: 5,
  // FINAL: 11
};

/*
TODO:
"return to where I should be"
*/



const useWelcomeTour = () => {
  const { crew } = useCrewContext();

  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements(true, false, true);
  const { data: crewBuildings, isLoading: buildingsLoading } = useCrewBuildings();
  const { data: crewDeposits, isLoading: depositsLoading } = useCrewSamples();
  const isLoading = agreementsLoading || buildingsLoading || depositsLoading;

  const [transitioning, setTransitioning] = useState();
  const isTransitioning = !!transitioning;

  // const crewTutorial = useStore(s => s.crewTutorials?.[crew?.id]);
  // const uncrewTutorial = useStore(s => s.crewTutorials?.[undefined]); // have to do this to preserve pre-crew actions
  // const dispatchDismissCrewTutorial = useStore(s => s.dispatchDismissCrewTutorial);
  // const dispatchDismissCrewTutorialStep = useStore(s => s.dispatchDismissCrewTutorialStep);

  // const dismissedTutorialSteps = useMemo(() => {
  //   const dismissed = new Set();
  //   (crewTutorial?.dismissedSteps || []).forEach((s) => dismissed.add(s));
  //   (uncrewTutorial?.dismissedSteps || []).forEach((s) => dismissed.add(s));
  //   return Array.from(dismissed);
  // }, [crewTutorial?.dismissedSteps, uncrewTutorial?.dismissedSteps]);


  // TODO: determine step based on state so user can't 
  // 
  const dispatchCoachmarks = useStore(s => s.dispatchCoachmarks);
  const dispatchFiltersReset = useStore(s => s.dispatchFiltersReset);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchRecenterCamera = useStore(s => s.dispatchRecenterCamera);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const dispatchWelcomeTourStep = useStore((s) => s.dispatchWelcomeTourStep);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const openHudMenu = useStore(s => s.openHudMenu);
  const origin = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const selectedLotId = useStore(s => s.asteroids.lot);
  const selectedResourceId = useStore(s => s.asteroids.resourceMap.active ? s.asteroids.resourceMap.selected : null);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const actionDialog = useStore(s => s.actionDialog);


  const resetAsteroidFilters = () => dispatchFiltersReset('asteroids');

  const welcomeTour = useStore(s => s.welcomeTour);
  
  const { data: lot } = useLot(selectedLotId);
  const lotIsLeasable = useMemo(() => {
    if (lot && Permission.getPolicyDetails(lot, crew)[Permission.IDS.USE_LOT]?.crewStatus === 'available') {
      console.log('in1', lot);
      if (!lot?.building && !lot?.surfaceShip) {
        console.log('in2');
        return true;
      }
    }
    return false;
  }, [crew, lot]);

  
  const advance = useCallback(() => {
    dispatchWelcomeTourStep(welcomeTour.step + 1);
  }, [welcomeTour.step]);

  const welcomeTourSteps = useMemo(() => {
    if (isLoading) return [];

    // const lotLease = crewAgreements?.find((a) => a.permission === Permission.IDS.LOT_USE);

    // const controlledWarehouse = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.WAREHOUSE
    //   && b.Building?.status !== Building.CONSTRUCTION_STATUSES.UNPLANNED
    // ));

    // const controlledWarehouseSite = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.WAREHOUSE
    //   && [Building.CONSTRUCTION_STATUSES.PLANNED, Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION].includes(b.Building?.status)
    // ));

    // const buildableWarehouse = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.WAREHOUSE
    //   && (
    //     b.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION
    //     || (
    //       b.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED
    //       && !getBuildingRequirements(b, []).find((req) => req.inNeed > 0)
    //     )
    //   )
    // ));

    // const controlledOperationalWarehouse = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.WAREHOUSE
    //   && b.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
    // ));

    // const controlledExtractor = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.EXTRACTOR
    //   && b.Building?.status !== Building.CONSTRUCTION_STATUSES.UNPLANNED
    // ));

    // const controlledOperationalExtractor = crewBuildings?.find((b) => (
    //   b.Building?.buildingType === Building.IDS.EXTRACTOR
    //   && b.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
    // ));

    // const controlledNonWarehouse = crewBuildings?.find((b) => (
    //   b.Building?.buildingType !== Building.IDS.WAREHOUSE
    //   && [Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION, Building.CONSTRUCTION_STATUSES.OPERATIONAL].includes(b.Building?.status)
    // ));

    // const ownedCoreDrill = crewBuildings?.find((b) => {
    //   return !!(b.Inventories || []).find((i) => (
    //       i.status === Inventory.STATUSES.AVAILABLE
    //       && (i.contents || []).find((c) => c.product === Product.IDS.CORE_DRILL && c.amount > 0)
    //     )
    //   );
    // });

    const extractors = [];
    const deposits = [];
    const refinedMaterials = false;
    const warehouses = [];
    const shipyards = [];


    
    // TODO: consider coachmark-back-to-AP function and atAP helper var




    // TODO: do we want these in each step? ideally would use coach marks for nav... but maybe to prep state?
    //  initialize: () => {},
    return [
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
        crewmateId: WELCOME_CONFIG.crewmates.pilot,
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
        coachmarks: {},
        rightButton: {
          children: 'Let\'s Get Started',
          onClick: () => advance(),
        },
      },
      {
        title: 'The Asteroid Belt',
        content: zoomStatus === 'out'
          ? `
            Located partly inside the star's habitable "Goldilocks Zone," the Adalian asteroid belt is
            comprised of 250,000 asteroids with unique orbits & resource compositions. Aspiring colonists may
            purchase development rights to entire asteroids, or join with larger organizations attempting to
            develop their own tracts of land in the belt.
          `
          : `Ehem, we'll have to zoom out a bit first...`,
        crewmateId: WELCOME_CONFIG.crewmates.pilot,
        coachmarks: {
          [COACHMARK_IDS.backToBelt]: zoomStatus === 'in'
        },
        rightButton: {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Adalia Prime - The First Colony',
        content: `Adalia Prime is the single largest asteroid in the belt and the oldest hub of commerce and
          human activity. Every Adalian owes their life to The Arvad, the wayward colony ship that was moored
          and dismantled here to form the first permanent settlements.`,
        crewmateId: WELCOME_CONFIG.crewmates.scientist,
        // TODO: consider if at this stage, we should just initialize for them?
        initialize: () => {
          dispatchOriginSelected(1);
        },
        coachmarks: { // if AP selected, InfoPane; else, "crew location"
          [COACHMARK_IDS.hudCrewLocation]: origin !== 1,
          [COACHMARK_IDS.hudInfoPane]: zoomStatus === 'out' && origin === 1
        },
        rightButton: {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Create Your Recruit',
        content: `Before you choose which Class to join, and begin your formal post-secondary education, 
          you have one last general education requirement to complete. Your final requirement is a 
          practical internship as a new recruit, where you will learn about life in Adalia by joining 
          an experienced crew made up of volunteers who are ready to teach you.`,
        crewmateId: WELCOME_CONFIG.crewmates.scientist,
        coachmarks: {
          [COACHMARK_IDS.hudRecruitCaptain]: true // TODO: if dialog not open
        },
        shouldAdvance: () => welcomeTour.crewmate?.name && welcomeTour.crewmate?.appearance
      },
      { // TODO: could combine with above somewhat...
        title: `Welcome, ${welcomeTour.crewmate?.name}!`,
        content: `Your friends are going to be so envious - you must be one of the luckiest 
          new recruits in Adalia. The rest of the crew for your internship is composed of some 
          of the most famous Adalians - they were all Department Heads aboard the great 
          generational ship, the Arvad, before humanity arrived here.`,
        crewmateId: WELCOME_CONFIG.crewmates.scientist,
        coachmarks: {},
        rightButton: {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Lease Some Lots', // TODO: ...
        content: `Pick out a good spot to lease some lots. Click the lot.`,
        crewmateId: WELCOME_CONFIG.crewmates.engineer,
        initialize: () => {
          // deselect lot
          // zoom to altitude
          console.log({ lot });
        },
        coachmarks: {
          // TODO: navigate to AP

          [COACHMARK_IDS.hudMenuResources]: !lot && openHudMenu !== 'RESOURCES',
          [COACHMARK_IDS.hudMenuTargetResource]: !lot && openHudMenu === 'RESOURCES' && selectedResourceId !== WELCOME_CONFIG.resourceId,
          [COACHMARK_IDS.actionButtonLease]: lotIsLeasable && !actionDialog?.type, // TODO: unoccupied

          // TODO: make action buttons abstracted by using name?
          // TODO: "help me pick" option
        },
        shouldAdvance: () => welcomeTour.leasedLots?.length > 0,
        // TODO: auto-lease 4 more nearby
      },
      {
        title: '', // TODO: ...
        content: `Construct your extractor.`,
        crewmateId: WELCOME_CONFIG.crewmates.engineer,
        coachmarks: [
          // TODO: click a lot with an agreement on it (via hud)
          // TODO: "plan" action button --> extractor
          // (fast forward)
          // TODO: "construct" action button
          // TODO: "source from markets" button
          // (fast forward)
          // TODO: "construct" action button
          // (fast forward)
        ],
        shouldAdvance: () => extractors?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `You'll need somewhere to store your mining output. Construct a warehouse nearby.`,
        crewmateId: WELCOME_CONFIG.crewmates.engineer,
        coachmarks: [
          // TODO: click a lot with an agreement on it (via hud)
          // TODO: "plan" action button --> warehouse
          // (fast forward)
          // TODO: "construct" action button
          // TODO: "source from markets" button
          // (fast forward)
          // TODO: "construct" action button
          // (fast forward)
        ],
        shouldAdvance: () => warehouses?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `Let's find a deposit to mine by core sampling on the lot with our extractor.`,
        crewmateId: WELCOME_CONFIG.crewmates.miner,
        coachmarks: [
          // TODO: purchase core samplers from the market to the warehouse
          // (fast forward)
          // TODO: "core sample" action button
          // (fast forward)
          // TODO: "finish"
        ],
        shouldAdvance: () => deposits?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `Let's mine it.`,
        crewmateId: WELCOME_CONFIG.crewmates.miner,
        coachmarks: [
          // TODO: extract action button
          // (fast forward)
        ],
        shouldAdvance: () => deposits?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `Let's refine it. We'll need a refinery first.`,
        crewmateId: WELCOME_CONFIG.crewmates.engineer,
        coachmarks: [
          // TODO: click a lot with an agreement on it (via hud)
          // TODO: "plan" action button --> refinery
          // (fast forward)
          // TODO: "construct" action button
          // TODO: "source from markets" button
          // (fast forward)
          // TODO: "construct" action button
          // (fast forward)
          // TODO: "refine" action button
          // (fast forward)
        ],
        shouldAdvance: () => refinedMaterials > 0,
      },
      {
        title: '', // TODO: ...
        content: `Let's make some money and sell our refined good.`,
        crewmateId: WELCOME_CONFIG.crewmates.merchant,
        coachmarks: [
          // "asteroid markets"
          // "select good"
          // "find market with demand"
          // "market sell"
        ],
        shouldAdvance: () => refinedMaterials === 0, // TODO: material gone
      },
      {
        title: '', // TODO: ...
        content: `Let's think about getting off this rock. Start by building a shipyard.`,
        crewmateId: WELCOME_CONFIG.crewmates.pilot,
        coachmarks: [
          // TODO: click a lot with an agreement on it (via hud)
          // TODO: "plan" action button --> shipyard
          // (fast forward)
          // TODO: "construct" action button
          // TODO: "source from markets" button
          // (fast forward)
          // TODO: "construct" action button
          // (fast forward)
        ],
        shouldAdvance: () => shipyards?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `Assemble a ship`,
        crewmateId: WELCOME_CONFIG.crewmates.engineer,
        coachmarks: [
          // TODO: get to shipyard lot (via hud)
          // "build ship"
          // "light transport",
          // (fast forward)
          // deliver to last leased lot
        ],
      },
      {
        title: '', // TODO: ...
        content: `Stock your ship`,
        crewmateId: WELCOME_CONFIG.crewmates.merchant,
        coachmarks: [
          // order food
          // order propellant
          // (fast forward)
        ],
      },
      {
        title: '', // TODO: ...
        content: `Get to orbit`,
        crewmateId: WELCOME_CONFIG.crewmates.pilot,
        coachmarks: [
          // station crew on ship
          // (fast forward)
          // launch to orbit
          // (fast forward)
        ],
      },
      {
        title: '', // TODO: ...
        content: `Blast off`,
        crewmateId: WELCOME_CONFIG.crewmates.pilot,
        coachmarks: [
          // plan travel
          // prepop target
          // porkchop plot
          // set course
        ],
      },
      {
        title: '', // TODO: ...
        content: `Time to go it alone`,
        crewmateId: 6891,
        rightButton: {
          children: 'Next',
          onClick: () => {},
        },
      },
    ];
  }, [
    actionDialog,
    crew,
    crewDeposits,
    isLoading,
    crewAgreements,
    crewBuildings,
    lot,
    lotIsLeasable,
    openHudMenu,
    origin,
    selectedResourceId,
    zoomStatus
  ]);

  // cleanse step
  useEffect(() => {
    if (!isLoading) {
      if (welcomeTour.step < 0 || welcomeTour.step > welcomeTourSteps.length - 1) {
        dispatchWelcomeTourStep(0);
      }
    }
  }, [isLoading, welcomeTour?.step, welcomeTourSteps]);

  const currentStep = useMemo(() => {
    // TODO: use named index instead of numbers
    return welcomeTourSteps[welcomeTour.step];
  }, [welcomeTourSteps, welcomeTour.step]);

  // autoadvance as prescribed
  useEffect(() => {
    if (currentStep?.shouldAdvance && currentStep.shouldAdvance()) {
      advance();
    }
  }, [advance, currentStep]);

  useEffect(() => {
    if (currentStep?.initialize) {
      currentStep?.initialize();
    }
  }, [welcomeTour.step]);

  const coachmarks = useMemo(() => {
    console.log('Object.keys(currentStep?.coachmarks || {})', Object.keys(currentStep?.coachmarks || {}));
    return Object.keys(currentStep?.coachmarks || {}).filter((id) => {
      return !!currentStep?.coachmarks[id]
    });
  }, [currentStep?.coachmarks]);

  useEffect(() => {
    console.log({ coachmarks });
    dispatchCoachmarks(coachmarks);
  }, [coachmarks]);


  // useEffect(() => dispatchWelcomeTourStep(0), []);

  // TODO: memoize
  return {
    currentStep,
    isLoading,
    isTransitioning
  }
}

const WelcomeTour = () => {
  const { authenticating, authenticated, login } = useSession();
  const { crews, loading } = useCrewContext();
  const history = useHistory();

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  
  const [isHidden, setIsHidden] = useState(false);

  const { currentStep, isLoading, isTransitioning } = useWelcomeTour();
  useEffect(() => {
    setIsHidden(false);

    // TODO: initialize
  }, [currentStep])

  // TODO: coachmarks

  if (!currentStep) return null;
  return (
    <>
      <TutorialMessage
        crewmateId={currentStep?.crewmateId}
        isIn={currentStep && !isHidden && !isTransitioning}
        onClose={() => setIsHidden(true)}
        rightButton={currentStep.rightButton
          ? {
            // TODO: defaults to overwrite
            // color: theme.colors.main,
            // disabled: false,
            ...currentStep.rightButton
          }
          : null
        }
        step={currentStep}
      />
    </>
  );
};

export default WelcomeTour;