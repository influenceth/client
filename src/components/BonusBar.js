import styled from 'styled-components';
import { RiVipDiamondFill as BonusIcon } from 'react-icons/ri';

const Bonus = styled.span`
  white-space: nowrap;
  & > * {
    margin-right: 3px;
    opacity: 0.2;
    vertical-align: middle;
  }
  & > *:nth-child(1) {
    ${p => p.bonus >= 1 && 'opacity: 1;'}
  }
  & > *:nth-child(2) {
    ${p => p.bonus >= 2 && 'opacity: 1;'}
  }
  & > *:nth-child(3) {
    ${p => p.bonus >= 3 && 'opacity: 1;'}
  }
`;

const BonusBar = ({ bonus }) => (
  <Bonus bonus={bonus}>
    <BonusIcon />
    <BonusIcon />
    <BonusIcon />
  </Bonus>
);

export default BonusBar;