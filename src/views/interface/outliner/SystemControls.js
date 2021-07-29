import { useState } from 'react';
import styled from 'styled-components';
import screenfull from 'screenfull';
import { AiOutlineSetting, AiOutlinePushpin, AiFillPushpin } from 'react-icons/ai';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { BsEyeSlash, BsEye } from 'react-icons/bs';

import useSettingsStore from '~/hooks/useSettingsStore';
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
  const outlinerPinned = useSettingsStore(state => state.outlinerPinned);
  const setOutlinerPinned = useSettingsStore(state => state.setOutlinerPinned);
  const skyboxHidden = useSettingsStore(state => state.skyboxHidden);
  const setSkyboxHidden = useSettingsStore(state => state.setSkyboxHidden);
  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  screenfull.on('change', () => {
    setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
  });

  return (
    <StyledSystemControls>
      {!outlinerPinned && (
        <IconButton
          data-tip="Pin Outliner"
          onClick={() => setOutlinerPinned(true)}
          borderless>
          <AiOutlinePushpin />
        </IconButton>
      )}
      {outlinerPinned && (
        <IconButton
          data-tip="Unpin Outliner"
          onClick={() => setOutlinerPinned(false)}
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
      {!skyboxHidden && (
        <IconButton
          data-tip="Hide Skybox"
          onClick={() => setSkyboxHidden(true)}
          borderless>
          <BsEyeSlash />
        </IconButton>
      )}
      {skyboxHidden && (
        <IconButton
          data-tip="Show Skybox"
          onClick={() => setSkyboxHidden(false)}
          borderless>
          <BsEye />
        </IconButton>
      )}
      <IconButton
        data-tip="Settings"
        borderless>
        <AiOutlineSetting />
      </IconButton>
    </StyledSystemControls>
  );
};

export default SystemControls;
