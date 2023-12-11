import { useMemo } from 'react';
import styled from 'styled-components';
import { Crew, Time } from '@influenceth/sdk';

import { FoodIcon, WarningOutlineIcon } from '~/components/Icons';
import useChainTime from '~/hooks/useChainTime';
import useConstants from '~/hooks/useConstants';

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
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const lastFed = useMemo(() => {
    return optLastFed || optCrew?.Crew?.lastFed || 0;
  }, [optCrew, optLastFed]);

  const [percentage, isRationing] = useMemo(() => {
    const lastFedAgo = Time.toGameDuration(chainTime - lastFed, parseInt(TIME_ACCELERATION));
    return lastFedAgo
      ? [
        Math.round(100 * Crew.getCurrentFoodRatio(lastFedAgo)),
        (Crew.getFoodMultiplier(lastFedAgo) < 1)
      ]
      : [0, false];
  }, [chainTime, lastFed]);
  
  return (
    <Food isRationing={isRationing} onClick={onClick} {...props}>
      {isRationing && <WarningOutlineIcon />}
      <span>{percentage}%</span>
      <FoodIcon />
    </Food>
  );
}

export default LiveFoodStatus;