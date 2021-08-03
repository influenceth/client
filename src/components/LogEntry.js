import styled from 'styled-components';

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

    AsteroidScanned: (e) => <span>Resource scan completed</span>
  }
};

const StyledLogEntry = styled.li`
  display: flex;
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.mainText};
  margin: 10px;

  & div a {
    color: ${props => props.theme.colors.secondaryText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 100px;
    overflow: hidden;
    vertical-align: top;
  }

  & > a {
    color: ${props => props.theme.colors.secondaryText};
  }
`;

const LogEntry = (props) => {
  const { type, tx } = props;
  const url = `${process.env.REACT_APP_ETHERSCAN_URL}/tx/${tx.transactionHash}`;

  return (
    <StyledLogEntry>
      <div>
        {getDesc[type][tx.event](tx)}
      </div>
      <a href={url} rel="noreferrer" target="_blank">View on Etherscan</a>
    </StyledLogEntry>
  );
};

export default LogEntry;
