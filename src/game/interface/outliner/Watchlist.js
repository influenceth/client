import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { AiFillEye } from 'react-icons/ai';
import { RiFilter2Fill as FilterIcon, RiTableFill } from 'react-icons/ri';
import { FaMapMarkedAlt as ShowOnMapIcon } from 'react-icons/fa';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import useWatchlist from '~/hooks/useWatchlist';
import useUpdateWatchlist from '~/hooks/useUpdateWatchlist';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import AsteroidItem from '~/components/AsteroidItem';
import ColorPicker from '~/components/ColorPicker';
import ListEmptyMessage from '~/components/ListEmptyMessage';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const StyledWatchlist = styled.div`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0;
`;

const Watchlist = (props) => {
  const history = useHistory();
  const { isMobile } = useScreenSize();
  const { watchlist: { data: watchlist }} = useWatchlist();
  const includeWatched = useStore(s => s.asteroids.watched.mapped);
  const filterWatched = useStore(s => s.asteroids.watched.filtered);
  const highlightColor = useStore(s => s.asteroids.watched.highlightColor);
  const showOnMap = useStore(s => s.dispatchWatchedAsteroidsMapped);
  const removeFromMap = useStore(s => s.dispatchWatchedAsteroidsUnmapped);
  const applyFilters = useStore(s => s.dispatchWatchedAsteroidsFiltered);
  const removeFilters = useStore(s => s.dispatchWatchedAsteroidsUnfiltered);
  const changeColor = useStore(s => s.dispatchWatchedAsteroidColorChange);

  // Removes watched asteroids from search set when section is closed
  useEffect(() => {
    return () => removeFromMap()
  }, [ removeFromMap ]);

  return (
    <Section
      name="watchlist"
      title="Watchlist"
      icon={<AiFillEye />}>
      <Controls>
        {!isMobile && (
          <IconButton
            data-tip={includeWatched ? 'Hide on Map' : 'Show on Map'}
            onClick={() => includeWatched ? removeFromMap() : showOnMap()}
            active={includeWatched}>
            <ShowOnMapIcon />
          </IconButton>
        )}
        <IconButton
          data-tip={filterWatched ? 'Remove Filters' : 'Apply Filters'}
          onClick={() => filterWatched ? removeFilters() : applyFilters()}
          active={filterWatched}>
          <FilterIcon />
        </IconButton>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/watchlist')}>
          <RiTableFill />
        </IconButton>
        {includeWatched && <ColorPicker initialColor={highlightColor} onChange={changeColor} />}
      </Controls>
      <StyledWatchlist>
        {(watchlist?.length === 0 || !watchlist) && (
          <ListEmptyMessage><span>No asteroids have been watched yet</span></ListEmptyMessage>
        )}
        {watchlist?.length > 0 && watchlist.map(w => <AsteroidItem key={w.asteroid.i} asteroid={w.asteroid} watched={true} />)}
      </StyledWatchlist>
    </Section>
  );
};

export default Watchlist;
