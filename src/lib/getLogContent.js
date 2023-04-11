import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { MdBlurOff as ScanIcon } from 'react-icons/md';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';
import styled from 'styled-components';

import AsteroidLink from '~/components/AsteroidLink';
import CrewLink from '~/components/CrewLink';
import AddressLink from '~/components/AddressLink';
import { LinkIcon } from '~/components/Icons';

const SaleLink = styled.a`
  color: ${p => p.theme.colors.main} !important;
  font-weight: bold;
  max-width: 100% !important;
  pointer-events: none;
  text-overflow: initial;
`;
const InnerLink = styled.div`
  &:hover a {
    text-decoration: underline;
  }
`;

const SwayLink = styled.a`
  color: ${p => p.theme.colors.main} !important;
  max-width: 100% !important;
  text-decoration: underline;
`;

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
      <div>
        <div>
          <span>Asteroid </span>
          <AsteroidLink id={e.returnValues.tokenId} />
          <span> transferred from </span>
          <AddressLink address={e.returnValues.from} />
          <span> to </span>
          <AddressLink address={e.returnValues.to} />
        </div>
        {process.env.REACT_APP_AELIN_POOL_URL && (
          <div style={{ marginTop: 10 }}>
            You are now eligible to purchase up to <SwayLink target="_blank" rel="noreferrer" href={process.env.REACT_APP_AELIN_POOL_URL}>25,000,000 SWAY</SwayLink>
          </div>
        )}
      </div>
    ),
    txLink: getTxLink(e.transactionHash)
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
      <div>
        <div>
          <span>Crew member </span>
          <CrewLink id={e.returnValues.tokenId} />
          <span> transferred from </span>
          <AddressLink address={e.returnValues.from} />
          <span> to </span>
          <AddressLink address={e.returnValues.to} />
        </div>
        {process.env.REACT_APP_AELIN_POOL_URL && (
          <div style={{ marginTop: 10 }}>
            You are now eligible to purchase up to <SwayLink target="_blank" rel="noreferrer" href={process.env.REACT_APP_AELIN_POOL_URL}>25,000,000 SWAY</SwayLink>
          </div>
        )}
      </div>
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
      <InnerLink>
        <div>
          The next asteroid development rights sale will start at
          {` ${(new Date(e.start)).toLocaleString()}`}
        </div>
        <div style={{ marginTop: 10 }}>
          <SaleLink><LinkIcon /> Asteroid Sale How-To Guide</SaleLink>
        </div>
      </InnerLink>
    ),
    onClickContent: (e) => {
      if (process.env.REACT_APP_ASTEROID_SALE_GUIDE_URL) {
        e.stopPropagation();
        window.open(process.env.REACT_APP_ASTEROID_SALE_GUIDE_URL, '_blank', 'noopener');
      }
    }
  }),

  Sale_Started: (e) => ({
    content: (
      <InnerLink>
        <div>
          An asteroid development rights sale is now open!
          {e.endTime
            ? ` Asteroid purchases will be available until ${new Date(e.endTime * 1e3).toLocaleString()}`
            : (e.available
                ? ` There ${e.available === 1 ? 'is' : 'are'} ${e.available.toLocaleString()} remaining asteroid${e.available === 1 ? '' : 's'} available.`
                : ''
              )
          }
        </div>
        <div style={{ marginTop: 10 }}>
          <SaleLink><LinkIcon /> Asteroid Sale How-To Guide</SaleLink>
        </div>
      </InnerLink>
    ),
    onClickContent: (e) => {
      if (process.env.REACT_APP_ASTEROID_SALE_GUIDE_URL) {
        e.stopPropagation();
        window.open(process.env.REACT_APP_ASTEROID_SALE_GUIDE_URL, '_blank', 'noopener');
      }
    }
  }),

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
