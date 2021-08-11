import styled from 'styled-components';
import utils from 'influence-utils';
import { IoIosPin } from 'react-icons/io';
import { BiTargetLock } from 'react-icons/bi';
import { AiFillEye as WatchIcon } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import useUnWatchAsteroid from '~/hooks/useUnWatchAsteroid';
import IconButton from '~/components/IconButton';
import BonusBadge from '~/components/BonusBadge';
import theme from '~/theme';

const StyledAsteroidItem = styled.li`
  padding-left: 10px;
  transition: all 0.3s ease;
  max-height: 40px;
  overflow: hidden;

  &:hover {
    max-height: 120px;
  }

  &{Description} {
    color: ${p => p.selected ? props.theme.colors.main : 'inherit'};
  }
`;

const Description = styled.span`
  height: 40px;
  line-height: 40px;
`;

const Bonuses = styled.div`
  display: flex;
  height: 40px;
`;

const Controls = styled.div`
  height: 40px;
`;

const RarityBadge = styled.span`
  color: ${props => theme.colors.rarity[props.rarity]};
`;

const AsteroidItem = (props) => {
  const { asteroid, watched } = props;
  const dispatchAsteroidHovered = useStore(s => s.dispatchAsteroidHovered);
  const dispatchAsteroidUnhovered = useStore(s => s.dispatchAsteroidUnhovered);
  const origin = useStore(s => s.asteroids.origin);
  const selectOrigin = useStore(s => s.dispatchOriginSelected);
  const clearOrigin = useStore(s => s.dispatchOriginCleared);
  const routePlannerActive = useStore(s => s.outliner.routePlanner.active);
  const destination = useStore(s => s.asteroids.destination);
  const selectDestination = useStore(s => s.dispatchDestinationSelected);
  const clearDestination = useStore(s => s.dispatchDestinationCleared);
  const unWatchAsteroid = useUnWatchAsteroid();

  return (
    <StyledAsteroidItem
      onMouseOver={() => dispatchAsteroidHovered(asteroid.i)}
      onMouseOut={dispatchAsteroidUnhovered}
      selected={origin === asteroid.i}
      {...props}>
      <Description>
        {asteroid.name}{' - '}
        {utils.toSize(asteroid.r)}{' '}
        {utils.toSpectralType(asteroid.spectralType)}{'-type'}
        {asteroid.scanned && <RarityBadge rarity={utils.toRarity(asteroid.bonuses)}> &#9679;</RarityBadge>}
      </Description>
      <Controls>
        <IconButton
          data-tip={origin === asteroid.i ? 'Deselect Asteroid' : 'Select Asteroid'}
          onClick={() => origin === asteroid.i ? clearOrigin() : selectOrigin(asteroid.i)}
          active={origin === asteroid.i}>
          <IoIosPin />
        </IconButton>
        {routePlannerActive && (
          <IconButton
            data-tip={destination === asteroid.i ? 'Clear Destination' : 'Set as Destination'}
            onClick={() => destination === asteroid.i ? clearDestination() : selectDestination(asteroid.i)}
            active={destination === asteroid.i}>
            <BiTargetLock />
          </IconButton>
        )}
        {watched && (
          <IconButton
            data-tip="Un-watch Asteroid"
            onClick={() => unWatchAsteroid.mutate(asteroid.i)}
            active={true}>
            <WatchIcon />
          </IconButton>
        )}
      </Controls>
      {asteroid.bonuses?.length > 0 && (
        <Bonuses>
          {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
        </Bonuses>
      )}
    </StyledAsteroidItem>
  );
};

export default AsteroidItem;
