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

const highlightFieldName = 'eccentricity';

const initialValues = {
  eccMin: '',
  eccMax: ''
};

const EccentricityFilter = ({ filters, onChange }) => {
  const highlight = useStore(s => s.asteroids.highlight) || {};
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [ focus, setFocus ] = useState();
  const [ eccMin, setEccMin ] = useState(initialValues.eccMin);
  const [ eccMax, setEccMax ] = useState(initialValues.eccMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(constants.MIN_ECCENTRICITY, Math.min(e.currentTarget.value, constants.MAX_ECCENTRICITY))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, 0.999))
      : '';
    if (k === 'eccMin') {
      if (!cleansedValue || cleansedValue === constants.MIN_ECCENTRICITY) {
        cleansedValue = initialValues.eccMin;
      }
      setEccMin(looselyCleansedValue);
    } else if (k === 'eccMax') {
      if (!cleansedValue || cleansedValue === constants.MAX_ECCENTRICITY) {
        cleansedValue = initialValues.eccMax;
      }
      setEccMax(looselyCleansedValue);
    }

    if (filters[k] !== cleansedValue) {
      onChange({
        eccMin: filters.eccMin,
        eccMax: filters.eccMax,
        [k]: cleansedValue
      });
    }
  }, [eccMax, eccMin, filters, onChange]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== 'eccMin')
      setEccMin(filters.eccMin || initialValues.eccMin);
  }, [filters?.eccMin, focus]);

  useEffect(() => {
    if (focus !== 'eccMax')
      setEccMax(filters.eccMax || initialValues.eccMax);
  }, [filters?.eccMax, focus]);

  const highlightColorRange = useMemo(() => ({
    min: eccMin || constants.MIN_ECCENTRICITY,
    max: eccMax || constants.MAX_ECCENTRICITY,
    from: colorFrom,
    to: colorTo
  }), [eccMin, eccMax, colorFrom, colorTo]);

  return (
    <SearchMenu
      collapsed={!(filters.eccMin || filters.eccMax)}
      fieldName={['eccMin', 'eccMax']}
      highlightFieldName={highlightFieldName}
      title="Orbit Eccentricity"
      highlightColorRange={highlightColorRange}>
      
      <InputBlock>
        <label>Min</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('eccMin')}
            onFocus={handleFocusChange('eccMin')}
            onChange={handleRangeChange('eccMin')}
            placeholder={constants.MIN_ECCENTRICITY.toLocaleString()}
            step={0.001}
            type="number"
            value={safeValue(eccMin)} />
          <span />
          {fieldHighlight && <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />}
        </div>
      </InputBlock>
      
      <InputBlock>
        <label>Max</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange('eccMax')}
            onFocus={handleFocusChange('eccMax')}
            onChange={handleRangeChange('eccMax')}
            placeholder={constants.MAX_ECCENTRICITY.toLocaleString()}
            step={0.001}
            type="number"
            value={safeValue(eccMax)} />
          <span />
          {fieldHighlight && <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />}
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default EccentricityFilter;
