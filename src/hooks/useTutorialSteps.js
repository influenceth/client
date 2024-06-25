import { useCallback, useEffect, useMemo } from 'react';
import { FaYoutube as YoutubeIcon } from 'react-icons/fa';
import { Building, Permission, Inventory, Product } from '@influenceth/sdk';

import useCrewAgreements from '~/hooks/useCrewAgreements';
import useCrewBuildings from '~/hooks/useCrewBuildings';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewSamples from '~/hooks/useCrewSamples';
import useStore from '~/hooks/useStore';
import { getBuildingRequirements } from '~/game/interface/hud/actionDialogs/components';
import styled from 'styled-components';

const STEPS = {
  INTRO: 1,
  CREW: 2,
  PARTNER: 3,
  LEASE: 4,
  PLAN: 5,
  SOURCE: 6,
  WAREHOUSE: 7,
  EXTRACTOR: 8,
  CORE_DRILL: 9,
  DEPOSIT: 10,
  FINAL: 11
};

const VideoLink = styled.div`
  align-items: center;
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  margin-top: 10px;
  & > svg {
    font-size: 40px;
    margin-right: 8px;
  }
  &:hover {
    opacity: 0.9;
    & > span {
      text-decoration: underline;
    }
  }
`;

const TutorialVideoLink = ({ link }) => {
  const onClick = useCallback(() => {
    window.open(link, '_blank');
  }, [link]);
  return (
    <VideoLink onClick={onClick}>
      <YoutubeIcon /> <span>Learn More: Watch the Video</span>
    </VideoLink>
  );
};

// TODO: explicit agreement vs. whitelist
const useTutorialSteps = () => {
  const { crew } = useCrewContext();

  const { data: crewAgreements, isLoading: agreementsLoading } = useCrewAgreements(true, false, true);
  const { data: crewBuildings, isLoading: buildingsLoading } = useCrewBuildings();
  const { data: crewDeposits, isLoading: depositsLoading } = useCrewSamples();
  const loading = agreementsLoading || buildingsLoading || depositsLoading;

  const crewTutorial = useStore(s => s.crewTutorials?.[crew?.id]);
  const uncrewTutorial = useStore(s => s.crewTutorials?.[undefined]); // have to do this to preserve pre-crew actions
  const dispatchDismissCrewTutorial = useStore(s => s.dispatchDismissCrewTutorial);
  const dispatchDismissCrewTutorialStep = useStore(s => s.dispatchDismissCrewTutorialStep);

  const dismissedTutorialSteps = useMemo(() => {
    const dismissed = new Set();
    (crewTutorial?.dismissedSteps || []).forEach((s) => dismissed.add(s));
    (uncrewTutorial?.dismissedSteps || []).forEach((s) => dismissed.add(s));
    return Array.from(dismissed);
  }, [crewTutorial?.dismissedSteps, uncrewTutorial?.dismissedSteps]);

  const tutorialSteps = useMemo(() => {
    if (loading) return [];

    const lotLease = crewAgreements?.find((a) => a.permission === Permission.IDS.LOT_USE);

    const controlledWarehouse = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.WAREHOUSE
      && b.Building?.status !== Building.CONSTRUCTION_STATUSES.UNPLANNED
    ));

    const controlledWarehouseSite = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.WAREHOUSE
      && [Building.CONSTRUCTION_STATUSES.PLANNED, Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION].includes(b.Building?.status)
    ));

    const buildableWarehouse = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.WAREHOUSE
      && (
        b.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION
        || (
          b.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED
          && !getBuildingRequirements(b, []).find((req) => req.inNeed > 0)
        )
      )
    ));

    const controlledOperationalWarehouse = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.WAREHOUSE
      && b.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
    ));

    const controlledExtractor = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.EXTRACTOR
      && b.Building?.status !== Building.CONSTRUCTION_STATUSES.UNPLANNED
    ));

    const controlledOperationalExtractor = crewBuildings?.find((b) => (
      b.Building?.buildingType === Building.IDS.EXTRACTOR
      && b.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
    ));

    const controlledNonWarehouse = crewBuildings?.find((b) => (
      b.Building?.buildingType !== Building.IDS.WAREHOUSE
      && [Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION, Building.CONSTRUCTION_STATUSES.OPERATIONAL].includes(b.Building?.status)
    ));

    const ownedCoreDrill = crewBuildings?.find((b) => {
      return !!(b.Inventories || []).find((i) => (
          i.status === Inventory.STATUSES.AVAILABLE
          && (i.contents || []).find((c) => c.product === Product.IDS.CORE_DRILL && c.amount > 0)
        )
      );
    });

    return [
      {
        key: STEPS.INTRO,
        title: 'Lea Cobden-Edwards here!',
        content: (
          <>
            You might recognize me as the last Chief Navigator of the Arvad before we arrived here in Adalia.
            I'm going to be showing you around our new home and helping you to get settled in here.
            <br/><br/>
            Remember: If you find that you need my help again in the future, just re-enable the tutorial again
            in the Settings Menu, and I'll be here.
          </>
        ),
        rightButton: {
          children: "Let's Get Started",
          onClick: () => dispatchDismissCrewTutorialStep(crew?.id, STEPS.INTRO),
        },
        precondition: true,
        postcondition: controlledOperationalWarehouse && controlledOperationalExtractor && (crewDeposits?.length > 0), // (same as FINAL)
        initialize: () => {}
      },
      {
        key: STEPS.CREW,
        title: 'Recruit your crew!',
        content: (
          <>
            First, find a public Habitat on Adalia Prime and click the blinking green Recruit Crewmate button. Guide your crewmate through their backstory and help prepare them for adulthood in Adalia.
            <br/><br/>
            Tip: While all classes have specialized traits, Miners and Engineers are particularly useful on crews starting their first mining operation.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=114" />
          </>
        ),
        precondition: true,
        postcondition: !!crew,
        initialize: () => {}
      },
      {
        key: STEPS.PARTNER, // TODO: dismissal button? i.e. bought basic starter pack
        title: 'How about a partner?',
        content: (
          <>
            You have one crewmate recruited, but cooperation is key to surviving in the belt. The Prime Council
            believes all Adalians benefit when we work together! Recruit a second crewmate.
            <br/><br/>
            Tip: Miners and Engineers make a great duo when you aren't quite ready for a full five-person crew.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=114" />
          </>
        ),
        // crew present, only one crewmate
        precondition: crew,
        postcondition: crew?._crewmates?.length >= 2,// || dismissedTutorialSteps.includes(STEPS.PARTNER),
        initialize: () => {}
      },
      {
        key: STEPS.LEASE, // TODO: dismissal button? i.e. wants to squat
        title: 'Find some land!',
        content: (
          <>
            The next step is to find a lot to lease. Look at the unoccupied lots close to your Habitat, but
            remember, the cost of leasing decreases the further away you go.
            <br/><br/>
            Tip: You'll have to determine how best to balance the cost versus the commute time for your
            crewmates to get to work.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=465" />
          </>
        ),
        // crew present, no lots leased
        precondition: crew,
        postcondition: lotLease,// || dismissedTutorialSteps.includes(STEPS.LEASE),
        initialize: () => {}
      },
      {
        key: STEPS.PLAN,
        title: 'Failing to plan is planning to fail',
        content: (
          <>
            Before you begin mining, you'll need a place to store whatever riches you find beneath the surface.
            And before you begin building, you'll need to plan your first Warehouse on your leased lot.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=496" />
          </>
        ),
        // Leased lots present AND no warehouse building (or site)
        precondition: lotLease,
        postcondition: controlledWarehouse,
        initialize: () => {}
      },
      {
        key: STEPS.SOURCE,
        title: 'We\'re going shopping!',
        content: (
          <>
            Before they can begin assembling the building, your crew will need to gather all of the required
            building materials.
            <br/><br/>
            Tip: Do you have any shrewd Merchants on your crew to assist you in your first foray into the
            Marketplaces of Adalia?
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=522" />
          </>
        ),
        // Unready warehouse site + No completed or completable controlled warehouses
        precondition: controlledWarehouseSite,
        postcondition: (buildableWarehouse || controlledOperationalWarehouse),
        initialize: () => {}
      },
      {
        key: STEPS.WAREHOUSE,
        title: 'Construct your first warehouse',
        content: (
          <>
            Now, it is time for your crew to use those muscles and construct your first Warehouse.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=600" />
          </>
        ),
        // no completed controlled warehouse AND ready-to-build warehouse site present
        precondition: buildableWarehouse,
        postcondition: controlledOperationalWarehouse,
        initialize: () => {}
      },
      {
        key: STEPS.EXTRACTOR,
        title: 'Strike the earth!',
        content: (
          <>
            Now that you have a place to store whatever you will mine, it is time to build your first Extractor.
            Get some more land, plan your extractor site, go shopping, and get building!
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=600" />
          </>
        ),
        // Controlled warehouse and no other buildings
        precondition: controlledOperationalWarehouse,
        postcondition: controlledNonWarehouse,
        initialize: () => {}
      },
      {
        key: STEPS.CORE_DRILL,
        title: 'Reveal the mystery!',
        content: (
          <>
            We're all new to Adalia and no one knows exactly what lies beneath the surface of any asteroid at any
            specific spot. That's why you need to buy some core drills - they can reveal what is there for extracting.
            <TutorialVideoLink link="https://youtu.be/pzvFzEwHlP8?si=BKZMAbkMMSMYFe7a&t=620" />
          </>
        ),
        // Extractor site present and No core drills in warehouse
        precondition: controlledExtractor,
        postcondition: ownedCoreDrill,
        initialize: () => {}
      },
      {
        key: STEPS.DEPOSIT,
        title: 'Almost ready to take on the belt',
        content: (
          <>
            You're almost ready to see the fruits of your hard labor! The Prime Council is so proud of how far
            you've come.
            <br/><br/>
            Now, all you need to do is run a core drill to retrieve a core sample at your Extractor site. Then
            you'll be ready to set your Extractor to mine, watch your resources pile up in your Warehouse, and
            see how you can expand your influence across Adalia!
          </>
        ),
        // Core drill in warehouse + no owned deposits
        precondition: ownedCoreDrill,
        postcondition: (crewDeposits?.length > 0),
        initialize: () => {}
      },
      {
        key: STEPS.FINAL,
        title: 'Additional help is available',
        content: (
          <>
            It seems as though you have your space legs under you now, but if you ever need further help along
            the way, the Prime Council has created many resources for new Adalians to learn: visit our
            {' '}<a href="https://wiki.influenceth.io/en/docs/user-guides" target="_blank" rel="noopener noreferrer">Wiki</a>,
            {' '}<a href="https://www.youtube.com/channel/UCocm9rPd_axPU8LBJ8rvzTw" target="_blank" rel="noopener noreferrer">Youtube</a>
            {' '}or <a href="https://discord.com/invite/influenceth" target="_blank" rel="noopener noreferrer">Discord</a> to learn more!
          </>
        ),
        // warehouse finished, extractor finished, crew deposit finished
        precondition: controlledOperationalWarehouse && controlledOperationalExtractor && (crewDeposits?.length > 0),
        rightButton: {
          children: "Dismiss",
          onClick: () => dispatchDismissCrewTutorialStep(crew?.id, STEPS.FINAL),
        },
        initialize: () => {}
      }
    ];
  }, [crew, crewDeposits, loading, crewAgreements, crewBuildings]);

  useEffect(() => {
    tutorialSteps.forEach((s) => {
      if (s.postcondition && !dismissedTutorialSteps.includes(s.key)) {
        // if postcondition is true (and not dismissed), then dismiss
        // TODO: if no crew id, will this lead to loop?
        dispatchDismissCrewTutorialStep(crew?.id, s.key);
      }
    });
  }, [crew?.id, dismissedTutorialSteps, tutorialSteps]);

  useEffect(() => {
    if (!loading) {
      if (Object.keys(tutorialSteps).length === dismissedTutorialSteps?.length) {
        dispatchDismissCrewTutorial(crew?.id, true);
      }
    }
  }, [crew?.id, dispatchDismissCrewTutorial, dismissedTutorialSteps, loading])

  return useMemo(() => {
    return tutorialSteps.filter((s) => {
      return s.precondition && !dismissedTutorialSteps.includes((s.key))
    })
  }, [dismissedTutorialSteps, tutorialSteps]);
}

export default useTutorialSteps;
