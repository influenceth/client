import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { Capable, Inventory } from '@influenceth/sdk';

import AddressLink from '~/components/AddressLink';
import AsteroidLink from '~/components/AsteroidLink';
import CrewLink from '~/components/CrewLink';
import PlotLink from '~/components/PlotLink';
import {
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  PlanBuildingIcon,
  PromoteIcon,
  ScanAsteroidIcon,
  SurfaceTransferIcon,
  UnplanBuildingIcon,
} from '~/components/Icons';

const getTxLink = (event) => {
  if (event.__t === 'Ethereum') {
    return `${process.env.REACT_APP_ETHEREUM_EXPLORER_URL}/tx/${event.transactionHash}`;
  }
  return `${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${event.transactionHash}`;
}

// const saleLabels = {
//   Asteroid: 'asteroid development rights',
//   Crewmate: 'crewmate recruitment'
// };

const addressMaxWidth = "100px";

const entries = {
  //
  // Generic
  //

  GenericAlert: (e) => ({
    content: <span>{e.content}</span>
  }),

  GenericLoadingError: (e) => ({
    content: (
      <span>Error loading {e.label || 'data'}. Please refresh and try again.</span>
    ),
  }),

  //
  // App-level
  //

  App_Updated: (e) => ({
    content: (
      <>
        <span>A new version of Influence is now available! </span>
        <span>Click here to update your experience.</span>
      </>
    )
  }),

  Game_GPUPrompt: (e) => ({
    content: (
      <>
        <span>Please consider turning on browser hardware accleration for a better experience.</span>
        <span> Find instructions </span>
        <a href="https://www.computerhope.com/issues/ch002154.htm" rel="noreferrer" target="_blank">
          here
        </a>
      </>
    ),
  }),


  //
  // Events
  //

  Asteroid_Transfer: (e) => ({
    icon: <TransferIcon />,
    content: (
      <>
        <span>Asteroid </span>
        <AsteroidLink id={e.returnValues.tokenId} />
        <span> transferred from </span>
        <AddressLink address={e.returnValues.from} chain={e.__t} maxWidth={addressMaxWidth} />
        <span> to </span>
        <AddressLink address={e.returnValues.to} chain={e.__t} maxWidth={addressMaxWidth} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  // Asteroid_ScanStarted: (e) => ({
  //   icon: <ScanAsteroidIcon />,
  //   content: (
  //     <>
  //       <span>Resource scan initiated on asteroid </span>
  //       <AsteroidLink id={e.returnValues.asteroidId} />
  //     </>
  //   ),
  //   txLink: getTxLink(e),
  // }),

  // Asteroid_ReadyToFinalizeScan: (e) => ({
  //   icon: <ScanAsteroidIcon />,
  //   // TODO: may want to review language here (depending on what expiration is on starknet)
  //   content: (
  //     <>
  //       <span>Ready to finalize scan on </span>
  //       <AsteroidLink id={e.i} />
  //     </>
  //   ),
  // }),

  Asteroid_ScanFinished: (e) => ({
    icon: <ScanAsteroidIcon />,
    content: (
      <>
        <span>Resource scan completed on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Asteroid_NameChanged: (e) => ({
    icon: <NameIcon />,
    content: (
      <>
        <span>Asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId || e.returnValues.tokenId} forceBaseName />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </>
    ),
    txLink: getTxLink(e),
  }),

  // (deprecated, but there may be some old events in log that want to display?)
  // Asteroid_AsteroidUsed: (e) => ({
  //   icon: <CrewIcon />,
  //   content: (
  //     <>
  //       <span>Crew member </span>
  //       <CrewLink id={e.returnValues.crewId} />
  //       <span> minted with </span>
  //       <AsteroidLink id={e.returnValues.asteroidId} />
  //     </>
  //   ),
  //   txLink: getTxLink(e),
  // }),

  Construction_Planned: (e) => ({
    icon: <PlanBuildingIcon />,
    content: (
      <>
        <span>{Capable.TYPES[e.returnValues.capableType]?.name} site plan completed on </span>
        <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.lotId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Construction_Unplanned: (e) => ({
    icon: <UnplanBuildingIcon />,
    content: (
      <>
        <span>Construction plans canceled on </span>
        <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.lotId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  // Construction_Started: (e) => ({
  //   icon: <ConstructIcon />,
  //   content: (
  //     <>
  //       <span>Construction started.</span>
  //     </>
  //   ),
  //   txLink: getTxLink(e),
  // }),

  Construction_Finished: (e) => {
    const asteroidId = e.linked.find((l) => l.type === 'Asteroid')?.asset?.asteroidId;
    const lot = e.linked.find((l) => l.type === 'Lot')?.asset;
    const lotId = lot?.i;
    const capableName = lot?.building?.type;
    return {
      icon: <ConstructIcon />,
      content: (
        <>
          <span>{capableName ? `${capableName} construction` : 'Construction'} finished on </span>
          <PlotLink asteroidId={asteroidId} plotId={lotId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  Construction_Deconstructed: (e) => {
    const asteroidId = e.linked.find((l) => l.type === 'Asteroid')?.asset?.asteroidId;
    const lot = e.linked.find((l) => l.type === 'Lot')?.asset;
    const lotId = lot?.i;
    const capableName = lot?.building?.type;
    return {
      icon: <DeconstructIcon />,
      content: (
        <>
          <span>{capableName ? `${capableName} ` : 'Building'} deconstructed on </span>
          <PlotLink asteroidId={asteroidId} plotId={lotId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  // CoreSample_SamplingStarted: (e) => ({
  //   icon: <CoreSampleIcon />,
  //   content: (
  //     <>
  //       <span>{Inventory.RESOURCES[e.returnValues.resourceId]?.name} core sample started at </span>
  //       <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.lotId} resourceId={e.returnValues.resourceId} />
  //     </>
  //   ),
  //   txLink: getTxLink(e),
  // }),

  // TODO: add data from server that this was an improvement?
  CoreSample_SamplingFinished: (e) => {
    return {
      icon: <CoreSampleIcon />,
      content: (
        <>
          <span>{Inventory.RESOURCES[e.returnValues.resourceId]?.name} core sample completed at </span>
          <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.lotId} resourceId={e.returnValues.resourceId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  Extraction_Started: (e) => {
    const asteroidId = e.linked.find((l) => l.type === 'Asteroid')?.asset?.asteroidId;
    const lotId = e.linked.find((l) => l.type === 'Lot')?.asset?.i;
    return {
      icon: <ExtractionIcon />,
      content: (
        <>
          <span>{Inventory.RESOURCES[e.returnValues.resourceId]?.name} extraction started at </span>
          <PlotLink asteroidId={asteroidId} plotId={lotId} resourceId={e.returnValues.resourceId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  Extraction_Finished: (e) => {
    const asteroidId = e.linked.find((l) => l.type === 'Asteroid')?.asset?.asteroidId;
    const lotId = e.linked.find((l) => l.type === 'Lot')?.asset?.i;
    return {
      icon: <ExtractionIcon />,
      content: (
        <>
          <span>Extraction completed at </span>
          <PlotLink asteroidId={asteroidId} plotId={lotId} resourceId={e.returnValues.resourceId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  Dispatcher_InventoryTransferFinish: (e) => {
    return {
      icon: <SurfaceTransferIcon />,
      content: (
        <>
          <span>Delivery completed to </span>
          <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.destinationLotId} />
        </>
      ),
      txLink: getTxLink(e),
    };
  },

  Crew_CompositionChanged: (e) => {
    let action = null;
    let icon = <CrewIcon />;
    const { newCrew, oldCrew } = e.returnValues;

    if (newCrew[0] === e.i && oldCrew[0] !== e.i) {
      action = `promoted to Captain`;
      icon = <PromoteIcon />;
    }
    else if (oldCrew[0] === e.i && newCrew[0] !== e.i && newCrew.includes(e.i)) {
      action = `relieved of command`;
    }
    else if (newCrew.includes(e.i) && !oldCrew.includes(e.i)) action = `assigned to active duty`;
    else if (!newCrew.includes(e.i) && oldCrew.includes(e.i)) action = `removed from active duty`;
    // (if lateral move in active crew, not worth reporting)

    if (action) {
      return {
        icon,
        content: (
          <>
            <span>Crew member </span>
            <CrewLink id={e.i} />
            <span> {action}.</span>
          </>
        ),
        txLink: getTxLink(e),
      };
    }
  },

  Crewmate_Transfer: (e) => ({
    icon: <TransferIcon />,
    content: (
      <>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.tokenId} />
        <span> transferred from </span>
        <AddressLink address={e.returnValues.from} chain={e.__t} maxWidth={addressMaxWidth} />
        <span> to </span>
        <AddressLink address={e.returnValues.to} chain={e.__t} maxWidth={addressMaxWidth} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Crewmate_NameChanged: (e) => ({
    icon: <NameIcon />,
    content: (
      <>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.crewId || e.returnValues.tokenId} />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </>
    ),
    txLink: getTxLink(e),
  }),

  // Sale_TimeToStart: (e) => ({
  //   content: (
  //     <span>
  //       The next {saleLabels[e.asset]} sale will start at
  //       {` ${(new Date(e.start)).toLocaleString()}`}
  //     </span>
  //   ),
  // }),

  // Sale_Started: (e) => {
  //   const singular = e.available === 1;
  //   return {
  //     content: (
  //       <span>
  //         An {saleLabels[e.asset]} sale is now open!
  //         There {singular ? 'is' : 'are'} {e.available.toLocaleString()} remaining asteroid{singular ? '' : 's'} available.
  //       </span>
  //     ),
  //   }
  // },

  // Sale_Ended: (e) => ({
  //   content: (
  //     <span>
  //       The {saleLabels[e.asset]} sale has completed.
  //     </span>
  //   ),
  // })
};

const getLogContent = ({ type, data }) => {
  try {
    return entries[type](data);
  } catch (e) {
    return null;
  }
};

export default getLogContent;
