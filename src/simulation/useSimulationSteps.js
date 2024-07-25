import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, Permission, Inventory, Product } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';

import { ZOOM_IN_ANIMATION_TIME, ZOOM_OUT_ANIMATION_TIME, ZOOM_TO_PLOT_ANIMATION_MAX_TIME, ZOOM_TO_PLOT_ANIMATION_MIN_TIME } from '~/game/scene/Asteroid';
import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewBuildings from '~/hooks/useCrewBuildings';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewSamples from '~/hooks/useCrewSamples';
import useStore from '~/hooks/useStore';
import { COACHMARK_IDS } from '~/Coachmarks';
import useLot from '~/hooks/useLot';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';
import useSimulationState from '~/hooks/useSimulationState';

const DELAY_MESSAGE = 1000;

const STEPS = {
  INTRO: 1,
  BELT: 2,
  AP: 3,
  RECRUIT: 4,
  LEASE: 5,
  // FINAL: 11
};

const useSimulationSteps = () => {
  const { crew, pendingTransactions } = useCrewContext();

  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements(true, false, true);
  const { data: crewBuildings, isLoading: buildingsLoading } = useCrewBuildings();
  const { data: crewDeposits, isLoading: depositsLoading } = useCrewSamples();
  const isLoading = agreementsLoading || buildingsLoading || depositsLoading;

  const [transitioning, setTransitioning] = useState();
  const isTransitioning = !!transitioning;

  const history = useHistory();

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
  const dispatchSimulationActions = useStore((s) => s.dispatchSimulationActions);
  const dispatchSimulationStep = useStore((s) => s.dispatchSimulationStep);
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

  const simulation = useSimulationState();
  
  const { data: lot } = useLot(selectedLotId);
  const [lotIsLeasable, lotIsMine] = useMemo(() => {
    let leasable = false;
    let leased = false;
    if (lot) {
      const crewStatus = Permission.getPolicyDetails(lot, crew)[Permission.IDS.USE_LOT]?.crewStatus;
      leasable = (crewStatus === 'available' && !lot?.building && !lot?.surfaceShip)
      leased = (crewStatus === 'controller');
    }
    return [leasable, leased];
  }, [crew, lot]);

  const unusedLotId = useMemo(() => {
    return (crewAgreements || []).find((a) => {
      return !(crewBuildings || []).find((b) => b.Location.location.id === a.id)
    })?.id;
  }, [crewAgreements, crewBuildings]);

  
  const advance = useCallback(() => {
    dispatchSimulationStep((simulation.step || 0) + 1);
  }, [simulation?.step]);

  const simulationSteps = useMemo(() => {
    if (isLoading) return [];

    // const lotLease = crewAgreements?.find((a) => a.permission === Permission.IDS.USE_LOT);

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
            Welcome, Adalian! The Prime Council knows that you are eager to get out there and get started, 
            but first we need to ensure that you are equipped with the knowledge you need to survive here.
            <br /><br />
            Remember: the <a href="https://wiki.influenceth.io/en/docs/user-guides" target="_blank" rel="noopener noreferrer">Wiki</a>
            {' '}and  <a href="https://discord.com/invite/influenceth" target="_blank" rel="noopener noreferrer">Discord</a>
            {' '}are resources that are always available to you when seeking help from your fellow Adalians.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
            Located partly inside our star's habitable "Goldilocks Zone," the Adalian asteroid belt is
            comprised of 250,000 asteroids with unique orbital paths & resource compositions. Adalians
            may purchase development rights to entire asteroids, or join with larger organizations
            attempting to develop their own colonies in the belt.
          `
          : `Ehem, we'll have to zoom out a bit first...`,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
        content: zoomStatus === 'out'
          ? `I've focused your nav panel on Adalia Prime. Click the HUD to zoom in for a closer look.`
          : `
            Adalia Prime is the single largest asteroid in the belt and the oldest hub of commerce and human
            activity. While we all owe our lives to the Arvad, the wayward colony ship that was moored and
            dismantled to form the first permanent settlements, Adalia Prime was our first real home here
            in the asteroid belt. Here, at any public Habitats, you can find fellow new recruits when you
            are ready to form your first crew.
          `,
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        initialize: () => {
          dispatchOriginSelected(1);
        },
        coachmarks: { // if AP selected, InfoPane; else, "crew location"
          [COACHMARK_IDS.hudCrewLocation]: origin !== 1,
          [COACHMARK_IDS.hudInfoPane]: zoomStatus === 'out' && origin === 1
        },
        rightButton: zoomStatus !== 'out' && {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Create Your Recruit',
        content: `Before you choose which class to join and begin your specialized education, you have one 
          last general education requirement to complete. Your final requirement takes the form of a 
          practical internship as a new recruit, where you will learn about life in Adalia by joining an 
          experienced crew made up of volunteers who are ready to teach you.`,
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        coachmarks: {
          [COACHMARK_IDS.hudRecruitCaptain]: (history.location.pathname === '/') // not in creation flow
        },
        shouldAdvance: () => simulation.crewmate?.name && simulation.crewmate?.appearance
      },
      {
        // TODO: navigate to fake /crew page? could probably do now that faking state
        title: `Welcome, ${simulation.crewmate?.name}!`,
        content: `Your friends are going to be so envious - you must be one of the luckiest new recruits
          in Adalia. The rest of the crew for your internship is composed of some of the most famous
          Adalians - they were all Department Heads and members of the Prime Council aboard the Arvad,
          the great generational ship that arrived here from Earth.`,
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        coachmarks: {}, // TODO: brief flash on crewmate added to AvatarMenu?
        initialize: () => {
          // TODO: zoom to where crew is
        },
        rightButton: {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Lease Some Lots',
        content: `Since the Prime Council still controls Adalia Prime, you'll have to lease some lots of
          land from them. The first task that you are assigned is to find an unoccupied lot to lease. It's
          also your first lesson in how the economics of Adalia operate. Mason Quince, a leading member
          of a prominent Merchant's Guild, gives you some advice: "Leasing lots is all about balance. The
          further out from the city centers that you go, the cheaper the lots, but the higher the commute
          time for your crew and goods to get to market. Find the right balance and I'm sure you'll find
          a sweet spot to set up a beginning mining operation."`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        initialize: () => {
          // TODO: deselect lot -> zoom to altitude
        },
        coachmarks: {
          // TODO: (navigate to AP package)

          [COACHMARK_IDS.hudMenuResources]: !lot && openHudMenu !== 'RESOURCES',
          [COACHMARK_IDS.hudMenuTargetResource]: !lot && openHudMenu === 'RESOURCES' && selectedResourceId !== SIMULATION_CONFIG.resourceId,
          [COACHMARK_IDS.actionButtonLease]: lotIsLeasable && !actionDialog?.type, // TODO: unoccupied

          // TODO: make action buttons abstracted by using name?
          // TODO: "help me pick" option
        },
        enabledActions: {
          FormLotLeaseAgreement: !!lotIsLeasable
        },
        shouldAdvance: () => !!simulation.lots
      },
      {
        title: 'Construct your extractor.',
        content: `Do it.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: {
          [COACHMARK_IDS.hudMenuMyAssets]: !(lot && lotIsMine) && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsAgreement]: !(lot && lotIsMine) && openHudMenu === 'MY_ASSETS' && unusedLotId,
          [COACHMARK_IDS.actionButtonPlan]: lotIsMine && !actionDialog?.type && !lot?.building,
          [COACHMARK_IDS.actionButtonConstruct]: !actionDialog?.type && lotIsMine && lot?.building,

          [COACHMARK_IDS.actionDialogPlanType]: Building.IDS.EXTRACTOR,
          [COACHMARK_IDS.actionDialogConstructSource]: true,
          
          
          // TODO: "plan" action button --> extractor
          // (fast forward)
          // TODO: "construct" action button
          // TODO: "source from markets" button
          // (fast forward)
          // TODO: "construct" action button
          // (fast forward)
        },
        enabledActions: {
          PlanBuilding: !!lotIsMine,
          [`SelectSitePlan:${Building.IDS.EXTRACTOR}`]: true,
          Construct: lotIsMine && !!lot?.building,
          // TODO: deliveries?
        },
        shouldAdvance: () => {
          console.log({ lot, lotIsMine, openHudMenu })
          return extractors?.length > 0;
        },
      },
      {
        title: '', // TODO: ...
        content: `You'll need somewhere to store your mining output. Construct a warehouse nearby.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
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
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
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
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        coachmarks: [
          // TODO: extract action button
          // (fast forward)
        ],
        shouldAdvance: () => deposits?.length > 0,
      },
      {
        title: '', // TODO: ...
        content: `Let's refine it. We'll need a refinery first.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
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
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
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
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
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
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        coachmarks: [
          // order food
          // order propellant
          // (fast forward)
        ],
      },
      {
        title: '', // TODO: ...
        content: `Get to orbit`,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
    history.location.pathname,
    lot,
    lotIsLeasable,
    lotIsMine,
    openHudMenu,
    origin,
    selectedResourceId,
    zoomStatus
  ]);

  // cleanse step
  useEffect(() => {
    if (!isLoading) {
      if (simulation.step === undefined || simulation.step < 0 || simulation.step > simulation.length - 1) {
        dispatchSimulationStep(0);
      }
    }
  }, [isLoading, simulation?.step, simulationSteps]);

  const currentStep = useMemo(() => {
    // TODO: use named index instead of numbers
    return simulationSteps[simulation.step];
  }, [simulationSteps, simulation.step]);

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
  }, [simulation.step]);

  const enabledActions = useMemo(() => {
    return Object.keys(currentStep?.enabledActions || {}).filter((id) => {
      return !!currentStep?.enabledActions[id]
    });
  }, [currentStep?.enabledActions]);

  // TODO: 

  useEffect(() => {
    console.log({ coachmarks: currentStep?.coachmarks });
    dispatchCoachmarks(pendingTransactions.length > 0 ? {} : currentStep?.coachmarks);
  }, [currentStep?.coachmarks, pendingTransactions]);

  useEffect(() => {
    console.log({ enabledActions });
    dispatchSimulationActions(enabledActions);
  }, [enabledActions]);


  // useEffect(() => dispatchSimulationStep(0), []);

  // TODO: memoize
  return {
    currentStep,
    isLoading,
    isTransitioning
  }
};

export default useSimulationSteps;