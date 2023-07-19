import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { NoToneMapping } from 'three';

import Button from '~/components/ButtonAlt';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import { CheckedIcon, CloseIcon, UncheckedIcon } from '~/components/Icons';
import NumberInput from '~/components/NumberInput';
import DevToolContext from '~/contexts/DevToolContext';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import theme from '~/theme';
import { getModelViewerSettings, toneMaps } from '../../ModelViewer';
import { HudMenuCollapsibleSection, Scrollable } from './components';

const InnerSection = styled.div`
  & > * {
    margin-bottom: 8px;
  }

  hr {
    border-color: #3f3f40;
    margin: 12px 0;
  }
`;

const OverrideLabel = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  & > label {
    font-size: 12px;
    opacity: 0.7;
  }
`;

const Miniform = styled.div`
  display: block !important;
  margin-top: 15px;
  padding-left: 5px;
  width: 175px;
  & > label {
    display: block;
    font-size: 10px;
  }
  & > input {
    width: 100%;
  }
`;

const CheckboxRow = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: 25px;
  margin-bottom: 0;
  padding-left: 3px;
  &:hover {
    background: #222;
  }
  & > svg {
    color: ${p => p.theme.colors.main};
  }
  & > label {
    font-size: 14px;
    margin-left: 8px;
    opacity: 0.7;
  }
`;

const reader = new FileReader();

const DevTools = () => {
  const { overrides, ...setters } = useContext(DevToolContext);

  const defaultSettings = getModelViewerSettings(overrides.assetType, {});
  const settings = getModelViewerSettings(overrides.assetType, overrides);

  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const ships = useShipAssets();
  
  const fileInput = useRef();
  const uploadType = useRef();

  const [category, setCategory] = useState();
  const [categories, setCategories] = useState();
  const [categoryModels, setCategoryModels] = useState();
  const [isLoading, setIsLoading] = useState();
  const [modelSelection, setModelSelection] = useState();
  const [modelOverride, setModelOverride] = useState();

  const assets = useMemo(() => {
    if (settings.assetType === 'building') return buildings;
    if (settings.assetType === 'resource') return resources;
    if (settings.assetType === 'ship') return ships;
  }, [settings.assetType, buildings, resources, ships]);
  
  useEffect(() => {
    setCategories();
    setCategory();
    if (assets) {
      const categorySet = new Set(assets.filter((a) => !!a).map((a) => a.category || ''));
      const categoryArr = Array.from(categorySet).sort();
      setCategories(categoryArr.map((c) => ({ label: c || '(Uncategorized)', value: c })));

      const currentModel = assets.find((a) => a?.modelUrl === settings.modelUrl);
      setCategory(categoryArr.find((c) => c.value === currentModel?.category) || categoryArr[0]);
    }
  }, [assets]);

  useEffect(() => {
    if (!!assets && category !== undefined) {
      const bAssets = assets
        .filter((a) => (a.category || '') === category)
        .sort((a, b) => a.name < b.name ? -1 : 1);
      setCategoryModels(bAssets);

      const currentModel = bAssets.find((a) => a?.modelUrl === settings.modelUrl);
      setModelSelection(currentModel || bAssets[0]);
    }
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setters.setModelUrl(modelOverride?.url || modelSelection?.modelUrl);
  }, [modelOverride, modelSelection]);

  const selectModel = useCallback((m) => {
    setModelSelection(m);
  }, []);

  const handleUploadClick = useCallback((which) => () => {
    uploadType.current = which;
    fileInput.current.click();
  }, []);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (uploadType.current === 'model' && file.name.match(/\.(gltf|glb)$/i)) {
      setIsLoading(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        setModelOverride({
          name: file.name,
          url: reader.result
        });
        setIsLoading(false);
      };
    } else if (file.name.match(/\.(hdr|jpg)$/i)) {
      setIsLoading(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (uploadType.current === 'bg') {
          setters.setBackgroundOverrideName(file.name);
          setters.setBackground(reader.result);
        } else if (uploadType.current === 'env') {
          setters.setEnvmapOverrideName(file.name);
          setters.setEnvmap(reader.result);
        }
        setIsLoading(false);
      };
    } else {
      window.alert('Bad file type.');
    }
  }, []);

  const removeOverride = useCallback((which) => () => {
    if (which === 'model') {
      setModelOverride();
    } else if (which === 'bg') {
      setters.setBackground();
      setters.setBackgroundOverrideName();
    } else if (which === 'env') {
      setters.setEnvmap();
      setters.setEnvmapOverrideName();
    }
  }, []);

  const toggleSetting = useCallback((setter) => {
    setter((s) => !s);
  }, []);

  const onChangeToneMapping = useCallback((selection) => {
    setters.setToneMapping(selection?.value);
    if (selection?.value === NoToneMapping) {
      setters.setToneMappingExposure();
    }
  }, []);

  if (!process.env.REACT_APP_ENABLE_DEV_TOOLS) return null;
  return (
    <Scrollable>
      <HudMenuCollapsibleSection titleText="Viewer">
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button
            size="small"
            onClick={() => setters.setAssetType('building')}
            background={settings.assetType === 'building' ? theme.colors.main : undefined }
            style={{ minWidth: 90 }}>
            Buildings
          </Button>
          <Button
            size="small"
            onClick={() => setters.setAssetType('resource')}
            background={settings.assetType === 'resource' ? theme.colors.main : undefined }
            style={{ minWidth: 90 }}>
            Resources
          </Button>
          <Button
            size="small"
            onClick={() => setters.setAssetType('ship')}
            background={settings.assetType === 'ship' ? theme.colors.main : undefined }
            style={{ minWidth: 90 }}>
            Ships
          </Button>
        </div>
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection titleText="Model">
        <InnerSection>
          {categories?.length > 1 && (
            <Dropdown
              disabled={isLoading || modelOverride}
              options={categories}
              onChange={(c) => setCategory(c?.value)}
              size="small"
              style={{ textTransform: 'none', width: '250px' }} />
          )}
          <Dropdown
            disabled={isLoading || modelOverride}
            initialSelection={categoryModels?.find((m) => m.modelUrl === settings.modelUrl)?.i}
            labelKey="name"
            valueKey="i"
            options={categoryModels}
            onChange={(a) => selectModel(a)}
            size="small"
            style={{ textTransform: 'none', width: '250px' }} />

          <Button
            disabled={isLoading}
            onClick={handleUploadClick('model')}
            subtle>
            Upload Model
          </Button>

          {modelOverride && (
            <OverrideLabel>
              <IconButton onClick={removeOverride('model')}><CloseIcon /></IconButton>
              <label>{modelOverride.name}</label>
            </OverrideLabel>
          )}
        </InnerSection>
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection titleText="Environment">
        <InnerSection>
          <Button
            disabled={isLoading}
            onClick={handleUploadClick('bg')}
            subtle>
            Upload Skybox
          </Button>
          {overrides.background && (
            <OverrideLabel style={{ marginBottom: 20 }}>
              <IconButton onClick={removeOverride('bg')}><CloseIcon /></IconButton>
              <label>{overrides.backgroundOverrideName}</label>
            </OverrideLabel>
          )}

          <Button
            disabled={isLoading}
            onClick={handleUploadClick('env')}
            subtle>
            Upload EnvMap
          </Button>
          {overrides.envmap && (
            <OverrideLabel>
              <IconButton onClick={removeOverride('env')}><CloseIcon /></IconButton>
              <label>{overrides.envmapOverrideName}</label>
            </OverrideLabel>
          )}
        </InnerSection>
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection titleText="Other Settings">
        {/* many of these are reset on assetType change */}
        <InnerSection key={settings.assetType}>
            <CheckboxRow onClick={() => toggleSetting(setters.setEnablePostprocessing)}>
              {settings.enablePostprocessing ? <CheckedIcon /> : <UncheckedIcon />}
              <label>Bloom</label>
            </CheckboxRow>

            {settings.enablePostprocessing && (
              <div style={{ marginTop: 8 }}>
                <Dropdown
                  disabled={isLoading}
                  initialSelection={toneMaps.find((t) => t.value === settings.toneMapping)?.value}
                  options={toneMaps}
                  onChange={onChangeToneMapping}
                  size="small"
                  style={{ textTransform: 'none', width: '250px' }} />

                {settings.toneMapping !== NoToneMapping && (
                  <Miniform>
                    <label>Tone Mapping Exposure</label>
                    <NumberInput
                      disabled={isLoading}
                      initialValue={settings.toneMappingExposure}
                      min="0.5"
                      step="0.5"
                      onChange={(v) => setters.setToneMappingExposure(parseFloat(v) || 1)} />
                  </Miniform>
                )}

                <Miniform>
                  <label>Bloom Radius</label>
                  <NumberInput
                    disabled={isLoading}
                    initialValue={settings.bloomRadius}
                    min="0"
                    step="0.05"
                    onChange={(v) => setters.setBloomRadius(parseFloat(v))} />
                </Miniform>

                <Miniform>
                  <label>Bloom Strength</label>
                  <NumberInput
                    disabled={isLoading}
                    initialValue={settings.bloomStrength}
                    min="0"
                    step="0.5"
                    onChange={(v) => setters.setBloomStrength(parseFloat(v))} />
                </Miniform>
              </div>
            )}

            <CheckboxRow onClick={() => toggleSetting(setters.setEnableDefaultLights)}>
              {settings.enableDefaultLights ? <CheckedIcon /> : <UncheckedIcon />}
              <label>Additional Lighting</label>
            </CheckboxRow>

            <CheckboxRow onClick={() => toggleSetting(setters.setEnableRotation)}>
              {settings.enableRotation ? <CheckedIcon /> : <UncheckedIcon />}
              <label>Auto Rotation</label>
            </CheckboxRow>

            <CheckboxRow onClick={() => toggleSetting(setters.setEnableZoomLimits)}>
              {settings.enableZoomLimits ? <CheckedIcon /> : <UncheckedIcon />}
              <label>Camera Zoom Limits</label>
            </CheckboxRow>

            <CheckboxRow onClick={() => toggleSetting(setters.setTrackCamera)}>
              {settings.trackCamera ? <CheckedIcon /> : <UncheckedIcon />}
              <label>Track Camera</label>
            </CheckboxRow>

            <Miniform>
              <label>Env Map Strength</label>
              <NumberInput
                disabled={isLoading}
                initialValue={defaultSettings.envmapStrength}
                min="0.1"
                step="0.1"
                onChange={(v) => setters.setEnvmapStrength(parseFloat(v))} />
            </Miniform>
        </InnerSection>
      </HudMenuCollapsibleSection>

      <input
        ref={fileInput}
        onChange={handleFile}
        onClick={(e) => e.target.value = null}
        style={{ display: 'none' }}
        type="file" />
    </Scrollable>
  );
};

export default DevTools;