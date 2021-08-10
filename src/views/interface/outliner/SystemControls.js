import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import screenfull from 'screenfull';
import { AiOutlineSetting, AiOutlinePushpin, AiFillPushpin } from 'react-icons/ai';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { BsEyeSlash, BsEye } from 'react-icons/bs';

import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';

const StyledSystemControls = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 50px;
  width: 385px;
  position: absolute;
  bottom: 0;
`;

const SystemControls = (props) => {
  const history = useHistory();
  const outlinerPinned = useStore(state => state.outliner.pinned);
  const dispatchOutlinerPinned = useStore(state => state.dispatchOutlinerPinned);
  const dispatchOutlinerUnpinned = useStore(state => state.dispatchOutlinerUnpinned);
  const skyboxVisible = useStore(state => state.graphics.skybox);
  const dispatchSkyboxHidden = useStore(state => state.dispatchSkyboxHidden);
  const dispatchSkyboxUnhidden = useStore(state => state.dispatchSkyboxUnhidden);
  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  screenfull.on('change', () => {
    setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
  });

  return (
    <StyledSystemControls>
      {!outlinerPinned && (
        <IconButton
          data-tip="Pin Outliner"
          onClick={dispatchOutlinerPinned}
          borderless>
          <AiOutlinePushpin />
        </IconButton>
      )}
      {outlinerPinned && (
        <IconButton
          data-tip="Unpin Outliner"
          onClick={dispatchOutlinerUnpinned}
          borderless>
          <AiFillPushpin />
        </IconButton>
      )}
      {!fullscreen && (
        <IconButton
          data-tip="Go Fullscreen"
          onClick={() => screenfull.request()}
          borderless>
          <MdFullscreen />
        </IconButton>
      )}
      {fullscreen && (
        <IconButton
          data-tip="Exit Fullscreen"
          onClick={() => screenfull.exit()}
          borderless>
          <MdFullscreenExit />
        </IconButton>
      )}
      {skyboxVisible && (
        <IconButton
          data-tip="Hide Skybox"
          onClick={dispatchSkyboxHidden}
          borderless>
          <BsEyeSlash />
        </IconButton>
      )}
      {!skyboxVisible && (
        <IconButton
          data-tip="Show Skybox"
          onClick={dispatchSkyboxUnhidden}
          borderless>
          <BsEye />
        </IconButton>
      )}
      <IconButton
        data-tip="Settings"
        onClick={() => history.push('/settings')}
        borderless>
        <AiOutlineSetting />
      </IconButton>
    </StyledSystemControls>
  );
};

export default SystemControls;
