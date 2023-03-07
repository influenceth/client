import styled from 'styled-components';

import ActionDialog from './hud/ActionDialog';
import ActionItems from './hud/ActionItems';
import AvatarMenu from './hud/AvatarMenu';
import InfoPane from './hud/InfoPane';
import SystemControls from './outliner/SystemControls';
import HudMenu from './hud/HudMenu';
import SearchResultsBanner from './hud/SearchResultsBanner';

const bottomMargin = 60;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: ${bottomMargin}px;
  z-index: 2;
`;

const LeftWrapper = styled(Wrapper)`
  display: flex;
  height: calc(100% - ${bottomMargin}px);
  left: 0;
  top: 0;
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

const HUD = () => {
  return (
    <>
      <LeftWrapper>
        <AvatarMenu />
        <ActionItems />
        <InfoPane />
      </LeftWrapper>

      <SearchResultsBanner />

      <HudMenu />

      <SystemControls />

      <ActionDialog />
    </>
  );
}

export default HUD;