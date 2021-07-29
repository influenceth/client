import styled from 'styled-components';
import utils from 'influence-utils';

import { useAsteroidsStore } from '~/hooks/useAsteroidsStore';

const StyledAsteroidItem = styled.li`
  height: 50px;
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

  return (
    <StyledAsteroidItem>
      <span>
        {asteroid.name}{' - '}
        {utils.toSize(asteroid.r)}{' '}
        {utils.toSpectralType(asteroid.spectralType)}{'-type'}
        {asteroid.scanned && <RarityBadge rarity={utils.toRarity(asteroid.bonuses)}> &#9679;</RarityBadge>}
      </span>
    </StyledAsteroidItem>
  );
};

export default AsteroidItem;
