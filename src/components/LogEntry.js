import styled from 'styled-components';
import { FiExternalLink as LinkIcon } from 'react-icons/fi';
import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { MdBlurOff as ScanIcon } from 'react-icons/md';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';

import AsteroidLink from '~/components/AsteroidLink';
import CrewLink from '~/components/CrewLink';
import AddressLink from '~/components/AddressLink';

const StyledLogEntry = styled.li`
  align-items: center;
  color: ${p => p.theme.colors.mainText};
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  margin: 12px 0;

  & a {
    color: ${p => p.theme.colors.mainText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 100px;
    overflow: hidden;
    vertical-align: top;
    white-space: nowrap;
  }

  & svg {
    color: ${p => p.theme.colors.main};
    flex: 0 0 auto;
    height: 16px;
    margin-right: 8px;
    width: 16px;
  }
`;

const Description = styled.div`
  flex: 1 1 auto;
`;

const IconLink = styled.a`
  flex: 0 0 28px;
  height: 20px;
  margin-left: auto;
  padding-left: 8px;
  width: 20px;

  & svg:hover {
    color: white;
  }
`;

const getTxLink = (txHash) => {
  const url = `${process.env.REACT_APP_ETHERSCAN_URL}/tx/${txHash}`;
  return <IconLink href={url} rel="noreferrer" target="_blank"><LinkIcon /></IconLink>;
};

const entries = {
  Asteroid_Transfer: (e) => {
    return (
      <StyledLogEntry>
        <TransferIcon />
        <Description>
          <span>Asteroid </span>
          <AsteroidLink id={e.returnValues.tokenId} />
          <span> transferred from</span>
          <AddressLink address={e.returnValues.from} />
          <span>to </span>
          <AddressLink address={e.returnValues.to} />
        </Description>
        {getTxLink(e.transactionHash)}
      </StyledLogEntry>
    );
  },

  Asteroid_ScanStarted: (e) => (
    <StyledLogEntry>
      <ScanIcon />
      <Description>
        <span>Resource scan initiated on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </Description>
      {getTxLink(e.transactionHash)}
    </StyledLogEntry>
  ),

  Asteroid_AsteroidScanned: (e) => (
    <StyledLogEntry>
      <ScanIcon />
      <Description>
        <span>Resource scan completed on asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
      </Description>
      {getTxLink(e.transactionHash)}
    </StyledLogEntry>
  ),

  Asteroid_NameChanged: (e) => (
    <StyledLogEntry>
      <NameIcon />
      <Description>
        <span>Asteroid </span>
        <AsteroidLink id={e.returnValues.asteroidId} />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </Description>
      {getTxLink(e.transactionHash)}
    </StyledLogEntry>
  ),

  Asteroid_NamingError: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Error naming asteroid </span>
          <AsteroidLink id={e.i} />
          <span>Please try a different name and ensure no symbols or extra spaces are included.</span>
        </Description>
      </StyledLogEntry>
    );
  },

  Asteroid_ScanningError: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Error starting resource scan on asteroid </span>
          <AsteroidLink id={e.i} />
          <span>Please check your transaction and try again.</span>
        </Description>
      </StyledLogEntry>
    );
  },

  Asteroid_FinalizeScanError: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Error finalizing resource scan for asteroid </span>
          <AsteroidLink id={e.i} />
          <span>Please check your transaction and try again.</span>
        </Description>
      </StyledLogEntry>
    );
  },

  Game_GPUPrompt: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Please consider turning on browser hardware accleration for a better experience.</span>
          <span> Find instructions </span>
          <a href="https://www.computerhope.com/issues/ch002154.htm" rel="noreferrer" target="_blank">
            here
          </a>
        </Description>
      </StyledLogEntry>
    );
  },

  CrewMember_Transfer: (e) => {
    return (
      <StyledLogEntry>
        <TransferIcon />
        <Description>
          <span>Crew member </span>
          <CrewLink id={e.returnValues.tokenId} />
          <span> transferred from</span>
          <AddressLink address={e.returnValues.from} />
          <span>to </span>
          <AddressLink address={e.returnValues.to} />
        </Description>
        {getTxLink(e.transactionHash)}
      </StyledLogEntry>
    );
  },

  Asteroid_AsteroidUsed: (e) => {
    return (
      <StyledLogEntry>
        <CrewIcon />
        <Description>
          <span>Crew member </span>
          <CrewLink id={e.returnValues.crewId} />
          <span> minted with </span>
          <AsteroidLink id={e.returnValues.asteroidId} />
        </Description>
        {getTxLink(e.transactionHash)}
      </StyledLogEntry>
    );
  },

  CrewMember_SettlingError: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Error minting crew member, please check your transaction and try again.</span>
        </Description>
      </StyledLogEntry>
    );
  },

  CrewMember_NamingError: (e) => {
    return (
      <StyledLogEntry>
        <Description>
          <span>Error naming crew member </span>
          <CrewLink id={e.i} />
          <span>. Please try a different name and ensure no symbols or extra spaces are included.</span>
        </Description>
      </StyledLogEntry>
    );
  },

  CrewMember_NameChanged: (e) => (
    <StyledLogEntry>
      <NameIcon />
      <Description>
        <span>Crew member </span>
        <CrewLink id={e.returnValues.crewId} />
        <span>{` re-named to "${e.returnValues.newName}"`}</span>
      </Description>
      {getTxLink(e.transactionHash)}
    </StyledLogEntry>
  ),
};

const LogEntry = (props) => {
  const { type, data } = props;

  try {
    return entries[type](data);
  } catch (e) {
    return <span>Placeholder</span>
  }
};

export default LogEntry;
