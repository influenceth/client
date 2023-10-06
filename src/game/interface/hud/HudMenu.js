import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';
import { Building, Inventory } from '@influenceth/sdk';
import { BiWrench as WrenchIcon } from 'react-icons/bi';

import IconButton from '~/components/IconButton';
import {
  AsteroidSearchIcon,
  ChatIcon,
  CloseIcon,
  DetailIcon,
  FavoriteIcon,
  InfoIcon,
  InventoryIcon,
  ListViewIcon,
  LotSearchIcon,
  MyAssetsIcon,
  OrderIcon,
  ResourceIcon,
  SimulateRouteIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import hudMenus from './hudMenus';
import { reactBool } from '~/lib/utils';

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
  background: ${p => p.theme.colors.hudMenuBackground};
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
  background: ${p => p.theme.colors.hudMenuBackground};
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
  padding-right: ${p => p.forcedOpen ? 0 : buttonsWidth}px;
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
  height: 43px;
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

const HudMenu = ({ forceOpenMenu }) => {
  const history = useHistory();
  const { account } = useAuth();
  const asteroidId = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const { asteroidId: lotAsteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const showDevTools = useStore(s => s.graphics.showDevTools);
  const openHudMenu = useStore(s => forceOpenMenu || s.openHudMenu);

  const { data: lot } = useLot(lotAsteroidId, lotId);

  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);

  const [open, setOpen] = useState();
  const [hidden, setHidden] = useState();

  const handleButtonClick = useCallback((selected, onOpen, hideInsteadOfClose) => {

    // clicking button of already-open --> close
    if (openHudMenu === selected) {
      if (hideInsteadOfClose) {
        setHidden((h) => !h);
        return;
      }
      else dispatchHudMenuOpened();

    // else, already open, but clicking different button --> close, then open new
    } else if (open) {
      setOpen(false);
      setTimeout(() => {
        if (onOpen) onOpen();
        else dispatchHudMenuOpened(selected);
      }, panelAnimationLength);

    // else, nothing open --> open new
    } else {
      if (onOpen) onOpen();
      else dispatchHudMenuOpened(selected);
    }

    setHidden(false);
  }, [open, openHudMenu]);

  useEffect(() => {
    if (openHudMenu) {
      const category = openHudMenu.split('_').shift();
      if (category === 'BELT' && zoomStatus !== 'out') dispatchHudMenuOpened();
      if (category === 'ASTEROID' && !(zoomStatus === 'in' && !zoomScene)) dispatchHudMenuOpened();
      if (category === 'LOT' && !(zoomStatus === 'in' && zoomScene?.type === 'LOT')) dispatchHudMenuOpened();
      if (category === 'SHIP' && !(zoomStatus === 'in' && zoomScene?.type === 'SHIP')) dispatchHudMenuOpened();
    }
  }, [dispatchHudMenuOpened, zoomScene, zoomStatus]);

  useEffect(() => {
    // if just zoomed in and resourcemap is active, then open asteroid resources
    if (zoomStatus === 'in' && !zoomScene && resourceMap.active) {
      dispatchHudMenuOpened('ASTEROID_RESOURCES');
    }
  }, [zoomStatus, zoomScene])

  useEffect(() => {
    setOpen(!!openHudMenu);
  }, [openHudMenu]);

  const buttons = useMemo(() => {
    let buttons = [];

    // "force open" options
    if (forceOpenMenu === "MY_CREWS") {
      buttons.push({
        key: 'MY_CREWS',
        label: 'My Crews',
        Component: hudMenus.MyCrews,
        noClose: true,
        noDetail: true,
      })
    }

    // "system view"
    if (zoomStatus === 'out') {
      if (asteroidId) {
        buttons.push({
          key: 'BELT_ASTEROID_INFO',
          label: 'Asteroid Info',
          icon: <InfoIcon />,
          Component: hudMenus.AsteroidInfo,
          detailType: 'detail',
          onDetailClick: () => {
            if (asteroidId) {
              history.push(`/asteroids/${asteroidId}`);
            }
          }
        });
      }

      buttons.push(
        {
          key: 'BELT_ASSETS',
          label: 'My Assets',
          icon: <MyAssetsIcon />,
          Component: hudMenus.AllAssets,
          requireLogin: true
        },
        {
          key: 'BELT_MAP_SEARCH',
          label: 'System Search',
          icon: <AsteroidSearchIcon />,
          Component: hudMenus.SearchMap,
          componentProps: { assetType: 'asteroidsMapped' },
          detailType: 'list',
          onDetailClick: () => {
            history.push(`/listview/asteroids`);
          }
        },
        {
          key: 'BELT_FAVORITES',
          label: 'Favorites',
          icon: <FavoriteIcon />,
          Component: hudMenus.Favorites,
          requireLogin: true
        },
        {
          key: 'BELT_ADVANCED_SEARCH',
          label: 'Advanced Search',
          icon: <ListViewIcon />,
          onOpen: () => {
            history.push(`/listview/asteroids`);
          }
        },
      );

      if (asteroidId && destination) {
        buttons.push({
          key: 'BELT_PLAN_FLIGHT',
          label: 'Plan Flight',
          icon: <SimulateRouteIcon />,
          Component: hudMenus.RoutePlanner,
          noDetail: true
        });
      }

    // zoomed to asteroid, not zoomed to lot or ship
    } else if (zoomStatus === 'in' && !zoomScene) {
      buttons.push(
        {
          key: 'ASTEROID_ASSETS',
          label: 'My Assets',
          icon: <MyAssetsIcon />,
          Component: hudMenus.AsteroidAssets,
          requireLogin: true
        },
        {
          key: 'ASTEROID_RESOURCES',
          label: 'Asteroid Resources',
          icon: <ResourceIcon />,
          Component: hudMenus.Resources
        },
        {
          key: 'ASTEROID_MAP_SEARCH',
          label: 'Lot Search',
          icon: <LotSearchIcon />,
          Component: hudMenus.SearchMap,
          componentProps: { assetType: 'lotsMapped' },
          detailType: 'list',
          onDetailClick: () => {
            history.push(`/listview/lots`);
          }
        },
        // {
        //   key: 'ASTEROID_CHAT',
        //   label: 'Asteroid Chat',
        //   icon: <ChatIcon />,
        //   Component: hudMenus.AsteroidChat
        // },
        {
          key: 'ASTEROID_ADVANCED_SEARCH',
          label: 'Advanced Search',
          icon: <ListViewIcon />,
          onOpen: () => {
            history.push(`/listview`);  // TODO: should probably also go to /listview/lots
          }
        },
      );

      if (false) { // TODO: if has at least 1 OPERATIONAL marketplace
        buttons.push({
          key: 'ASTEROID_MARKETS',
          label: 'Asteroid Markets',
          icon: <OrderIcon />,
          onOpen: () => {
            history.push(`/marketplace/${asteroidId}/all`);
          }
        });
      }

    // zoomed to lot
    } else if (zoomStatus === 'in' && zoomScene?.type === 'LOT') {
      buttons.push(
        {
          key: 'LOT_INFORMATION',
          label: 'Information',
          icon: <InfoIcon />,
          Component: hudMenus.LotInfo
        }
      );

      if (lot?.building?.Building?.status === Building.CONSTRUCTION_STATUS_IDS.OPERATIONAL) {
        if (lot.building.Building.buildingType === Building.IDS.MARKETPLACE) {
          buttons.push({
            key: 'MARKETPLACE_LISTINGS',
            label: 'Marketplace Listings',
            icon: <OrderIcon />,
            onOpen: () => {
              history.push(`/marketplace/${asteroidId}/${lotId}`);
            }
          });
        }
      }

      buttons.push({
        key: 'LOT_RESOURCES',
        label: 'Resources',
        icon: <ResourceIcon />,
        Component: hudMenus.LotResources
      });

      if (lot?.building?.Building?.buildingType && (lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE)) {
        buttons.push({
          key: 'LOT_INVENTORY',
          label: 'Inventory',
          icon: <InventoryIcon />,
          Component: hudMenus.Inventory
        });
      }

    // zoomed to ship
    } else if (zoomStatus === 'in' && zoomScene?.type === 'SHIP') {
      // TODO: ... ship HUD menu options ...
    }

    if (process.env.REACT_APP_ENABLE_DEV_TOOLS && showDevTools) {
      buttons.push({
        key: 'DEV_TOOLS',
        label: 'Dev Tools',
        icon: <WrenchIcon />,
        noDetail: true,
        Component: hudMenus.DevTools,
        hideInsteadOfClose: true
      });
    }

    return buttons;
  }, [asteroidId, destination, lot, lotId, showDevTools, zoomStatus, zoomScene]);

  const { label, onDetailClick, detailType, Component, componentProps, hideInsteadOfClose, noClose, noDetail } = useMemo(() => {
    return buttons.find((b) => b.key === openHudMenu) || {};
  }, [buttons, openHudMenu]);

  return (
    <Wrapper>
      {!forceOpenMenu && (
        <>
          <ReactTooltip id="hudMenu" effect="solid" />
          <Buttons open={open}>
            {buttons.map(({ key, label, icon, onOpen, requireLogin, hideInsteadOfClose }) => {
              if (requireLogin && !account) return null;
              return (
                <Button
                  key={key}
                  onClick={() => handleButtonClick(key, onOpen, hideInsteadOfClose)}
                  selected={key === openHudMenu}
                  data-for="hudMenu"
                  data-place="left"
                  data-tip={label}>
                  {icon}
                </Button>
              );
            })}
          </Buttons>
        </>
      )}
      <Panel open={open && !hidden} forcedOpen={reactBool(forceOpenMenu)}>
        <PanelInner>
          <PanelTitle>
            <span style={{ flex: 1 }}>{label}</span>
            {!noDetail && (
              <IconButton
                data-for="global"
                data-tip={detailType === 'detail' ? 'Detail View' : 'Advanced Search'}
                data-place="left"
                onClick={onDetailClick}>
                {detailType === 'detail' ? <DetailIcon /> : <ListViewIcon />}
              </IconButton>
            )}
            {!noClose && (
              <IconButton onClick={() => handleButtonClick(openHudMenu, null, hideInsteadOfClose)}>
                <CloseIcon />
              </IconButton>
            )}
          </PanelTitle>
          <PanelContent>
            {Component && (
              <Component
                {...(componentProps || {})}
                onClose={() => handleButtonClick(openHudMenu, null, hideInsteadOfClose)} />
            )}
          </PanelContent>
        </PanelInner>
      </Panel>
    </Wrapper>
  );
};

export default HudMenu;