import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { AiFillStar } from 'react-icons/ai';
import { RiFilter2Fill as FilterIcon, RiTableFill } from 'react-icons/ri';
import { FaMapMarkedAlt as ShowOnMapIcon } from 'react-icons/fa';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const AsteroidList = styled.ul`
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
    background-color: rgba(40, 40, 40, 0.5);
    border-top: 1px solid ${props => props.theme.colors.contentBorder};
    border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
  }
`;

const OwnedAsteroids = (props) => {
  const asteroids = useOwnedAsteroids();
  const includeOwned = useStore(state => state.asteroids.owned.mapped);
  const filterOwned = useStore(state => state.asteroids.owned.filtered);
  const dispatchOwnedAsteroidsMapped = useStore(state => state.dispatchOwnedAsteroidsMapped);
  const dispatchOwnedAsteroidsUnmapped = useStore(state => state.dispatchOwnedAsteroidsUnmapped);
  const dispatchOwnedAsteroidsFiltered = useStore(state => state.dispatchOwnedAsteroidsFiltered);
  const dispatchOwnedAsteroidsUnfiltered = useStore(state => state.dispatchOwnedAsteroidsUnfiltered);
  const history = useHistory();

  // Removes owned asteroids from search set when section is closed
  useEffect(() => {
    return () => dispatchOwnedAsteroidsUnmapped()
  }, [ dispatchOwnedAsteroidsUnmapped ]);

  return (
    <Section
      name="ownedAsteroids"
      title="Owned Asteroids"
      icon={<AiFillStar />}>
      <Controls>
        <IconButton
          data-tip={includeOwned ? 'Hide on Map' : 'Show on Map'}
          onClick={() => includeOwned ? dispatchOwnedAsteroidsUnmapped() : dispatchOwnedAsteroidsMapped()}
          active={includeOwned}>
          <ShowOnMapIcon />
        </IconButton>
        <IconButton
          data-tip={filterOwned ? 'Remove Filters' : 'Apply Filters'}
          onClick={() => filterOwned ? dispatchOwnedAsteroidsUnfiltered() : dispatchOwnedAsteroidsFiltered()}
          active={filterOwned}>
          <FilterIcon />
        </IconButton>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/owned-asteroids')}>
          <RiTableFill />
        </IconButton>
      </Controls>
      <AsteroidList>
        {asteroids.data?.length === 0 && <li><span>No owned asteroids</span></li>}
        {asteroids.data?.map(a => <StyledAsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default OwnedAsteroids;
