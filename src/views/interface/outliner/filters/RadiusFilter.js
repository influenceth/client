import { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import ColorPicker from '~/components/ColorPicker';
import Ether from '~/components/Ether';
import Highlighter from './Highlighter';
import formatters from '~/lib/formatters';
import constants from '~/lib/constants';

const initialValues = {
  radiusMin: constants.MIN_ASTEROID_RADIUS,
  radiusMax: constants.MAX_ASTEROID_RADIUS
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const FilterSection = styled.div`
  display: flex;
`;

const Price = styled.span`
  color: ${props => props.theme.colors.secondaryText};
  margin-left: 10px;
`;

const RadiusFilter = (props) => {
  const { onChange } = props;
  const { data: sale } = useSale();

  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);
  const highlightActive = useRef(false);

  const [ radiusMin, setRadiusMin ] = useState(initialValues.radiusMin);
  const [ radiusMax, setRadiusMax ] = useState(initialValues.radiusMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (!!highlightActive.current) {
      updateHighlight(null);
      highlightActive.current = false;
    } else {
      updateHighlight({
        field: 'radius',
        min: radiusMin,
        max: radiusMax,
        from: colorFrom,
        to: colorTo
      });

      highlightActive.current = true;
    }
  };

  useEffect(() => {
    if (onChange) onChange({ radiusMin, radiusMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ radiusMin, radiusMax ]);

  useEffect(() => {
    if (!!highlightActive.current) {
      updateHighlight({ field: 'radius', min: radiusMin, max: radiusMax, from: colorFrom, to: colorTo });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, radiusMin, radiusMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlightActive.current && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h3>Asteroid Radius (Price)</h3>
      <Highlighter
        active={!!highlightActive.current}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout
          label="Min (m)"
          data={
            <>
              <StyledInput
                initialValue={initialValues.radiusMin}
                min={initialValues.radiusMin}
                max={initialValues.radiusMax}
                onChange={(v) => setRadiusMin(Number(v))} />
              <Price>({!!sale ? formatters.asteroidPrice(radiusMin, sale) : '...'} <Ether />)</Price>
            </>} />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout
          label="Max (m)"
          data={
            <>
              <StyledInput
                initialValue={initialValues.radiusMax}
                min={initialValues.radiusMin}
                max={initialValues.radiusMax}
                onChange={(v) => setRadiusMax(Number(v))} />
              <Price>({!!sale ? formatters.asteroidPrice(radiusMax, sale) : '...'} <Ether />)</Price>
            </>} />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default RadiusFilter;
