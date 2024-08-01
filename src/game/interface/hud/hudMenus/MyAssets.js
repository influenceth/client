import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Entity, Permission, Ship } from '@influenceth/sdk';
import Loader from 'react-spinners/PuffLoader';

import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useWalletAgreements from '~/hooks/useWalletAgreements';
import useWalletAsteroids from '~/hooks/useWalletAsteroids';
import useWalletBuildings from '~/hooks/useWalletBuildings';
import useWalletShips from '~/hooks/useWalletShips';
import { HudMenuCollapsibleSection, Scrollable, majorBorderColor, scrollbarPadding } from './components/components';
import { AgreementBlock, AsteroidBlock, BuildingBlock, ShipBlock } from './components/AssetBlocks';
import { CheckedIcon, RadioCheckedIcon, RadioUncheckedIcon, UncheckedIcon } from '~/components/Icons';
import useSession from '~/hooks/useSession';
import formatters from '~/lib/formatters';
import { locationsArrToObj } from '~/lib/utils';
import EntityName from '~/components/EntityName';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  overflow: visible hidden;
  width: calc(100% + ${scrollbarPadding}px);
`;

const Controls = styled.div`
  border-bottom: 1px solid ${majorBorderColor};
  margin-right: ${scrollbarPadding}px;
`;

const Toggles = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const Toggle = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 92%;
  padding: 8px 8px 0;

  & > svg {
    margin-right: 4px;
  }
  ${p => p.isSelected
    ? `
      & > svg:not(:first-child) {
        display: none;
      }
    `
    : `
      opacity: 0.5;
      & > svg { opacity: 0.3; }
      & > svg:first-child {
        display: none;
      }
    `
  }
`;

const CrewSelectionToggle = styled(Toggle)`
  margin: 10px 0;
  ${p => p.isSelected && `
    & > svg {
      color: ${p.theme.colors.main};
    }
  `}
`;

const Contents = styled.div`
  flex: 1;
  overflow: visible hidden;
  padding-right: ${scrollbarPadding}px;
  width: 100%;
`;

const EmptyMessage = styled.div`
  &:before {
    background: rgba(255, 255, 255, 0.15);
    content: "No matching assets found.";
    display: block;
    font-size: 85%;
    opacity: 0.5;
    padding: 15px 0;
    text-align: center;
  }
`;

const containerHeightBuffer = 30;
const groupTitleHeight = 44 + containerHeightBuffer;

const AsteroidBlocks = ({ asteroids, onSelectCrew, selectedCrew }) => {
  const origin = useStore((s) => s.asteroids.origin);
  const selectAsteroid = useStore((s) => s.dispatchOriginSelected);
  const updateZoomStatus = useStore((s) => s.dispatchZoomStatusChanged);

  const [rendersReady, setRendersReady] = useState(0);

  const onRenderReady = useCallback(() => {
    setRendersReady((r) => r + 1);
  }, []);

  const onClick = useCallback((asteroid) => () => {
    if (origin === asteroid?.id) {
      updateZoomStatus('zooming-in');
    } else {
      selectAsteroid(asteroid.id)
    }

    onSelectCrew(asteroid.Control?.controller?.id);
  }, [onSelectCrew, origin]);

  return asteroids.map((asteroid, i) => (
    <AsteroidBlock
      key={asteroid.id}
      asteroid={asteroid}
      onClick={onClick(asteroid)}
      onRenderReady={onRenderReady}
      selectedCrew={selectedCrew}
      showRender={rendersReady >= i} />
  ));
};

const groupAssets = (assets) => {
  return assets.reduce((acc, asset) => {
    const asteroidId = locationsArrToObj(asset.Location?.locations || [])?.asteroidId || '_';
    if (!acc[asteroidId]) acc[asteroidId] = [];
    acc[asteroidId].push(asset);
    return acc;
  }, {});
};

// TODO (enhancement): virtualize lists
// TODO (enhancement?): collapse all if > some number of total assets

const LoadingMessage = () => (
  <span style={{ marginLeft: 5, opacity: 0.7 }}>
    <Loader color="white" size={20} />
  </span>
);

const GroupedAssets = ({ assetTally, groupedAssets, isLoading, itemHeight, itemGetter, singleGroupMode, title }) => {
  const groupTally = singleGroupMode ? 0 : Object.keys(groupedAssets).length;
  return (
    <HudMenuCollapsibleSection
      titleText={<>{title}{isLoading && <LoadingMessage />}</>}
      titleLabel={`${assetTally} Asset${assetTally === 1 ? '' : 's'}`}
      collapsed={!assetTally}
      containerHeight={itemHeight * assetTally + groupTitleHeight * groupTally + containerHeightBuffer}
      openOnChange={!!assetTally}>
      {!isLoading && assetTally === 0 && <EmptyMessage />}
      {singleGroupMode
        ? Object.values(groupedAssets)[0]?.map(itemGetter)
        : Object.keys(groupedAssets).map((asteroidId) => (
          <HudMenuCollapsibleSection
            key={asteroidId}
            containerHeight={itemHeight * groupedAssets[asteroidId].length + containerHeightBuffer}
            titleProps={{ style: { textTransform: 'none' } }}
            titleText={asteroidId === '_' ? 'In Flight' : <EntityName label={Entity.IDS.ASTEROID} id={asteroidId} />}>
            {groupedAssets[asteroidId].map(itemGetter)}
          </HudMenuCollapsibleSection>
        ))
      }
    </HudMenuCollapsibleSection>
  );
}

const MyAssets = () => {
  const setCoachmarkRef = useCoachmarkRefSetter();
  const { accountAddress } = useSession();
  const { crew, crews, selectCrew } = useCrewContext();
  const { data: walletAgreementsWithDupes, isLoading: agreementsLoading } = useWalletAgreements();
  const { data: walletAsteroids, isLoading: asteroidsLoading } = useWalletAsteroids();
  const { data: walletBuildings, isLoading: buildingsLoading } = useWalletBuildings();
  const { data: walletShips, isLoading: shipsLoading } = useWalletShips();

  const origin = useStore((s) => s.asteroids.origin);
  const coachmarks = useStore(s => s.coachmarks);
  const launcherPage = useStore((s) => s.launcherPage);
  const dispatchLauncherPage = useStore((s) => s.dispatchLauncherPage);

  // default to wide-aperture of assets from launcher menu
  const [allAsteroidsMode, setAllAsteroidsMode] = useState(!!launcherPage || !origin);
  const [autoselectMode, setAutoselectMode] = useState(!!launcherPage);
  const [allCrewsMode, setAllCrewsMode] = useState(!!launcherPage);

  const onClickCrewAsset = useCallback((crewId, fallbackCrewId) => {
    // if in autoselect mode, switch to crewId (IF it is my crew)
    if (autoselectMode) {
      const autoselectCrew = crews.find((c) => c.id === crewId)
        || (fallbackCrewId && crews.find((c) => c.id === fallbackCrewId));
      if (autoselectCrew && autoselectCrew.id !== crew.id) {
        selectCrew(autoselectCrew.id);
      }
    }
    
    // either way, close the launcher page if open
    dispatchLauncherPage();
  }, [autoselectMode, crew, crews]);

  const [agreements, agreementTally] = useMemo(() => {
    const paths = [];
    const deduped = (walletAgreementsWithDupes || []).filter((a) => {
      if (paths.includes(a._agreement._path)) return false;
      paths.push(a._agreement._path);
      return true;
    });

    const ungrouped = deduped
      .filter((a) => {
        const asteroidId = (a.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID)?.id
          || a.Ship?.transitDestination?.id;
        if (allAsteroidsMode || asteroidId === origin) {
          if (allCrewsMode || [a._agreement.permitted?.id, a.Control?.controller?.id].includes(crew?.id) || a._agreement.permitted === accountAddress) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        const aIsPrepaid = a._agreement._type === Permission.POLICY_IDS.PREPAID;
        const bIsPrepaid = b._agreement._type === Permission.POLICY_IDS.PREPAID;
        if (aIsPrepaid && bIsPrepaid) return a._agreement.endTime - b._agreement.endTime;
        if (aIsPrepaid) return -1;
        if (bIsPrepaid) return 1;

        const aName = a.Ship ? formatters.shipName(a) : (a.Building ? formatters.buildingName(a) : formatters.lotName(a));
        const bName = b.Ship ? formatters.shipName(b) : (b.Building ? formatters.buildingName(b) : formatters.lotName(b));
        if (aName === bName) {
          return Permission.TYPES[a.permission]?.name < Permission.TYPES[b.permission]?.name ? -1 : 1;
        }
        return aName < bName ? -1 : 1;
      });
    const groups = groupAssets(ungrouped);
    return [groups, ungrouped.length];
  }, [walletAgreementsWithDupes, allAsteroidsMode, allCrewsMode]);

  const [asteroids, asteroidTally] = useMemo(() => {
    const a = (walletAsteroids || [])
      .filter((a) => {
        if (allAsteroidsMode || a.id === origin) {
          if (allCrewsMode || a.Control?.controller?.id === crew?.id) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        if (a.Name?.name && b.Name?.name) {
          return a.Name?.name < b.Name?.name ? -1 : 1;
        } else if (a.Name?.name) {
          return -1;
        } else if (b.Name?.name) {
          return 1;
        }
        return a.id - b.id;
      });
    return [a, a.length, 1];
  }, [walletAsteroids, allAsteroidsMode, allCrewsMode]);

  const [buildings, buildingTally] = useMemo(() => {
    const ungrouped = (walletBuildings || [])
      .filter((a) => {
        const asteroidId = (a.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID)?.id;
        if (allAsteroidsMode || asteroidId === origin) {
          if (allCrewsMode || a.Control?.controller?.id === crew?.id) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        const aTypeName = Building.TYPES[a.Building.buildingType].name;
        const bTypeName = Building.TYPES[b.Building.buildingType].name;
        if (a.Building.buildingType === b.Building.buildingType) {
          if (a.Name?.name || b.Name?.name) {
            return (a.Name?.name || aTypeName) < (b.Name?.name || bTypeName) ? -1 : 1;
          }
          return a.id - b.id;
        }
        return aTypeName < bTypeName ? -1 : 1
      });
    const groups = groupAssets(ungrouped);
    return [groups, ungrouped.length];
  }, [walletBuildings, allAsteroidsMode, allCrewsMode]);

  const [ships, shipTally] = useMemo(() => {
    const ungrouped = (walletShips || [])
      .filter((a) => {
        const asteroidId = (a.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID)?.id
          || a.Ship.transitDestination?.id;
        if (allAsteroidsMode || asteroidId === origin) {
          if (allCrewsMode || a.Control?.controller?.id === crew?.id) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => {
        const aTypeName = Ship.TYPES[a.Ship.shipType].name;
        const bTypeName = Ship.TYPES[b.Ship.shipType].name;
        if (a.Name?.name || b.Name?.name) {
          return (a.Name?.name || aTypeName) < (b.Name?.name || bTypeName) ? -1 : 1;
        }
        return a.id - b.id;
      });
    const groups = groupAssets(ungrouped);
    return [groups, ungrouped.length];
  }, [walletShips, allAsteroidsMode, allCrewsMode]);

  return (
    <Wrapper>
      <Controls>
        <Toggles>
          <div>
            <Toggle
              onClick={() => setAllCrewsMode(true)}
              isSelected={!!allCrewsMode}>
              <RadioCheckedIcon /><RadioUncheckedIcon /> Across All My Crews
            </Toggle>
            <Toggle
              onClick={() => setAllCrewsMode(false)}
              isSelected={!allCrewsMode}>
              <RadioCheckedIcon /><RadioUncheckedIcon /> Only Selected Crew
            </Toggle>
          </div>
          <div>
            <Toggle
              onClick={() => setAllAsteroidsMode(true)}
              isSelected={!!allAsteroidsMode}>
              <RadioCheckedIcon /><RadioUncheckedIcon /> All Asteroids
            </Toggle>
            <Toggle
              onClick={() => setAllAsteroidsMode(false)}
              isSelected={!allAsteroidsMode}>
              <RadioCheckedIcon /><RadioUncheckedIcon /> Selected Asteroid
            </Toggle>
          </div>
        </Toggles>

        <CrewSelectionToggle
          onClick={() => setAutoselectMode((m) => !m)}
          isSelected={autoselectMode}>
          <CheckedIcon /><UncheckedIcon />
          <span>Activate controlling crew when zooming to asset</span>
        </CrewSelectionToggle>
      </Controls>

      <Contents>
        <Scrollable>
          <HudMenuCollapsibleSection
            titleText={<>Asteroids{asteroidsLoading && <LoadingMessage />}</>}
            titleLabel={`${asteroidTally} Asset${asteroidTally === 1 ? '' : 's'}`}
            collapsed={!asteroidTally}
            containerHeight={85 * asteroidTally + containerHeightBuffer}>
            {!asteroidsLoading && asteroidTally === 0 && <EmptyMessage />}
            <AsteroidBlocks
              asteroids={asteroids}
              onSelectCrew={onClickCrewAsset}
              selectedCrew={crew} />
          </HudMenuCollapsibleSection>

          <GroupedAssets
            title="Ships"
            groupedAssets={ships}
            assetTally={shipTally}
            isLoading={shipsLoading}
            itemGetter={(ship) => {
              const coachmarked = coachmarks[COACHMARK_IDS.hudMenuMyAssetsShip] === ship.id;
              console.log('coachmarked', coachmarked, coachmarks[COACHMARK_IDS.hudMenuMyAssetsShip], ship.id);
              return (
                <ShipBlock
                  key={ship.id}
                  onSelectCrew={onClickCrewAsset}
                  selectedCrew={crew}
                  ship={ship}
                  setRef={coachmarked ? setCoachmarkRef(COACHMARK_IDS.hudMenuMyAssetsShip) : undefined} />
              );
            }}
            itemHeight={85}
            singleGroupMode={!allAsteroidsMode} />

          <GroupedAssets
            title="Buildings"
            groupedAssets={buildings}
            assetTally={buildingTally}
            isLoading={buildingsLoading}
            itemGetter={(building) => {
              const coachmarked = coachmarks[COACHMARK_IDS.hudMenuMyAssetsBuilding] === building.id;
              return (
                <BuildingBlock
                  key={building.id}
                  onSelectCrew={onClickCrewAsset}
                  selectedCrew={crew}
                  building={building}
                  setRef={coachmarked ? setCoachmarkRef(COACHMARK_IDS.hudMenuMyAssetsBuilding) : undefined}
                />
              );
            }}
            itemHeight={55}
            singleGroupMode={!allAsteroidsMode} />

          <GroupedAssets
            title="Agreements"
            groupedAssets={agreements}
            assetTally={agreementTally}
            isLoading={agreementsLoading}
            itemGetter={(agreement) => {
              const coachmarked = coachmarks[COACHMARK_IDS.hudMenuMyAssetsAgreement] === agreement.id;
              return (
                <AgreementBlock
                  key={agreement._agreement._path}
                  agreement={agreement}
                  onSelectCrew={onClickCrewAsset}
                  selectedCrew={crew}
                  setRef={coachmarked ? setCoachmarkRef(COACHMARK_IDS.hudMenuMyAssetsAgreement) : undefined}
                />
              );
            }}
            itemHeight={55}
            singleGroupMode={!allAsteroidsMode} />
          </Scrollable>
      </Contents>
    </Wrapper>
  );
};

export default MyAssets;