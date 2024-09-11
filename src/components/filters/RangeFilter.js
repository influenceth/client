import { useCallback, useEffect, useMemo, useState } from '~/lib/react-debug';
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
  children = null,
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
  const looseCleansingMax = useMemo(import.meta.url, () => 10 ** Math.ceil(Math.log10(rangeLimits.max)) - step, []);

  const toDisplayFormat = useCallback(import.meta.url, (x) => displayFormatter ? displayFormatter(x) : x, [displayFormatter]);
  const toSearchFormat = useCallback(import.meta.url, (x) => searchFormatter ? searchFormatter(x) : x, [searchFormatter]);

  const [ focus, setFocus ] = useState();
  const [ valueMin, setValueMin ] = useState(initialValues.min);
  const [ valueMax, setValueMax ] = useState(initialValues.max);
  const [ colorFrom, setColorFrom ] = useState(highlightColorMinMax?.min);
  const [ colorTo, setColorTo ] = useState(highlightColorMinMax?.max);

  const handleRangeChange = useCallback(import.meta.url, (k) => (e) => {
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

  const handleFocusChange = useCallback(import.meta.url, (k) => (e) => {
    setFocus(e.type === 'focus' ? k : null);
  }, []);

  useEffect(import.meta.url, () => {
    if (focus !== fieldNames.min)
      setValueMin(toDisplayFormat(filters[fieldNames.min]) || initialValues.min);
  }, [filters && filters[fieldNames.min], focus, toDisplayFormat]);

  useEffect(import.meta.url, () => {
    if (focus !== fieldNames.max)
      setValueMax(toDisplayFormat(filters[fieldNames.max]) || initialValues.max);
  }, [filters && filters[fieldNames.max], focus, toDisplayFormat]);

  const highlightColorRange = useMemo(import.meta.url, () => ({
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

      {children}

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
