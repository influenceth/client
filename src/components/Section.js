import styled from 'styled-components';
import { MdClear } from 'react-icons/md';

import useStore from '~/hooks/useStore';
import IconButton from './IconButton';

const StyledSection = styled.div`
  background-color: rgba(255, 255, 255, 0.075);
  font-size: 14px;
  padding: 0 20px;
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

const Content = styled.div`
  display: flex;
  flex-direction: column;
  max-height: ${props => props.minimized ? '0' : '33vh'};
  overflow: hidden;
  padding-bottom: ${props => props.minimized ? '0' : '20px'};
  transition: all 0.3s ease;
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
  cursor: pointer;
  font-size: 18px;
  margin: 0;
  height: 75px;
  line-height: 75px;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  right: 10px;
  top: 23px;
  opacity: 0;

  ${StyledSection}:hover & {
    opacity: 1;
  }
`;

const Section = (props) => {
  const sectionSettings = useStore(state => state.outlinerSections[props.name]);
  const setOutlinerSectionExpanded = useStore(state => state.setOutlinerSectionExpanded);
  const setOutlinerSectionActive = useStore(state => state.setOutlinerSectionActive);

  const toggleMinimize = () => {
    setOutlinerSectionExpanded(props.name, !sectionSettings.expanded);
  };

  const closeSection = () => {
    if (props.onClose && typeof props.onClose === 'function') props.onClose();
    setOutlinerSectionActive(props.name, false);
  };

  return (
    <StyledSection {...props}>
      <Tab>
        {props.icon}
      </Tab>
      {props.title && <Title onClick={toggleMinimize}>{props.title}</Title>}
      <CloseButton onClick={closeSection} borderless><MdClear /></CloseButton>
      <Content minimized={!sectionSettings.expanded}>
        {props.children}
      </Content>
    </StyledSection>
  );
};

export default Section;
