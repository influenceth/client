import styled from 'styled-components';
import { FoodIcon, WarningOutlineIcon } from '~/components/Icons';

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
  }
`;

const FoodStatus = ({ isRationing, onClick, percentage, ...props }) => {
  return (
    <Food isRationing={isRationing} onClick={onClick} {...props}>
      {percentage < 50 && <WarningOutlineIcon />}
      <span>{percentage}%</span>
      <FoodIcon />
    </Food>
  );
}

export default FoodStatus;