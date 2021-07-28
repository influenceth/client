import styled from 'styled-components';

import theme from '~/theme';

const StyledSection = styled.div`
  background-color: rgba(255, 255, 255, 0.075);
  font-size: 14px;
  padding: 20px 15px;
  margin: 0 0 10px 25px;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-image: linear-gradient(0.25turn, rgba(54, 167, 205, 0.1), rgba(0, 0, 0, 0));
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  &:hover:after {
    opacity: 1;
  }
`;

const Tab = styled.div`
  align-items: stretch;
  background-color: rgb(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  display: flex;
  position: absolute;
  width: 25px;
  height: 100%;
  top: 0;
  left: -25px;
  transition: all 0.3s ease;

  ${StyledSection}:hover & {
    background-color: ${props => props.theme.colors.main};

    & > svg {
      color: white;
    }
  }

  & > svg {
    color: rgba(255, 255, 255, 0.5);
    flex: 0 1 auto;
    height: 100%;
    width: 100%;
    padding: 4px;
  }
`;

const Title = styled.h2`
  font-size: 18px;
  margin: 0;
  padding: 0 0 10px 0;
`;

const Section = (props) => {
  return (
    <StyledSection>
      <Tab>
        {props.icon}
      </Tab>
      {props.title && (
        <Title>{props.title}</Title>)
      }
      {props.children}
    </StyledSection>
  );
};

export default Section;
