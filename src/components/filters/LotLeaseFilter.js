import { useCallback, useEffect, useState } from 'react';

import useStore from '~/hooks/useStore';
import ColorPicker from '~/components/ColorPicker';
import { RadioCheckedIcon, RadioUncheckedIcon } from '~/components/Icons';
import { CheckboxButton, CheckboxRow, SearchMenu } from './components';

export const options = {
  unleaseable: "Unleaseable",
  leaseable: "Leaseable",
  leased: "Leased",
};

const initialValues = {
  unleaseable: null,
  leaseable: null,
  leased: null
};

const defaultColorMap = {
  unleaseable: '#00c7ff',
  leaseable: '#ffcccc',
  leased: '#ffffff',
};

const fieldName = 'leasability';
const highlightFieldName = 'leasability';

const LotLeaseFilter = ({ assetType, filters, onChange }) => {
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const fieldHighlight = highlight && highlight.field === highlightFieldName;

  const [types, setTypes] = useState(initialValues);
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
    onChange({ [fieldName]: k });
  }, [onChange]);

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      highlightFieldName={highlightFieldName}
      title="Leasing"
      highlightColorMap={highlightColors}>
      {Object.keys(options).map((k) => (
        <CheckboxRow key={k} onClick={onClick(k)}>
          <CheckboxButton checked={types[k]}>
            {types[k] ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
          </CheckboxButton>
          <span>{options[k]}</span>
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

export default LotLeaseFilter;
