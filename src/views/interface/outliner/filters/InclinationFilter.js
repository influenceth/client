import { useEffect, useState } from 'react';
import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import constants from '~/constants';

const initialValues = {
  incMin: constants.MIN_INCLINATION,
  incMax: constants.MAX_INCLINATION
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const InclinationFilter = (props) => {
  const { onChange } = props;
  const [ incMin, setIncMin ] = useState(initialValues.incMin);
  const [ incMax, setIncMax ] = useState(initialValues.incMax);

  useEffect(() => {
    if (onChange) onChange({
      incMin: Math.PI * incMin / 180,
      incMax: Math.PI * incMax / 180
    });
  }, [ onChange, incMin, incMax ]);

  return (
    <>
      <h3>Orbit Inclination</h3>
      <DataReadout
        label="Min. Inclination (deg)"
        data={
          <StyledInput
            initialValue={initialValues.incMin}
            min={initialValues.incMin}
            max={initialValues.incMax}
            step={0.01}
            onChange={(v) => setIncMin(Number(v))} />
          } />
      <DataReadout
        label="Max. Inclination (deg)"
        data={
          <StyledInput
            initialValue={initialValues.incMax}
            min={initialValues.incMin}
            max={initialValues.incMax}
            step={0.01}
            onChange={(v) => setIncMax(Number(v))} />
          } />
    </>
  );
};

export default InclinationFilter;
