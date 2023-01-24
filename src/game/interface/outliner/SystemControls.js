import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import screenfull from 'screenfull';
import { AiOutlineMenu, AiOutlinePushpin, AiFillPushpin } from 'react-icons/ai';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { BsEyeSlash, BsEye } from 'react-icons/bs';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import IconButton from '~/components/IconButton';

const StyledSystemControls = styled.div`
  align-items: center;
  bottom: 0;
  display: flex;
  height: 50px;
  justify-content: flex-end;
  position: absolute;
  width: 385px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    width: 100%;
  }
`;

const SystemControls = (props) => {
  const history = useHistory();
  const { isMobile } = useScreenSize();
  const outlinerPinned = useStore(s => s.outliner.pinned);
  const dispatchOutlinerPinned = useStore(s => s.dispatchOutlinerPinned);
  const dispatchOutlinerUnpinned = useStore(s => s.dispatchOutlinerUnpinned);
  const skyboxVisible = useStore(s => s.graphics.skybox);
  const dispatchSkyboxHidden = useStore(s => s.dispatchSkyboxHidden);
  const dispatchSkyboxUnhidden = useStore(s => s.dispatchSkyboxUnhidden);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
      });
    }
  }, []);

  return (
    <StyledSystemControls>
      {!outlinerPinned && !isMobile && (
        <IconButton
          data-tip="Pin Outliner"
          onClick={dispatchOutlinerPinned}
          borderless>
          <AiOutlinePushpin />
        </IconButton>
      )}
      {outlinerPinned && !isMobile && (
        <IconButton
          data-tip="Unpin Outliner"
          onClick={dispatchOutlinerUnpinned}
          borderless>
          <AiFillPushpin />
        </IconButton>
      )}
      {screenfull.isEnabled && !fullscreen && !isMobile && (
        <IconButton
          data-tip="Go Fullscreen"
          onClick={() => screenfull.request()}
          borderless>
          <MdFullscreen />
        </IconButton>
      )}
      {screenfull.isEnabled && fullscreen && !isMobile && (
        <IconButton
          data-tip="Exit Fullscreen"
          onClick={() => screenfull.exit()}
          borderless>
          <MdFullscreenExit />
        </IconButton>
      )}
      {skyboxVisible && !isMobile && (
        <IconButton
          data-tip="Hide Skybox"
          onClick={dispatchSkyboxHidden}
          borderless>
          <BsEyeSlash />
        </IconButton>
      )}
      {!skyboxVisible && !isMobile && (
        <IconButton
          data-tip="Show Skybox"
          onClick={dispatchSkyboxUnhidden}
          borderless>
          <BsEye />
        </IconButton>
      )}
      <IconButton
        data-tip="Main Menu"
        onClick={() => dispatchLauncherPage(true)}
        borderless>
        <AiOutlineMenu />
      </IconButton>
    </StyledSystemControls>
  );
};

export default SystemControls;
