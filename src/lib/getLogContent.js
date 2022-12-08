import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { MdBlurOff as ScanIcon } from 'react-icons/md';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { Capable } from '@influenceth/sdk';

import AddressLink from '~/components/AddressLink';
import AsteroidLink from '~/components/AsteroidLink';
import CrewLink from '~/components/CrewLink';
import PlotLink from '~/components/PlotLink';
import {
  ConstructIcon,
  CrewIcon,
  PromoteIcon
} from '~/components/Icons';

const getTxLink = (event) => {
  if (event.__t === 'Ethereum') {
    return `${process.env.REACT_APP_ETHEREUM_EXPLORER_URL}/tx/${event.transactionHash}`;
  }
  return `${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${event.transactionHash}`;
}

const saleLabels = {
  Asteroid: 'asteroid development rights',
  Crewmate: 'crewmate recruitment'
};

const addressMaxWidth = "100px";

const entries = {
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

  Asteroid_ScanStarted: (e) => ({
    icon: <ScanIcon />,
    content: (
      <>
        <span>Resource scan initiated on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Asteroid_ReadyToFinalizeScan: (e) => ({
    icon: <ScanIcon />,
    // TODO: may want to review language here (depending on what expiration is on starknet)
    content: (
      <>
        <span>Ready to finalize scan on </span>
        <AsteroidLink id={e.i} />
        <span>. Scan *must* be submitted and mined within 256 blocks (~45 min)</span>
      </>
    ),
  }),

  Asteroid_ScanFinished: (e) => ({
    icon: <ScanIcon />,
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

  Asteroid_BuyingError: (e) => ({
    content: (
      <>
        <span>Error purchasing development rights on asteroid </span>
        <AsteroidLink id={e.i} />
        <span>. Please check your transaction and try again.</span>
      </>
    ),
  }),

  Asteroid_NamingError: (e) => ({
    content: (
      <>
        <span>Error naming asteroid </span>
        <AsteroidLink id={e.i} />
        <span>. Please try a different name and ensure no symbols or extra spaces are included.</span>
      </>
    ),
  }),

  Asteroid_ScanningError: (e) => ({
    content: (
      <>
        <span>Error starting resource scan on asteroid </span>
        <AsteroidLink id={e.i} />
        <span>. Please check your transaction and try again.</span>
      </>
    ),
  }),

  Asteroid_FinalizeScanError: (e) => ({
    content: (
      <>
        <span>Error starting resource scan on asteroid </span>
        <AsteroidLink id={e.i} />
        <span>. Please check your transaction and try again.</span>
      </>
    ),
  }),

  Asteroid_AsteroidUsed: (e) => ({
    icon: <CrewIcon />,
    content: (
      <>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.crewId} />
        <span> minted with </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Construction_Planned: (e) => ({
    icon: <ConstructIcon />,
    // TODO: which building, which lot, link to lot
    content: (
      <>
        <span>{Capable.TYPES[e.returnValues.capableType]?.name} plan completed on </span>
        <PlotLink asteroidId={e.returnValues.asteroidId} plotId={e.returnValues.lotId} />
      </>
    ),
    txLink: getTxLink(e),
  }),

  Construction_Started: (e) => ({
    icon: <ConstructIcon />,
    content: (
      <>
        <span>Construction started. {JSON.stringify(e.returnValues)}</span>
      </>
    ),
    txLink: getTxLink(e),
  }),

  Construction_Finished: (e) => ({
    icon: <ConstructIcon />,
    content: (
      <>
        <span>Construction finished. {JSON.stringify(e.returnValues)}</span>
      </>
    ),
    txLink: getTxLink(e),
  }),

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

  CrewMember_SettlingError: (e) => ({
    content: (
      <span>Error minting crew member, please check your transaction and try again.</span>
    ),
  }),

  CrewMember_NamingError: (e) => ({
    content: (
      <>
        <span>Error naming crew member </span>
        <CrewLink id={e.i} />
        <span>. Please try a different name and ensure no symbols or extra spaces are included.</span>
      </>
    ),
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

  GenericAlert: (e) => ({
    content: <span>{e.content}</span>
  }),

  GenericLoadingError: (e) => ({
    content: (
      <span>Error loading {e.label || 'data'}. Please refresh and try again.</span>
    ),
  }),

  Sale_TimeToStart: (e) => ({
    content: (
      <span>
        The next {saleLabels[e.asset]} sale will start at
        {` ${(new Date(e.start)).toLocaleString()}`}
      </span>
    ),
  }),

  Sale_Started: (e) => {
    const singular = e.available === 1;
    return {
      content: (
        <span>
          An {saleLabels[e.asset]} sale is now open!
          There {singular ? 'is' : 'are'} {e.available.toLocaleString()} remaining asteroid{singular ? '' : 's'} available.
        </span>
      ),
    }
  },

  Sale_Ended: (e) => ({
    content: (
      <span>
        The {saleLabels[e.asset]} sale has completed.
      </span>
    ),
  })
};

const getLogContent = ({ type, data }) => {
  try {
    return entries[type](data);
  } catch (e) {
    return null;
  }
};

export default getLogContent;
