import { useCallback, useEffect, useState } from 'react';

import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

const initialValues = {
  yieldMin: '',
  yieldMax: ''
};

const TonnageFilter = ({ filters, onChange }) => {
  const [ focus, setFocus ] = useState();
  const [ yieldMin, setYieldMin ] = useState(initialValues.yieldMin);
  const [ yieldMax, setYieldMax ] = useState(initialValues.yieldMax);

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 10000))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 999999))
      : '';
    if (k === 'yieldMin') {
      if (!cleansedValue || cleansedValue === 0) {
        cleansedValue = initialValues.yieldMin;
      }
      setYieldMin(looselyCleansedValue);
    } else if (k === 'yieldMax') {
      if (!cleansedValue || cleansedValue === 10000) {
        cleansedValue = initialValues.yieldMax;
      }
      setYieldMax(looselyCleansedValue);
    }

    if (filters[k] !== cleansedValue) {
      onChange({
        yieldMin: filters.yieldMin,
        yieldMax: filters.yieldMax,
        [k]: cleansedValue
      });
    }
  }, [filters, onChange, yieldMax, yieldMin]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== 'yieldMin')
      setYieldMin(filters.yieldMin || initialValues.yieldMin);
  }, [filters.yieldMin, focus]);

  useEffect(() => {
    if (focus !== 'yieldMax')
      setYieldMax(filters.yieldMax || initialValues.yieldMax);
  }, [filters.yieldMax, focus]);

  return (
    <SearchMenu
      assetType="coresamples"
      fieldName={['yieldMin', 'yieldMax']}
      filters={filters}
      onChange={onChange}
      title="Yield">
      
      <InputBlock>
        <label>Min (tonnes)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('yieldMin')}
            onFocus={handleFocusChange('yieldMin')}
            onChange={handleRangeChange('yieldMin')}
            placeholder={0}
            step={1}
            type="number"
            value={safeValue(yieldMin)} />
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Max (tonnes)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('yieldMax')}
            onFocus={handleFocusChange('yieldMax')}
            onChange={handleRangeChange('yieldMax')}
            placeholder={`10,000`}
            step={1}
            type="number"
            value={safeValue(yieldMax)} />
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default TonnageFilter;
