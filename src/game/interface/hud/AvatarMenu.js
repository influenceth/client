import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

import CollapsibleSection from '~/components/CollapsibleSection';
import CrewCardFramed from '~/components/CrewCardFramed';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import { BusyIcon, CloseIcon, CrewIcon, CrewLocationIcon, IdleIcon, WarningOutlineIcon } from '~/components/Icons';
import LiveTimer from '~/components/LiveTimer';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import useInterval from '~/hooks/useInterval';
import formatters from '~/lib/formatters';
import theme from '~/theme';

const menuWidth = 450;

const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

const Wrapper = styled.div`
  pointer-events: none;
  width: ${menuWidth}px;
`;

const IconWrapper = styled.span`
  font-size: 24px;
  line-height: 0;
`;

const TimerWrapper = styled.span.attrs((p) => {
  let width = 0;
  if (p.len === 7) width = 66;
  if (p.len === 6) width = 61;
  if (p.len === 5) width = 56;
  if (p.len === 4) width = 51;
  if (p.len === 3) width = 46;
  if (p.len === 2) width = 41;
  return width ? { style: { width: `${width}px` } } : {};
})`
  display: inline-block;
  padding-left: 5px;
  text-align: right;
  white-space: nowrap;
`;

const StatusContainer = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 16px;
  justify-content: flex-end;
  & > label {
    color: #BBB;
    font-size: 16px;
    text-transform: uppercase;
  }
  & > ${IconWrapper} {
    align-items: center;
    background: rgba(90, 90, 90, 0.75);
    border-radius: 3px;
    display: flex;
    height: 24px;
    justify-content: center;
    margin-left: 8px;
    margin-right: 6px;
    width: 24px;
  }
`;
const BusyStatusContainer = styled(StatusContainer)`
  & > label {
    color: ${p => p.theme.colors.main};
  }
  & > ${IconWrapper} {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
    color: ${p => p.theme.colors.main};
    & > svg {
      animation: ${opacityKeyframes} 2000ms infinite;
      font-size: 17px;
    }
  }
`;

const CrewWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const CrewInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  & > div {
    margin-left: 12px;

    & > svg {
      font-size: 24px;
    }
  }
`;

const TitleBar = styled.div`
  ${CrewInfoContainer} & {
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 20px;
    height: 48px;
    justify-content: space-between;
    margin-left: 0;
    pointer-events: auto;
    padding: 0 12px 12px;

    clip-path: polygon(
      0 0,
      100% 0,
      100% 24px,
      calc(100% - 12px) 36px,
      12px 36px,
      0 48px
    );

    & svg {
      font-size: 18px;
    }
  }
`;

const BaseLocation = styled.div`
  color: white;
  cursor: ${p => p.theme.cursors.active};
  font-size: 14.5px;
  span {
    color: #AAA;
    &:before {
      content: " > ";
    }
  }
  svg {
    color: ${p => p.theme.colors.main};
    margin-right: 2px;
    vertical-align: middle;
  }
`;

const Crewmates = styled.div`
  display: flex;
  flex-direction: row;
  padding-left: 2px;
  margin-top: -4px;
  & > * {
    margin-left: 5px;
    &:first-child {
      margin-left: 0;
    }
  }
`;

const AvatarMenu = () => {
  const { account } = useAuth();
  const { captain, crew, loading: crewIsLoading } = useCrewContext();
  const history = useHistory();

  const hydratedLocation = useHydratedLocation(crew?._location);

  const silhouetteOverlay = useMemo(() => {
    if (!captain) {
      return {
        alwaysOn: ['icon'],
        disableHover: true,
        icon: <WarningOutlineIcon />,
        iconSize: 40,
        rgb: theme.colors.mainRGB,
      };
    }
    return null;
  }, [account, captain]);

  const onClick = useCallback(() => history.push('/crew'), []);

  const [crewIsBusy, setCrewIsBusy] = useState(false);
  useEffect(() => {
    const readyAtMS = (crew?.Crew?.readyAt || 0) * 1e3;
    if (readyAtMS > Date.now()) {
      setCrewIsBusy(true);
      const to = setTimeout(() => {
        setCrewIsBusy(false);
      }, 1000 + (readyAtMS - Date.now()))
      return () => { if (to) { clearTimeout(to) } };
    } else {
      setCrewIsBusy(false);
    }
  }, [crew?.Crew?.readyAt]);

  if (crewIsLoading) return null;
  return (
    <Wrapper>
      <CollapsibleSection
        borderless={!account}
        containerHeight={140}
        title={(
          <>
            <IconWrapper style={{ color: theme.colors.main }}><CrewIcon /></IconWrapper>
            <label>{formatters.crewName(crew)}</label>
            {crewIsBusy && (
              <BusyStatusContainer>
                <label>Busy</label>
                <LiveTimer target={crew.Crew.readyAt} maxPrecision={2}>
                  {(formattedTime) => <TimerWrapper len={formattedTime.length}>{formattedTime}</TimerWrapper>}
                </LiveTimer>
                <IconWrapper><BusyIcon /></IconWrapper>
              </BusyStatusContainer>
            )}
            {!crewIsBusy && (
              <StatusContainer>
                <label>Idle</label> 
                <IconWrapper><IdleIcon /></IconWrapper>
              </StatusContainer>
            )}
          </>
        )}>
        <CrewWrapper>
          <CrewCardFramed
            borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
            crewmate={captain}
            isCaptain
            onClick={onClick}
            silhouetteOverlay={silhouetteOverlay}
            warnIfNotOwnedBy={crew?.Nft?.owner}
            width={96} />

          <CrewInfoContainer>
            <TitleBar>
              <BaseLocation onClick={hydratedLocation.onLink}>
                <CrewLocationLabel hydratedLocation={hydratedLocation} />
              </BaseLocation>

              {/* TODO: potentially link directly to add rations dialog instead */}
              <LiveFoodStatus crew={crew} />
            </TitleBar>

            <Crewmates>
              {(crew?._crewmates || []).map((crewmate, i) => {
                if (i === 0) return null;
                return (
                  <CrewCardFramed
                    key={crewmate.id}
                    borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                    crewmate={crewmate}
                    onClick={onClick}
                    silhouetteOverlay={silhouetteOverlay}
                    warnIfNotOwnedBy={crew?.Nft?.owner}
                    width={65}
                    noArrow />
                );
              })}
            </Crewmates>
          </CrewInfoContainer>
        </CrewWrapper>
      </CollapsibleSection>
    </Wrapper>
  );
};

export default AvatarMenu;