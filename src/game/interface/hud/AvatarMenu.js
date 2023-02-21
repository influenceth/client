import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled, { css, keyframes } from 'styled-components';
import { MdFastfood as FoodIcon } from 'react-icons/md';

import CrewCard from '~/components/CrewCard';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import { CaptainIcon, CrewIcon, IdleIcon, LocationPinIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import CollapsableSection from './CollapsableSection';

const bgColor = '#000';
const hoverBgColor = '#183541';
const borderColor = '#444';
const cardWidth = 96;
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

const StatusIcon = styled.div`
  align-items: center;
  background: #646464;
  border-radius: 3px;
  color: inherit;
  display: flex;
  font-size: 25px;
  height: 26px;
  justify-content: center;
  margin-left: 8px;
  width: 26px;
`;
const StatusContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  ${p => p.active ? `
    color: ${p.theme.colors.main};
    & ${StatusIcon} {
      background: rgba(${p.theme.colors.mainRGB}, 0.3);
    }
  ` : ''}
`;


const CrewWrapper = styled.div`
  display: flex;
  flex-direction: row;
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
      : ''//'margin-top: -8px;'
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

const CrewInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  & > div {
    margin-left: 12px;
    padding: 8px 0;

    & svg {
      font-size: 24px;
    }
  }
`;

const SwayContainer = styled.div`
  ${CrewInfoContainer} & {
    background: ${bgColor};
    color: white;
    font-size: 20px;
    height: 48px;
    margin-left: 0;
    pointer-events: auto;
    padding: 6px 12px 0;

    clip-path: polygon(
      0 0,
      100% 0,
      100% 24px,
      calc(100% - 12px) 36px,
      12px 36px,
      0 48px
    );

    & + * {
      margin-top: -12px;
    }
  }
`;

const BaseLocation = styled.div`
  color: white;
  font-size: 14.5px;
  span {
    color: #777;
  }
  svg {
    margin-right: 2px;
    vertical-align: middle;
  }
`;
const Personnel = styled.div`
  ${CrewInfoContainer} & {
    border-top: 1px solid ${borderColor};
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 14px 2px 0 6px;
  }
`;

const CrewMemberIcon = styled.div`
  height: 25px;
  width: 7px;
  border-radius: 10px;
  background: #333;
`;
const CrewMemberIcons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 54px;

  ${p => p.crewMembers > 0 
    ? `
      ${CrewMemberIcon}:nth-child(n+1):nth-child(-n+${p.crewMembers}) {
        background: #CCC;
      }
    `
    : ``
  }
`;

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.main};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
  }
`;

const AvatarMenu = (props) => {
  const { account } = useAuth();
  const { captain, crewMemberMap, crew, loading: crewIsLoading } = useCrew();
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
            <label>Skull Squadron</label>
            <StatusContainer>
              Idle
              <StatusIcon>
                <IdleIcon />
              </StatusIcon>
            </StatusContainer>
          </>
        )}>
        <CrewWrapper>
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

          <CrewInfoContainer>
            <SwayContainer noCaptain={!captain}><SwayIcon /> 0</SwayContainer>
            {captain && (
              <>
                <BaseLocation>
                  <LocationPinIcon /> Habitat <span>&gt; Adalia Prime</span>
                </BaseLocation>
                <Personnel>
                  <div>
                    <CrewMemberIcons crewMembers={crew?.crewMembers?.length || 0}>
                      <CrewMemberIcon />
                      <CrewMemberIcon />
                      <CrewMemberIcon />
                      <CrewMemberIcon />
                      <CrewMemberIcon />
                    </CrewMemberIcons>
                  </div>
                  <Food isRationing={false}>
                    {false && <WarningOutlineIcon />}
                    <span>94%</span>
                    <FoodIcon />
                  </Food>
                </Personnel>
              </>
            )}
          </CrewInfoContainer>
        </CrewWrapper>
      </CollapsableSection>
    </Wrapper>
  );
};

export default AvatarMenu;