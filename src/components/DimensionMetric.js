import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';

const DimensionImage = styled.div`
  background-image: url('${p => p.image}');
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  flex: 1 1 0;
  margin: 20px;
  width: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: 5px;
    min-height: 70px;
  }
`;

const DimensionData = styled(DataReadout)`
  flex: 1 1 0;
  flex-direction: column;
  font-size: ${p => p.theme.fontSizes.detailText};

  & label {
    padding-right: 0;
  }
`;

const DimensionMetric = (props) => {
  const { image, label, text, ...restProps } = props;

  return (
    <div {...restProps}>
      {image && <DimensionImage image={image} />}
      <DimensionData label={label || ''}>{text || ''}</DimensionData>
    </div>
  );
};

export default DimensionMetric;
