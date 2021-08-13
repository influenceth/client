import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import eccentricityImage from './eccentricity.png';
import inclinationImage from './inclination.png';
import orbitalPeriodImage from './orbital-period.png';
import radiusImage from './radius.png';
import semiMajorAxisImage from './semi-major-axis.png';
import surfaceAreaImage from './surface-area.png';
import formatters from '~/lib/formatters';

const StyledDimensions = styled.div`
  align-items: stretch;
  display: flex;
  flex: 1 1 auto;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 20px;
`;

const Dimension = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 32%;
  flex-direction: column;
  justify-content: center;
  max-width: 32%;
`;

const DimensionImage = styled.div`
  background-image: url('${p => p.image}');
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  flex: 1 1 auto;
  margin: 20px;
  width: 100%;
`;

const DimensionData = styled(DataReadout)`
  flex: 0 1 auto;
  flex-direction: column;
  font-size: ${p => p.theme.fontSizes.detailText};

  & label {
    padding-right: 0;
  }
`;

const Dimensions = (props) => {
  const { asteroid } = props;

  return (
    <StyledDimensions>
      <Dimension>
        <DimensionImage image={orbitalPeriodImage} />
        <DimensionData label="Orbital Period">{formatters.period(asteroid.orbital.a)}</DimensionData>
      </Dimension>
      <Dimension>
        <DimensionImage image={semiMajorAxisImage} />
        <DimensionData label="Semi-major Axis">{formatters.axis(asteroid.orbital.a)}</DimensionData>
      </Dimension>
      <Dimension>
        <DimensionImage image={inclinationImage} />
        <DimensionData label="Inclination">{formatters.inclination(asteroid.orbital.i)}</DimensionData>
      </Dimension>
      <Dimension>
        <DimensionImage image={eccentricityImage} />
        <DimensionData label="Eccentricity">{asteroid.orbital.e}</DimensionData>
      </Dimension>
      <Dimension>
        <DimensionImage image={radiusImage} />
        <DimensionData label="Radius">{formatters.radius(asteroid.radius)}</DimensionData>
      </Dimension>
      <Dimension>
        <DimensionImage image={surfaceAreaImage} />
        <DimensionData label="Surface Area">{formatters.surfaceArea(asteroid.radius)}</DimensionData>
      </Dimension>
    </StyledDimensions>
  );
}

export default Dimensions;
