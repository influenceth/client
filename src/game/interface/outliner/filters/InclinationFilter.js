import { useEffect, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';
import constants from '~/lib/constants';

const field = 'inclination';
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

  const highlight = useStore(s => s.assetSearch.asteroids.highlight);
  const updateHighlight = useStore(s => s.dispatchHighlightUpdated('asteroids'));

  const [ highlightActive, setHighlightActive ] = useState(false);
  const [ incMin, setIncMin ] = useState(initialValues.incMin);
  const [ incMax, setIncMax ] = useState(initialValues.incMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (highlightActive) {
      updateHighlight(null);
    } else {
      updateHighlight({
        field: field,
        min: Math.PI * incMin / 180,
        max: Math.PI * incMax / 180,
        from: colorFrom,
        to: colorTo
      });
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
    setHighlightActive(highlight?.field === field);
  }, [ highlight ]);

  useEffect(() => {
    if (highlightActive) {
      updateHighlight({
        field: field,
        min: Math.PI * incMin / 180,
        max: Math.PI * incMax / 180,
        from: colorFrom,
        to: colorTo
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, incMin, incMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlightActive && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h3>Orbit Inclination</h3>
      <Highlighter
        active={highlightActive}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout label="Min (deg)">
          <StyledInput
            initialValue={initialValues.incMin}
            min={initialValues.incMin}
            max={initialValues.incMax}
            step={0.01}
            onChange={(v) => setIncMin(Number(v))} />
        </DataReadout>
        {highlightActive && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout label="Max (deg)">
          <StyledInput
            initialValue={initialValues.incMax}
            min={initialValues.incMin}
            max={initialValues.incMax}
            step={0.01}
            onChange={(v) => setIncMax(Number(v))} />
        </DataReadout>
        {highlightActive && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default InclinationFilter;
