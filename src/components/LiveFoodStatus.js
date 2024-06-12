import { useMemo } from 'react';
import styled from 'styled-components';
import { Crew, Time } from '@influenceth/sdk';

import { FoodIcon, WarningOutlineIcon } from '~/components/Icons';
import useConstants from '~/hooks/useConstants';
import { hexToRGB } from '~/theme';
import useBlockTime from '~/hooks/useBlockTime';

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: ${p => p.fontSize || '15px'};
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

const LiveFoodStatus = ({ crew, fontSize, onClick, ...props }) => {
  const blockTime = useBlockTime();
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const [percentage, isRationing] = useMemo(() => {
    const lastFedAgo = Time.toGameDuration(blockTime - (crew?.Crew?.lastFed || 0), parseInt(TIME_ACCELERATION) || 1);
    return (blockTime > 0 && typeof lastFedAgo === 'number')
      ? [
        Math.round(100 * Crew.getCurrentFoodRatio(lastFedAgo, crew._foodBonuses?.consumption)),
        (Crew.getFoodMultiplier(lastFedAgo, crew._foodBonuses?.consumption, crew._foodBonuses?.rationing) < 1)
      ]
      : [0, false];
  }, [blockTime, crew]);

  if (!(blockTime > 0)) return null;
  return (
    <Food fontSize={fontSize} isRationing={isRationing} onClick={onClick} {...props}>
      {isRationing && <WarningOutlineIcon />}
      <span>{percentage}%</span>
      <FoodIcon />
    </Food>
  );
}

export default LiveFoodStatus;