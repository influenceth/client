import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { SPECTRAL_TYPES } from '@influenceth/sdk';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton'
import ColorPicker from '~/components/ColorPicker';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

const fieldName = 'spectralType';
const highlightFieldName = 'spectralType';

const initialValues = Object.keys(SPECTRAL_TYPES).reduce((acc, k) => ({ ...acc, [k]: true }), {});

const defaultColorMap = {
  0: '#6efaf4',
  1: '#00f3ff',
  2: '#00ebff',
  3: '#00e1ff',
  4: '#00d5ff',
  5: '#00c7ff',
  6: '#00b6ff',
  7: '#50a0ff',
  8: '#a084ff',
  9: '#d65dff',
  10: '#ff00f2'
};

const SpectralTypeFilter = ({ filters, onChange, showHighlighting }) => {
  const highlight = useStore(s => s.assetSearch.asteroids.highlight || {});
  const fieldHighlight = showHighlighting && highlight && highlight.field === highlightFieldName;
  
  const [ types, setTypes ] = useState({ ...initialValues });
  const [highlightColors, setHighlightColors] = useState({ ...(fieldHighlight?.colorMap || defaultColorMap) });

  useEffect(() => {
    const newTypes = ({ ...initialValues });
    if (filters[fieldName] && filters[fieldName].length > 0) {
      const filterArr = filters[fieldName].split(',');
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
    onChange({ [fieldName]: Object.keys(newTypes).filter((k) => newTypes[k]).join(',') });
  }, [onChange, types]);

  return (
    <SearchMenu
      assetType="asteroids"
      fieldName={fieldName}
      filters={filters}
      onChange={onChange}
      highlightFieldName={showHighlighting && highlightFieldName}
      title="Spectral Type"
      highlightColorMap={highlightColors}>
      
      {SPECTRAL_TYPES.map((v, k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <CheckedIcon /> : <UncheckedIcon />}
          </CheckboxButton>
          <span>{v}-Type</span>
          {fieldHighlight && (
            <ColorPicker
              initialColor={highlightColors[k]}
              onChange={(c) => setHighlightColors((h) => ({ ...h, [k]: c }))} />
          )}
        </CheckboxRow>
      ))}
    </SearchMenu>
  );
};

export default SpectralTypeFilter;
