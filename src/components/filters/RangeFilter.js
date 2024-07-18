import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import { InputBlock, SearchMenu } from './components';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

const FieldNote = styled.span`
  white-space: nowrap;
`;

const RangeFilter = ({
  assetType,
  fieldNames,
  fieldNote,
  filters,
  displayFormatter,
  inputWidth,
  searchFormatter,
  highlightColorMinMax = { min: '#73D8FF', max: '#FA28FF' },
  highlightFieldName,
  initialValues = { min: '', max: '' },
  labels = { min: 'Min', max: 'Max' },
  onChange,
  rangeLimits,
  step = 1,
  title,
}) => {
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;
  const looseCleansingMax = useMemo(() => 10 ** Math.ceil(Math.log10(rangeLimits.max)) - step, []);

  const toDisplayFormat = useCallback((x) => displayFormatter ? displayFormatter(x) : x, [displayFormatter]);
  const toSearchFormat = useCallback((x) => searchFormatter ? searchFormatter(x) : x, [searchFormatter]);

  const [ focus, setFocus ] = useState();
  const [ valueMin, setValueMin ] = useState(initialValues.min);
  const [ valueMax, setValueMax ] = useState(initialValues.max);
  const [ colorFrom, setColorFrom ] = useState(highlightColorMinMax?.min);
  const [ colorTo, setColorTo ] = useState(highlightColorMinMax?.max);

  const handleRangeChange = useCallback((k) => (e) => {
    let cleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(rangeLimits.min, Math.min(e.currentTarget.value, rangeLimits.max))
      : '';
    let looselyCleansedValue = e.currentTarget.value.toString().length > 0
      ? Math.max(0, Math.min(e.currentTarget.value, looseCleansingMax))
      : '';
    if (k === fieldNames.min) {
      if (!cleansedValue || cleansedValue === rangeLimits.min) {
        cleansedValue = initialValues.min;
      }
      setValueMin(looselyCleansedValue);
    } else if (k === fieldNames.max) {
      if (!cleansedValue || cleansedValue === rangeLimits.max) {
        cleansedValue = initialValues.max;
      }
      setValueMax(looselyCleansedValue);
    }

    if (filters[k] !== toSearchFormat(cleansedValue)) {
      onChange({
        [fieldNames.min]: filters[fieldNames.min],
        [fieldNames.max]: filters[fieldNames.max],
        [k]: toSearchFormat(cleansedValue)
      });
    }
  }, [filters, onChange, toSearchFormat]);

  const handleFocusChange = useCallback((k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(() => {
    if (focus !== fieldNames.min)
      setValueMin(toDisplayFormat(filters[fieldNames.min]) || initialValues.min);
  }, [filters && filters[fieldNames.min], focus, toDisplayFormat]);

  useEffect(() => {
    if (focus !== fieldNames.max)
      setValueMax(toDisplayFormat(filters[fieldNames.max]) || initialValues.max);
  }, [filters && filters[fieldNames.max], focus, toDisplayFormat]);

  const highlightColorRange = useMemo(() => ({
    min: toSearchFormat(valueMin || rangeLimits.min),
    max: toSearchFormat(valueMax || rangeLimits.max),
    from: colorFrom,
    to: colorTo
  }), [valueMin, valueMax, colorFrom, colorTo, toSearchFormat]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={[fieldNames.min, fieldNames.max]}
      filters={filters}
      highlightFieldName={highlightFieldName}
      title={title}
      highlightColorRange={highlightColorRange}>

      <InputBlock>
        <label>{labels.min}</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange(fieldNames.min)}
            onFocus={handleFocusChange(fieldNames.min)}
            onChange={handleRangeChange(fieldNames.min)}
            placeholder={rangeLimits.min.toLocaleString()}
            step={step}
            type="number"
            width={inputWidth}
            value={safeValue(valueMin)} />
          {fieldNote ? <FieldNote>({fieldNote(valueMin || rangeLimits.min)})</FieldNote> : <span />}
          {fieldHighlight && <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />}
        </div>
      </InputBlock>

      <InputBlock>
        <label>{labels.max}</label>
        <div>
          <UncontrolledTextInput
            onBlur={handleFocusChange(fieldNames.max)}
            onFocus={handleFocusChange(fieldNames.max)}
            onChange={handleRangeChange(fieldNames.max)}
            placeholder={rangeLimits.max.toLocaleString()}
            step={step}
            type="number"
            width={inputWidth}
            value={safeValue(valueMax)} />
          {fieldNote ? <FieldNote>({fieldNote(valueMax || rangeLimits.max)})</FieldNote> : <span />}
          {fieldHighlight && <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />}
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default RangeFilter;
