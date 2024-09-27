import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import ClipCorner from '~/components/ClipCorner';
import NavIcon from '~/components/NavIcon';
import { CloseIcon, LinkIcon } from '~/components/Icons';
import { reactBool } from '~/lib/utils';
import theme from '~/theme';
import IconButton from '~/components/IconButton';
import useStore from '~/hooks/useStore';

const borderColor = '#222;'

const DialogWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-left: 250px;
  padding: 0 25px;
  width: calc(100% - 285px);
`;

const Padding = styled.div`
  background: rgb(20, 20, 20, 0.5);
  padding: 8px;
  ${p => p.theme.clipCorner(34)};
`;

const Dialog = styled.div`
  background: black;
  border: 1px solid ${borderColor};
  ${p => p.theme.clipCorner(30)};
  display: flex;
  flex-direction: row;
  position: relative;
`;
const PaneWrapper = styled.div`
  border-left: 1px solid ${borderColor};
  ${p => p.singlePane
      ? 'max-height: calc(100vh - 250px);'
      : `
        height: calc(100vh - 250px);
        max-height: calc(100vh - 175px);
      `
  }
  overflow: hidden auto;
  width: 1075px;
`;

const TabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0 0 300px;
  padding: 15px 0;
`;

const Tab = styled.div`
  align-items: center;
  background: black;
  border-radius: 8px 0 0 8px;
  border-right: 3px solid transparent;
  opacity: 0.5;
  display: flex;
  flex-direction: row;
  font-size: 17px;
  margin: 0 0 5px 20px;
  padding: 10px;
  text-transform: uppercase;
  transition:
    background 150ms ease,
    border-right-width 150ms ease,
    opacity 150ms ease;
  & > span {
    font-size: 125%;
    margin-right: 4px;
    opacity: 0;
    transition: opacity 150ms ease;
  }
  ${p => p.isSelected
    ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.4);
      border-right-color: ${p.theme.colors.main};
      opacity: 1;
      & > span {
        opacity: 1;
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        opacity: 0.9;
      }
  `};

  & > label {
    margin-right: 5px;
  }
`;

const CloseButton = styled(IconButton)`
  margin-right: 0;
  position: absolute !important;
  top: 17px;
  right: 20px;
  z-index: 2;
  ${p => p.hasBackground ? 'background: rgba(0, 0, 0, 0.75);' : ''}
`;

const BottomLeft = styled.div``;

const LauncherDialog = ({ panes = [], preselect, singlePane, bottomLeftMenu }) => {
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const [selected, setSelected] = useState();

  useEffect(() => {
    if (!!panes) {
      setSelected(panes[preselect || 0]);
    }
  }, [!!panes, preselect]);

  const handleClick = useCallback((pane) => {
    if (pane.link) {
      window.open(pane.link);
    } else {
      setSelected(pane);
    }
  }, []);

  const onClose = useCallback(() => {
    dispatchLauncherPage('play');
  }, []);

  return (
    <DialogWrapper id="DialogWrapper">
      <Padding>
        <Dialog>
          <CloseButton borderless hasBackground onClick={onClose}><CloseIcon /></CloseButton>
          {!singlePane && (
            <TabWrapper>
              {panes.map((pane) => (
                <Tab
                  key={pane.label}
                  isSelected={selected?.label === pane.label}
                  onClick={() => handleClick(pane)}>
                  <span><NavIcon color={theme.colors.main} /></span>
                  <label>{pane.label}</label>
                  {pane.link && <LinkIcon />}
                </Tab>
              ))}
              {bottomLeftMenu && (
                <>
                  <div style={{ flex: 1 }} />
                  <BottomLeft>
                    {bottomLeftMenu}
                  </BottomLeft>
                </>
              )}
            </TabWrapper>
          )}
          <PaneWrapper singlePane={!!reactBool(singlePane)}>
            {singlePane || selected?.pane || null}
          </PaneWrapper>
          <ClipCorner dimension={30} color={borderColor} />
        </Dialog>
      </Padding>
    </DialogWrapper>
  );
};

export default LauncherDialog;