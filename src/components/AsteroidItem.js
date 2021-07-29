import styled from 'styled-components';
import utils from 'influence-utils';
import { IoIosPin } from 'react-icons/io';

import useAsteroidsStore from '~/hooks/useAsteroidsStore';
import IconButton from '~/components/IconButton';
import theme from '~/theme';

const StyledAsteroidItem = styled.li`
  padding-left: 10px;
  transition: all 0.3s ease;
  max-height: 40px;
  overflow: hidden;

  &:hover {
    max-height: 80px;
  }
`;

const Description = styled.span`
  height: 40px;
  line-height: 40px;
`;

const Controls = styled.div`
  height: 40px;
`;

const RarityBadge = styled.span`
  color: ${props => {
    if (props.rarity === 'Common') return '#bbbbbb';
    if (props.rarity === 'Uncommon') return '#69ebf4';
    if (props.rarity === 'Rare') return '#4f90ff';
    if (props.rarity === 'Superior') return '#884fff';
    if (props.rarity === 'Exceptional') return '#ff984f';
    if (props.rarity === 'Incomparable') return '#ffd94f';
  }}
`;

const AsteroidItem = (props) => {
  const { asteroid } = props;
  const setHovered = useAsteroidsStore(state => state.setHoveredAsteroid);
  const origin = useAsteroidsStore(state => state.origin);
  const selectOrigin = useAsteroidsStore(state => state.selectOrigin);

  return (
    <StyledAsteroidItem
      onMouseOver={() => setHovered(asteroid.i)}
      onMouseOut={() => setHovered(null)}
      {...props}>
      <Description>
        {asteroid.name}{' - '}
        {utils.toSize(asteroid.r)}{' '}
        {utils.toSpectralType(asteroid.spectralType)}{'-type'}
        {asteroid.scanned && <RarityBadge rarity={utils.toRarity(asteroid.bonuses)}> &#9679;</RarityBadge>}
      </Description>
      <Controls>
        <IconButton
          data-tip="Select Asteroid"
          onClick={() => selectOrigin(asteroid.i)}
          disabled={origin?.i === asteroid.i}
          borderless>
          <IoIosPin />
        </IconButton>
      </Controls>
    </StyledAsteroidItem>
  );
};

export default AsteroidItem;
