import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { BellIcon, EyeIcon, ListIcon } from '~/components/Icons';
import CollapsibleSection from '~/components/CollapsibleSection';
import useActionItems from '~/hooks/useActionItems';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import { hexToRGB } from '~/theme';
import ActionItem, { ITEM_WIDTH, TRANSITION_TIME } from './ActionItem';
import useStore from '~/hooks/useStore';

export const SECTION_WIDTH = ITEM_WIDTH + 30;

const TitleWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;

const ActionItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  transition: width 0.15s ease;
  user-select: none;
  width: ${ITEM_WIDTH}px;
`;

const filterRowPadding = 9;
const selectionIndicatorHeight = 3;
const selectionIndicatorWidth = 30;
const Filters = styled.div`
  align-items: center;
  border-bottom: 1px solid #444;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  padding: ${filterRowPadding}px 0;
  width: 100%;
  & > a {
    display: inline-block;
    font-size: 18px;
    height: 26px;
    padding: 4px 6px;
  }
`;
const Filter = styled.div`
  cursor: ${p => p.theme.cursors.active};
  font-size: 90%;
  font-weight: bold;
  height: 26px;
  margin-right: 8px;
  padding: 4px 15px;
  position: relative;
  text-transform: uppercase;

  & > svg {
    font-size: 22px;
  }
  & > b {
    color: white;
    margin-right: 2px;
  }

  &:after {
    content: "";
    background: currentColor;
    bottom: -${filterRowPadding + selectionIndicatorHeight}px;
    height: ${selectionIndicatorHeight}px;
    margin-left: 0;
    left: 50%;
    position: absolute;
    width: 0;
    transition: bottom 150ms ease, margin-left 150ms ease 50ms, width 150ms ease 50ms;
  }

  ${p => p.selected ? `` : `&:hover {`}
    &:after {
      bottom: -${filterRowPadding}px;
      margin-left: -${selectionIndicatorWidth / 2}px;
      width: ${selectionIndicatorWidth}px;
    }
  ${p => p.selected ? `` : `}`}
`;
const IconFilter = styled(Filter)`
  align-items: center;
  display: flex;
  flex-direction: row;
  opacity: ${p => p.selected ? 1 : 0.8};
  transition: opacity 150ms ease;
  ${p => p.selected ? `` : `&:hover { opacity: 0.9; }`}
  & > b {
    margin: 0 0 0 6px;
  }

  &:after {
    background: ${p => p.theme.colors.main};
  }
`;
const AllFilter = styled(IconFilter)`
  padding-left: 5px;
  padding-right: 2px;

  &:after {
    // left: ${selectionIndicatorWidth / 2}px;
  }
`;
const HiddenFilter = styled(IconFilter)`
  color: #CCC;
  padding-left: 0;
  padding-right: 0;
`;
const PillFilter = styled(Filter)`
  border-radius: 20px;
  border: 1px solid ${p => p.selected ? 'currentColor' : 'transparent'};
  transition: border-color 150ms ease;
`;
const ReadyFilter = styled(PillFilter)`
  background: rgba(${p => hexToRGB(p.theme.colors.success)}, 0.2);
  color: ${p => p.theme.colors.success};
  ${p => p.selected && `
    &:hover {
      border-color: rgba(${hexToRGB(p.theme.colors.success)}, 0.3);
    }
  `}
`;
const InProgressFilter = styled(PillFilter)`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
  color: ${p => p.theme.colors.brightMain};
  ${p => !p.selected && `
    &:hover {
      border-color: rgba(${hexToRGB(p.theme.colors.brightMain)}, 0.3);
    }
  `}
`;

const OuterWrapper = styled.div`
  flex: 1;
  height: 0;
  pointer-events: none;
  position: relative;
  width: ${SECTION_WIDTH}px;
`;

const ActionItemContainer = styled.div`
  max-height: 275px;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  width: ${ITEM_WIDTH}px;
`;

const ActionItemCategory = styled.div`
  margin-top: 8px;
  &:not(:first-child) {
    margin-top: 10px;
  }
  &:not(:last-child) {
    &:after {
      border-bottom: 1px solid #444;
      content: "";
      display: block;
      padding-bottom: 10px;
      width: 100%;
    }
  }
`;

const UnhideAll = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 14px;
  height: 34px;
  margin-bottom: -8px;
  pointer-events: all;
  & > svg {
    font-size: 22px;
    margin-right: 4px;
  }
  &:hover {
    text-decoration: underline;
  }
`;

const ActionItems = () => {
  const { authenticated } = useSession();
  const { allVisibleItems: allItems } = useActionItems();
  const { captain } = useCrewContext();
  const getActivityConfig = useGetActivityConfig();

  const dispatchUnhideAllActionItems = useStore(s => s.dispatchUnhideAllActionItems);

  const [displayItems, setDisplayItems] = useState();
  useEffect(() => {
    if (displayItems) {
      // TODO: maybe this should show new ones while transitioning out old ones?
      // set to transition state
      setDisplayItems((items) => {
        items.forEach((item) => {
          if (!allItems.find((i) => i.uniqueKey === item.uniqueKey)) {
            item.transitionOut = true;
          }
        });
        return items;
      });

      // after TRANSITION_TIME, update to post-transition
      setTimeout(() => {
        setDisplayItems(allItems);
      }, TRANSITION_TIME);
    } else {
      setDisplayItems(allItems);
    }
  }, [allItems]);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [lastClick, setLastClick] = useState();

  const onClickFilter = useCallback((filter) => (e) => {
    e.stopPropagation();
    setSelectedFilter(filter);
    setLastClick(Date.now());
  }, []);

  const onUnhideAll = useCallback(() => {
    dispatchUnhideAllActionItems();
    setSelectedFilter('all');
    setLastClick(Date.now());
  }, []);

  const tallies = useMemo(() => {
    return (displayItems || []).reduce(
      (acc, cur) => {
        if (!cur.hidden) {
          acc.all++;
          if (['pending', 'failed', 'randomEvent', 'ready'].includes(cur.type)) acc.ready++;
          if (cur.type === 'unready' || cur.type === 'unstarted') acc.progress++;
        } else {
          acc.hidden++;
        }
        return acc;
      },
      {
        all: 0,
        ready: 0,
        progress: 0,
        hidden: 0
      }
    )
  }, [displayItems]);

  const filteredDisplayItems = useMemo(() => {
    let filter;
    if (selectedFilter === 'all') filter = (i) => !i.hidden;
    if (selectedFilter === 'ready') filter = (i) => !i.hidden && ['pending', 'failed', 'randomEvent', 'ready'].includes(i.type);
    if (selectedFilter === 'progress') filter = (i) => !i.hidden && ['unready', 'unstarted'].includes(i.type);
    if (selectedFilter === 'hidden') filter = (i) => i.hidden;

    return (displayItems || []).filter(filter);
  }, [displayItems, selectedFilter]);

  const filteredDisplayCategories = useMemo(() => {
    const categorized = {};
    filteredDisplayItems.forEach((i) => {
      if (!categorized[i.category]) {
        categorized[i.category] = {
          category: i.category,
          items: []
        }
      }
      categorized[i.category].items.push(i);
    })
    return Object.values(categorized);
  }, [filteredDisplayItems])

  if (!captain) return null;
  return (
    <OuterWrapper>
      {authenticated && (
        <CollapsibleSection
          borderless
          collapsibleProps={{ style: { width: SECTION_WIDTH - 32 } }}
          openOnChange={lastClick}
          title={(
            <TitleWrapper>
              <Filters>
                <AllFilter onClick={onClickFilter('all')} selected={selectedFilter === 'all'}><BellIcon /> <b>{(tallies.all || 0).toLocaleString()}</b></AllFilter>
                <ReadyFilter onClick={onClickFilter('ready')} selected={selectedFilter === 'ready'}><b>{(tallies.ready || 0).toLocaleString()}</b> Ready</ReadyFilter>
                <InProgressFilter onClick={onClickFilter('progress')} selected={selectedFilter === 'progress'}><b>{(tallies.progress || 0).toLocaleString()}</b> In Progress</InProgressFilter>
                {tallies.hidden > 0 && <HiddenFilter onClick={onClickFilter('hidden')} selected={selectedFilter === 'hidden'}><EyeIcon /> <b>{(tallies.hidden || 0).toLocaleString()}</b></HiddenFilter>}
                <div style={{ flex: 1 }} />
                <Link to="/listview/actionitems" onClick={(e) => e.stopPropagation()}><ListIcon /></Link>
              </Filters>
            </TitleWrapper>
          )}>
          {selectedFilter === 'hidden' && <UnhideAll onClick={onUnhideAll}><EyeIcon /> Unhide All</UnhideAll>}
          <ActionItemWrapper>
            <ActionItemContainer>
              {filteredDisplayCategories.map(({ category, items }) => (
                <ActionItemCategory key={category}>
                  {items.map((item) => (
                    <ActionItem
                      key={item.uniqueKey}
                      data={item}
                      getActivityConfig={getActivityConfig}
                    />
                  ))}
                </ActionItemCategory>
              ))}
            </ActionItemContainer>
          </ActionItemWrapper>
        </CollapsibleSection>
      )}
    </OuterWrapper>
  );
};

export default ActionItems;