import styled from 'styled-components';
import { AiFillAlert as LogIcon } from 'react-icons/ai';

import useEvents from '~/hooks/useEvents';
import Section from '~/components/Section';
import LogEntry from '~/components/LogEntry';

const LogList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const EmptyMessage = styled.span`
  height: 40px;
  line-height: 40px;
`;

const Log = () => {
  const { events } = useEvents();

  return (
    <Section
      name="log"
      title="Activity Log"
      sticky
      icon={<LogIcon />}>
      <LogList>
        {events?.length === 0 && (
          <EmptyMessage>No log events recorded.</EmptyMessage>
        )}
        {events && events.map(e => {
          const type = e.type || `${e.assetType}_${e.event}`;
          let key = `${type}.${e.timestamp}`;
          if (e.transactionHash) key += `.${e.transactionHash}`;
          if (e.logIndex) key += `.${e.logIndex}`;
          if (e.i) key += `.${e.i}`;
          return <LogEntry key={key} type={type} data={e} />;
        })}
      </LogList>
    </Section>
  );
};

export default Log;
