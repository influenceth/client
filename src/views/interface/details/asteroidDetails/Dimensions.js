import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';
import formatters from '~/lib/formatters';

const StyledDimensions = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0 auto;
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
`;

const DimensionIcon = styled.svg`
  fill: transparent;
  flex: 0 1 auto;
  stroke: white;
  margin-bottom: 10px;
  max-width: 100px;
`;

const DimensionData = styled(DataReadout)`
  flex-direction: column;
  font-size: ${props => props.theme.fontSizes.detailText};
`;

const Dimensions = (props) => {
  const { asteroid } = props;

  return (
    <StyledDimensions>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Orbital Period" data={formatters.period(asteroid.orbital.a)} />
      </Dimension>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Semi-major Axis" data={formatters.axis(asteroid.orbital.a)} />
      </Dimension>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Inclination" data={formatters.inclination(asteroid.orbital.i)} />
      </Dimension>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Eccentricity" data={asteroid.orbital.e} />
      </Dimension>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Radius" data={formatters.radius(asteroid.radius)} />
      </Dimension>
      <Dimension>
        <DimensionIcon viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" />
        </DimensionIcon>
        <DimensionData label="Surface Area" data={formatters.surfaceArea(asteroid.radius)} />
      </Dimension>
    </StyledDimensions>
  );
}

export default Dimensions;
