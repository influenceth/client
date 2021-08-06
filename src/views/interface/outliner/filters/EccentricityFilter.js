import { useEffect, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';
import constants from '~/constants';

const initialValues = {
  eccMin: constants.MIN_ECCENTRICITY,
  eccMax: constants.MAX_ECCENTRICITY
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const FilterSection = styled.div`
  display: flex;
  justify-content: space-between;
`;

const EccentricityFilter = (props) => {
  const { onChange } = props;

  const highlight = useStore(state => state.asteroids.highlight);
  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);

  const [ eccMin, setEccMin ] = useState(initialValues.eccMin);
  const [ eccMax, setEccMax ] = useState(initialValues.eccMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (highlight?.field === 'eccentricity') {
      updateHighlight(null);
    } else {
      updateHighlight({ field: 'eccentricity', min: eccMin, max: eccMax, from: colorFrom, to: colorTo });
    }
  };

  useEffect(() => {
    if (onChange) onChange({ eccMin, eccMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ eccMin, eccMax ]);

  useEffect(() => {
    if (highlight?.field === 'eccentricity') {
      updateHighlight({ field: 'eccentricity', min: eccMin, max: eccMax, from: colorFrom, to: colorTo });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, eccMin, eccMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlight?.field === 'eccentricity' && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight ]);

  return (
    <>
      <h3>Orbit Eccentricity</h3>
      <Highlighter
        active={highlight?.field === 'eccentricity'}
        onClick={handleHighlightToggle} />
      <FilterSection>
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
        {highlight?.field === 'eccentricity' && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
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
        {highlight?.field === 'eccentricity' && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default EccentricityFilter;
