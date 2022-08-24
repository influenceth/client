import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { AiFillStar } from 'react-icons/ai';
import { BiTransfer as TradeIcon } from 'react-icons/bi';
import { RiFilter2Fill as FilterIcon, RiTableFill } from 'react-icons/ri';
import { FaMapMarkedAlt as ShowOnMapIcon } from 'react-icons/fa';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';
import ColorPicker from '~/components/ColorPicker';
import ListEmptyMessage from '~/components/ListEmptyMessage';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const AsteroidList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const OwnedAsteroids = (props) => {
  const history = useHistory();
  const { isMobile } = useScreenSize();
  const { data: asteroids } = useOwnedAsteroids();
  const includeOwned = useStore(s => s.asteroids.owned.mapped);
  const filterOwned = useStore(s => s.asteroids.owned.filtered);
  const highlightColor = useStore(s => s.asteroids.watched.highlightColor);
  const showOnMap = useStore(s => s.dispatchOwnedAsteroidsMapped);
  const removeFromMap = useStore(s => s.dispatchOwnedAsteroidsUnmapped);
  const applyFilters = useStore(s => s.dispatchOwnedAsteroidsFiltered);
  const removeFilters = useStore(s => s.dispatchOwnedAsteroidsUnfiltered);
  const changeColor = useStore(s => s.dispatchOwnedAsteroidColorChange);

  // Removes owned asteroids from search set when section is closed
  useEffect(() => {
    return () => removeFromMap()
  }, [ removeFromMap ]);

  return (
    <Section
      name="ownedAsteroids"
      title="Owned Asteroids"
      icon={<AiFillStar />}>
      <Controls>
        {!isMobile && (
          <IconButton
            data-tip={includeOwned ? 'Hide on Map' : 'Show on Map'}
            onClick={() => includeOwned ? removeFromMap() : showOnMap()}
            active={includeOwned}>
            <ShowOnMapIcon />
          </IconButton>
        )}
        <IconButton
          data-tip={filterOwned ? 'Remove Filters' : 'Apply Filters'}
          onClick={() => filterOwned ? removeFilters() : applyFilters()}
          active={filterOwned}>
          <FilterIcon />
        </IconButton>
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/owned-asteroids')}>
          <RiTableFill />
        </IconButton>
        <IconButton
          data-tip="Trade Asteroids"
          onClick={() => window.open(`${process.env.REACT_APP_ASPECT_URL}/collection/${process.env.REACT_APP_STARKNET_ASTEROID_TOKEN}`)}>
          <TradeIcon />
        </IconButton>
        {includeOwned && <ColorPicker initialColor={highlightColor} onChange={changeColor} />}
      </Controls>
      <AsteroidList>
        {asteroids?.length === 0 && <ListEmptyMessage><span>No owned asteroids</span></ListEmptyMessage>}
        {asteroids?.map(a => <AsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default OwnedAsteroids;
