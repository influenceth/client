import { useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { GasIcon, ShipMarkerIcon, TimerIcon, WarningIcon } from '~/components/Icons';
import ClockContext from '~/contexts/ClockContext';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import theme from '~/theme';

import Banner from './Banner';

const Side = styled.div`
  align-items: center;
  color: white;
  display: flex;
  font-size: 90%;
  font-weight: bold;
  width: 72px;

  & > svg {
    color: ${p => p.theme.colors.main};
    font-size: 22px;
    margin-right: 3px;
    vertical-align: bottom;
  }
  &:last-child {
    justify-content: flex-end;
    & > svg {
      margin-right: 0;
      margin-left: 3px;
    }
  }
`;
const Center = styled.div`
  flex: 1;
  text-align: center;
`;

const Content = styled.div`
  align-items: center;
  color: ${p => p.color || 'white'};
  ${p => p.onClick && `cursor: ${p.theme.cursors.active};`}
  display: flex;
  flex-direction: row;
  font-size: 15px;
  width: 100%;
  & > * {
    line-height: 1em;
  }

  ${p => p.color && `
    ${Side} {
      color: ${p.color};
      & > svg {
        color: ${p.color};
      }
    }
  `}
`;

const TravelBanner = ({ visible }) => {
  const { coarseTime } = useContext(ClockContext);
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);

  const { headline, bannerColor } = useMemo(() => {
    let h, c;
    if (travelSolution) {
      if (travelSolution.invalid) {
        h = 'Not Possible';
        c = '#f36d64';
      } else {
        h = 'Flight Time';
      }
    } else {
      h = 'Selected';
      c = theme.colors.main;
    }
    return { headline: h, bannerColor: c };
  }, [travelSolution]);
  
  return (
    <Banner
      headline={<b>{headline}</b>}
      isLoading={undefined}
      isVisible={visible}
      color={bannerColor}
      wide>
      {!travelSolution && (
        <Content color={bannerColor} onClick={() => dispatchHudMenuOpened('BELT_PLAN_FLIGHT')}>
          <Side><GasIcon /></Side>
          <Center>Use Route Planner to calculator viable route between asteroids.</Center>
          <Side />
        </Content>
      )}
      {travelSolution && travelSolution.invalid && (
        <Content color={bannerColor}>
          <Side><GasIcon /> {travelSolution.usedPropellantPercent > 100 ? '' : `${formatFixed(travelSolution.usedPropellantPercent, 1)}%`}</Side>
          <Center>Route is not possible with specified parameters.</Center>
          <Side><WarningIcon /></Side>
        </Content>
      )}
      {travelSolution && !travelSolution.invalid && (
        <Content color={bannerColor}>
          <Side><GasIcon /> {formatFixed(travelSolution.usedPropellantPercent, 1)}%</Side>
          <Center style={{ fontSize: 22 }}>
            <span style={{ display: 'inline-block', marginRight: 12, transform: 'rotate(90deg)' }}>
              <ShipMarkerIcon />
            </span>
            {`${formatFixed(travelSolution.arrivalTime - travelSolution.departureTime, 2)} hours`}
          </Center>
          <Side>
            +{formatFixed(travelSolution.departureTime - coarseTime, 1)}
            <TimerIcon style={{ marginLeft: 3 }} />
          </Side>
        </Content>
      )}
    </Banner>
  );
};

export default TravelBanner;