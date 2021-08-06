import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { AiFillEye } from 'react-icons/ai';
import { RiFilter2Fill as FilterIcon, RiTableFill } from 'react-icons/ri';
import { FaMapMarkedAlt as ShowOnMapIcon } from 'react-icons/fa';

import useStore from '~/hooks/useStore';
import useWatchlist from '~/hooks/useWatchlist';
import useUpdateWatchlist from '~/hooks/useUpdateWatchlist';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import AsteroidItem from '~/components/AsteroidItem';
import ColorPicker from '~/components/ColorPicker';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const StyledWatchlist = styled.div`
  border-top: 1px solid ${props => props.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0;
`;

const StyledAsteroidItem = styled(AsteroidItem)`
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;

  &:hover {
    background-color: ${props => props.theme.colors.contentHighlight};
    border-top: 1px solid ${props => props.theme.colors.contentBorder};
    border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
  }

  &:first-child {
    border-top: 0;
  }
`;

const Watchlist = (props) => {
  const history = useHistory();
  const { watchlist: { data: watchlist }} = useWatchlist();
  const includeWatched = useStore(state => state.asteroids.watched.mapped);
  const filterWatched = useStore(state => state.asteroids.watched.filtered);
  const highlightColor = useStore(state => state.asteroids.watched.highlightColor);
  const showOnMap = useStore(state => state.dispatchWatchedAsteroidsMapped);
  const removeFromMap = useStore(state => state.dispatchWatchedAsteroidsUnmapped);
  const applyFilters = useStore(state => state.dispatchWatchedAsteroidsFiltered);
  const removeFilters = useStore(state => state.dispatchWatchedAsteroidsUnfiltered);
  const changeColor = useStore(state => state.dispatchWatchedAsteroidColorChange);

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
        <IconButton
          data-tip={includeWatched ? 'Hide on Map' : 'Show on Map'}
          onClick={() => includeWatched ? removeFromMap() : showOnMap()}
          active={includeWatched}>
          <ShowOnMapIcon />
        </IconButton>
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
        {watchlist && watchlist.map(w => (
          <StyledAsteroidItem key={w.asteroid.i} asteroid={w.asteroid} watched={true} />
        ))}
      </StyledWatchlist>
    </Section>
  );
};

export default Watchlist;
