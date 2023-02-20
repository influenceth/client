import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled, { css, keyframes } from 'styled-components';
import CrewCard from '~/components/CrewCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';

import { CaptainIcon, CollapsedIcon, CrewIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import CollapsableSection from './CollapsableSection';

const bgColor = '#000';
const hoverBgColor = '#183541';
const borderColor = '#888';
const cardWidth = 90;
const tween = '250ms ease';

const silhouetteAnimation = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
`;

const Wrapper = styled.div`
  margin-bottom: 12px;
  pointer-events: none;
  width: 100%;
`;

const StatusContainer = styled.div`

`;

const Avatar = styled.div`
  background: ${bgColor};
  border: solid ${borderColor};
  border-width: 1px 1px 0;
  overflow: hidden;
  padding: 5px 5px 8px;
  pointer-events: auto;
  transition: background ${tween}, border-color ${tween};

  & > div {
    ${p => p.captainless
      ? css`
        animation: ${silhouetteAnimation} 2000ms linear infinite;
        border: 1px solid ${p => p.theme.colors.main};
      `
      : 'margin-top: -8px;'
    }
    transition: opacity ${tween};
  }
`;
const AvatarFlourish = styled.div`
  pointer-events: auto;
  position: relative;
`;
const StyledTriangleTip = styled(TriangleTip)`
  height: 20px;
  width: 100%;
  path { transition: stroke ${tween}; }
  polygon { transition: fill ${tween}; }
`;
const StyledCaptainIcon = styled(CaptainIcon)`
  bottom: 8px;
  font-size: 22px;
  left: 50%;
  margin-left: -33.5px;
  position: absolute;
  ${p => p.captainless && `
    & * {
      fill: rgba(255, 255, 255, 0.25) !important;
    }
  `}
`;

const AvatarWrapper = styled.div`
  cursor: ${p => p.theme.cursors.active};
  margin-left: 5px;
  margin-top: -30px;
  position: relative;
  z-index: 1;
  width: ${cardWidth}px;

  &:hover {
    ${Avatar} {
      background: ${hoverBgColor};
      border-color: ${p => p.theme.colors.main};
      & > div {
        animation: none;
        opacity: 1;
      }
    }
    ${StyledTriangleTip} {
      polygon {
        fill: ${hoverBgColor};
      }
      path {
        stroke: ${p => p.theme.colors.main};
      }
    }
  }
`;

const SwayContainer = styled.div`
  background: ${bgColor};
  color: white;
  font-size: 20px;
  margin-left: 1px;
  pointer-events: auto;
  padding: 6px 12px 6px ${p => 12 + (p.noCaptain ? 0 : cardWidth)}px;
  min-width: ${p => 100 + (p.noCaptain ? 0 : cardWidth)}px;

  clip-path: polygon(
    0 0,
    100% 0,
    calc(100% - 10px) 100%,
    0 100%
  );

  & > svg {
    font-size: 24px;
  }
`;

const AvatarMenu = (props) => {
  const { account } = useAuth();
  const { captain, crewMemberMap, loading: crewIsLoading } = useCrew();
  const history = useHistory();

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const silhouetteOverlay = useMemo(() => {
    // if no account or no crew members, show "+" to start their crew
    if (!account || Object.keys(crewMemberMap || {}).length === 0) {
      return {
        alwaysOn: ['icon'],
        disableHover: true,
        icon: <PlusIcon />,
        iconSize: 45,
        rgb: theme.colors.mainRGB,
      };
    }
    // if account and crew members, but no captain, show "warning sign" and link to move crewmates to crew
    else if (!captain) {
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

  const [tooltip, onClick] = useMemo(() => {
    if (!account) return ['Login', () => dispatchLauncherPage('wallets')];
    else if (!captain) return ['Start Your Crew', () => history.push('/owned-crew')];
    else return [null, () => history.push('/owned-crew')];
  }, [ account, captain ]);

  useEffect(() => ReactTooltip.rebuild(), [tooltip]);

  if (crewIsLoading) return null;
  return (
    <Wrapper>
      <CollapsableSection
        title={(
          <>
            <CrewIcon />
            <label>The Mod Squad</label>
            <StatusContainer>
              Idle
            </StatusContainer>
          </>
        )}>
        <SwayContainer noCaptain={!captain}><SwayIcon /> 0</SwayContainer>
        <AvatarWrapper
          data-tip={tooltip}
          data-for="global"
          data-place="right"
          onClick={onClick}>
          <Avatar captainless={!captain}>
            {captain && (
              <CrewCard
                crew={captain}
                hideHeader
                hideFooter
                hideMask />
            )}
            {!captain && (
              <CrewSilhouetteCard overlay={silhouetteOverlay} />
            )}
          </Avatar>
          <AvatarFlourish>
            <StyledCaptainIcon captainless={!captain} />
            <StyledTriangleTip
              fillColor={bgColor}
              strokeColor={borderColor}
              strokeWidth={2} />
          </AvatarFlourish>
        </AvatarWrapper>
      </CollapsableSection>
    </Wrapper>
  );
};

export default AvatarMenu;