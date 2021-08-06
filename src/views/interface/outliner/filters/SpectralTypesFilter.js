import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { SPECTRAL_TYPES } from 'influence-utils';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import useStore from '~/hooks/useStore';

import IconButton from '~/components/IconButton'
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';

const initialValues = SPECTRAL_TYPES.map((v, k) => k);

const StyledTitle = styled.h3`
  margin-bottom: 10px !important;
`;

const FilterSection = styled.div`
  display: flex;
  justify-content: space-between;
`;

const SpectralType = styled.div`
  align-items: center;
  display: flex;
`;

const SpectralTypesFilter = (props) => {
  const { onChange } = props;

  const highlight = useStore(state => state.asteroids.highlight);
  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);

  const [ types, setTypes ] = useState(initialValues);
  const [ colors, setColors ] = useState([
    '#6efaf4',
    '#00f3ff',
    '#00ebff',
    '#00e1ff',
    '#00d5ff',
    '#00c7ff',
    '#00b6ff',
    '#50a0ff',
    '#a084ff',
    '#d65dff',
    '#ff00f2'
  ]);

  const handleHighlightToggle = () => {
    if (highlight?.field === 'spectralType') {
      updateHighlight(null);
    } else {
      updateHighlight({ field: 'spectralType', colorMap: colors });
    }
  };

  useEffect(() => {
    if (onChange) onChange({ spectralTypes: types.join(',') });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ types ]);

  const toggleType = (k) => {
    const newTypes = types.slice();
    const index = types.indexOf(k);

    if (index < 0) {
      newTypes.push(k);
    } else {
      newTypes.splice(types.indexOf(k), 1)
    }

    setTypes(newTypes);
  };

  useEffect(() => {
    if (highlight?.field === 'spectralType') updateHighlight({ field: 'spectralType', colorMap: colors });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, colors ]);

  useEffect(() => {
    return () => highlight?.field === 'spectralType' && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StyledTitle>Spectral Types</StyledTitle>
      <Highlighter
        active={highlight?.field === 'radius'}
        onClick={handleHighlightToggle} />
      {SPECTRAL_TYPES.map((v, k) => {
        return (
          <SpectralType key={k}>
            <IconButton
              onClick={() => toggleType(k)}
              borderless>
              {types.includes(k) ? <CheckedIcon /> : <UncheckedIcon />}
            </IconButton>
            <span>{v}-Type</span>
            {highlight?.field === 'spectralType' && (
              <ColorPicker initialColor={colors[k]} onChange={(c) => {
                const newColors = colors.slice(0);
                newColors[k] = c;
                setColors(newColors);
              }} />
            )}
          </SpectralType>
        );
      })}
    </>
  );
};

export default SpectralTypesFilter;
