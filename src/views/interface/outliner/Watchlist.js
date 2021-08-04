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

const Controls = styled.div`
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
  const dispatchWatchedAsteroidsMapped = useStore(state => state.dispatchWatchedAsteroidsMapped);
  const dispatchWatchedAsteroidsUnmapped = useStore(state => state.dispatchWatchedAsteroidsUnmapped);
  const dispatchWatchedAsteroidsFiltered = useStore(state => state.dispatchWatchedAsteroidsFiltered);
  const dispatchWatchedAsteroidsUnfiltered = useStore(state => state.dispatchWatchedAsteroidsUnfiltered);

  return (
    <Section
      name="watchlist"
      title="Watchlist"
      icon={<AiFillEye />}>
      <Controls>
        <IconButton
          data-tip={includeWatched ? 'Hide on Map' : 'Show on Map'}
          onClick={() => includeWatched ? dispatchWatchedAsteroidsUnmapped() : dispatchWatchedAsteroidsMapped()}
          active={includeWatched}>
          <ShowOnMapIcon />
        </IconButton>
        <IconButton
          data-tip={filterWatched ? 'Remove Filters' : 'Apply Filters'}
          onClick={() => filterWatched ? dispatchWatchedAsteroidsUnfiltered() : dispatchWatchedAsteroidsFiltered()}
          active={filterWatched}>
          <FilterIcon />
        </IconButton>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/watchlist')}>
          <RiTableFill />
        </IconButton>
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
