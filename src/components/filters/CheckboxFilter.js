import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { SPECTRAL_TYPES } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton'
import ColorPicker from '~/components/ColorPicker';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

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
    if (filters[fieldName] && filters[fieldName].length > 0) {
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
    </SearchMenu>
  );
};

export default CheckboxFilter;
