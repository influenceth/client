import styled from 'styled-components';

import DataReadout from '~/components/DataReadout';

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
