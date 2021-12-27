import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { MdBlurOff as ScanIcon } from 'react-icons/md';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';

import AsteroidLink from '~/components/AsteroidLink';
import CrewLink from '~/components/CrewLink';
import AddressLink from '~/components/AddressLink';

const getTxLink = (txHash) => `${process.env.REACT_APP_ETHERSCAN_URL}/tx/${txHash}`;

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
        <AddressLink address={e.returnValues.from} />
        <span> to </span>
        <AddressLink address={e.returnValues.to} />
      </>
    ),
    txLink: getTxLink(e.transactionHash),
  }),

  Asteroid_ScanStarted: (e) => ({
    icon: <ScanIcon />,
    content: (
      <>
        <span>Resource scan initiated on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </>
    ),
    txLink: getTxLink(e.transactionHash),
  }),

  Asteroid_ReadyToFinalizeScan: (e) => ({
    icon: <ScanIcon />,
    content: (
      <>
        <span>Ready to finalize scan on </span>
        <AsteroidLink id={e.i} />
        <span>. Scan *must* be submitted and mined within 256 blocks (~45 min)</span>
      </>
    ),
  }),

  Asteroid_AsteroidScanned: (e) => ({
    icon: <ScanIcon />,
    content: (
      <>
        <span>Resource scan completed on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </>
    ),
    txLink: getTxLink(e.transactionHash),
  }),

  Asteroid_NameChanged: (e) => ({
    icon: <NameIcon />,
    content: (
      <>
        <span>Asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </>
    ),
    txLink: getTxLink(e.transactionHash),
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
    txLink: getTxLink(e.transactionHash),
  }),

  CrewMember_Transfer: (e) => ({
    icon: <TransferIcon />,
    content: (
      <>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.tokenId} />
        <span> transferred from </span>
        <AddressLink address={e.returnValues.from} />
        <span> to </span>
        <AddressLink address={e.returnValues.to} />
      </>
    ),
    txLink: getTxLink(e.transactionHash),
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

  CrewMember_NameChanged: (e) => ({
    icon: <NameIcon />,
    content: (
      <>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.crewId} />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </>
    ),
    txLink: getTxLink(e.transactionHash),
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
        The next asteroid development rights sale will start at
        {` ${(new Date(e.start)).toLocaleString()}`}
      </span>
    ),
  }),

  Sale_Started: (e) => {
    const singular = e.available === 1;
    return {
      content: (
        <span>
          An asteroid development rights sale is now open!
          There {singular ? 'is' : 'are'} {e.available.toLocaleString()} remaining asteroid{singular ? '' : 's'} available.
        </span>
      ),
    }
  },

  Sale_Ended: (e) => ({
    content: (
      <span>
        The asteroid development rights sale has completed.
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
