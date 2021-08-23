import styled from 'styled-components';
import utils from 'influence-utils';

import BonusBadge from '~/components/BonusBadge';

const resourceNames = {
  yield: 'Yield',
  volatile: 'Volatiles',
  metal: 'Metals',
  organic: 'Organics',
  rareearth: 'Rare Earth',
  fissile: 'Fissiles'
};

const StyledResourceBonuses = styled.div`
  display: flex;
  flex: 1 1 67%;
  flex-wrap: wrap;
  justify-content: space-around;
  margin-left: 20px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1 1 0;
    margin: 0;
  }
`;

const Bonus = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 32%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 1 1 50%;
    padding: 5px 5px;
  }
`;

const BonusBars = styled.div`
  display: flex;
  flex: 0 0 20px;
  flex-direction: column;
`;

const BonusBar = styled.div`
  background-color: ${props => {
    if (props.shown) return props.theme.colors.bonus[`level${props.level}`];
    if (!props.shown) return props.theme.colors.disabledText;
  }};
  border-radius: 2px;
  height: 1.5vh;
  margin-bottom: 2px;
  width: 1.6vh;
`;

const StyledBonusBadge = styled(BonusBadge)`
  display: flex;
  flex: 0 1 4.5vh;
  margin: 0 8px;
  height: auto;

  & svg {
    height: auto;
    width: auto;
  }
`;

const BonusDesc = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${p => p.theme.fontSizes.detailText};

  & span {
    margin-bottom: 5px;
  }

  & span:last-child {
    font-size: ${p => p.theme.fontSizes.mainText};
  }
`;

const ResourceBonuses = (props) => {
  const { asteroid } = props;

  return (
    <StyledResourceBonuses>
      {utils.BONUS_MAPS.map(b => {
        let bonus = b.base;
        const hasResourceType = b.spectralTypes.includes(asteroid.spectralType);

        if (hasResourceType) {
          const found = asteroid.bonuses.find(f => f.type === b.base.type);
          if (found) bonus = found;
        }

        return (
          <Bonus key={b.base.type}>
            <BonusBars visible={hasResourceType}>
              <BonusBar shown={bonus.level >= 3} level={bonus.level} />
              <BonusBar shown={bonus.level >= 2} level={bonus.level} />
              <BonusBar shown={bonus.level >= 1} level={bonus.level} />
            </BonusBars>
            <StyledBonusBadge visible={hasResourceType} bonus={bonus} />
            <BonusDesc>
              <span>{resourceNames[bonus.type]}</span>
              {hasResourceType && <span>{`+${bonus.modifier}%`}</span>}
              {!hasResourceType && <span>Not present</span>}
            </BonusDesc>
          </Bonus>
        );
      })}
    </StyledResourceBonuses>
  );
};

export default ResourceBonuses;
