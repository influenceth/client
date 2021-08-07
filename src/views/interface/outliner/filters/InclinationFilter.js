import { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';
import constants from '~/lib/constants';

const initialValues = {
  incMin: constants.MIN_INCLINATION,
  incMax: constants.MAX_INCLINATION
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const FilterSection = styled.div`
  display: flex;
`;

const InclinationFilter = (props) => {
  const { onChange } = props;

  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);
  const highlightActive = useRef(false);

  const [ incMin, setIncMin ] = useState(initialValues.incMin);
  const [ incMax, setIncMax ] = useState(initialValues.incMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (!!highlightActive.current) {
      updateHighlight(null);
      highlightActive.current = false;
    } else {
      updateHighlight({
        field: 'inclination',
        min: Math.PI * incMin / 180,
        max: Math.PI * incMax / 180,
        from: colorFrom,
        to: colorTo
      });

      highlightActive.current = true;
    }
  };

  useEffect(() => {
    if (onChange) onChange({
      incMin: Math.PI * incMin / 180,
      incMax: Math.PI * incMax / 180
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ incMin, incMax ]);

  useEffect(() => {
    if (!!highlightActive.current) {
      updateHighlight({
        field: 'inclination',
        min: Math.PI * incMin / 180,
        max: Math.PI * incMax / 180,
        from: colorFrom,
        to: colorTo
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, incMin, incMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlightActive.current && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h3>Orbit Inclination</h3>
      <Highlighter
        active={!!highlightActive.current}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout
          label="Min (deg)"
          data={
            <StyledInput
              initialValue={initialValues.incMin}
              min={initialValues.incMin}
              max={initialValues.incMax}
              step={0.01}
              onChange={(v) => setIncMin(Number(v))} />
            } />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout
          label="Max (deg)"
          data={
            <StyledInput
              initialValue={initialValues.incMax}
              min={initialValues.incMin}
              max={initialValues.incMax}
              step={0.01}
              onChange={(v) => setIncMax(Number(v))} />
            } />
        {!!highlightActive.current && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default InclinationFilter;
