import { useState } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import screenfull from 'screenfull';
import Clipboard from 'react-clipboard.js';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';
import { MdContentCopy as CopyIcon } from 'react-icons/md';

import useStore from '~/hooks/useStore';
import Details from '~/components/Details';
import DataReadout from '~/components/DataReadout';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import NumberInput from '~/components/NumberInput';

const StyledSettings = styled.div`
  padding-left: 15px;

  & h3 {
    border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
    padding-bottom: 3px;
  }
`;

const ControlGroup = styled.div`
  align-items: center;
  display: flex;

  & input {
    margin-right: 10px;
  }

  & button {
    margin-right: 10px;
    width: auto;
  }
`;

const StyledDataReadout = styled(DataReadout)`
  & label {
    width: 150px;
  }

  & span {
    align-items: center;
    display: flex;
  }
`;

const StyledClipboard = styled(Clipboard)`
  text-decoration: none;
`;

const Settinigs = (props) => {
  const history = useHistory();
  const { account } = useWeb3React();
  const graphics = useStore(state => state.graphics);
  const setTextureSize = useStore(state => state.dispatchTextureSizeSet);
  const turnOnSkybox = useStore(state => state.dispatchSkyboxUnhidden);
  const turnOffSkybox = useStore(state => state.dispatchSkyboxHidden);
  const turnOnLensflare = useStore(state => state.dispatchLensflareUnhidden);
  const turnOffLensflare = useStore(state => state.dispatchLensflareHidden);
  const turnOnShadows = useStore(state => state.dispatchShadowsOn);
  const turnOffShadows = useStore(state => state.dispatchShadowsOff);
  const setShadowSize = useStore(state => state.dispatchShadowSizeSet);
  const setFOV = useStore(state => state.dispatchFOVSet);
  const turnOnStats = useStore(state => state.dispatchStatsOn);
  const turnOffStats = useStore(state => state.dispatchStatsOff);

  const [ localFOV, setLocalFOV ] = useState(graphics.fov);
  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  screenfull.on('change', () => {
    setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
  });

  return (
    <Details title="Settings">
      <StyledSettings>
        <h3>Graphics</h3>
        <StyledDataReadout label="Texture Quality">
          <ControlGroup>
            <Button
              active={graphics.textureSize === 512}
              onClick={() => setTextureSize(512)}>
              Low
            </Button>
            <Button
              active={graphics.textureSize === 1024}
              onClick={() => setTextureSize(1024)}>
              Medium
            </Button>
            <Button
              active={graphics.textureSize === 2048}
              onClick={() => setTextureSize(2048)}>
              High
            </Button>
          </ControlGroup>
        </StyledDataReadout>
        <StyledDataReadout label="Dynamic Shadows">
          <IconButton
            data-tip="Toggle Shadows"
            data-for="global"
            onClick={() => graphics.shadows ? turnOffShadows() : turnOnShadows()}
            borderless>
            {graphics.shadows ? <CheckedIcon /> : <UncheckedIcon />}
          </IconButton>
        </StyledDataReadout>
        {graphics.shadows && (
          <StyledDataReadout label="Shadow Quality">
            <ControlGroup>
              <Button
                active={graphics.shadowSize === 1024}
                onClick={() => setShadowSize(1024)}>
                Low
              </Button>
              <Button
                active={graphics.shadowSize === 2048}
                onClick={() => setShadowSize(2048)}>
                Medium
              </Button>
              <Button
                active={graphics.shadowSize === 4092}
                onClick={() => setShadowSize(4092)}>
                High
              </Button>
            </ControlGroup>
          </StyledDataReadout>
        )}
        <StyledDataReadout label="Field of View">
          <ControlGroup>
            <NumberInput
              initialValue={graphics.fov}
              onChange={v => setLocalFOV(v)}
              min={45}
              max={175} />
            <Button
              onClick={() => setFOV(localFOV)}
              disabled={localFOV === graphics.fov}>
              Update
            </Button>
          </ControlGroup>
        </StyledDataReadout>
        <StyledDataReadout label="Fullscreen">
          <IconButton
            data-tip="Toggle Fullscreen"
            data-for="global"
            onClick={() => fullscreen ? screenfull.exit() : screenfull.request()}
            borderless>
            {fullscreen ? <CheckedIcon /> : <UncheckedIcon />}
          </IconButton>
        </StyledDataReadout>
        <StyledDataReadout label="Skybox">
          <IconButton
            data-tip="Toggle Skybox"
            data-for="global"
            onClick={() => graphics.skybox ? turnOffSkybox() : turnOnSkybox()}
            borderless>
            {graphics.skybox ? <CheckedIcon /> : <UncheckedIcon />}
          </IconButton>
        </StyledDataReadout>
        <StyledDataReadout label="Stellar Lensflare">
          <IconButton
            data-tip="Toggle Stellar Lensflare"
            data-for="global"
            onClick={() => graphics.lensflare ? turnOffLensflare() : turnOnLensflare()}
            borderless>
            {graphics.lensflare ? <CheckedIcon /> : <UncheckedIcon />}
          </IconButton>
        </StyledDataReadout>
        <StyledDataReadout label="Performance Stats">
          <IconButton
            data-tip="Toggle Performance Stats"
            data-for="global"
            onClick={() => graphics.stats ? turnOffStats() : turnOnStats()}
            borderless>
            {graphics.stats ? <CheckedIcon /> : <UncheckedIcon />}
          </IconButton>
        </StyledDataReadout>

        <h3>Sound</h3>
        <StyledDataReadout label="Volume">
        </StyledDataReadout>

        <h3>Referrals</h3>
        <StyledDataReadout label="Referral Link">
          {!account && <span>Connect wallet to generate link</span>}
          {account && (
            <>
              <StyledClipboard
                component="a"
                button-href="#"
                data-clipboard-text={`${document.location.origin}?r=${account}`}>
                <Button>Click / tap to copy</Button>
              </StyledClipboard>
            </>
          )}
        </StyledDataReadout>
      </StyledSettings>
    </Details>
  );
};

export default Settinigs;
