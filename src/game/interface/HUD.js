import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Construction } from '@influenceth/sdk';

import { BackIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import ActionDialog from './hud/ActionDialog';
import PlotInventory from './hud/PlotInventory';
import ResourceMapSelector from './hud/ResourceMapSelector';
import ActionItems from './hud/ActionItems';
import AvatarMenu from './hud/AvatarMenu';
import InfoPane from './hud/InfoPane';
import ResourceMapToggle from './hud/ResourceMapToggle';
import useActionButtons from './hud/useActionButtons';

const bottomMargin = 90;
const rightModuleWidth = 375;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: ${bottomMargin}px;
  z-index: 2;

  & > * {
    margin-bottom: 12px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const LeftWrapper = styled(Wrapper)`
  left: 0;
  height: calc(100% - ${bottomMargin}px);
  top: 0;
`;

const RightWrapper = styled(Wrapper)`
  right: -23px;
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

const ActionModuleContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  transform: translateY(${p => p.lower ? `52px` : 0});
  transition: transform 350ms ease;
  width: ${rightModuleWidth}px;
`;

const ActionModule = styled.div`
  border-right: 3px solid ${p => p.theme.colors.main};
  bottom: 0;
  opacity: ${p => p.visible ? 1 : 0};
  padding-right: 32px;
  position: absolute;
  right: 0;
  transition: opacity 350ms ease, transform 350ms ease;
  transform: translateX(${p => p.visible ? 0 : `${rightModuleWidth + 5}px`});
  width: 100%;
`;

const ActionButtonContainer = styled(ActionModule)`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding-bottom: 8px;
  padding-top: 8px;
  position: static;
  width: 100%;
`;

const useActionModuleVisibility = () => {
  const mapResourceId = useStore(s => s.asteroids.mapResourceId);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot) || {};
  const { data: plot } = usePlot(asteroidId, zoomToPlot ? plotId : null);

  return {
    resourceMapSelector: zoomStatus === 'in' && !zoomToPlot && !!mapResourceId,
    plotInventory: zoomStatus === 'in' && zoomToPlot && plot?.building?.capableType === 1 && plot?.building?.construction?.status === Construction.STATUS_OPERATIONAL
  };
}

const ActionModules = () => {
  const visibleModules = useActionModuleVisibility();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      <ActionModule visible={visibleModules.resourceMapSelector}>
        <ResourceMapSelector
          active={visibleModules.resourceMapSelector}
          asteroid={asteroid} />
      </ActionModule>
      <ActionModule visible={visibleModules.plotInventory}>
        <PlotInventory active={visibleModules.plotInventory} asteroid={asteroid} />
      </ActionModule>
    </>
  );
};

const HUD = () => {
  const { plotId } = useStore(s => s.asteroids.plot) || {};
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);

  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const { actions, props: actionProps } = useActionButtons();
  const actionModuleVisible = useActionModuleVisibility();
  const anyActionModulesVisible = useMemo(() => Object.values(actionModuleVisible).find((v) => !!v), [actionModuleVisible]);

  const { backLabel, onClickBack } = useMemo(() => {
    if (zoomToPlot) {
      return {
        backLabel: 'Back to Asteroid',
        onClickBack: () => dispatchZoomToPlot()
      }
    }
    if (plotId) {
      return {
        backLabel: 'Deselect Lot',
        onClickBack: () => dispatchPlotSelected()
      }
    }
    return {
      backLabel: 'Back to Belt',
      onClickBack: () => updateZoomStatus('zooming-out')
    }
  }, [plotId, zoomToPlot]);

  useEffect(() => ReactTooltip.rebuild(), [actions]);

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
        <ActionModuleContainer lower={!actions?.length}>
          <ActionModules />
        </ActionModuleContainer>

        <Rule visible={anyActionModulesVisible && actions?.length > 0} />

        <ActionButtonContainer visible={actions?.length > 0}>
          {actions.map((ActionButton, i) => (
            <ActionButton key={i} {...actionProps} />
          ))}
        </ActionButtonContainer>
      </RightWrapper>

      <ActionDialog />
    </>
  );
}

export default HUD;