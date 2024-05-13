import styled from 'styled-components';
import Button from '~/components/ButtonAlt';

import HudIconButton from '~/components/HudIconButton';
import { InfluenceIcon } from '~/components/Icons';
import useAccountFormatted from '../../../hooks/useAccountFormatted';

export const menuAnimationTime = 250;

const MainMenuWrapper = styled.div`
  align-self: flex-start;
  position: relative;
  display: flex;
  overflow: hidden;

  height: ${p => p.open ? (70 + p.itemTally * 37) : 50}px;
  width: ${p => (p.open || !p.hCollapse) ? 300 : 53}px;
  transition: width ${menuAnimationTime}ms ease ${p => p.open ? 0 : menuAnimationTime}ms,
              height ${menuAnimationTime}ms ease ${p => (p.open && p.hCollapse) ? menuAnimationTime : 0}ms;

`;
const MainMenu = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: 5px;

  background: ${p => p.open ? 'black' : 'transparent'};
  border-color: ${p => false && p.open ? '#444' : 'transparent'};
  border-style: solid;
  border-width: 0 0 1px 1px;
  text-align: right;
  transition: background ${menuAnimationTime}ms ease, border-color ${menuAnimationTime}ms ease;
  width: 100%;
  z-index: 3;

  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    & > button {
      padding: 0;
    }
  }
  & > ul {
    margin: 15px 0 0;
    padding: 0;
  }
`;
const HeaderWrapper = styled.div`
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  color: white;
  display: flex;
  flex: 1;
  justify-content: flex-start;
  overflow: hidden;
  max-width: calc(100% - 40px);

  ${p => p.onClick && `
    border-radius: 20px;
    cursor: ${p.theme.cursors.active};
    transition: background ${menuAnimationTime}ms ease, border-color ${menuAnimationTime}ms ease;;
    &:hover {
      background: rgba(${p.theme.colors.mainRGB}, 0.7);
      border-color: ${p.theme.colors.main};
    }
  `}
`;

const MainMenuItem = styled.li`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  margin: 0 -10px;
  padding: 0 15px 0 10px;
  svg {
    font-size: 25px;
  }
  label {
    flex: 1;
    text-transform: uppercase;
  }

  ${p => p.isRule
    ? `
      height: 18px;
      &:before {
        content: "";
        display: block;
        border-top: 1px solid #333;
        width: 100%;
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      height: 36px;
      &:hover {
        background: rgba(${p.theme.colors.mainRGB}, 0.6);
        color: white;
      }
    `
  }
`;

const LoggedInUser = styled.div`
  cursor: ${p => p.theme.cursors.active};
  flex: 1;
  font-size: 15px;
  margin-left: 10px;
  overflow: hidden;
  padding-right: 10px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

const LogoWrapper = styled.span`
  background: #222;
  border-radius: 20px;
  position: relative;
  & > svg {
    font-size: 34px;
  }
  &:after {
    content: "";
    background: ${p => p.connected ? p.theme.colors.success : p.theme.colors.error};
    position: absolute;
    bottom: 0;
    right: 0;
    border-radius: 5px;
    height: 10px;
    width: 10px;
  }
`;

const OpenerAsButtonWrapper = styled.div`
  align-items: center;
  display: flex;
  font-size: 18px;
  height: 40px;
  justify-content: flex-end;
  width: 40px;
`;

export const NavMenuLoggedInUser = ({ account }) => {
  const formattedAccount = useAccountFormatted({ address: account, truncate: true, doNotReplaceYou: true });
  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(account);
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <>
      <LogoWrapper connected={!!account}>
        <InfluenceIcon />
      </LogoWrapper>

      <LoggedInUser onClick={copyToClipboard}>{formattedAccount}</LoggedInUser>
    </>
  );
};

const DropdownNavMenu = ({
  menuItems,
  header,
  hCollapse,
  openerHighlight,
  openerAsButton,
  openerIcon,
  openerTooltip,
  onClickHeader,
  onClickOpener,
  isOpen,
  onClose
}) => (
  <MainMenuWrapper open={isOpen} hCollapse={hCollapse} itemTally={menuItems.length}>
    <MainMenu open={isOpen}>
      <div>
        <HeaderWrapper onClick={onClickHeader}>{header}</HeaderWrapper>

        {openerAsButton
          ? (
            <OpenerAsButtonWrapper>
              <Button data-tooltip-content={openerTooltip} onClick={onClickOpener} size="icon">{openerIcon}</Button>
            </OpenerAsButtonWrapper>
          )
          : (
            <HudIconButton
              data-tooltip-content={openerTooltip}
              isActive={openerHighlight && isOpen}
              onClick={onClickOpener}>
              {openerIcon}
            </HudIconButton>
          )}
      </div>
      <ul onClick={onClose}>
        {menuItems.map((item, i) => {
          return item.isRule
            ? <MainMenuItem key={i} isRule />
            : (
              <MainMenuItem key={i} onClick={item.onClick}>
                {item.content}
              </MainMenuItem>
            )
        })}
      </ul>
    </MainMenu>
  </MainMenuWrapper>
);

export default DropdownNavMenu;