import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import ColorPicker from '~/components/ColorPicker';
import Ether from '~/components/Ether';
import formatters from '~/lib/formatters';
import constants from '~/lib/constants';
import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

const highlightFieldName = 'radius';

const initialValues = {
  radiusMin: '',
  radiusMax: ''
};

const RadiusFilter = ({ assetType, filters, onChange }) => {
  const { data: sale } = useSale();

  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [ focus, setFocus ] = useState();
  const [ radiusMin, setRadiusMin ] = useState(initialValues.radiusMin);
  const [ radiusMax, setRadiusMax ] = useState(initialValues.radiusMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(constants.MIN_ASTEROID_RADIUS, Math.min(e.currentTarget.value, constants.MAX_ASTEROID_RADIUS))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 999999))
      : '';
    if (k === 'radiusMin') {
      if (!cleansedValue || cleansedValue === constants.MIN_ASTEROID_RADIUS) {
        cleansedValue = initialValues.radiusMin;
      }
      setRadiusMin(looselyCleansedValue);
    } else if (k === 'radiusMax') {
      if (!cleansedValue || cleansedValue === constants.MAX_ASTEROID_RADIUS) {
        cleansedValue = initialValues.radiusMax;
      }
      setRadiusMax(looselyCleansedValue);
    }

    if (filters[k] !== cleansedValue) {
      onChange({
        radiusMin: filters.radiusMin,
        radiusMax: filters.radiusMax,
        [k]: cleansedValue
      });
    }
  }, [filters, onChange, radiusMax, radiusMin]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== 'radiusMin')
      setRadiusMin(filters.radiusMin || initialValues.radiusMin);
  }, [filters.radiusMin, focus]);

  useEffect(() => {
    if (focus !== 'radiusMax')
      setRadiusMax(filters.radiusMax || initialValues.radiusMax);
  }, [filters.radiusMax, focus]);

  const highlightColorRange = useMemo(() => ({
    min: radiusMin || constants.MIN_ASTEROID_RADIUS,
    max: radiusMax || constants.MAX_ASTEROID_RADIUS,
    from: colorFrom,
    to: colorTo
  }), [radiusMin, radiusMax, colorFrom, colorTo]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={['radiusMin', 'radiusMax']}
      filters={filters}
      highlightFieldName={highlightFieldName}
      title="Radius"
      highlightColorRange={highlightColorRange}>
      
      <InputBlock>
        <label>Min (m)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('radiusMin')}
            onFocus={handleFocusChange('radiusMin')}
            onChange={handleRangeChange('radiusMin')}
            placeholder={constants.MIN_ASTEROID_RADIUS.toLocaleString()}
            step={1}
            type="number"
            value={safeValue(radiusMin)} />
          {sale && <Ether>{formatters.asteroidPrice(radiusMin || constants.MIN_ASTEROID_RADIUS, sale)}</Ether>}
          {fieldHighlight && <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />}
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Max (m)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('radiusMax')}
            onFocus={handleFocusChange('radiusMax')}
            onChange={handleRangeChange('radiusMax')}
            placeholder={constants.MAX_ASTEROID_RADIUS.toLocaleString()}
            step={1}
            type="number"
            value={safeValue(radiusMax)} />
          {sale && <Ether>{formatters.asteroidPrice(radiusMax || constants.MAX_ASTEROID_RADIUS, sale)}</Ether>}
          {fieldHighlight && <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />}
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default RadiusFilter;
