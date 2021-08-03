import styled from 'styled-components';
import utils from 'influence-utils';
import { IoIosPin } from 'react-icons/io';
import { BiTargetLock } from 'react-icons/bi';

import useStore from '~/hooks/useStore';
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
    color: ${props => props.selected ? props.theme.colors.main : 'inherit'};
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
  const { asteroid } = props;
  const dispatchAsteroidHovered = useStore(state => state.dispatchAsteroidHovered);
  const dispatchAsteroidUnhovered = useStore(state => state.dispatchAsteroidUnhovered);
  const origin = useStore(state => state.asteroids.origin);
  const selectOrigin = useStore(state => state.dispatchOriginSelected);
  const clearOrigin = useStore(state => state.dispatchOriginCleared);
  const routePlannerActive = useStore(state => state.outliner.routePlanner.active);
  const destination = useStore(state => state.asteroids.destination);
  const selectDestination = useStore(state => state.dispatchDestinationSelected);
  const clearDestination = useStore(state => state.dispatchDestinationCleared);

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
