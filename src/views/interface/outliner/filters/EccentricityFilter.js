import { useEffect, useState } from 'react';
import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import constants from '~/constants';

const initialValues = {
  eccMin: constants.MIN_ECCENTRICITY,
  eccMax: constants.MAX_ECCENTRICITY
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const EccentricityFilter = (props) => {
  const { onChange } = props;
  const [ eccMin, setEccMin ] = useState(initialValues.eccMin);
  const [ eccMax, setEccMax ] = useState(initialValues.eccMax);

  useEffect(() => {
    if (onChange) onChange({ eccMin, eccMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ eccMin, eccMax ]);

  return (
    <>
      <h3>Orbit Eccentricity</h3>
      <DataReadout
        label="Min. Eccentricity"
        data={
          <StyledInput
            initialValue={initialValues.eccMin}
            min={initialValues.eccMin}
            max={initialValues.eccMax}
            step={0.001}
            onChange={(v) => setEccMin(Number(v))} />
          } />
      <DataReadout
        label="Max. Eccentricity"
        data={
          <StyledInput
            initialValue={initialValues.eccMax}
            min={initialValues.eccMin}
            max={initialValues.eccMax}
            step={0.001}
            onChange={(v) => setEccMax(Number(v))} />
          } />
    </>
  );
};

export default EccentricityFilter;
