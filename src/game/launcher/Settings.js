import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import screenfull from 'screenfull';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';
import { useDetectGPU } from '@react-three/drei';

import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useReferralsCount from '~/hooks/useReferralsCount';
import useScreenSize from '~/hooks/useScreenSize';
import CopyReferralLink from '~/components/CopyReferralLink';
import DataReadout from '~/components/DataReadout';
import Button from '~/components/ButtonPill';
import IconButton from '~/components/IconButton';
import NumberInput from '~/components/NumberInput';
import Range from '~/components/Range';
import constants from '~/lib/constants';

const { ENABLE_SHADOWS, MIN_FOV, MAX_FOV } = constants;

const StyledSettings = styled.div`
  height: 100%;
  width: 100%;
`;

const Section = styled.div`
  padding-bottom: 12px;
  & > h3 {
    border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
    color: white;
    font-size: 18px;
    margin: 0 0 8px;
    padding-bottom: 8px;
    text-transform: uppercase;
  }
  & > div {
    background-color: black;
    padding: 20px 10px;
  }

  &:last-child {
    padding-bottom: 0;
    & > div {
      padding-bottom: 10px;
    }
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
  padding: 7px 0 7px 15px;

  & label {
    width: 175px;
  }

  & span {
    align-items: center;
    display: flex;
    flex: 1 0 auto;
  }
`;

const AutodetectButton = styled(Button)`
  border: 0;
  & > svg: {
    display: none;
  }
`;

const Settings = () => {
  const gpuInfo = useDetectGPU();

  const { authenticated } = useSession();
  const { isMobile } = useScreenSize();
  const { data: referralsCount } = useReferralsCount();
  const graphics = useStore(s => s.graphics);
  const sounds = useStore(s => s.sounds);
  const turnOnSkybox = useStore(s => s.dispatchSkyboxUnhidden);
  const turnOffSkybox = useStore(s => s.dispatchSkyboxHidden);
  const turnOnLensflare = useStore(s => s.dispatchLensflareUnhidden);
  const turnOffLensflare = useStore(s => s.dispatchLensflareHidden);
  const setAutodetect = useStore(s => s.dispatchGraphicsAutodetectSet);
  const setPixelRatio = useStore(s => s.dispatchPixelRatio);
  const setShadowQuality = useStore(s => s.dispatchShadowQualitySet);
  const setTextureQuality = useStore(s => s.dispatchTextureQualitySet);
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

  const toggleAutodetectGraphics = () => {
    setAutodetect(!graphics.autodetect, gpuInfo);
  };

  const pixelRatioOptions = useMemo(() => {
    const options = new Set();

    // add device settings and current selection always
    if (graphics.pixelRatio) options.add(graphics.pixelRatio);
    options.add(window.devicePixelRatio);

    // add others dynamically
    options.add(0.5);
    options.add(1);
    if (window.devicePixelRatio >= 2) options.add(2);
    if (window.devicePixelRatio >= 4) options.add(4);
    if (window.devicePixelRatio >= 8) options.add(8);

    return Array.from(options).sort();
  }, [graphics?.pixelRatio]);

  return (
    <StyledSettings>
      {!isMobile && (
        <Section>
          <h3>Graphics</h3>
          <div>
            <StyledDataReadout label="Texture Quality">
              <ControlGroup>
                <Button
                  active={!graphics.textureQuality || graphics.textureQuality === 1}
                  disabled={graphics.autodetect}
                  onClick={() => setTextureQuality(1)}>
                  Low
                </Button>
                <Button
                  active={graphics.textureQuality === 2}
                  disabled={graphics.autodetect}
                  onClick={() => setTextureQuality(2)}>
                  Medium
                </Button>
                <Button
                  active={graphics.textureQuality === 3}
                  disabled={graphics.autodetect}
                  onClick={() => setTextureQuality(3)}>
                  High
                </Button>
                <AutodetectButton
                  active={graphics.autodetect}
                  onClick={toggleAutodetectGraphics}>
                  {graphics.autodetect ? <CheckedIcon /> : <UncheckedIcon />}
                  Autodetect
                </AutodetectButton>
              </ControlGroup>
            </StyledDataReadout>

            <StyledDataReadout label="Render Pixel Ratio">
              <ControlGroup>
                {pixelRatioOptions.map((option) => (
                  <Button
                    key={option}
                    active={graphics.pixelRatio === option || (!graphics.pixelRatio && option === 1)}
                    onClick={() => setPixelRatio(option)}>
                    {option}x
                  </Button>
                ))}
              </ControlGroup>
            </StyledDataReadout>

            {ENABLE_SHADOWS && (
              <>
                <StyledDataReadout label="Dynamic Shadows">
                  <IconButton
                    data-tip="Toggle Shadows"
                    data-for="global"
                    onClick={() => setShadowQuality(graphics.shadowQuality > 0 ? 0 : 1)}
                    borderless>
                    {graphics.shadowQuality > 0 ? <CheckedIcon /> : <UncheckedIcon />}
                  </IconButton>
                </StyledDataReadout>
                {graphics.shadowQuality > 0 && (
                  <StyledDataReadout label="Shadow Quality">
                    <ControlGroup>
                      <Button
                        active={graphics.shadowQuality === 1}
                        onClick={() => setShadowQuality(1)}>
                        Low
                      </Button>
                      <Button
                        active={graphics.shadowQuality === 2}
                        onClick={() => setShadowQuality(2)}>
                        Medium
                      </Button>
                      <Button
                        active={graphics.shadowQuality === 3}
                        onClick={() => setShadowQuality(3)}>
                        High
                      </Button>
                    </ControlGroup>
                  </StyledDataReadout>
                )}
              </>
            )}
            <StyledDataReadout label="Field of View">
              <ControlGroup>
                <NumberInput
                  initialValue={graphics.fov}
                  onChange={v => setLocalFOV(v)}
                  min={MIN_FOV}
                  max={MAX_FOV} />
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
          </div>
        </Section>
      )}

      <Section>
        <h3>Sound</h3>
        <div>
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
        </div>
      </Section>

      <Section>
        <h3>Recruitment</h3>
        <div>
          <StyledDataReadout label="Recruitment Link">
            <CopyReferralLink
              fallbackContent={(
                <span>Connect wallet to generate link</span>
              )}>
              <Button>Generate Link</Button>
            </CopyReferralLink>
          </StyledDataReadout>
          {authenticated && (
            <StyledDataReadout label="Recruitments Count">{referralsCount || 0}</StyledDataReadout>
          )}
        </div>
      </Section>
    </StyledSettings>
  );
};

export default Settings;
