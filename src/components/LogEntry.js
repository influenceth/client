import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FiExternalLink as LinkIcon } from 'react-icons/fi';
import { BiTransfer as TransferIcon } from 'react-icons/bi';
import { MdBlurOff as ScanIcon } from 'react-icons/md';
import { AiFillEdit as NameIcon } from 'react-icons/ai';

import AsteroidLink from '~/components/AsteroidLink';
import AddressLink from '~/components/AddressLink';
import formatters from '~/lib/formatters';

const StyledLogEntry = styled.li`
  align-items: center;
  color: ${p => p.theme.colors.secondaryText};
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  margin: 12px 0;

  & a {
    color: ${p => p.theme.colors.secondaryText};
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
  )
};

const LogEntry = (props) => {
  const { type, data } = props;
  return entries[type](data);
};

export default LogEntry;
