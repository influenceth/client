import { useEffect, useState, useRef } from 'react';
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
`;

const EccentricityFilter = (props) => {
  const { onChange } = props;

  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);
  const highlightActive = useRef(false);

  const [ eccMin, setEccMin ] = useState(initialValues.eccMin);
  const [ eccMax, setEccMax ] = useState(initialValues.eccMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (!!highlightActive.current) {
      updateHighlight(null);
      highlightActive.current = false;
    } else {
      updateHighlight({ field: 'eccentricity', min: eccMin, max: eccMax, from: colorFrom, to: colorTo });
      highlightActive.current = true;
    }
  };

  useEffect(() => {
    if (onChange) onChange({ eccMin, eccMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ eccMin, eccMax ]);

  useEffect(() => {
    if (!!highlightActive.current) {
      updateHighlight({ field: 'eccentricity', min: eccMin, max: eccMax, from: colorFrom, to: colorTo });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, eccMin, eccMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlightActive.current && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h3>Orbit Eccentricity</h3>
      <Highlighter
        active={!!highlightActive.current}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout
          label="Min"
          data={
            <StyledInput
              initialValue={initialValues.eccMin}
              min={initialValues.eccMin}
              max={initialValues.eccMax}
              step={0.001}
              onChange={(v) => setEccMin(Number(v))} />
            } />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout
          label="Max"
          data={
            <StyledInput
              initialValue={initialValues.eccMax}
              min={initialValues.eccMin}
              max={initialValues.eccMax}
              step={0.001}
              onChange={(v) => setEccMax(Number(v))} />
            } />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default EccentricityFilter;
