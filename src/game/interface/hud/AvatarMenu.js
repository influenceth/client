import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

import CollapsibleSection from '~/components/CollapsibleSection';
import CrewmateCardFramed from '~/components/CrewmateCardFramed';
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
import useStore from '~/hooks/useStore';
import LiveReadyStatus from '~/components/LiveReadyStatus';

const menuWidth = 450;

const Wrapper = styled.div`
  pointer-events: none;
  width: ${menuWidth}px;
`;

const IconWrapper = styled.span`
  font-size: 24px;
  line-height: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 222px;
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

  const onSetAction = useStore(s => s.dispatchActionDialog);

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
            <LiveReadyStatus crew={crew} />
          </>
        )}>
        <CrewWrapper>
          <CrewmateCardFramed
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

              <LiveFoodStatus crew={crew} onClick={() => { onSetAction('FEED_CREW'); }} />
            </TitleBar>

            <Crewmates>
              {(crew?._crewmates || []).map((crewmate, i) => {
                if (i === 0) return null;
                return (
                  <CrewmateCardFramed
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