import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Construction, Inventory } from '@influenceth/sdk';
import ReactTooltip from 'react-tooltip';

import IconButton from '~/components/IconButton';
import {
  ChatIcon,
  CloseIcon,
  FavoriteIcon,
  InfoIcon,
  InventoryIcon,
  ListIcon,
  MyAssetsIcon,
  ResourceIcon,
  SearchIcon,
} from '~/components/Icons';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import hudMenus from './hudMenus';
import useAuth from '~/hooks/useAuth';
import { useHistory } from 'react-router-dom';

// const background = 'rgba(0, 0, 0, 0.9)';
// export const background = 'rgba(0, 14, 25, 0.9)';
export const background = 'rgba(20, 20, 20, 0.75)';

const cornerWidth = 8;
const bumpHeightHalf = 100;
const buttonsWidth = 66;
const panelAnimationLength = 250;
const panelWidth = 450;

const Wrapper = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  justify-content: center;
  pointer-events: none;
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2;
`;
const Buttons = styled.div`
  background: ${background};
  border-left: 1px solid #444;
  clip-path: polygon(
    0 ${cornerWidth}px,
    ${cornerWidth}px 0,
    100% 0,
    100% 100%,
    ${cornerWidth}px 100%,
    0 calc(100% - ${cornerWidth}px)
  );
  padding: 12px 0;
  pointer-events: all;
  position: absolute;
  z-index: 1;

  ${p => p.open && `
    border-color: transparent;
    background: transparent;
  `}
`;
const Button = styled.div`
  align-items: center;
  border-radius: 8px 0 0 8px;
  border-right: 3px solid transparent;
  color: #AAA;
  display: flex;
  font-size: 28px;
  height: 44px;
  justify-content: center;
  margin: 6px 0;
  padding: 6px 16px;
  transition: background 250ms ease, border-color 250ms ease, color 250ms ease, opacity 250ms ease;
  width: ${buttonsWidth}px;

  ${p => p.selected
    ? `
      border-color: ${p.theme.colors.main};
      background: rgba(${p.theme.colors.mainRGB}, 0.3);
      color: white;
      &:hover {
        border-color: rgba(${p.theme.colors.mainRGB}, 0.5);
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        border-color: #777;
        color: white;
      }
    `
  }
`;

const Panel = styled.div`
  background: ${background};
  border-left: 1px solid #444;
  clip-path: polygon(
    100% 0,
    100% 100%,
    ${cornerWidth}px 100%,
    ${cornerWidth}px calc(50% + ${bumpHeightHalf}px),
    0 calc(50% + ${bumpHeightHalf - cornerWidth}px),
    0 calc(50% - ${bumpHeightHalf - cornerWidth}px),
    ${cornerWidth}px calc(50% - ${bumpHeightHalf}px),
    ${cornerWidth}px 0
  );
  height: 75%;
  max-height: calc(100vh - 150px);
  padding-left: ${cornerWidth}px;
  padding-right: ${buttonsWidth}px;
  pointer-events: all;
  width: ${panelWidth}px;

  transform: translateX(${p => p.open ? 0 : panelWidth}px);
  transition: transform ${panelAnimationLength}ms ease;
`;

const PanelInner = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px 0 12px;
`;

const PanelTitle = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: row;
  font-size: 22px;
  padding-bottom: 12px;
  text-transform: uppercase;
  & button:last-child {
    margin-right: 0;
  }
`;
const PanelContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 0;
`;

const HudMenu = () => {
  const history = useHistory();
  const { account } = useAuth();
  const asteroidId = useStore(s => s.asteroids.origin);
  const { plotAsteroidId, plotId } = useStore(s => s.asteroids.plot || {});
  const openHudMenu = useStore(s => s.openHudMenu);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);

  const { data: plot } = usePlot(plotAsteroidId, plotId);

  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  
  const [open, setOpen] = useState();
  const handleButtonClick = useCallback((selected) => {
    // clicking button of already-open --> close
    if (openHudMenu === selected) {
      dispatchHudMenuOpened();

    // else, already open, but clicking different button --> close, then open new
    } else if (open) {
      setOpen(false);
      setTimeout(() => {
        dispatchHudMenuOpened(selected);
      }, panelAnimationLength);

    // else, nothing open --> open new
    } else {
      dispatchHudMenuOpened(selected);
    }
  }, [open, openHudMenu]);

  useEffect(() => {
    dispatchHudMenuOpened();
  }, [dispatchHudMenuOpened, zoomToPlot, zoomStatus]);

  useEffect(() => {
    setOpen(!!openHudMenu);
  }, [openHudMenu]);

  const buttons = useMemo(() => {
    if (zoomStatus === 'out') {
      return [
        {
          label: 'Asteroid Info',
          icon: <InfoIcon />,
          Component: hudMenus.AsteroidInfo,
          onDetailClick: () => {
            if (asteroidId) {
              history.push(`/asteroids/${asteroidId}`);
            }
          }
        },
        {
          label: 'My Assets',
          icon: <MyAssetsIcon />,
          Component: hudMenus.AllAssets,
          requireLogin: true
        },
        {
          label: 'Favorites',
          icon: <FavoriteIcon />,
          Component: hudMenus.Favorites,
          requireLogin: true
        },
        {
          label: 'System Search',
          icon: <SearchIcon />,
          Component: hudMenus.SearchAsteroids,
          onDetailClick: () => {
            history.push(`/asteroids`);
          }
        }
      ];
    } else if (zoomStatus === 'in' && !zoomToPlot) {
      return [
        {
          label: 'My Assets',
          icon: <MyAssetsIcon />,
          Component: hudMenus.AsteroidAssets,
          requireLogin: true
        },
        {
          label: 'Asteroid Resources',
          icon: <ResourceIcon />,
          Component: hudMenus.Resources
        },
        {
          label: 'Lot Search',
          icon: <SearchIcon />,
          Component: hudMenus.SearchLots
        },
        {
          label: 'Asteroid Chat',
          icon: <ChatIcon />,
          Component: hudMenus.AsteroidChat
        }
      ];
    } else if (zoomStatus === 'in' && zoomToPlot) {
      const b = [
        {
          label: 'Information',
          icon: <InfoIcon />,
          Component: hudMenus.LotInfo
        },
        {
          label: 'Resources',
          icon: <ResourceIcon />,
          Component: hudMenus.LotResources
        }
      ];
      if (plot?.building?.capableType) {
        if (
          (plot.building.construction?.status === Construction.STATUS_PLANNED && Inventory.CAPACITIES[plot.building.capableType][0])
          || (plot.building.construction?.status === Construction.STATUS_OPERATIONAL && Inventory.CAPACITIES[plot.building.capableType][1])
        ) {
          b.push({
            label: 'Inventory',
            icon: <InventoryIcon />,
            Component: hudMenus.Inventory
          });
        } 
      }
      return b;
    }
    return [];
  }, [asteroidId, plotId, zoomStatus, zoomToPlot, plot]);

  const { label, onDetailClick, Component } = useMemo(() => {
    const [category, label] = (openHudMenu || '').split('.');
    return buttons.find((b) => b.label === label) || {};
  }, [openHudMenu]);

  const buttonFilter = zoomStatus === 'in' && zoomToPlot
    ? 'lot'
    : (zoomStatus === 'in' ? 'asteroid' : 'belt');
  return (
    <Wrapper>
      <ReactTooltip id="hudMenu" effect="solid" />
      <Buttons open={open}>
        {buttons.map(({ label, icon, requireLogin }) => {
          const key = `${buttonFilter}.${label}`;
          if (requireLogin && !account) return null;
          return (
            <Button
              key={key}
              onClick={() => handleButtonClick(key)}
              selected={key === openHudMenu}
              data-for="hudMenu"
              data-place="left"
              data-tip={label}>
              {icon}
            </Button>
          );
        })}
      </Buttons>
      <Panel open={open}>
        <PanelInner>
          <PanelTitle>
            <span style={{ flex: 1 }}>{label}</span>
            <IconButton onClick={onDetailClick}><ListIcon /></IconButton>
            <IconButton onClick={() => handleButtonClick()}><CloseIcon /></IconButton>
          </PanelTitle>
          <PanelContent>
            {Component && <Component onClose={() => handleButtonClick()} />}
          </PanelContent>
        </PanelInner>
      </Panel>
    </Wrapper>
  );
};

export default HudMenu;