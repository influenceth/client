import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import formatters from '~/lib/formatters';
import constants from '~/lib/constants';
import { SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

const Period = styled.span``;

const InputBlock = styled.div`
  padding-bottom: 12px;
  &:last-child {
    padding-bottom: 0;
  }

  label {
    font-size: 13px;
    margin-bottom: 4px;
    opacity: 0.5;
  }
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-top: 6px;
    width: 100%;

    & > span {
      flex: 1;
      font-size: 90%;
      opacity: 0.5;
      padding-left: 8px;
      transition: opacity 250ms ease;
    }

    input:focus + span {
      opacity: 1;
    }
  }
`;

const highlightFieldName = 'axis';

const initialValues = {
  axisMin: '',
  axisMax: ''
};

const AxisFilter = ({ filters, onChange }) => {
  const highlight = useStore(s => s.asteroids.highlight) || {};
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [ focus, setFocus ] = useState();
  const [ axisMin, setAxisMin ] = useState(initialValues.axisMin);
  const [ axisMax, setAxisMax ] = useState(initialValues.axisMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(constants.MIN_AXIS, Math.min(e.currentTarget.value, constants.MAX_AXIS))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 9.9))
      : '';
    if (k === 'axisMin') {
      if (!cleansedValue || cleansedValue === constants.MIN_AXIS) {
        cleansedValue = initialValues.axisMin;
      }
      setAxisMin(looselyCleansedValue);
    } else if (k === 'axisMax') {
      if (!cleansedValue || cleansedValue === constants.MAX_AXIS) {
        cleansedValue = initialValues.axisMax;
      }
      setAxisMax(looselyCleansedValue);
    }

    if (filters[k] !== cleansedValue) {
      onChange({
        axisMin: filters.axisMin,
        axisMax: filters.axisMax,
        [k]: cleansedValue
      });
    }
  }, [axisMax, axisMin, filters, onChange]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== 'axisMin')
      setAxisMin(filters.axisMin || initialValues.axisMin);
  }, [filters?.axisMin, focus]);

  useEffect(() => {
    if (focus !== 'axisMax')
      setAxisMax(filters.axisMax || initialValues.axisMax);
  }, [filters?.axisMax, focus]);

  const highlightColorRange = useMemo(() => ({
    min: axisMin || constants.MIN_AXIS,
    max: axisMax || constants.MAX_AXIS,
    from: colorFrom,
    to: colorTo
  }), [axisMin, axisMax, colorFrom, colorTo]);

  return (
    <SearchMenu
      collapsed={!(filters.axisMin || filters.axisMax)}
      fieldName={['axisMin', 'axisMax']}
      highlightFieldName={highlightFieldName}
      title="Semi-major Axis"
      highlightColorRange={highlightColorRange}>
      
      <InputBlock>
        <label>Min (AU)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('axisMin')}
            onFocus={handleFocusChange('axisMin')}
            onChange={handleRangeChange('axisMin')}
            placeholder={constants.MIN_AXIS.toLocaleString()}
            step={0.1}
            type="number"
            value={safeValue(axisMin)} />
          <Period>({formatters.period(axisMin || constants.MIN_AXIS)})</Period>
          {fieldHighlight && <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />}
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Max (AU)</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('axisMax')}
            onFocus={handleFocusChange('axisMax')}
            onChange={handleRangeChange('axisMax')}
            placeholder={constants.MAX_AXIS.toLocaleString()}
            step={0.1}
            type="number"
            value={safeValue(axisMax)} />
          <Period>({formatters.period(axisMax || constants.MAX_AXIS)})</Period>
          {fieldHighlight && <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />}
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default AxisFilter;
