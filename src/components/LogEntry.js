import styled from 'styled-components';
import { FiExternalLink as LinkIcon } from 'react-icons/fi';

import formatters from '~/lib/formatters';

const getDesc = {
  asteroid: {

    Transfer: (e) => {
      return (
        <>
          <span>Asteroid transferred from </span>
          {formatters.assetOwner(e.returnValues.from)}
          <span> to </span>
          {formatters.assetOwner(e.returnValues.to)}
        </>
      );
    },

    ScanStarted: (e) => <span>Resource scan initiated</span>,

    AsteroidScanned: (e) => <span>Resource scan completed</span>,

    NameChanged: (e) => <span>{`Asteroid re-named to "${e.returnValues.newName}"`}</span>
  }
};

const StyledLogEntry = styled.li`
  color: ${p => p.theme.colors.secondaryText};
  font-size: ${p => p.theme.fontSizes.mainText};
  margin: 10px;

  & a {
    color: ${p => p.theme.colors.mainText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 100px;
    overflow: hidden;
    vertical-align: top;
  }

  & a {
    color: ${p => p.theme.colors.mainText};
  }

  &:before {
    color: ${p => p.theme.colors.main};
    content: '» ';
  }
`;

const IconLink = styled.a`
  margin-left: 5px;
`;

const LogEntry = (props) => {
  const { type, tx } = props;
  const url = `${process.env.REACT_APP_ETHERSCAN_URL}/tx/${tx.transactionHash}`;

  return (
    <StyledLogEntry>
      {getDesc[type][tx.event](tx)}
      <IconLink href={url} rel="noreferrer" target="_blank"><LinkIcon /></IconLink>
    </StyledLogEntry>
  );
};

export default LogEntry;
