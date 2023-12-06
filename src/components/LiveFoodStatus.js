import { useMemo } from 'react';
import styled from 'styled-components';
import { Crew, Time } from '@influenceth/sdk';

import { FoodIcon, WarningOutlineIcon } from '~/components/Icons';
import useChainTime from '~/hooks/useChainTime';
import useConstants from '~/hooks/useConstants';
import { hexToRGB } from '~/theme';

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
  }
  ${p => p.onClick && `
    border-radius: 3px;
    cursor: ${p.theme.cursors.active};
    padding: 3px;
    transition: background 250ms ease;
    &:hover {
      background: rgba(${hexToRGB(p.isRationing ? p.theme.colors.red : p.theme.colors.green)}, 0.15);
    }
  `}
`;

const LiveFoodStatus = ({ crew: optCrew, lastFed: optLastFed, onClick, ...props }) => {
  const chainTime = useChainTime();
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const lastFed = useMemo(() => {
    return optLastFed || optCrew?.Crew?.lastFed || 0;
  }, [optCrew, optLastFed]);

  const percentage = useMemo(() => {
    const lastFedAgo = Time.toGameDuration(chainTime - lastFed, parseInt(TIME_ACCELERATION));
    return lastFedAgo ? Math.round(100 * Crew.getCurrentFoodRatio(lastFedAgo)) : 0;
  }, [chainTime, lastFed]);
  
  return (
    <Food isRationing={percentage < 50} onClick={onClick} {...props}>
      {percentage < 50 && <WarningOutlineIcon />}
      <span>{percentage}%</span>
      <FoodIcon />
    </Food>
  );
}

export default LiveFoodStatus;