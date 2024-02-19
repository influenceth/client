import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';
import { Building, Inventory, Lot, Permission } from '@influenceth/sdk';
import { BiWrench as WrenchIcon } from 'react-icons/bi';

import IconButton from '~/components/IconButton';
import {
  AsteroidSearchIcon,
  ChatIcon,
  CloseIcon,
  CompositionIcon,
  DetailIcon,
  FavoriteIcon,
  InfoIcon,
  InventoryIcon,
  KeysIcon,
  ListViewIcon,
  LotSearchIcon,
  MarketplaceBuildingIcon,
  MyAssetsIcon,
  OrderIcon,
  PassengersIcon,
  ResourceIcon,
  ShipIcon,
  SimulateRouteIcon,
  StationCrewIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import hudMenus from './hudMenus';
import { reactBool } from '~/lib/utils';
import useCrewContext from '~/hooks/useCrewContext';
import theme from '~/theme';
import useAsteroidBuildings from '~/hooks/useAsteroidBuildings';
import useShip from '~/hooks/useShip';
import useAsteroid from '~/hooks/useAsteroid';

const cornerWidth = 8;
const bumpHeightHalf = 100;
const buttonsWidth = 66;
const panelAnimationLength = 250;
const panelWidth = 475;

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

const ButtonSection = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  ${p => p.showSeparator && `
    &:before {
      align-self: center;
      content: '';
      display: block;
      border-top: 1px solid #444;
      margin: 7px 0 8px;
      width: 45px;
    }
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
  margin: 3px 0;
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

const initialBorder = 3;
const hoverBorder = 6;
const PageButton = styled(Button)`
  position: relative;
  &:after {
    border: solid transparent;
    border-width: ${initialBorder}px ${initialBorder}px ${initialBorder}px 0;
    border-right-color: #555;
    content: '';
    position: absolute;
    right: -3px;
    top: 4px;
    bottom: 4px;

    transition: border-color 250ms ease, border-width 250ms ease;
  }

  &:hover {
    border-color: transparent;
    &:after {
      border-right-color: ${p => p.theme.colors.main};
      border-width: ${hoverBorder}px ${hoverBorder}px ${hoverBorder}px 0;
    }
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
  const { crew } = useCrewContext();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const asteroidId = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const lotId = useStore(s => s.asteroids.lot);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const showDevTools = useStore(s => s.graphics.showDevTools);
  const openHudMenu = useStore(s => forceOpenMenu || s.openHudMenu);

  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lot } = useLot(lotId);
  const { data: ship } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : null);
  // const { data: marketplaces } = useAsteroidBuildings(
  //   asteroidId,
  //   'Exchange',
  //   [Permission.IDS.BUY, Permission.IDS.SELL, Permission.IDS.LIMIT_BUY, Permission.IDS.LIMIT_BUY]
  // );

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
    // TODO: refactor this now that organization changed...
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
      dispatchHudMenuOpened('RESOURCES');
    }
  }, [zoomStatus, zoomScene])

  useEffect(() => {
    setOpen(!!openHudMenu);
  }, [openHudMenu]);

  const [menuButtons, pageButtons] = useMemo(() => {
    const menuButtons = [];
    const pageButtons = [];

    let scope = 'belt'; // belt, asteroid, lot, ship
    if (zoomStatus === 'in') scope = 'asteroid';
    if (zoomScene?.type === 'LOT') scope = 'lot';
    if (zoomScene?.type === 'SHIP') scope = 'ship'; // TODO: probably only if ship is in flight should we change scope

    let focus = ''; // asteroid, lot, ship
    if (asteroidId) focus = 'asteroid';
    if (lotId) focus = 'lot';
    if (zoomScene?.type === 'SHIP') focus = 'ship';

    // "force open" options
    if (forceOpenMenu === "MY_CREWS") {
      menuButtons.push({
        key: 'MY_CREWS',
        label: 'My Crews',
        Component: hudMenus.MyCrews,
        noClose: true,
        noDetail: true,
        isVisible: true
      })
    }

    menuButtons.push(
      {
        key: 'SHIP_INFORMATION',
        label: 'Ship Info',
        icon: <InfoIcon />,
        Component: hudMenus.ShipInfo,
        isVisible: focus === 'ship'
      },
      {
        key: 'LOT_INFORMATION',
        label: 'Lot Info',
        icon: <InfoIcon />,
        Component: hudMenus.LotInfo,
        isVisible: focus === 'lot'
      },
      {
        key: 'ASTEROID_INFO',
        label: 'Asteroid Info',
        icon: <InfoIcon />,
        Component: hudMenus.AsteroidInfo,
        // detailType: 'detail',
        // onDetailClick: () => {
        //   if (asteroidId) {
        //     history.push(`/asteroids/${asteroidId}`);
        //   }
        // }
        isVisible: focus === 'asteroid'
      },
      {
        key: 'BUILDING_ADMIN',
        label: 'Building Management',
        icon: <KeysIcon />,
        noDetail: true,
        Component: hudMenus.AdminBuilding,
        isVisible: focus === 'lot'
          && lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
          && lot.building.Control?.controller?.id === crew?.id
      },
      {
        key: 'ASTEROID_ADMIN',
        label: 'Asteroid Management',
        icon: <KeysIcon />,
        noDetail: true,
        Component: hudMenus.AdminAsteroid,
        isVisible: focus === 'asteroid'
          && asteroid?.Control?.controller?.id === crew?.id
      },
      {
        key: 'SHIP_ADMIN',
        label: 'Ship Management',
        icon: <KeysIcon />,
        noDetail: true,
        Component: hudMenus.AdminShip,
        isVisible: focus === 'ship'
          && ship?.Control?.controller?.id === crew?.id
      },
      {
        key: 'DOCKED_SHIPS',
        label: 'Docked Ships',
        icon: <ShipIcon />,
        Component: hudMenus.DockDetails,
        noDetail: true,
        isVisible: focus === 'lot'
          && lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
          && lot.building.Dock
      },
      {
        key: 'RESOURCES',
        label: 'Resources',
        icon: <ResourceIcon />,
        Component: hudMenus.Resources,
        noDetail: true,
        isVisible: scope === 'asteroid' || scope === 'lot'
      },
      {
        key: 'LOT_INVENTORY',
        label: 'Lot Inventory',
        icon: <InventoryIcon />,
        Component: hudMenus.Inventory,
        isVisible: focus === 'lot'
          && (lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE)
      },
      {
        key: 'STATIONED_CREW',
        label: 'Station Manifest',
        icon: <StationCrewIcon />,
        Component: hudMenus.StationManifest,
        isVisible: focus === 'lot' && lot?.building?.Station
      },
      {
        key: 'SHIP_INVENTORY',
        label: 'Ship Inventory',
        icon: <InventoryIcon />,
        Component: hudMenus.Inventory,
        isVisible: focus === 'ship'
          && (ship?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE)
      },
      {
        key: 'SHIP_PASSENGERS',
        label: 'Passenger Manifest',
        icon: <PassengersIcon />,
        Component: hudMenus.StationManifest,
        isVisible: focus === 'ship'
      },

      {
        key: 'ASTEROID_MAP_SEARCH',
        label: 'Lot Search',
        icon: <LotSearchIcon />,
        Component: hudMenus.SearchMap,
        noDetail: true,
        componentProps: { assetType: 'lotsMapped' },
        detailType: 'list',
        onDetailClick: () => {
          history.push(`/listview/lots`);
        },
        isVisible: scope === 'asteroid'
      },
      // {
      //   key: 'ASTEROID_CHAT',
      //   label: 'Asteroid Chat',
      //   icon: <ChatIcon />,
      //   Component: hudMenus.AsteroidChat
      //   isVisible: scope === 'asteroid' || scope === 'lot'
      // },
      {
        key: 'ASTEROID_ASSETS',
        label: 'My Assets',
        highlightIcon: true,
        icon: <MyAssetsIcon />,
        Component: hudMenus.AsteroidAssets,
        noDetail: true,
        requireLogin: true,
        isVisible: scope === 'asteroid'
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
        },
        isVisible: scope === 'belt'
      },
      {
        key: 'BELT_FAVORITES',
        label: 'Favorites',
        icon: <FavoriteIcon />,
        Component: hudMenus.Favorites,
        noDetail: true,
        requireLogin: true,
        isVisible: scope === 'belt'
      },
      {
        key: 'BELT_PLAN_FLIGHT',
        label: 'Plan Flight',
        icon: <SimulateRouteIcon />,
        Component: hudMenus.RoutePlanner,
        noDetail: true,
        isVisible: scope === 'belt' && destination
      },
      {
        key: 'BELT_ASSETS',
        label: 'My Assets',
        highlightIcon: true,
        icon: <MyAssetsIcon />,
        Component: hudMenus.AllAssets,
        noDetail: true,
        requireLogin: true,
        isVisible: scope === 'belt'
      },
    )

    pageButtons.push(
      {
        key: 'MARKETPLACE_LISTINGS',
        label: 'Marketplace Listings',
        icon: <OrderIcon />,
        onOpen: () => {
          history.push(`/marketplace/${asteroidId}/${Lot.toIndex(lotId)}`);
        },
        isVisible: focus === 'lot'
          && lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
          && lot.building.Building.buildingType === Building.IDS.MARKETPLACE
      },
      {
        key: 'ASTEROID_DETAILS',
        label: 'Asteroid Details',
        icon: <CompositionIcon />,
        onOpen: () => {
          history.push(`/asteroids/${asteroidId}`);
        },
        isVisible: focus === 'asteroid' || scope === 'asteroid'
      },
      {
        key: 'ASTEROID_MARKETS',
        label: 'Asteroid Markets',
        icon: <MarketplaceBuildingIcon />,
        onOpen: () => {
          // if (marketplaces?.length > 0) {
            history.push(`/marketplace/${asteroidId}/all`);
          // } else {
          //   createAlert({
          //     type: 'GenericAlert',
          //     level: 'warning',
          //     data: { content: 'Asteroid does not yet have any marketplaces accessible to your crew.' },
          //     duration: 3000
          //   });
          // }
        },
        isVisible: focus === 'asteroid' || scope === 'asteroid'
      },
      {
        key: 'ASTEROID_ADVANCED_SEARCH',
        label: 'Advanced Search',
        icon: <ListViewIcon />,
        onOpen: () => {
          history.push(`/listview`);  // TODO: should probably also go to /listview/lots
        },
        isVisible: scope === 'asteroid'
      },

      {
        key: 'BELT_ADVANCED_SEARCH',
        label: 'Advanced Search',
        icon: <ListViewIcon />,
        onOpen: () => {
          history.push(`/listview/asteroids`);
        },
        isVisible: scope === 'belt'
      }
    );

    if (process.env.REACT_APP_ENABLE_DEV_TOOLS && showDevTools) {
      menuButtons.push({
        key: 'DEV_TOOLS',
        label: 'Dev Tools',
        icon: <WrenchIcon />,
        noDetail: true,
        Component: hudMenus.DevTools,
        hideInsteadOfClose: true
      });
    }

    return [menuButtons, pageButtons];
  }, [asteroid, asteroidId, crew?.id, destination, lot, lotId, showDevTools, zoomStatus, zoomScene]);

  const { label, onDetailClick, detailType, Component, componentProps, hideInsteadOfClose, noClose, noDetail } = useMemo(() => {
    return menuButtons.find((b) => b.key === openHudMenu) || {};
  }, [menuButtons, openHudMenu]);

  const [visibleMenuButtons, visiblePageButtons] = useMemo(() => ([
    menuButtons.filter((b) => b.isVisible && (!b.requireLogin || !!account)),
    pageButtons.filter((b) => b.isVisible && (!b.requireLogin || !!account)),
  ]), [!!account, menuButtons]);

  // if open hud menu is no longer visible (or if get logged out and "requireLogin" menu), close
  useEffect(() => {
    if (openHudMenu) {
      const openMenuConfig = menuButtons.find((b) => b.key === openHudMenu);
      if (!openMenuConfig?.isVisible || (openMenuConfig?.requireLogin && !account)) {
        handleButtonClick(openHudMenu, null, openMenuConfig?.hideInsteadOfClose);
      }
    }
  }, [account, handleButtonClick, openHudMenu, visibleMenuButtons]);

  return (
    <Wrapper>
      {!forceOpenMenu && (
        <>
          <ReactTooltip id="hudMenu" effect="solid" />
          <Buttons open={open}>
            {visibleMenuButtons.length > 0 && (
              <ButtonSection>
                {visibleMenuButtons.map(({ key, label, highlightIcon, icon, onOpen, hideInsteadOfClose }) => (
                  <Button
                    key={key}
                    style={highlightIcon ? { color: theme.colors.main } : {}}
                    onClick={() => handleButtonClick(key, onOpen, hideInsteadOfClose)}
                    selected={key === openHudMenu}
                    data-for="hudMenu"
                    data-place="left"
                    data-tip={label}>
                    {icon}
                  </Button>
                ))}
              </ButtonSection>
            )}
            {visiblePageButtons.length > 0 && (
              <ButtonSection showSeparator={menuButtons.length > 0}>
                {visiblePageButtons.map(({ key, label, highlightIcon, icon, onOpen, hideInsteadOfClose }) => (
                  <PageButton
                    key={key}
                    style={highlightIcon ? { color: theme.colors.main } : {}}
                    onClick={() => handleButtonClick(key, onOpen, hideInsteadOfClose)}
                    selected={key === openHudMenu}
                    data-for="hudMenu"
                    data-place="left"
                    data-tip={label}>
                    {icon}
                  </PageButton>
                ))}
              </ButtonSection>
            )}
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