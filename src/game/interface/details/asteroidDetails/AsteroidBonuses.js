import { useState } from '~/lib/react-debug';
import styled from 'styled-components';

import BonusBar from '~/components/BonusBar';
import BonusInfoPane from '~/components/BonusInfoPane';

const Bonuses = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  ${p => !p.fullWidth && `
    & > div {
      width: 48%;
    }
  `}
`;

const BonusItem = styled.div`
  align-items: center;
  display: flex;
  padding: 6px 0;
  color: ${p => p.theme.colors.resources[p.category] || 'white'};
  & > label {
    font-size: 90%;
    font-weight: bold;
    margin-left: 10px;
  }
`;

const bonusLabels = {
  yield: 'Overall',
  fissile: 'Fissile',
  metal: 'Metal',
  organic: 'Organic',
  rareearth: 'Rare-Earth',
  volatile: 'Volatile',
};

const AsteroidBonuses = ({ bonuses, ...props }) => {
  const [infoPaneAnchor, setInfoPaneAnchor] = useState();
  const setInfoPaneRef = (which) => (e) => {
    setInfoPaneAnchor(which ? e.target : null);
  };

  if (!(bonuses?.length > 0)) return null;

  return (
    <>
      <Bonuses {...props}>
        {bonuses.map((bonus) => (
          <BonusItem key={bonus.name}
            category={bonusLabels[bonus.type]}
            onMouseEnter={setInfoPaneRef(true)}
            onMouseLeave={setInfoPaneRef(false)}>
            <BonusBar bonus={bonus.level} />
            <label>{bonusLabels[bonus.type]} Yield: +{bonus.modifier}%</label>
          </BonusItem>
        ))}
      </Bonuses>
      <BonusInfoPane referenceEl={infoPaneAnchor} visible={!!infoPaneAnchor} />
    </>
  );
};

export default AsteroidBonuses;