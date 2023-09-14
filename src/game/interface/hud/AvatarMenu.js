import { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled, { css, keyframes } from 'styled-components';

import CollapsibleSection from '~/components/CollapsibleSection';
import CrewCardFramed from '~/components/CrewCardFramed';
import { CaptainIcon, CrewIcon, CrewmateIcon, FoodIcon, IdleIcon, LocationIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';
import TriangleTip from '~/components/TriangleTip';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useBuilding from '~/hooks/useBuilding';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import formatters from '~/lib/formatters';
import theme from '~/theme';

const menuWidth = 450;

const Wrapper = styled.div`
  pointer-events: none;
  width: ${menuWidth}px;
`;

const IconWrapper = styled.span`
  font-size: 24px;
  line-height: 0;
`;

const StatusContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  & > ${IconWrapper} {
    margin-left: 4px;
    margin-right: 6px;
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

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
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
  const { captain, crewmateMap, crew, loading: crewIsLoading } = useCrewContext();
  const history = useHistory();

  // TODO: should we combine these into a single location link?
  const onLotLink = useLotLink(crew?._location || {});
  const onShipLink = useShipLink(crew?._location || {});

  const { data: crewAsteroid } = useAsteroid(crew?._location?.asteroidId);
  const { data: crewBuilding } = useBuilding(crew?._location?.buildingId);
  const { data: crewShip } = useShip(crew?._location?.shipId);

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

  const goToCrewLocation = useCallback(() => {
    if (crew?._location?.shipId && !crew?._location?.lotId) onShipLink();
    else onLotLink();
  }, [crew?._location, onLotLink, onShipLink]);

  const onClick = useCallback(() => history.push('/crew'), []);

  if (crewIsLoading) return null;
  return (
    <Wrapper>
      <CollapsibleSection
        borderless={!account}
        title={(
          <>
            <IconWrapper style={{ color: theme.colors.main }}><CrewIcon /></IconWrapper>
            <label>{formatters.crewName(crew)}</label>
            <StatusContainer>
              Idle
              <IconWrapper><IdleIcon /></IconWrapper>
            </StatusContainer>
          </>
        )}>
        <CrewWrapper>
          <CrewCardFramed
            borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
            crewmate={captain}
            isCaptain
            onClick={onClick}
            silhouetteOverlay={silhouetteOverlay}
            width={96} />

          <CrewInfoContainer>
            <TitleBar>
              <BaseLocation onClick={goToCrewLocation}>
                <LocationIcon />{/* TODO: should be different icon */}
                {crewAsteroid && <>{formatters.asteroidName(crewAsteroid)}</>}
                {crewShip && <span>{formatters.shipName(crewShip)}</span>}
                {!crewShip && crewBuilding && <span>{formatters.buildingName(crewBuilding)}</span>}
                {!crewShip && !crewBuilding && crew?._location?.lotId && <span>Lot {crew._location.lotId.toLocaleString()}</span>}
              </BaseLocation>

              {/* TODO: potentially link directly to add rations dialog instead */}
              {/* TODO: implement lastFed or whatever */}
              <Food isRationing={false} onClick={onClick}>
                {false && <WarningOutlineIcon />}
                <span>100%</span>
                <FoodIcon />
              </Food>
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