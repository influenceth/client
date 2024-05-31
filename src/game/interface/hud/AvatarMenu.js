import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';

import CollapsibleSection from '~/components/CollapsibleSection';
import CrewmateCardFramed from '~/components/CrewmateCardFramed';
import CrewLocationCompactLabel from '~/components/CrewLocationCompactLabel';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import { WarningOutlineIcon } from '~/components/Icons';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';
import theme from '~/theme';
import useStore from '~/hooks/useStore';
import LiveReadyStatus from '~/components/LiveReadyStatus';
import { SECTION_WIDTH } from './ActionItems';

const menuWidth = SECTION_WIDTH;

const Wrapper = styled.div`
  pointer-events: none;
  width: ${menuWidth}px;
`;

const CrewWrapper = styled.div`
  display: flex;
  flex-direction: row;
`;

const CrewInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const gradientWidth = 18;
const gradientAngle = 135;
const gradientAngleSine = Math.sin(Math.PI * gradientAngle / 180);
const widthOverSine = gradientWidth / gradientAngleSine;
const actionProgressBarAnimation = keyframes`
  0% { background-position: ${widthOverSine}px 0; }
`;
const actionProgressPadding = 4;
const TitleBar = styled.div`
  align-items: center;
  background: ${p => p.showBusy ? `rgba(${p.theme.colors.darkMainRGB}, 0.7)` : `rgba(0, 0, 0, 0.7)`};
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 20px;
  height: 48px;
  justify-content: space-between;
  margin-left: 0;
  padding: 0 5px 12px;
  pointer-events: auto;
  position: relative;

  clip-path: polygon(
    0 0,
    100% 0,
    100% 24px,
    calc(100% - 12px) 36px,
    10px 36px,
    0 48px
  );

  & > div svg {
    font-size: 24px;
  }
  & > div:last-child svg {
    font-size: 18px;
  }

  ${p => p.showBusy && css`
    &:before {
      content: "";
      animation: ${actionProgressBarAnimation} 2.5s linear infinite reverse;
      background: repeating-linear-gradient(
        ${gradientAngle}deg,
        ${p.theme.colors.brightMain} 0,
        ${p.theme.colors.brightMain} 12px,
        transparent 12px,
        transparent ${gradientWidth}px
      );
      background-size: ${widthOverSine}px 100%;
      clip-path: polygon(
        0 0,
        100% 0,
        100% calc(100% - 10px),
        calc(100% - 10px) 100%,
        0 100%
      );
      opacity: 0.09;
      position: absolute;
      top: ${actionProgressPadding}px;
      bottom: ${actionProgressPadding + 12}px;
      left: ${actionProgressPadding}px;
      right: ${actionProgressPadding}px;
    }
  `}
`;

const Crewmates = styled.div`
  display: flex;
  flex-direction: row;
  padding-left: 2px;
  margin-left: 12px;
  margin-top: -4px;
  & > * {
    margin-left: 6px;
    &:first-child {
      margin-left: 0;
    }
  }
`;

const TitleWrapper = styled.div`
  align-items: center;
  display: flex;
  filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.5));
  flex-direction: row;
  justify-content: space-between;
  width: ${menuWidth - 30}px;

  & > * {
    flex: 1 1 ${(menuWidth - 30)/2}px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:first-child {
      padding-right: 10px;
    }
  }
`;

const AvatarMenu = () => {
  const { authenticated } = useSession();
  const { captain, crew, loading: crewIsLoading } = useCrewContext();
  const history = useHistory();

  const onSetAction = useStore(s => s.dispatchActionDialog);
  const asteroidId = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

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
  }, [captain]);

  const onClick = useCallback(() => history.push('/crew'), []);

  if (crewIsLoading) return null;
  return (
    <Wrapper>
      <CollapsibleSection
        borderless={!authenticated}
        containerHeight={140}
        title={(
          <TitleWrapper>
            <div style={{ fontSize: '18px' }}>{formatters.crewName(crew)}</div>

            <CrewLocationCompactLabel
              crew={crew}
              flip
              zoomedToAsteroid={zoomStatus === 'in' && asteroidId} />
          </TitleWrapper>
        )}>
        <CrewWrapper>
          <CrewmateCardFramed
            borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
            crewmate={captain}
            isCaptain
            onClick={onClick}
            silhouetteOverlay={silhouetteOverlay}
            warnIfNotOwnedBy={crew?.Nft?.owner}
            width={98} />

          <CrewInfoContainer>
            <TitleBar showBusy={!crew._ready}>
              <LiveReadyStatus crew={crew} flip style={{ fontSize: '15px' }} />

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
                    width={69}
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