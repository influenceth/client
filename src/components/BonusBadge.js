import { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

const icons = {
  rareearth: (<svg viewBox="0 0 24 24"><path d="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.66C6,21.4 6.6,22 7.33,22H16.66C17.4,22 18,21.4 18,20.67V5.33C18,4.6 17.4,4 16.67,4M11,20V14.5H9L13,7V12.5H15" /></svg>),
  volatile: (<svg viewBox="0 0 24 24"><path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z" /></svg>),
  yield : (<svg viewBox="0 0 24 24"><path d="M14.79,10.62L3.5,21.9L2.1,20.5L13.38,9.21L14.79,10.62M19.27,7.73L19.86,7.14L19.07,6.35L19.71,5.71L18.29,4.29L17.65,4.93L16.86,4.14L16.27,4.73C14.53,3.31 12.57,2.17 10.47,1.37L9.64,3.16C11.39,4.08 13,5.19 14.5,6.5L14,7L17,10L17.5,9.5C18.81,11 19.92,12.61 20.84,14.36L22.63,13.53C21.83,11.43 20.69,9.47 19.27,7.73Z" /></svg>),
  fissile: (<svg viewBox="0 0 24 24"><path d="M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,22C10.05,22 8.22,21.44 6.69,20.47L10,15.47C10.6,15.81 11.28,16 12,16C12.72,16 13.4,15.81 14,15.47L17.31,20.47C15.78,21.44 13.95,22 12,22M2,12C2,7.86 4.5,4.3 8.11,2.78L10.34,8.36C8.96,9 8,10.38 8,12H2M16,12C16,10.38 15.04,9 13.66,8.36L15.89,2.78C19.5,4.3 22,7.86 22,12H16Z" /></svg>),
  metal: (<svg viewBox="0 0 24 24"><path d="M1 22L2.5 17H9.5L11 22H1M13 22L14.5 17H21.5L23 22H13M6 15L7.5 10H14.5L16 15H6M23 6.05L19.14 7.14L18.05 11L16.96 7.14L13.1 6.05L16.96 4.96L18.05 1.1L19.14 4.96L23 6.05Z" /></svg>),
  organic: (<svg viewBox="0 0 24 24"><path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" /></svg>)
};

const descriptions = {
  yield: { label: 'Overall', desc: 'increased yield' },
  volatile: { label: 'Volatiles', desc: 'to gas & ice harvesting' },
  metal: { label: 'Metals', desc: 'to mining efficiency' },
  organic: { label: 'Organics', desc: 'to material extraction' },
  rareearth: { label: 'Rare Earth', desc: 'to local abundance' },
  fissile: { label: 'Fissile', desc: 'to deposit accessibility' }
};

const StyledBonusBadge = styled.div`
  border-radius: 50%;
  height: 30px;
  margin-right: 10px;
  padding: 5px;
  width: 30px;

  & > svg {
    fill: ${p => p.theme.colors.bonus[`level${props.level}`]};
  }

  &:hover {
    background-color: ${p => p.theme.colors.bonus[`level${props.level}`]};

    & > svg {
      fill: black;
    }
  }
`;

const BonusBadge = (props) => {
  const { type, level, modifier } = props.bonus;
  const { desc } = descriptions[type];
  const description = `+${modifier}% ${desc}`;

  useEffect(() => ReactTooltip.rebuild(), []);

  return (
    <StyledBonusBadge
      {...props}
      level={level}
      data-for="global"
      data-tip={description}>
      {icons[type]}
    </StyledBonusBadge>
  );
};

BonusBadge.propTypes = {
  bonus: PropTypes.shape({
    type: PropTypes.string.isRequired,
    level: PropTypes.number.isRequired
  }).isRequired
};

export default BonusBadge;
