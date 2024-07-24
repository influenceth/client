import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import screenfull from 'screenfull';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';
import { useDetectGPU } from '@react-three/drei';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import DataReadout from '~/components/DataReadout';
import Button from '~/components/ButtonPill';
import IconButton from '~/components/IconButton';
import NumberInput from '~/components/NumberInput';
import Range from '~/components/Range';
import constants from '~/lib/constants';
import LauncherDialog from './components/LauncherDialog';
import useCrewContext from '~/hooks/useCrewContext';
import useSession from '~/hooks/useSession';

const { ENABLE_SHADOWS, MIN_FOV, MAX_FOV } = constants;

const StyledSettings = styled.div`
  max-width: 100%;
  padding: 30px 20px;
  width: 720px;
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
    ${p => p.wide
      ? 'width: auto; white-space: nowrap;'
      : 'width: 175px;'
    }
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

const CheckboxRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  margin-bottom: 20px;
  & > label {
    color: #A0A0A0;
    flex: 0 0 200px;
  }
  & > div {
    align-items: center;
    cursor: ${p => p.theme.cursors.active};
    display: flex;
    flex-direction: row;
    flex: 1;
    padding: 8px 0;
    & > svg {
      color: ${p => p.theme.colors.main};
      flex: 0 0 48px;
      font-size: 20px;
    }
    & > span {
      color: #656565;
    }
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const GraphicsPane = () => {
  const gpuInfo = useDetectGPU();

  const { isMobile } = useScreenSize();
  const graphics = useStore(s => s.graphics);
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
                    data-tooltip-content="Toggle Shadows"
                    data-tooltip-id="globalTooltip"
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
                  data-tooltip-content="Toggle Fullscreen"
                  data-tooltip-id="globalTooltip"
                  onClick={() => fullscreen ? screenfull.exit() : screenfull.request()}
                  borderless>
                  {fullscreen ? <CheckedIcon /> : <UncheckedIcon />}
                </IconButton>
              </StyledDataReadout>
            )}
            <StyledDataReadout label="Skybox">
              <IconButton
                data-tooltip-content="Toggle Skybox"
                data-tooltip-id="globalTooltip"
                onClick={() => graphics.skybox ? turnOffSkybox() : turnOnSkybox()}
                borderless>
                {graphics.skybox ? <CheckedIcon /> : <UncheckedIcon />}
              </IconButton>
            </StyledDataReadout>
            <StyledDataReadout label="Stellar Lensflare">
              <IconButton
                data-tooltip-content="Toggle Stellar Lensflare"
                data-tooltip-id="globalTooltip"
                onClick={() => graphics.lensflare ? turnOffLensflare() : turnOnLensflare()}
                borderless>
                {graphics.lensflare ? <CheckedIcon /> : <UncheckedIcon />}
              </IconButton>
            </StyledDataReadout>
            <StyledDataReadout label="Performance Stats">
              <IconButton
                data-tooltip-content="Toggle Performance Stats"
                data-tooltip-id="globalTooltip"
                onClick={() => graphics.stats ? turnOffStats() : turnOnStats()}
                borderless>
                {graphics.stats ? <CheckedIcon /> : <UncheckedIcon />}
              </IconButton>
            </StyledDataReadout>
          </div>
        </Section>
      )}
    </StyledSettings>
  );
}

const SoundPane = () => {
  const sounds = useStore(s => s.sounds);
  const adjustMusicVolume = useStore(s => s.dispatchMusicVolumeSet);
  const adjustEffectsVolume = useStore(s => s.dispatchEffectsVolumeSet);

  return (
    <StyledSettings>
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
    </StyledSettings>
  );
}

const GameplayPane = () => {
  const { authenticated } = useSession();
  const { crew } = useCrewContext();

  const crewTutorials = useStore(s => s.crewTutorials);
  const gameplay = useStore(s => s.gameplay);
  const toggleAutoswap = useStore(s => s.dispatchAutoswapEnabled);
  const dispatchDismissCrewTutorial = useStore(s => s.dispatchDismissCrewTutorial);
  const dispatchTutorialDisabled = useStore(s => s.dispatchTutorialDisabled);
  
  const tutorialIsDisabled = useMemo(() => {
    if (gameplay.dismissTutorial) {
      return true;
    } else if (crewTutorials?.[crew?.id]?.dismissed) {
      return true;
    }
    return false;
  }, [crew, crewTutorials, gameplay.dismissTutorial]);

  const toggleTutorialDisabled = useCallback((which) => {
    // disable setting only (i.e. not crew-specific)
    if (which) {
      dispatchTutorialDisabled(true);

    // else, to ensure visible, crewTutorial and setting both must be enabled
    } else {
      if (crewTutorials?.[crew?.id]?.dismissed) {
        dispatchDismissCrewTutorial(crew?.id, false);
      }
      dispatchTutorialDisabled(false);
    }
  }, [crew, crewTutorials, gameplay.dismissTutorial]);

  return (
    <StyledSettings>
      <Section>
        <h3>Gameplay</h3>
        <div>
          <CheckboxRow>
            <label>Autoswap ETH ⇌ USDC:</label>
            <div onClick={() => toggleAutoswap(!gameplay.autoswap)}>
              {gameplay.autoswap ? <CheckedIcon /> : <UncheckedIcon />}
              <span>
                Automatically swap ETH ⇌ USDC as needed for purchases. Swap requests
                for the appropriate amount will be included with the purchase request.
              </span>
            </div>
          </CheckboxRow>

          {/* <CheckboxRow>
            <label>Show Welcome Tour:</label>
            <div onClick={() => dispatchWelcomeTourDisabled(!gameplay.dismissWelcomeTour)}>
              {!gameplay.dismissWelcomeTour ? <CheckedIcon /> : <UncheckedIcon />}
              <span>
                Shows the Welcome Tour when navigating the client while logged out.
              </span>
            </div>
          </CheckboxRow> */}

          {authenticated && (
            <CheckboxRow>
              <label>Show Tutorial:</label>
              <div onClick={() => toggleTutorialDisabled(!tutorialIsDisabled)}>
                {!tutorialIsDisabled ? <CheckedIcon /> : <UncheckedIcon />}
                <span>
                  Shows all completeable steps in the tutorial (if any).
                </span>
              </div>
            </CheckboxRow>
          )}
        </div>
      </Section>
    </StyledSettings>
  );
}

// TODO: connect these
const menuShortcuts = [
  { label: 'Play Menu', shortcut: 'Ctrl + -' },
  { label: 'Settings Menu', shortcut: 'Ctrl + 1' },
  { label: 'Help Menu', shortcut: 'Ctrl + 2' },
  { label: 'Store Menu', shortcut: 'Ctrl + 3' },
  { label: 'Rewards Menu', shortcut: 'Ctrl + 4' },
];
const cameraShortcuts = [
  { label: 'Recenter Selected Lot', shortcut: 'Ctrl + .' },
  { label: 'Camera to North', shortcut: 'Ctrl + \\' },
  { label: 'Hide / Show HUD', shortcut: 'Ctrl + F9' },
];

const Shortcut = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: 20px;
  padding-left: 20px;
  & > label {
    color: #888;
  }
  & > span {
    color: white;
  }
`;

const ShortcutsPane = () => {
  return (
    <StyledSettings>
      <Section>
        <h3>Menus</h3>
        <div>
          {menuShortcuts.map(({ label, shortcut }) => (
            <Shortcut key={label}>
              <label>{label}</label>
              <span>{shortcut}</span>
            </Shortcut>
          ))}
        </div>
      </Section>
      <Section>
        <h3>Camera</h3>
        <div>
          {cameraShortcuts.map(({ label, shortcut }) => (
            <Shortcut key={label}>
              <label>{label}</label>
              <span>{shortcut}</span>
            </Shortcut>
          ))}
        </div>
      </Section>
    </StyledSettings>
  );
}

const panes = [
  {
    label: 'Graphics',
    pane: <GraphicsPane />
  },
  {
    label: 'Sound',
    pane: <SoundPane />
  },
  {
    label: 'Gameplay',
    pane: <GameplayPane />
  },
  {
    label: 'Keyboard Shortcuts',
    pane: <ShortcutsPane />
  }
];

const Settings = () => <LauncherDialog panes={panes} />;

export default Settings;
