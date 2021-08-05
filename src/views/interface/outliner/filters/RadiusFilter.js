import { useEffect, useState } from 'react';
import styled from 'styled-components';

import useSale from '~/hooks/useSale';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import formatters from '~/lib/formatters';
import constants from '~/constants';

const initialValues = {
  radiusMin: constants.MIN_ASTEROID_RADIUS,
  radiusMax: constants.MAX_ASTEROID_RADIUS
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const Price = styled.span`
  color: ${props => props.theme.colors.secondaryText};
  margin-left: 10px;
`;

const RadiusFilter = (props) => {
  const { onChange } = props;
  const { data: sale } = useSale();
  const [ radiusMin, setRadiusMin ] = useState(initialValues.radiusMin);
  const [ radiusMax, setRadiusMax ] = useState(initialValues.radiusMax);

  useEffect(() => {
    if (onChange) onChange({ radiusMin, radiusMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ radiusMin, radiusMax ]);

  return (
    <>
      <h3>Asteroid Radius (Price)</h3>
      <DataReadout
        label="Min. Radius (m)"
        data={
          <>
            <StyledInput
              initialValue={initialValues.radiusMin}
              min={initialValues.radiusMin}
              max={initialValues.radiusMax}
              onChange={(v) => setRadiusMin(Number(v))} />
            <Price>({!!sale ? formatters.asteroidPrice(radiusMin, sale) : '...'} ETH)</Price>
          </>} />
      <DataReadout
        label="Max. Radius (m)"
        data={
          <>
            <StyledInput
              initialValue={initialValues.radiusMax}
              min={initialValues.radiusMin}
              max={initialValues.radiusMax}
              onChange={(v) => setRadiusMax(Number(v))} />
            <Price>({!!sale ? formatters.asteroidPrice(radiusMax, sale) : '...'} ETH)</Price>
          </>} />
    </>
  );
};

export default RadiusFilter;
