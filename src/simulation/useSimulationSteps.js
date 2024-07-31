import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, Crewmate, Entity, Inventory, Permission, Process, Processor, Product, Ship } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';

import { ZOOM_IN_ANIMATION_TIME, ZOOM_OUT_ANIMATION_TIME, ZOOM_TO_PLOT_ANIMATION_MAX_TIME, ZOOM_TO_PLOT_ANIMATION_MIN_TIME } from '~/game/scene/Asteroid';
import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewBuildings from '~/hooks/useCrewBuildings';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewSamples from '~/hooks/useCrewSamples';
import useLot from '~/hooks/useLot';
import useSimulationState from '~/hooks/useSimulationState';
import useStore from '~/hooks/useStore';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import { formatResourceMass, getBuildingRequirementsMet } from '~/game/interface/hud/actionDialogs/components';
import { getMockBuildingInventories } from './MockDataManager';
import simulationConfig from '~/simulation/simulationConfig';
import useCrewOrders from '~/hooks/useCrewOrders';
import useCrewShips from '~/hooks/useCrewShips';
import EntityName from '~/components/EntityName';
import useTravelSolutionIsValid from '~/hooks/useTravelSolutionIsValid';
import { SwayIcon } from '~/components/Icons';
import { formatPrice } from '~/lib/utils';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';

const DELAY_MESSAGE = 1000;

  // TODO: "get me where i'm supposed to be" option
  // TODO: "help me pick" option

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
  const history = useHistory();

  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements(true, false, true);
  const { data: crewBuildings, isLoading: buildingsLoading } = useCrewBuildings();
  const { data: crewDeposits, isLoading: depositsLoading } = useCrewSamples();
  const { data: crewShips, isLoading: shipsLoading } = useCrewShips();
  const { data: crewOrders, isLoading: ordersLoading } = useCrewOrders(crew?.id);
  const isLoading = agreementsLoading || buildingsLoading || depositsLoading || shipsLoading || ordersLoading;

  const [locationPath, setLocationPath] = useState();
  const [transitioning, setTransitioning] = useState();
  const isTransitioning = !!transitioning;

  useEffect(() => {
    // (returns unlisten, so can just return directly to useEffect)
    return history.listen((location) => setLocationPath(location.pathname));
  }, [history]);

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
  const dispatchSimulationEnabled = useStore(s => s.dispatchSimulationEnabled);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
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
  const dispatchSimulationLotState = useStore((s) => s.dispatchSimulationLotState);
  const dispatchSimulationState = useStore((s) => s.dispatchSimulationState);
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
  const inTravelMode = useStore(s => s.asteroids.travelMode);
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  const travelSolutionIsValid = useTravelSolutionIsValid();

  const resetAsteroidFilters = () => dispatchFiltersReset('asteroids');

  const simulation = useSimulationState();
  
  const { data: selectedLot } = useLot(selectedLotId);
  
  const advance = useCallback(() => {
    dispatchSimulationStep((simulation.step || 0) + 1);
  }, [simulation?.step]);

  const simulationSteps = useMemo(() => {
    if (isLoading) return [];

    // selectLot
    let selectedLotIsLeasable = false;
    let selectedLotIsMine = false;
    if (selectedLot) {
      const crewStatus = Permission.getPolicyDetails(selectedLot, crew)[Permission.IDS.USE_LOT]?.crewStatus;
      selectedLotIsLeasable = (crewStatus === 'available' && !selectedLot?.building && !selectedLot?.surfaceShip)
      selectedLotIsMine = (crewStatus === 'controller');
    }
    const selectedBuildingType = selectedLot?.building?.Building?.buildingType;

    // next available unused lot
    const nextUnusedLotId = (crewAgreements || []).find((a) => {
      return !(crewBuildings || []).find((b) => b.Location.location.id === a.id)
    })?.id;

    const extractorLot = Object.values(simulation.lots || {}).find((l) => l.buildingType === Building.IDS.EXTRACTOR);
    const warehouseLot = Object.values(simulation.lots || {}).find((l) => l.buildingType === Building.IDS.WAREHOUSE);
    const refineryLot = Object.values(simulation.lots || {}).find((l) => l.buildingType === Building.IDS.REFINERY);
    const shipyardLot = Object.values(simulation.lots || {}).find((l) => l.buildingType === Building.IDS.SHIPYARD);
    const shipLot = Object.values(simulation.lots || {}).find((l) => !!l.shipId);
  
    const crewIsOnShip = !!crew?._location?.shipId;

    // my inventory contents flags
    const crewHasCoreDrill = !!(crewBuildings || []).find((b) => {
      return !!(b.Inventories || []).find((i) => (
        i.status === Inventory.STATUSES.AVAILABLE
        && (i.contents || []).find((c) => c.product === Product.IDS.CORE_DRILL && c.amount > 0)
      ));
    });
    const crewAcetyleneAmount = (crewBuildings || []).reduce((acc1, b) => {
      const buildingAcetylene = (b.Inventories || []).reduce((acc2, i) => {
        if (i.status === Inventory.STATUSES.AVAILABLE) {
          const item = (i.contents || []).find((c) => c.product === Product.IDS.ACETYLENE);
          return acc2 + (item?.amount || 0);
        }
        return acc2;
      }, 0);
      return acc1 + buildingAcetylene;
    }, 0);
    const crewHasFood = !!(crewShips || []).find((b) => {
      return !!(b.Inventories || []).find((i) => (
        i.status === Inventory.STATUSES.AVAILABLE
        && (i.contents || []).find((c) => c.product === Product.IDS.FOOD && c.amount > 0)
      ));
    });
    const crewHasPropellant = !!(crewShips || []).find((b) => {
      return !!(b.Inventories || []).find((i) => (
        i.status === Inventory.STATUSES.AVAILABLE
        && (i.contents || []).find((c) => c.product === Product.IDS.HYDROGEN_PROPELLANT && c.amount >= 3000e3)
      ));
    });

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



    // "plan" action button --> extractor
    // (fast forward)
    // "construct" action button
    // "source from markets" button
    // (fast forward)
    // "construct" action button
    // (fast forward)
    const getConstructBuildingCoachmarks = (buildingType) => {
      const plannedLot = Object.values(simulation.lots || {}).find((l) => l.buildingType === buildingType);

      const x = {};

      // need to plan... select a leased, empty lot
      if (!plannedLot) {
        const onLeasedEmptyLot = selectedLotIsMine && !selectedLot?.building;
        x[COACHMARK_IDS.hudMenuMyAssets] = !onLeasedEmptyLot && !actionDialog?.type && openHudMenu !== 'MY_ASSETS';
        x[COACHMARK_IDS.hudMenuMyAssetsAgreement] = !onLeasedEmptyLot && !actionDialog?.type && openHudMenu === 'MY_ASSETS' ? nextUnusedLotId : false;
        x[COACHMARK_IDS.actionButtonPlan] = onLeasedEmptyLot && !actionDialog?.type;
        x[COACHMARK_IDS.actionDialogPlanType] = buildingType;

      // need to construct
      } else {
        const pseudoBuilding = {
          id: plannedLot.buildingId,
          label: Building.IDS.LABEL,
          Building: {
            buildingType: plannedLot.buildingType,
          },
          Inventories: getMockBuildingInventories(plannedLot.buildingType, plannedLot.buildingStatus, plannedLot.inventoryContents)
        };

        // navigate to planned lot
        const onPlannedLot = selectedLot?.building?.id === plannedLot?.buildingId;
        x[COACHMARK_IDS.hudMenuMyAssets] = !onPlannedLot && !actionDialog?.type && openHudMenu !== 'MY_ASSETS';
        x[COACHMARK_IDS.hudMenuMyAssetsBuilding] = !onPlannedLot && !actionDialog?.type && openHudMenu === 'MY_ASSETS' ? plannedLot.buildingId : false;
        
        // open construct dialog
        x[COACHMARK_IDS.actionButtonConstruct] = onPlannedLot && !['CONSTRUCT', 'SHOPPING_LIST'].includes(actionDialog?.type);
        if (!getBuildingRequirementsMet(pseudoBuilding)) {
          x[COACHMARK_IDS.actionDialogConstructSource] = onPlannedLot && actionDialog?.type === 'CONSTRUCT';
        }
      }

      return x;
    }

    
    // TODO: consider coachmark-back-to-AP function and atAP helper var


    console.log({ selectedLotIsMine, selectedLot });

    const goTo = ({ origin, zoomStatus }) => {
      if (currentZoomScene) dispatchZoomScene();
      if (destination) dispatchDestinationSelected();
      if (openHudMenu) dispatchHudMenuOpened();
      resetAsteroidFilters();

      // TODO: fill this in a lot

      if (zoomStatus === 'out') {
        setTimeout(() => {
          const delay = zoomStatus === 'out' ? 0 : ZOOM_OUT_ANIMATION_TIME;
          if (!['out', 'zooming-out'].includes(zoomStatus)) updateZoomStatus('zooming-out');

          setTimeout(() => {
            dispatchReorientCamera();
            if (origin) dispatchOriginSelected(origin);
            setTimeout(() => { setTransitioning(false); }, DELAY_MESSAGE);
          }, delay);
        }, 0);
      }
    };


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
        targetLocation: () => ({ zoomStatus: 'in', origin: 1089 }),
        initialize: () => {
          goTo({ zoomStatus: 'in', origin: 1089 })
        },
        coachmarks: {
          // TODO: rightButton?
        },
        rightButton: {
          children: 'Let\'s Get Started',
          onClick: () => advance(),
        },
      },
      {
        title: 'Create Your Recruit',
        content: (
          <>
            Before you choose which class to join and begin your specialized education, you have one 
            last general education requirement to complete. Your final requirement takes the form of a 
            practical internship as a new recruit, where you will learn about life in Adalia by joining an 
            experienced crew made up of volunteers who are ready to teach you.
            <br/><br/>
            Click on the empty crew slot in your HUD to get started.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        targetLocation: () => ({ url: '/recruit/0/1/0/create' }),
        coachmarks: {
          [COACHMARK_IDS.hudRecruitCaptain]: (!locationPath || locationPath === '/') // not in creation flow
        },
        // TODO: implement enabledActions here so cannot click early
        shouldAdvance: () => simulation.crewmate?.name && simulation.crewmate?.appearance
      },
      {
        // TODO: navigate to fake /crew page? could probably do now that faking state
        title: `Welcome, ${simulation.crewmate?.name}!`,
        content: `Your friends are going to be so envious - you must be one of the luckiest new recruits
          in Adalia! The rest of the crew for your internship is composed of some of the most famous
          Adalians - they were all Department Heads and members of the Prime Council aboard the Arvad,
          the great generational ship that arrived here from Earth.`,
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        coachmarks: {
          // TODO: brief flash on crewmate added to AvatarMenu?
          // TODO: rightButton?
        }, 
        initialize: () => {/* TODO: open crew details? */},
        rightButton: {
          children: 'Start Training Simulation',
          onClick: () => advance(),
        },
      },
      {
        title: 'Welcome to Adalia',
        content: `
          Located partly inside our star's habitable "Goldilocks Zone," the Adalian asteroid belt is
          comprised of 250,000 asteroids with unique orbital paths & resource compositions. Adalians
          may purchase development rights to entire asteroids, or join with larger organizations
          attempting to develop their own colonies in the belt.
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        targetLocation: () => ({ zoomStatus: 'out' }),
        initialize: () => {
          goTo({ zoomStatus: 'out' })
        },
        coachmarks: {
          [COACHMARK_IDS.backToBelt]: zoomStatus === 'in'
          // TODO: rightButton?
        },
        rightButton: {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Adalia Prime - The First Colony',
        content: (zoomStatus === 'out' && origin === 1)
          ? `I've focused your nav panel on Adalia Prime. Click the HUD to zoom in for a closer look.`
          : (
            <>
              Adalia Prime is the single largest asteroid in the belt and the oldest hub of commerce and human
              activity. While we all owe our lives to the Arvad, the wayward colony ship that was moored and
              dismantled to form the first permanent settlements, Adalia Prime was our first real home here
              in the asteroid belt. Here, at any public Habitats, you can find fellow new recruits when you
              are ready to form your first crew.
            <br/><br/>
              Click on the HUD crew location to zoom to your current station.
            </>
          ),
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        targetLocation: () => ({ zoomStatus: 'in', origin: 1 }),
        initialize: () => {
          goTo({ zoomStatus: 'out', origin: 1 })
        },
        coachmarks: { // if AP selected, InfoPane; else, "crew location"
          [COACHMARK_IDS.hudCrewLocation]: origin !== 1 || zoomStatus === 'in',
          [COACHMARK_IDS.hudInfoPane]: zoomStatus === 'out' && origin === 1
          // TODO: rightButton coachmark
        },
        shouldAdvance: () => selectedLotId === crew?._location?.lotId
      },
      {
        title: 'Resource Mapping',
        content: (
          <>
            Every asteroid has a set of resources available for us to mine, refine, and use in 
            manufacturing. Resource maps show you where the highest concentrations are located on a 
            particular asteroid. No single asteroid has everything we need to survive, but, when we combine 
            resources from all of the spectral types, we have everything we need to sustain our colony.
            {!selectedResourceId && (
              <>
                <br /><br />
                Enable the resource map display in your HUD, then spin around the asteroid to explore.
              </>
            )}
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.scientist,
        targetLocation: () => ({ zoomStatus: 'in', origin: 1, openHudMenu: 'RESOURCES', resourceId: Product.IDS.BITUMEN, lot: null }),
        initialize: () => {
          goTo({ lot: null })
        },
        coachmarks: {
          [COACHMARK_IDS.hudCrewLocation]: zoomStatus !== 'in' || origin !== 1,
          [COACHMARK_IDS.hudMenuResources]: openHudMenu !== 'RESOURCES',
          [COACHMARK_IDS.hudMenuTargetResource]: openHudMenu === 'RESOURCES' && selectedResourceId !== Product.IDS.BITUMEN ? Product.IDS.BITUMEN : null,
          // TODO: rightButton coachmark
        },
        rightButton: selectedResourceId && {
          children: 'Next',
          onClick: () => advance(),
        },
      },
      {
        title: 'Lease Some Lots',
        content: `Since the Prime Council still controls Adalia Prime, you'll have to lease some lots of
          land from them. The first task that you are assigned is to find an unoccupied lot to lease. It's
          also your first lesson in how the economics of Adalia operate.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Lease Some Lots',
        content: `Mason Quince, a leading member of a prominent Merchant's Guild, gives you some advice:
          "Leasing lots is all about balance. The further out from the city centers that you go, the 
          cheaper the lots, but the higher the commute time for your crew and goods to get to market. Find 
          the right balance and I'm sure you'll find a sweet spot to set up a beginning mining operation."`,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Lease Some Lots',
        content: (
          <>
            I've sent you <SwayIcon />{formatPrice(SIMULATION_CONFIG.startingSway / TOKEN_SCALE[TOKEN.SWAY], { minPrecision: 0 })} SWAY, the currency of
            Adalia, to get you started. Try not to spend it all in one place! Or do, it's up to you, this
            is only a simulation.
            <br/><br/>
            Choose a spot on Adalia Prime that is unoccupied and has an abundance of{' '}
            {Product.TYPES[SIMULATION_CONFIG.resourceId].name}, keeping in mind my advice about balance.
            <br/><br/>
            Click the pip at the center of any lot to reveal lot-specific actions in the HUD.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        initialize: () => {
          dispatchSimulationState('sway', SIMULATION_CONFIG.startingSway);
          // TODO: deselect lot -> zoom to altitude
        },
        coachmarks: {
          // TODO: coachmarks back to AP, zoomed in

          // open resource map
          [COACHMARK_IDS.hudMenuResources]: !selectedLot && openHudMenu !== 'RESOURCES',
          [COACHMARK_IDS.hudMenuTargetResource]: !selectedLot && openHudMenu === 'RESOURCES' && selectedResourceId !== SIMULATION_CONFIG.resourceId ? SIMULATION_CONFIG.resourceId : null,

          // prompt to lease
          [COACHMARK_IDS.actionButtonLease]: selectedLotIsLeasable && !actionDialog?.type,
        },
        enabledActions: {
          FormLotLeaseAgreement: !!selectedLotIsLeasable
        },
        shouldAdvance: () => !!simulation.lots
      },
      {
        title: 'Lease Some Lots',
        content: (
          <>
            "Excellent choice!" Mason gives you a stout pat on the back. "I can see you're going to
            be a quick study."
          <br/><br/>
            "To save you some time, I went ahead and leased the neighboring lots for you as well."
          </>
        ),
        initialize: () => {}, // TODO: open "my assets" so can see the agreements
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Building the Basics',
        content: (
          <>
            After leasing a few lots, the former Chief Technology Officer of the Arvad, Petros Vallois, is there to guide
            you in your next steps. "Humans are innate tool users, we are all builders, and we can all learn to make 
            something useful. No matter what class you end up joining, every Adalian is more than capable of building an 
            extractor and a warehouse. Let's get you started."
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Building the Basics',
        content: !Object.values(simulation.lots || {}).find((l) => l.buildingType === Building.IDS.EXTRACTOR)
          ? `Let's start with an Extractor. Select one of your already-leased lots, and add the appropriate "Site Plan."`
          : `
            Great job! Now, by following the training guides in the HUD, you can source materials for your
            planned Extractor on the open markets of Adalia Prime, and start construction.
          `,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: () => getConstructBuildingCoachmarks(Building.IDS.EXTRACTOR),
        enabledActions: {
          PlanBuilding: !!selectedLotIsMine,
          [`SelectSitePlan:${Building.IDS.EXTRACTOR}`]: true,
          Construct: selectedLotIsMine && !!selectedLot?.building,
          // TODO: deliveries?
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.EXTRACTOR && l.buildingStatus === Building.CONSTRUCTION_STATUSES.OPERATIONAL);
        },
      },
      {
        title: 'Building the Basics',
        content: `Great work! Now, you'll obviously need somewhere to store your mining output, so let's construct a
          warehouse nearby. Follow the training guides again to build your first warehouse.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: () => getConstructBuildingCoachmarks(Building.IDS.WAREHOUSE),
        enabledActions: {
          PlanBuilding: !!selectedLotIsMine,
          [`SelectSitePlan:${Building.IDS.WAREHOUSE}`]: true,
          Construct: selectedLotIsMine && !!selectedLot?.building,
          // TODO: deliveries?
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.WAREHOUSE && l.buildingStatus === Building.CONSTRUCTION_STATUSES.OPERATIONAL);
        },
      },
      {
        title: `What's Mine is Mine`,
        content: (
          <>
            "Despite what we hoped for, this place won't allow us to sow crops and farm the surface 
            directly. So, we have to dig to get what we need to survive." The Arvad's former Chief 
            Cook, Julia Oliveira, takes over the next part of your education. "Luckily, the essentials 
            needed for food, for life support, for everything we need to survive are here, beneath the 
            surface, if you know where to find them."
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: `What's Mine is Mine`,
        content: !crewHasCoreDrill
          ? (
            <>
              Let's purchase a few core drills from the markets. We'll have them delivered to your new
              warehouse, and then we can start searching for {Product.TYPES[SIMULATION_CONFIG.resourceId].name}-rich
              deposits on the lot with your new extractor.
            </>
          )
          : (
            <>
              Great work! Now, click on the lot with your extractor on it, and let's kick off a new core 
              sample with one of your new core drills. Once we have analyzed the core, we'll be able to
              extract {Product.TYPES[SIMULATION_CONFIG.resourceId].name} from that deposit. 
            </>
          ),
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        coachmarks: {
          // purchase core samplers from the market to the warehouse
          // (fast forward)
          // "core sample" action button
          // (fast forward)
          // "finish"

          [COACHMARK_IDS.hudMenuMarketplaces]: !crewHasCoreDrill && (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: !crewHasCoreDrill && Product.IDS.CORE_DRILL, // TODO: max 100

          [COACHMARK_IDS.detailsClose]: crewHasCoreDrill && (locationPath !== '/'),
          [COACHMARK_IDS.hudMenuMyAssets]: crewHasCoreDrill && !actionDialog?.type && selectedLot?.building?.id !== extractorLot?.buildingId && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsBuilding]: crewHasCoreDrill && selectedLot?.building?.id !== extractorLot?.buildingId ? extractorLot?.buildingId : null,
          [COACHMARK_IDS.actionButtonCoreSample]: crewHasCoreDrill && !actionDialog?.type && selectedLot?.building?.id === extractorLot?.buildingId,
          [COACHMARK_IDS.actionDialogTargetResource]: simulationConfig.resourceId
        },
        enabledActions: {
          MarketBuy: !crewHasCoreDrill,
          [`SelectInventory:${Entity.IDS.BUILDING}.${warehouseLot?.buildingId}.2`]: true,
          CoreSample: crewHasCoreDrill && selectedLot?.building?.id === extractorLot?.buildingId,
          [`SelectTargetResource:${simulationConfig.resourceId}`]: true
        },
        shouldAdvance: () => {
          return !!(extractorLot?.depositYield > 0);
        }
      },
      {
        title: `And now, we dig`,
        content: `
          "Now, we dig. It isn't so unlike farming potatoes, we're just using this giant shovel to 
          pull up what we found with our core sample. Both types of work require getting your hands 
          dirty." Julia gives you a rare smile, and you get to work together. 
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        coachmarks: {
          [COACHMARK_IDS.actionButtonExtract]: !actionDialog?.type && selectedLot?.building?.id === extractorLot?.buildingId,
        },
        enabledActions: {
          Extract: selectedLot?.building?.id === extractorLot?.buildingId,
          [`SelectInventory:${Entity.IDS.BUILDING}.${warehouseLot?.buildingId}.2`]: true,
        },
        shouldAdvance: () => {
          return !!(extractorLot?.depositYield > extractorLot?.depositYieldRemaining);
        },
      },
      {
        title: `Refining your Skills`,
        content: (
          <>
            After the extraction is completed, you're reassigned to Petros again. "Enough playing in 
            the dirt, time to get back to building again. This time we're building a Refinery, where 
            we'll turn all those rocks into something useful."
            <br/><br/>
            Follow the HUD training guides to construct your first refinery.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: () => getConstructBuildingCoachmarks(Building.IDS.REFINERY),
        enabledActions: {
          PlanBuilding: !!selectedLotIsMine,
          [`SelectSitePlan:${Building.IDS.REFINERY}`]: true,
          Construct: selectedLotIsMine && !!selectedLot?.building,
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.REFINERY && l.buildingStatus === Building.CONSTRUCTION_STATUSES.OPERATIONAL);
        },
      },
      {
        title: `Refining your Skills`,
        content: `
          "Refineries are where engineers and scientists should be working together." Petros hands
          you some personal protective equipment, and continues talking to you while putting his 
          own set on. "Now, I know you've probably grown up hearing about the rivalry between 
          these two classes, but from my point of view, we would all benefit from a bit more 
          cooperation." His voice is slightly muffled by his PPE now, and you have to strain to 
          hear him, but you're pretty sure that he is saying something about following the 
          processes and maybe something else about your safety?
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: () => ({
          [COACHMARK_IDS.hudMenuMyAssets]: refineryLot && !actionDialog?.type && selectedLot?.building?.id !== refineryLot?.buildingId && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsBuilding]: refineryLot && selectedLot?.building?.id !== refineryLot?.buildingId ? refineryLot?.buildingId : null,
          [COACHMARK_IDS.actionButtonProcess]: !actionDialog?.type && selectedLot?.building?.id === refineryLot?.buildingId,
          [COACHMARK_IDS.actionDialogTargetProcess]: actionDialog?.type === 'PROCESS' ? simulationConfig.processId : null,
          [COACHMARK_IDS.actionDialogMaxRecipes]: true
        }),
        enabledActions: {
          [`Process:${Processor.IDS.REFINERY}`]: selectedLotIsMine && selectedLot?.building?.id === refineryLot?.buildingId,
          [`SelectProcess:${Process.IDS.HUELS_PROCESS}`]: true,
          [`SelectInventory:${Entity.IDS.BUILDING}.${warehouseLot?.buildingId}.2`]: true,
        },
        shouldAdvance: () => crewAcetyleneAmount > 0
      },
      {
        title: `Step 3: Profit`,
        content: (
          <>
            "All right! Time to see what you're really made of, kid." Mason has a glint in his eye as he 
            takes you into the Marketplace.
            <br/><br/>
            "In here, you make no friends and you take no prisoners. One 
            minute you're up half a million in soybeans and the next, boom, your kids never leave their 
            test-tubes and they've repossessed your Heavy Transport."
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: `Step 3: Profit`,
        content: `
          Create a Limit Sell order for your ${formatResourceMass(crewAcetyleneAmount, Product.IDS.ACETYLENE)}
          stock of ${Product.TYPES[Product.IDS.ACETYLENE].name}. Try to choose a marketplace where you 
          can create an offer at the high price while staying competitive with the other offers.
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        coachmarks: () => ({
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.ACETYLENE,
        }),
        enabledActions: {
          LimitSell: true,
          [`SelectInventory:${Entity.IDS.BUILDING}.${warehouseLot?.buildingId}.2`]: true,
        },
        shouldAdvance: () => crewOrders?.length > 0
      },
      {
        title: 'Shipping & Receiving',
        content: (
          <>
            "You and I are getting to know each other pretty well. I don't say this to all the new 
            recruits I meet, but I think you might actually be able to hack it as an Engineer. At 
            least you don't seem to be afraid of hard work." Petros nods his approval, as you get 
            started building a shipyard.
            <br/><br/>
            Follow the HUD training guides to construct a shipyard.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        initialize: () => { history.push('/'); },
        coachmarks: getConstructBuildingCoachmarks(Building.IDS.SHIPYARD),
        enabledActions: {
          PlanBuilding: !!selectedLotIsMine && !shipyardLot,
          [`SelectSitePlan:${Building.IDS.SHIPYARD}`]: true,
          Construct: selectedLotIsMine && !!selectedLot?.building,
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.SHIPYARD && l.buildingStatus === Building.CONSTRUCTION_STATUSES.OPERATIONAL);
        }
      },
      {
        title: 'Some Assembly Required',
        content: (
          <>
            "Ah, and now we have arrived at it. The penultimate tool that humanity has created, so far: 
            a spaceship. A vehicle capable of breaking free from the gravitational pull of a large body, 
            capable of carrying a human life thousands of kilometers in the soundless vacuum of space, 
            and even capable of landing safely and being reused, again and again. A creation so 
            amazingly complex that, as far as we've seen, we're the only species in the known universe 
            to create it."
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Some Assembly Required',
        content: (
          <>
            I stocked your warehouse with everything you'll need to build a Light Transport -- your
            first ship.
            <br/><br/>
            Select your shipyard and follow the HUD training guides to start the assembly process.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        initialize: () => {
          // TODO: should we send these as a packaged p2p transfer?
          const warehouseLotId = Object.keys(simulation.lots).find((lotId) => simulation.lots[lotId].buildingType === Building.IDS.WAREHOUSE);
          dispatchSimulationLotState(warehouseLotId, {
            inventoryContents: {
              ...warehouseLot.inventoryContents,
              [2]: {
                ...warehouseLot.inventoryContents[2],
                ...Process.TYPES[Process.IDS.LIGHT_TRANSPORT_INTEGRATION].inputs
              }
            }
          });
          // TODO: open warehouse inventory to show?
        },
        coachmarks: ({
          // get to the shipyard lot
          [COACHMARK_IDS.hudMenuMyAssets]: shipyardLot && !actionDialog?.type && selectedLot?.building?.id !== shipyardLot?.buildingId && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsBuilding]: shipyardLot && selectedLot?.building?.id !== shipyardLot?.buildingId ? shipyardLot?.buildingId : null,

          // open dialog and select LT
          [COACHMARK_IDS.actionButtonAssembleShip]: !actionDialog?.type && selectedLot?.building?.id === shipyardLot?.buildingId,
          [COACHMARK_IDS.actionDialogTargetProcess]: actionDialog?.type === 'ASSEMBLE_SHIP' ? Ship.IDS.LIGHT_TRANSPORT : null,
        }),
        enabledActions: {
          AssembleShip: selectedLotIsMine && selectedLot?.building?.id === shipyardLot?.buildingId,
          [`SelectProcess:${Ship.IDS.LIGHT_TRANSPORT}`]: true,
          [`SelectInventory:${Entity.IDS.BUILDING}.${warehouseLot?.buildingId}.2`]: true,
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.shipId);
        }
      },
      {
        title: 'Fuel Up',
        content: `
          "They always save the best for last!" The former High Commander of the Arvad, Lucinda Natus,
          is more relaxed and far less serious than you expected. "I don't care what ship it is, where 
          I'm going to, what I'm leaving behind, or how many times I've done it - there is nothing that 
          can compare to flying. Leaving behind the solid ground and going to space, it's awe-inspiring 
          every single time."
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Fuel Up',
        content: (
          <>
            Your ship has been delivered to your remaining leased lot. Before we go, let's get this bird 
            ready to fly and your crew stocked for some inter-asteroid travel.
            <br/><br/>
            First, follow the training guides to stock the cargo hold of your ship with 5,000 kg food.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        initialize: () => {
          // select ship lot
          const shipLotId = Object.keys(simulation.lots).find((lotId) => !!simulation.lots[lotId]?.shipId);
          dispatchLotSelected(shipLotId);
        },
        coachmarks: {
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.FOOD,
          [COACHMARK_IDS.actionDialogTargetInventory]: `${Entity.IDS.SHIP}.${SIMULATION_CONFIG.shipId}.${Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].cargoSlot}`
        },
        enabledActions: {
          MarketBuy: true,
          [`SelectInventory:${Entity.IDS.SHIP}.${SIMULATION_CONFIG.shipId}.${Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].cargoSlot}`]: true
        },
        shouldAdvance: () => !!crewHasFood
      },
      {
        title: 'Fuel Up',
        content: `
          Next, let's take advantage of the allowance Quince sent you and fill up the tank. Add
          ${formatResourceMass(Inventory.TYPES[Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantInventoryType]?.massConstraint / 1e3, Product.IDS.HYDROGEN_PROPELLANT)}
          of hydrogen propellant to the propellant inventory of your ship by following the training
          guides once more.
        `,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        coachmarks: {
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.HYDROGEN_PROPELLANT,
          [COACHMARK_IDS.actionDialogTargetInventory]: `${Entity.IDS.SHIP}.${SIMULATION_CONFIG.shipId}.${Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantSlot}`
        },
        enabledActions: {
          MarketBuy: true,
          [`SelectInventory:${Entity.IDS.SHIP}.${SIMULATION_CONFIG.shipId}.${Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantSlot}`]: true
        },
        shouldAdvance: () => !!crewHasPropellant
      },
      {
        title: 'Lift Off',
        content: (
          <>
            Are we forgetting something? Oh right, our crew. We're still sitting nice and warm
            in the habitat building we started in.
            <br/><br/>
            Select the ship, restation our team as the piloting crew, and let's launch the ship
            into Adalia Prime's orbit.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        initialize: () => { history.push('/'); },
        coachmarks: {
          // select ship lot
          [COACHMARK_IDS.hudMenuMyAssets]: !actionDialog?.type && !(selectedLotIsMine && selectedLot?.surfaceShip) && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsShip]: !actionDialog?.type && !(selectedLotIsMine && selectedLot?.surfaceShip) ? shipLot?.shipId : null,

          // station crew on ship
          // (fast forward)
          // launch to orbit
          // (fast forward)
          [COACHMARK_IDS.actionButtonStationCrew]: !actionDialog?.type && !crewIsOnShip && selectedLotIsMine && selectedLot?.surfaceShip,
          [COACHMARK_IDS.actionButtonLaunchShip]: !actionDialog?.type && crewIsOnShip && selectedLotIsMine && selectedLot?.surfaceShip,
          
          [COACHMARK_IDS.actionDialogTargetLaunchType]: 'propulsive',
          // TODO: (flight crew empty on Ship Tab)
        },
        enabledActions: {
          LaunchShip: crewIsOnShip,
          [`SelectLaunchType:propulsive`]: true,
          StationCrew: !crewIsOnShip,
        },
        shouldAdvance: () => crew?._location?.asteroidId && !crew?._location?.lotId
      },
      {
        title: 'To Infinity',
        content: (
          <>
            Set the asteroid known as "<EntityName label={Entity.IDS.ASTEROID} id={SIMULATION_CONFIG.destinationAsteroidId} />" 
            as our destination in your HUD. The nav system will build a Ballistic Transfer Graph
            that describes the propellant requirements per the time of departure, length of your journey,
            and relative orbits of the origin and destination. Lighter areas require less fuel while 
            darker require more.
            <br/><br/>
            Pick your preferred travel solution and let's blast off this rock. Don't forget to leave
            some fuel for the return trip! Who knows where the nearest gas station might be?
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        initialize: () => {
          dispatchDestinationSelected(SIMULATION_CONFIG.destinationAsteroidId);
        },
        coachmarks: {
          // select ship
          // TODO: don't need these if no lot selected
          // TODO: should use 
          [COACHMARK_IDS.hudCrewLocation]: !inTravelMode && !actionDialog?.type && currentZoomScene?.shipId !== shipLot?.shipId,

          // plan travel
          [COACHMARK_IDS.actionButtonSelectDestination]: !inTravelMode && !actionDialog?.type,
          [COACHMARK_IDS.destinationAsteroid]: inTravelMode && destination !== SIMULATION_CONFIG.destinationAsteroidId,
          [COACHMARK_IDS.porkchop]: inTravelMode && !travelSolutionIsValid,
          [COACHMARK_IDS.actionButtonSetCourse]: !actionDialog?.type && inTravelMode && travelSolutionIsValid,
        },
        enabledActions: {
          PlanFlight: true,
          SetCourse: travelSolutionIsValid
        },
        shouldAdvance: () => crew?._location && !crew._location?.asteroidId
      },
      {
        title: 'Beyond',
        content: (
          <>
            "Freedom. That's one of the reasons that I love flying so much, it gives you freedom."
            <br/><br/>
            Natus has reviewed your performance, determined that your internship has been successful,
            and now your last general education requirement is complete.
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Beyond',
        content: (
          <>
            She suggested sharing a last meal with you before you depart her ship, and now she's been 
            telling you a bit about her own asteroid; the quiet, the solitude, the freedom that comes 
            with owning your own piece of the belt.
            <br/><br/>
            "Remember: the future is yours, Adalian, we're all excited to see what you do with it."
          </>
        ),
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        rightButton: { children: 'Next', onClick: () => advance(), },
      },
      {
        title: 'Training Simulation Complete',
        content: (
          <>
            You did it, congratulations! You are now officially ready to choose your career 
            class and start your own crew.
            <br/><br/>
            Good luck {simulation.crewmate?.name}, we're all pulling for you.
          </>
        ),
        crewmateImageOptionString: JSON.stringify({ coll: Crewmate.COLLECTION_IDS.ADALIAN, appearance: simulation.crewmate?.appearance }),
        rightButton: {
          children: 'Begin Your Journey',
          onClick: () => {
            // enter crew creation + exit simulation
            dispatchSimulationEnabled(false);
            setTimeout(() => {
              dispatchLauncherPage();
              history.push('/recruit/0');
            }, 100);
          },
        },
      },
    ];
  }, [
    actionDialog,
    crew,
    crewAgreements,
    crewBuildings,
    crewDeposits,
    crewShips,
    inTravelMode,
    isLoading,
    locationPath,
    selectedLot,
    openHudMenu,
    origin,
    selectedResourceId,
    travelSolution,
    travelSolutionIsValid,
    zoomStatus
  ]);

  // cleanse step
  useEffect(() => {
    if (!isLoading) {
      if (simulation.step === undefined || simulation.step < 0) {// || simulation.step > simulation.length - 1) {
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
    let currentCoachmarks = {};
    if (currentStep && pendingTransactions.length === 0) {
      if (typeof currentStep.coachmarks === 'function') {
        currentCoachmarks = currentStep.coachmarks() || {};
      } else {
        currentCoachmarks = currentStep.coachmarks || {};
      }
    }
    dispatchCoachmarks(currentCoachmarks);
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