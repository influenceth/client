import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import formatters from '~/lib/formatters';
import constants from '~/lib/constants';
import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

const highlightFieldName = 'inclination';

const initialValues = {
  incMin: '',
  incMax: ''
};

const toRadians = (d) => d >= 0 ? Math.PI * d / 180 : undefined;
const toDegrees = (r) => r > 0 ? Math.round(100 * 180 * r / Math.PI) / 100 : '';

const InclinationFilter = ({ filters, onChange }) => {
  const highlight = useStore(s => s.assetSearch.asteroids.highlight) || {};
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [ focus, setFocus ] = useState();
  const [ incMin, setIncMin ] = useState(initialValues.incMin);
  const [ incMax, setIncMax ] = useState(initialValues.incMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(constants.MIN_INCLINATION, Math.min(e.currentTarget.value, constants.MAX_INCLINATION))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 99.99))
      : '';
    if (k === 'incMin') {
      if (!cleansedValue || cleansedValue === constants.MIN_INCLINATION) {
        cleansedValue = initialValues.incMin;
      }
      setIncMin(looselyCleansedValue);
    } else if (k === 'incMax') {
      if (!cleansedValue || cleansedValue === constants.MAX_INCLINATION) {
        cleansedValue = initialValues.incMax;
      }
      setIncMax(looselyCleansedValue);
    }

    if (filters[k] !== toRadians(cleansedValue)) {
      onChange({
        incMin: filters.incMin,
        incMax: filters.incMax,
        [k]: toRadians(cleansedValue)
      });
    }
  }, [filters, incMax, incMin, onChange]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== 'incMin')
      setIncMin(toDegrees(filters.incMin) || initialValues.incMin);
  }, [filters.incMin, focus]);

  useEffect(() => {
    if (focus !== 'incMax')
      setIncMax(toDegrees(filters.incMax) || initialValues.incMax);
  }, [filters.incMax, focus]);

  const highlightColorRange = useMemo(() => ({
    min: toRadians(incMin || constants.MIN_INCLINATION),
    max: toRadians(incMax || constants.MAX_INCLINATION),
    from: colorFrom,
    to: colorTo
  }), [incMin, incMax, colorFrom, colorTo]);

  return (
    <SearchMenu
      assetType="asteroids"
      collapsed={!(filters.incMin || filters.incMax)}
      fieldName={['incMin', 'incMax']}
      highlightFieldName={highlightFieldName}
      title="Orbit Inclination"
      highlightColorRange={highlightColorRange}>
      
      <InputBlock>
        <label>Min (Deg)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('incMin')}
            onFocus={handleFocusChange('incMin')}
            onChange={handleRangeChange('incMin')}
            placeholder={constants.MIN_INCLINATION.toLocaleString()}
            step={0.01}
            type="number"
            value={safeValue(incMin)} />
          <span />
          {fieldHighlight && <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />}
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Max (Deg)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('incMax')}
            onFocus={handleFocusChange('incMax')}
            onChange={handleRangeChange('incMax')}
            placeholder={constants.MAX_INCLINATION.toLocaleString()}
            step={0.01}
            type="number"
            value={safeValue(incMax)} />
          <span />
          {fieldHighlight && <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />}
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default InclinationFilter;
