import { useEffect, useState } from 'react';
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

const field = 'radius';
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

  const highlight = useStore(state => state.asteroids.highlight);
  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);

  const [ highlightActive, setHighlightActive ] = useState(false);
  const [ radiusMin, setRadiusMin ] = useState(initialValues.radiusMin);
  const [ radiusMax, setRadiusMax ] = useState(initialValues.radiusMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (highlightActive) {
      updateHighlight(null);
    } else {
      updateHighlight({
        field: field,
        min: radiusMin,
        max: radiusMax,
        from: colorFrom,
        to: colorTo
      });
    }
  };

  useEffect(() => {
    if (onChange) onChange({ radiusMin, radiusMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ radiusMin, radiusMax ]);

  useEffect(() => {
    setHighlightActive(highlight?.field === field);
  }, [ highlight ]);

  useEffect(() => {
    if (highlightActive) {
      updateHighlight({ field: field, min: radiusMin, max: radiusMax, from: colorFrom, to: colorTo });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, radiusMin, radiusMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlightActive && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h3>Asteroid Radius (Price)</h3>
      <Highlighter
        active={highlightActive}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout label="Min (m)">
          <>
            <StyledInput
              initialValue={initialValues.radiusMin}
              min={initialValues.radiusMin}
              max={initialValues.radiusMax}
              onChange={(v) => setRadiusMin(Number(v))} />
            <Price>({!!sale ? formatters.asteroidPrice(radiusMin, sale) : '...'} <Ether />)</Price>
          </>
        </DataReadout>
        {highlightActive && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout label="Max (m)">
          <>
            <StyledInput
              initialValue={initialValues.radiusMax}
              min={initialValues.radiusMin}
              max={initialValues.radiusMax}
              onChange={(v) => setRadiusMax(Number(v))} />
            <Price>({!!sale ? formatters.asteroidPrice(radiusMax, sale) : '...'} <Ether />)</Price>
          </>
        </DataReadout>
        {highlightActive && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default RadiusFilter;
