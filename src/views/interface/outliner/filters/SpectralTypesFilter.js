import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { SPECTRAL_TYPES } from 'influence-utils';
import { FiCheckSquare as CheckedIcon, FiSquare as UncheckedIcon } from 'react-icons/fi';

import IconButton from '~/components/IconButton'

const initialValues = SPECTRAL_TYPES.map((v, k) => k);

const StyledTitle = styled.h3`
  margin-bottom: 10px !important;
`;

const SpectralType = styled.div`
  align-items: center;
  display: flex;
`;

const SpectralTypesFilter = (props) => {
  const { onChange } = props;
  const [ types, setTypes ] = useState(initialValues);

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

  return (
    <>
      <StyledTitle>Spectral Types</StyledTitle>
      {SPECTRAL_TYPES.map((v, k) => {
        return (
          <SpectralType key={k}>
            <IconButton
              onClick={() => toggleType(k)}
              borderless>
              {types.includes(k) ? <CheckedIcon /> : <UncheckedIcon />}
            </IconButton>
            <span>{v}-Type</span>
          </SpectralType>
        );
      })}
    </>
  );
};

export default SpectralTypesFilter;
