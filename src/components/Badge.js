import styled from 'styled-components';

const Badge = styled.span`
  align-items: center;
  background: ${p => p.theme.colors.main};
  border-radius: 0.7em;
  color: white;
  display: flex;
  font-weight: bold;
  height: 1.4em;
  justify-content: center;
  letter-spacing: 0;
  line-height: 1.4em;
  min-width: 1.4em;
  opacity: 1;
  padding: 0 3px;
  transition: opacity 0.4s ease 0.2s;

  & > sup {
    position: relative;
    top: -3px;
  }
`;

const FunctionalBadge = ({ max, showOnZero, value, ...otherProps }) => {
  if (showOnZero || value > 0) {
    return (
      <Badge {...otherProps}>
        {max && value > max
          ? (<>{max}<sup>+</sup></>)
          : value
        }
      </Badge>
    )
  }
  return null;
};

export default FunctionalBadge;