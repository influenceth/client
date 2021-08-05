import { useEffect, useState } from 'react';
import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import formatters from '~/lib/formatters';
import constants from '~/constants';

const initialValues = {
  axisMin: constants.MIN_AXIS,
  axisMax: constants.MAX_AXIS
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const Period = styled.span`
  color: ${props => props.theme.colors.secondaryText};
  margin-left: 10px;
`;

const AxisFilter = (props) => {
  const { onChange } = props;
  const [ axisMin, setAxisMin ] = useState(initialValues.axisMin);
  const [ axisMax, setAxisMax ] = useState(initialValues.axisMax);

  useEffect(() => {
    if (onChange) onChange({ axisMin, axisMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ axisMin, axisMax ]);

  const format = (num) => `${num} AU`;

  return (
    <>
      <h3>Semi-major Axis (Period)</h3>
      <DataReadout
        label="Min. Axis (AU)"
        data={
          <>
            <StyledInput
              initialValue={initialValues.axisMin}
              min={initialValues.axisMin}
              max={initialValues.axisMax}
              step={0.001}
              format={format}
              onChange={(v) => setAxisMin(Number(v))} />
            <Period>({formatters.period(axisMin)})</Period>
          </>} />
      <DataReadout
        label="Max. Axis (AU)"
        data={
          <>
            <StyledInput
              initialValue={initialValues.axisMax}
              min={initialValues.axisMin}
              max={initialValues.axisMax}
              step={0.001}
              format={format}
              onChange={(v) => setAxisMax(Number(v))} />
            <Period>({formatters.period(axisMax)})</Period>
          </>} />
    </>
  );
};

export default AxisFilter;
