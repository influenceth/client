import { useEffect, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import DataReadout from '~/components/DataReadout';
import NumberInput from '~/components/NumberInput';
import ColorPicker from '~/components/ColorPicker';
import Highlighter from './Highlighter';
import formatters from '~/lib/formatters';
import constants from '~/constants';

const initialValues = {
  axisMin: constants.MIN_AXIS,
  axisMax: constants.MAX_AXIS
};

const StyledInput = styled(NumberInput)`
  height: 24px;
`;

const FilterSection = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Period = styled.span`
  color: ${props => props.theme.colors.secondaryText};
  margin-left: 10px;
`;

const AxisFilter = (props) => {
  const { onChange } = props;

  const highlight = useStore(state => state.asteroids.highlight);
  const updateHighlight = useStore(state => state.dispatchHighlightUpdated);

  const [ axisMin, setAxisMin ] = useState(initialValues.axisMin);
  const [ axisMax, setAxisMax ] = useState(initialValues.axisMax);
  const [ colorFrom, setColorFrom ] = useState('#73D8FF');
  const [ colorTo, setColorTo ] = useState('#FA28FF');

  const handleHighlightToggle = () => {
    if (highlight?.field === 'axis') {
      updateHighlight(null);
    } else {
      updateHighlight({ field: 'axis', min: axisMin, max: axisMax, from: colorFrom, to: colorTo });
    }
  };

  useEffect(() => {
    if (onChange) onChange({ axisMin, axisMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ axisMin, axisMax ]);

  useEffect(() => {
    if (highlight?.field === 'axis') {
      updateHighlight({ field: 'axis', min: axisMin, max: axisMax, from: colorFrom, to: colorTo });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight, axisMin, axisMax, colorTo, colorFrom ]);

  useEffect(() => {
    return () => highlight?.field === 'axis' && updateHighlight(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ updateHighlight ]);

  const format = (num) => `${num} AU`;

  return (
    <>
      <h3>Semi-major Axis (Period)</h3>
      <Highlighter
        active={highlight?.field === 'axis'}
        onClick={handleHighlightToggle} />
      <FilterSection>
        <DataReadout
          label="Min (AU)"
          data={
            <>
              <StyledInput
                initialValue={initialValues.axisMin}
                min={initialValues.axisMin}
                max={initialValues.axisMax}
                step={0.001}
                onChange={(v) => setAxisMin(Number(v))} />
              <Period>({formatters.period(axisMin)})</Period>
            </>} />
        {highlight?.field === 'axis' && (
          <ColorPicker initialColor={colorFrom} onChange={(c) => setColorFrom(c)} />
        )}
      </FilterSection>
      <FilterSection>
        <DataReadout
          label="Max (AU)"
          data={
            <>
              <StyledInput
                initialValue={initialValues.axisMax}
                min={initialValues.axisMin}
                max={initialValues.axisMax}
                step={0.001}
                onChange={(v) => setAxisMax(Number(v))} />
              <Period>({formatters.period(axisMax)})</Period>
            </>} />
        {highlight?.field === 'axis' && (
          <ColorPicker initialColor={colorTo} onChange={(c) => setColorTo(c)} />
        )}
      </FilterSection>
    </>
  );
};

export default AxisFilter;
