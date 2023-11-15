import { useMemo } from 'react';
import styled from 'styled-components';
import { Crew } from '@influenceth/sdk';

import { FoodIcon, WarningOutlineIcon } from '~/components/Icons';
import useChainTime from '~/hooks/useChainTime';

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
  }
`;

const LiveFoodStatus = ({ crew: optCrew, lastFed: optLastFed, onClick, ...props }) => {
  const chainTime = useChainTime();

  const lastFed = useMemo(() => {
    return optLastFed || optCrew?.Crew?.lastFed || 0;
  }, [optCrew, optLastFed]);

  const percentage = useMemo(() => {
    const lastFedAgo = chainTime - lastFed;
    return lastFedAgo ? Math.round(100 * Crew.getCurrentFood(lastFedAgo) / Crew.CREWMATE_FOOD_PER_YEAR) : 0;
  }, [chainTime, lastFed]);
  
  return (
    <Food isRationing={percentage < 25} onClick={onClick} {...props}>
      {percentage < 50 && <WarningOutlineIcon />}
      <span>{percentage}%</span>
      <FoodIcon />
    </Food>
  );
}

export default LiveFoodStatus;