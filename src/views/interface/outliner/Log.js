import { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { AiFillAlert as LogIcon } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useEvents from '~hooks/useEvents';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import LogEntry from '~/components/LogEntry';

const LogList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0;
`;

const EmptyMessage = styled.span`
  height: 40px;
  line-height: 40px;
`;

const Log = () => {
  const { events } = useEvents();
  const alerts = useStore(s => s.logs.alerts);
  const [ combined, setCombined ] = useState([]);

  useEffect(() => {
    const newCombined = events.concat(alerts);
    newCombined.sort((a, b) => b.timestamp - a.timestamp);
    setCombined(newCombined);
  }, [ events, alerts ]);

  return (
    <Section
      name="log"
      title="Captain's Log"
      icon={<LogIcon />}>
      <LogList>
        {combined?.length === 0 && (
          <EmptyMessage>No log events recorded.</EmptyMessage>
        )}
        {combined && combined.map(e => {
          const type = e.type || `${e.assetType}_${e.event}`;
          return <LogEntry key={`${type}.${e.timestamp}`} type={type} data={e} />;
        })}
      </LogList>
    </Section>
  );
};

export default Log;
