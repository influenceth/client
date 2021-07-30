import styled from 'styled-components';
import utils from 'influence-utils';
import { IoIosPin } from 'react-icons/io';
import { MdCancel } from 'react-icons/md';

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
  const setHovered = useStore(state => state.setHoveredAsteroid);
  const origin = useStore(state => state.origin);
  const selectOrigin = useStore(state => state.selectOrigin);
  const deselectOrigin = useStore(state => state.deselectOrigin);

  return (
    <StyledAsteroidItem
      onMouseOver={() => setHovered(asteroid.i)}
      onMouseOut={() => setHovered(null)}
      selected={origin?.i === asteroid.i}
      {...props}>
      <Description>
        {asteroid.name}{' - '}
        {utils.toSize(asteroid.r)}{' '}
        {utils.toSpectralType(asteroid.spectralType)}{'-type'}
        {asteroid.scanned && <RarityBadge rarity={utils.toRarity(asteroid.bonuses)}> &#9679;</RarityBadge>}
      </Description>
      {asteroid.bonuses?.length > 0 && (
        <Bonuses>
          {asteroid.bonuses.map(b => <BonusBadge bonus={b} key={b.type} />)}
        </Bonuses>
      )}
      <Controls>
        {origin?.i !== asteroid.i && (
          <IconButton
            data-tip="Select Asteroid"
            onClick={() => selectOrigin(asteroid.i)}>
            <IoIosPin />
          </IconButton>
        )}
        {origin?.i === asteroid.i && (
          <IconButton
            data-tip="Deselect Asteroid"
            onClick={() => deselectOrigin()}>
            <MdCancel />
          </IconButton>
        )}
      </Controls>
    </StyledAsteroidItem>
  );
};

export default AsteroidItem;
