import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const SelectAllRow = styled.div`
  align-items: center;
  color: #555;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 12px;
  justify-content: flex-end;
  padding: 2px 0;
  transition: color 250ms ease;
  &:hover {
    color: ${p => p.theme.colors.main};
    text-decoration: underline;
  }
`;

const CheckboxFilter = ({
  assetType,
  filters,
  onChange, 
  title,
  options,
  fieldName,
  highlightFieldName,
  defaultColorMap
}) => {
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;
  
  const initialValues = useMemo(() => {
    return options.reduce((acc, { key, initialValue }) => ({ ...acc, [key]: initialValue }), {});
  }, [options]);
  
  const [ types, setTypes ] = useState({ ...initialValues });
  const [highlightColors, setHighlightColors] = useState({ ...(fieldHighlight?.colorMap || defaultColorMap) });

  useEffect(() => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] !== undefined) {
      const filterArr = filters[fieldName];
      Object.keys(newTypes).forEach((k) => {
        newTypes[k] = filterArr.includes(k);
      });
    }
    setTypes(newTypes);
  }, [filters[fieldName]]);

  const onClick = useCallback((k) => (e) => {
    e.stopPropagation();
    const newTypes = {
      ...types,
      [k]: !types[k]
    }
    onChange({ [fieldName]: Object.keys(newTypes).filter((k) => newTypes[k]) });
  }, [onChange, types]);

  const toggleAllMode = useMemo(() => {
    let selectedTally = (filters[fieldName] !== undefined)
      ? filters[fieldName].length
      : options.length;
    return selectedTally < options.length / 2;
  }, [filters[fieldName]])

  const toggleAll = useCallback(() => {
    onChange({ [fieldName]: toggleAllMode ? Object.keys(types) : [] });
  }, [toggleAllMode, fieldName]);

  const toggleAllLabel = useMemo(() => {
    if (options.length > 3) {
      return toggleAllMode ? 'Select All' : 'Deselect All';
    }
    return null;
  }, [toggleAllMode]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      highlightFieldName={highlightFieldName}
      title={title}
      highlightColorMap={highlightColors}>
      
      {options.map(({ key, label }) => (
        <CheckboxRow key={key} onClick={onClick(key)}>
          <CheckboxButton checked={types[key]}>
            {types[key] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{label}</span>
          {fieldHighlight && (
            <ColorPicker
              initialColor={highlightColors[key]}
              onChange={(c) => setHighlightColors((h) => ({ ...h, [key]: c }))} />
          )}
        </CheckboxRow>
      ))}

      {toggleAllLabel && (
        <SelectAllRow onClick={toggleAll}>{toggleAllLabel}</SelectAllRow>
      )}
      
    </SearchMenu>
  );
};

export default CheckboxFilter;
