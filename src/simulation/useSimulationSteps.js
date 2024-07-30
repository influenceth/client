import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, Inventory, Permission, Process, Processor, Product, Ship } from '@influenceth/sdk';
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

    const extractorLot = Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.EXTRACTOR);
    const warehouseLot = Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.WAREHOUSE);
    const refineryLot = Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.REFINERY);
    const shipyardLot = Object.values(simulation.lots).find((l) => l.buildingType === Building.IDS.SHIPYARD);
    const shipLot = Object.values(simulation.lots).find((l) => !!l.shipId);
  
    const crewIsOnShip = !!crew?._location?.shipId;

    // my inventory contents flags
    const crewHasCoreDrill = !!(crewBuildings || []).find((b) => {
      return !!(b.Inventories || []).find((i) => (
        i.status === Inventory.STATUSES.AVAILABLE
        && (i.contents || []).find((c) => c.product === Product.IDS.CORE_DRILL && c.amount > 0)
      ));
    });
    const crewHasAcetylene = !!(crewBuildings || []).find((b) => {
      return !!(b.Inventories || []).find((i) => (
        i.status === Inventory.STATUSES.AVAILABLE
        && (i.contents || []).find((c) => c.product === Product.IDS.ACETYLENE && c.amount > 0)
      ));
    });
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
      const plannedLot = Object.values(simulation.lots).find((l) => l.buildingType === buildingType);

      const x = {};

      // need to plan... select a leased, empty lot
      if (!plannedLot) {
        const onLeasedEmptyLot = selectedLotIsMine && !selectedLot?.building;
        x[COACHMARK_IDS.hudMenuMyAssets] = !onLeasedEmptyLot && !actionDialog?.type && openHudMenu !== 'MY_ASSETS';
        x[COACHMARK_IDS.hudMenuMyAssetsAgreement] = !onLeasedEmptyLot && !actionDialog?.type && openHudMenu === 'MY_ASSETS' ? nextUnusedLotId : false;
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


    console.log({ selectedLotIsMine, selectedLot })


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
          [COACHMARK_IDS.hudRecruitCaptain]: (locationPath === '/') // not in creation flow
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
          // TODO: add sway to the account... note that did it and not to spend it all in one place (or do, it's up to you, it's only a simulation)

          // TODO: deselect lot -> zoom to altitude
        },
        coachmarks: {
          // TODO: get back on track (navigate to AP)

          // open resource map
          [COACHMARK_IDS.hudMenuResources]: !selectedLot && openHudMenu !== 'RESOURCES',
          [COACHMARK_IDS.hudMenuTargetResource]: !selectedLot && openHudMenu === 'RESOURCES' && selectedResourceId !== SIMULATION_CONFIG.resourceId,
          
          // prompt to lease
          [COACHMARK_IDS.actionButtonLease]: selectedLotIsLeasable && !actionDialog?.type,
        },
        enabledActions: {
          FormLotLeaseAgreement: !!selectedLotIsLeasable
        },
        shouldAdvance: () => !!simulation.lots
        // TODO: not updating selected lot here until click away and back
      },
      {
        title: 'Construct your extractor.',
        content: `Do it.`,
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
        title: 'Construct your warehouse.', // TODO: ...
        content: `You'll need somewhere to store your mining output. Construct a warehouse nearby.`,
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
        title: 'Free Samples', // TODO: ...
        content: `Let's find a deposit to mine by core sampling on the lot with our extractor.`,
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        coachmarks: {
          // purchase core samplers from the market to the warehouse
          // (fast forward)
          // "core sample" action button
          // (fast forward)
          // "finish"

          [COACHMARK_IDS.hudMenuMarketplaces]: !crewHasCoreDrill && (locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: !crewHasCoreDrill && Product.IDS.CORE_DRILL, // TODO: max 100

          [COACHMARK_IDS.detailsClose]: crewHasCoreDrill && (locationPath !== '/'),
          [COACHMARK_IDS.hudMenuMyAssets]: crewHasCoreDrill && !actionDialog?.type && selectedLot?.building?.id !== extractorLot?.buildingId && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsBuilding]: crewHasCoreDrill && selectedLot?.building?.id !== extractorLot?.buildingId ? extractorLot?.buildingId : null,
          [COACHMARK_IDS.actionButtonCoreSample]: crewHasCoreDrill && !actionDialog?.type && selectedLot?.building?.id === extractorLot?.buildingId,
          [COACHMARK_IDS.actionDialogTargetResource]: simulationConfig.resourceId
        },
        enabledActions: {
          MarketBuy: !crewHasCoreDrill,
          CoreSample: crewHasCoreDrill && selectedLot?.building?.id !== extractorLot?.buildingId,
          [`SelectTargetResource:${simulationConfig.resourceId}`]: true,
        },
        shouldAdvance: () => {
          return !!(extractorLot?.depositYield > 0);
        }
      },
      {
        title: `Let's mine it.`,
        content: `Let's mine it.`,
        crewmateId: SIMULATION_CONFIG.crewmates.miner,
        coachmarks: {
          [COACHMARK_IDS.actionButtonExtract]: !actionDialog?.type && selectedLot?.building?.id === extractorLot?.buildingId,
        },
        enabledActions: {
          Extract: selectedLot?.building?.id === extractorLot?.buildingId,
        },
        shouldAdvance: () => {
          return !!(extractorLot?.depositYield > extractorLot?.depositYieldRemaining);
        },
      },
      {
        title: `Let's refine it.`,
        content: `Let's refine it. We'll need a refinery first.`,
        crewmateId: SIMULATION_CONFIG.crewmates.engineer,
        coachmarks: () => ({
          ...getConstructBuildingCoachmarks(Building.IDS.REFINERY),

          [COACHMARK_IDS.hudMenuMyAssets]: refineryLot && !actionDialog?.type && selectedLot?.building?.id !== refineryLot?.buildingId && openHudMenu !== 'MY_ASSETS',
          [COACHMARK_IDS.hudMenuMyAssetsBuilding]: refineryLot && selectedLot?.building?.id !== refineryLot?.buildingId ? refineryLot?.buildingId : null,
          [COACHMARK_IDS.actionButtonProcess]: !actionDialog?.type && selectedLot?.building?.id === refineryLot?.buildingId,

          [COACHMARK_IDS.actionDialogTargetProcess]: actionDialog?.type === 'PROCESS' ? simulationConfig.processId : null,
        }),
        enabledActions: {
          PlanBuilding: !!selectedLotIsMine && !refineryLot,
          [`SelectSitePlan:${Building.IDS.REFINERY}`]: true,
          Construct: selectedLotIsMine && !!selectedLot?.building,
          [`Process:${Processor.IDS.REFINERY}`]: selectedLotIsMine && selectedLot?.building?.id === refineryLot?.buildingId,
          [`SelectProcess:${Process.IDS.HUELS_PROCESS}`]: true
        },
        shouldAdvance: () => !!crewHasAcetylene
      },
      {
        title: `Let's make some money!`,
        content: `Let's make some money and sell our refined good.`,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        coachmarks: () => ({
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.ACETYLENE,
        }),
        enabledActions: {
          LimitSell: true
        },
        shouldAdvance: () => crewOrders?.length > 0
      },
      {
        title: 'Get off this rock.',
        content: `Start by building a shipyard.`,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
        title: 'Get off this rock.',
        content: `Assemble a ship. I stocked your warehouse with everything you'll need.`,
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
          [`SelectProcess:${Ship.IDS.LIGHT_TRANSPORT}`]: true
        },
        shouldAdvance: () => {
          return !!Object.values(simulation.lots).find((l) => l.shipId);
        }
      },
      {
        title: 'Stock your ship',
        content: `Your ship has been delivered to your final leased lot. Let's get you stocked for some inter-asteroid travel. First, 5,000 kg of Food.`,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        initialize: () => {
          // TODO: select ship lot
        },
        coachmarks: {
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.FOOD
          // TODO: select/force target of ship's cargo hold
        },
        enabledActions: {
          MarketBuy: true
        },
        shouldAdvance: () => !!crewHasFood
      },
      {
        title: 'Gas Up',
        content: `Now, let's fill that tank with ${formatResourceMass(Inventory.TYPES[Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantInventoryType]?.massConstraint / 1e3, Product.IDS.HYDROGEN_PROPELLANT)} of hydrogen propellant.`,
        crewmateId: SIMULATION_CONFIG.crewmates.merchant,
        coachmarks: {
          [COACHMARK_IDS.hudMenuMarketplaces]: (!locationPath || locationPath === '/'),
          [COACHMARK_IDS.asteroidMarketsHelper]: Product.IDS.HYDROGEN_PROPELLANT,
          // TODO: select/force target of ship's propellant hold
        },
        enabledActions: {
          MarketBuy: true
        },
        shouldAdvance: () => !!crewHasPropellant
      },
      {
        title: 'Get to ze choppa',
        content: `Get to orbit`,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
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
          // TODO: propulsive launch
          // TODO: (flight crew empty on Ship Tab)
        },
        enabledActions: {
          LaunchShip: crewIsOnShip,
          StationCrew: !crewIsOnShip,
        },
        shouldAdvance: () => !crew._location?.lotId
      },
      {
        title: 'Blast off',
        content: `Set course for ${SIMULATION_CONFIG.destinationAsteroidId/* TODO */}`,
        crewmateId: SIMULATION_CONFIG.crewmates.pilot,
        coachmarks: [
          // plan travel
          // prepop target
          // porkchop plot
          // set course
        ],
      },
      {
        title: 'Yay!',
        content: `Thanks for your help ${simulation.crewmate?.name}, but this simulation is over.
          You'll come to back in your habitat, ready to finish your education.`,
        crewmateId: 6891,
        rightButton: {
          children: 'Next',
          onClick: () => {
            // TODO: exit simulation
            // TODO: enter crew creation
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
    isLoading,
    locationPath,
    selectedLot,
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