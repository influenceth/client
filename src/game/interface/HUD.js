import { useEffect, useMemo, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Address } from '@influenceth/sdk';
import ReactTooltip from 'react-tooltip';

import IconButton from '~/components/IconButton';
import { BackIcon } from '~/components/Icons';
import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useChainTime from '~/hooks/useChainTime';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrew from '~/hooks/useCrew';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import actionButtons from './hud/actionButtons';
import ActionDialog from './hud/ActionDialog';
import ResourceMapSelector from './hud/ResourceMapSelector';
import ActionItems from './hud/ActionItems';
import AvatarMenu from './hud/AvatarMenu';
import InfoPane from './hud/InfoPane';
import ResourceMapToggle from './hud/ResourceMapToggle';


const rightModuleWidth = 375;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: 100px;
  z-index: 2;
`;

const LeftWrapper = styled(Wrapper)`
  left: 0;
  height: 100%;
  top: 0;
  & > * {
    margin-bottom: 12px;
    &:last-child {
      margin-bottom: 90px;
    }
  }
`;

const LeftActions = styled.div`
  transform: ${p => p.visible ? 'translateX(0)' : 'translateX(-64px)'};
  transition: transform 250ms ease ${p => p.visible ? '750ms' : '0ms'};
  & > * {
    margin-bottom: 12px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const IconHolder = styled.div`
  align-items: center;
  border-left: 3px solid ${p => p.theme.colors.main};
  color: #999;
  display: flex;
  font-size: 22px;
  height: 36px;
  justify-content: center;
  transition: background-color 250ms ease, border-color 250ms ease, color 250ms ease;
  width: 64px;
`;

export const LeftActionButton = styled(IconHolder)`
  border-color: rgba(255,255,255,0.25);
  border-radius: 0 5px 5px 0;
  pointer-events: all;

  ${p => p.active
    ? `
      border-color: ${p.theme.colors.main};
      background-color: rgba(${p.theme.colors.mainRGB}, 0.3);
      color: white;
      cursor: ${p.theme.cursors.default};
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: #333;
        border-color: white;
        color: white;
      }
    `
  }
`;

export const Rule = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.25);
  opacity: ${p => p.visible ? 1 : 0};
  transition: opacity 350ms ease;
  width: 100%;
`;

const RightWrapper = styled(Wrapper)`
  right: -23px;
  & > *:not(:last-child) {
    margin-bottom: 12px;
    width: ${rightModuleWidth}px;
  }
`;

const ActionModule = styled.div`
  border-right: 3px solid ${p => p.theme.colors.main};
  opacity: ${p => p.visible ? 1 : 0};
  padding-right: 32px;
  transition: opacity 350ms ease, transform 350ms ease;
  transform: translate(${p => p.visible ? 0 : `${rightModuleWidth + 5}px`}, ${p => p.lower ? `52px` : 0});
`;

const ActionButtons = styled(ActionModule)`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding-bottom: 8px;
  padding-top: 8px;
  width: 100%;
`;


// TODO: also split this up
const ActionMenu = () => {
  const { account } = useAuth();
  const buildings = useBuildingAssets();
  const chainTime = useChainTime();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { plotId } = useStore(s => s.asteroids.plot || {});
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const showResourceMap = useStore(s => s.asteroids.showResourceMap);
  const setAction = useStore(s => s.dispatchActionDialog);

  const { data: asteroid } = useAsteroid(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, plotId);
  const { data: plot } = usePlot(asteroidId, plotId);
  const { crew } = useCrew();

  const resourceMode = !!showResourceMap;

  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  const actions = useMemo(() => {
    const a = [];
    if (asteroid) {
      if (!asteroid.owner) {
        a.push(actionButtons.PurchaseAsteroid);
      }
      if (!asteroid.scanned) {
        if (account && asteroid.owner && Address.areEqual(account, asteroid.owner)) {
          a.push(actionButtons.ScanAsteroid);
        }
      } else if (plot && crew) {
        if (resourceMode) {
          a.push(actionButtons.NewCoreSample);
          a.push(actionButtons.ImproveCoreSample);
        }

        if (plot.occupier === crew.i) {
          if (constructionStatus === 'OPERATIONAL' && plot.building?.assetId) {
            const buildingAsset = buildings[plot.building.assetId];
            if (buildingAsset.capabilities.includes('extraction')) {
              a.push(actionButtons.Extract);
            }
          } else if (['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus)) {
            a.push(actionButtons.Construct);
          } else if (['READY_TO_PLAN', 'PLANNING'].includes(constructionStatus)) {
            a.push(actionButtons.NewBlueprint);
          }
  
          // TODO: prob should require an inventory with non-zero contents?
          // (OR be the destination of a delivery)
          if (plot?.building?.inventories) {
            a.push(actionButtons.SurfaceTransfer);
          }
  
          if (['PLANNED', 'CANCELING'].includes(constructionStatus)) {
            a.push(actionButtons.CancelBlueprint);
          }
          if (['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
            a.push(actionButtons.Deconstruct);
          } 
        } else if (!plot.occupier || (plot.gracePeriodEnd < chainTime && constructionStatus === 'PLANNED')) {
          a.push(actionButtons.NewBlueprint);
        }
      }
    }

    return a;
  }, [asteroid, constructionStatus, crew, plot, resourceMode]);

  useEffect(() => ReactTooltip.rebuild(), [actions]);
  
  return (
    <>
      <ActionModule visible={zoomStatus === 'in' && !zoomToPlot && resourceMode} lower={!actions?.length}>
        <ResourceMapSelector
          active={zoomStatus === 'in' && !zoomToPlot && resourceMode}
          asteroid={asteroid} />
      </ActionModule>

      <Rule visible={resourceMode && !zoomToPlot && actions?.length} />

      <ActionButtons visible={actions?.length > 0}>
        {actions.map((ActionButton, i) => (
          <ActionButton
            key={i}
            asteroid={asteroid}
            crew={crew}
            plot={plot}
            onSetAction={setAction} />
        ))}
      </ActionButtons>
    </>
  );
};

const HUD = () => {
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const { backLabel, onClickBack } = useMemo(() => {
    if (zoomToPlot) {
      return {
        backLabel: 'Back to Asteroid',
        onClickBack: () => dispatchZoomToPlot()
      }
    }
    return {
      backLabel: 'Back to Belt',
      onClickBack: () => updateZoomStatus('zooming-out')
    }
  }, [zoomToPlot]);

  return (
    <>
      <LeftWrapper>
        <AvatarMenu />

        <ActionItems />

        <LeftActions visible={zoomStatus === 'in'}>
          <ResourceMapToggle />
          <LeftActionButton
            data-arrow-color="transparent"
            data-for="global"
            data-place="right"
            data-tip={backLabel}
            onClick={onClickBack}>
            <BackIcon />
          </LeftActionButton>
        </LeftActions>

        <InfoPane />
      </LeftWrapper>

      <RightWrapper>
        <ActionMenu />
      </RightWrapper>

      <ActionDialog />
    </>
  );
}

export default HUD;