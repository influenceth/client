import { useMemo } from 'react';
import styled from 'styled-components';
import moment from 'moment';

import { LinkIcon } from '~/components/Icons';
import getLogContent from '~/lib/getLogContent';

const LogEntryItem = styled.li`
  align-items: center;
  color: ${p => p.theme.colors.mainText};
  display: flex;
  font-size: ${p => p.theme.fontSizes[p.isTabular ? 'smallText' : 'mainText']};
  margin: ${p => p.isTabular ? '5px 0' : '12px 0'};

  & > * {
    padding: 0 5px;
    &:first-child,
    &:last-child {
      padding: 0;
    }
  }

  ${p => p.css || ''}
`;

const Icon = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 0 0 16px;
  font-size: 130%;
  margin-left: 5px;
  margin-right: 5px;
`;

const Description = styled.div`
  flex: 1;
  & a {
    color: ${p => p.theme.colors.mainText};
    display: inline-block;
    text-overflow: ellipsis;
    max-width: 100px;
    overflow: hidden;
    vertical-align: top;
    white-space: nowrap;
  }
`;

const timestampWidth = 175;
const Timestamp = styled.div`
  text-align: right;
  white-space: nowrap;
  width: ${timestampWidth}px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const agoWidth = 90;
const Ago = styled.div`
  opacity: 0.6;
  text-align: left;
  white-space: nowrap;
  width: ${agoWidth}px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const TransactionLink = styled.a`
  flex: 0 0 28px;
  font-size: 116%;
  height: 20px;
  margin-left: auto;
  padding-left: 8px;
  text-align: center;
  width: 20px;

  & > svg {
    color: ${p => p.theme.colors.main};
  }

  &:hover {
    & > svg {
      color: white;
    }
  }
`;

const LogEntryHeader = styled(LogEntryItem)`
  color: white;
  font-size: ${p => p.theme.fontSizes[p.isTabular ? 'smallText' : 'mainText']};
  font-weight: bold;
  margin: 2px 0;

  ${p => p.css || ''}
`;
const EventLabel = styled.div`
  flex: 1;
`;
const DetailsLabel = styled.div`
  flex: 0 0 ${timestampWidth + agoWidth}px;
  text-align: center;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;
const LinkLabel = styled.div`
  flex: 0 0 28px;
`;

const LogEntry = ({ data = {}, css = {}, isHeaderRow, isTabular, type }) => {
  const m = useMemo(() => {
    if (isTabular) {
      return moment(new Date(data.timestamp * 1000));
    }
    return null;
  }, [data.timestamp, isTabular]);

  if (isHeaderRow) {
    return (
      <LogEntryHeader isTabular={isTabular} css={css}>
        <EventLabel>Event</EventLabel>
        {isTabular && <DetailsLabel>▾ Timestamp</DetailsLabel>}
        <LinkLabel>Link</LinkLabel>
      </LogEntryHeader>
    );
  }

  const {
    icon,
    content,
    txLink
  } = getLogContent({ type, data }) || {};

  if (content) {
    return (
      <LogEntryItem isTabular={isTabular} css={css}>
        <Icon>
          {icon}
        </Icon>
        <Description>
          {content}
        </Description>
        {isTabular && (
          <>
            <Timestamp>
              {m.format('MMM-DD-YYYY hh:mm:ss A')}
            </Timestamp>
            <Ago>
              {m.fromNow()}
            </Ago>
          </>
        )}
        {txLink && (
          <TransactionLink href={txLink} rel="noreferrer" target="_blank">
            <LinkIcon />
          </TransactionLink>
        )}
      </LogEntryItem>
    );
  }
  return null;
};

export default LogEntry;
