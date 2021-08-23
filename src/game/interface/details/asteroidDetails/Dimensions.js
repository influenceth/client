import styled from 'styled-components';

import DimensionMetric from '~/components/DimensionMetric';
import eccentricityImage from '~/assets/images/eccentricity.png';
import inclinationImage from '~/assets/images/inclination.png';
import orbitalPeriodImage from '~/assets/images/orbital-period.png';
import radiusImage from '~/assets/images/radius.png';
import semiMajorAxisImage from '~/assets/images/semi-major-axis.png';
import surfaceAreaImage from '~/assets/images/surface-area.png';
import formatters from '~/lib/formatters';

const StyledDimensions = styled.div`
  align-items: stretch;
  display: flex;
  flex: 1 1 0;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 20px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}) {
    align-items: center;
    flex-direction: column;
    margin: 0;
  }
`;

const StyledDimensionMetric = styled(DimensionMetric)`
  align-items: center;
  display: flex;
  flex: 0 0 32%;
  flex-direction: column;
  justify-content: center;
  max-width: 32%;
`;

const Dimensions = (props) => {
  const { asteroid } = props;

  return (
    <StyledDimensions>
      <StyledDimensionMetric
        image={orbitalPeriodImage}
        label="Orbital Period"
        text={formatters.period(asteroid.orbital.a)} />
      <StyledDimensionMetric
        image={semiMajorAxisImage}
        label="Semi-major Axis"
        text={formatters.axis(asteroid.orbital.a)} />
      <StyledDimensionMetric
        image={inclinationImage}
        label="Inclination"
        text={formatters.inclination(asteroid.orbital.i)} />
      <StyledDimensionMetric
        image={eccentricityImage}
        label="Eccentricity"
        text={asteroid.orbital.e} />
      <StyledDimensionMetric
        image={radiusImage}
        label="Radius"
        text={formatters.radius(asteroid.radius)} />
      <StyledDimensionMetric
        image={surfaceAreaImage}
        label="Surface Area"
        text={formatters.surfaceArea(asteroid.radius)} />
    </StyledDimensions>
  );
}

export default Dimensions;
