import { useEffect, useState } from 'react';
import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import constants from '~/constants';

const initialValues = {
  radiusMin: constants.MIN_ASTEROID_RADIUS,
  radiusMax: constants.MAX_ASTEROID_RADIUS
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const RadiusFilter = (props) => {
  const { onChange } = props;
  const [ radiusMin, setRadiusMin ] = useState(initialValues.radiusMin);
  const [ radiusMax, setRadiusMax ] = useState(initialValues.radiusMax);

  useEffect(() => {
    if (onChange) onChange({ radiusMin, radiusMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ radiusMin, radiusMax ]);

  return (
    <>
      <h3>Asteroid Radius</h3>
      <DataReadout
        label="Min. Radius (m)"
        data={
          <StyledInput
            initialValue={initialValues.radiusMin}
            min={initialValues.radiusMin}
            max={initialValues.radiusMax}
            onChange={(v) => setRadiusMin(Number(v))} />
          } />
      <DataReadout
        label="Max. Radius (m)"
        data={
          <StyledInput
            initialValue={initialValues.radiusMax}
            min={initialValues.radiusMin}
            max={initialValues.radiusMax}
            onChange={(v) => setRadiusMax(Number(v))} />
          } />
    </>
  );
};

export default RadiusFilter;
