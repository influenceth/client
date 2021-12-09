import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import screenfull from 'screenfull';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';
import useReferralsCount from '~/hooks/useReferralsCount';
import useScreenSize from '~/hooks/useScreenSize';
import CopyReferralLink from '~/components/CopyReferralLink';
import Details from '~/components/Details';
import DataReadout from '~/components/DataReadout';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import NumberInput from '~/components/NumberInput';
import Range from '~/components/Range';

const StyledSettings = styled.div`
  padding-left: 15px;

  & h3 {
    border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
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
    width: 175px;
  }

  & span {
    align-items: center;
    display: flex;
    flex: 1 0 auto;
  }
`;


const Settings = (props) => {
  const { account } = useWeb3React();
  const { isMobile } = useScreenSize();
  const { data: referralsCount } = useReferralsCount();
  const graphics = useStore(s => s.graphics);
  const sounds = useStore(s => s.sounds);
  const setTextureSize = useStore(s => s.dispatchTextureSizeSet);
  const turnOnSkybox = useStore(s => s.dispatchSkyboxUnhidden);
  const turnOffSkybox = useStore(s => s.dispatchSkyboxHidden);
  const turnOnLensflare = useStore(s => s.dispatchLensflareUnhidden);
  const turnOffLensflare = useStore(s => s.dispatchLensflareHidden);
  const turnOnShadows = useStore(s => s.dispatchShadowsOn);
  const turnOffShadows = useStore(s => s.dispatchShadowsOff);
  const setShadowSize = useStore(s => s.dispatchShadowSizeSet);
  const setFOV = useStore(s => s.dispatchFOVSet);
  const turnOnStats = useStore(s => s.dispatchStatsOn);
  const turnOffStats = useStore(s => s.dispatchStatsOff);
  const adjustMusicVolume = useStore(s => s.dispatchMusicVolumeSet);
  const adjustEffectsVolume = useStore(s => s.dispatchEffectsVolumeSet);

  const [ localFOV, setLocalFOV ] = useState(graphics.fov);
  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
      });
    }
  }, []);

  return (
    <Details title="Settings">
      <StyledSettings>
        {!isMobile && (
          <>
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
                    active={graphics.shadowSize === 4096}
                    onClick={() => setShadowSize(4096)}>
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
            {screenfull.isEnabled && (
              <StyledDataReadout label="Fullscreen">
                <IconButton
                  data-tip="Toggle Fullscreen"
                  data-for="global"
                  onClick={() => fullscreen ? screenfull.exit() : screenfull.request()}
                  borderless>
                  {fullscreen ? <CheckedIcon /> : <UncheckedIcon />}
                </IconButton>
              </StyledDataReadout>
            )}
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
          </>
        )}

        <h3>Sound</h3>
        <StyledDataReadout label="Music Volume">
          <Range
            type="slider"
            min={0}
            max={100}
            defaultValue={sounds.music}
            onChange={adjustMusicVolume} />
        </StyledDataReadout>
        <StyledDataReadout label="Effects Volume">
          <Range
            type="slider"
            min={0}
            max={100}
            defaultValue={sounds.effects}
            onChange={adjustEffectsVolume} />
        </StyledDataReadout>

        <h3>Recruitment</h3>
        <StyledDataReadout label="Recruitment Link">
          <CopyReferralLink
            fallbackContent={(
              <span>Connect wallet to generate link</span>
            )}>
            <Button>Click / tap to copy</Button>
          </CopyReferralLink>
        </StyledDataReadout>
        {account && (
          <StyledDataReadout label="Completed Recruitments">{referralsCount}</StyledDataReadout>
        )}
      </StyledSettings>
    </Details>
  );
};

export default Settings;
