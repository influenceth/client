import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MdClear } from 'react-icons/md';
import gsap from 'gsap';

import useStore from '~/hooks/useStore';
import IconButton from './IconButton';

const StyledSection = styled.div`
  background-color: rgba(255, 255, 255, 0.075);
  font-size: 14px;
  margin: 0 0 10px 25px;
  padding: 0 20px;
  position: relative;

  &:after {
    background-image: linear-gradient(0.25turn, rgba(54, 167, 205, 0.15), rgba(0, 0, 0, 0));
    bottom: 0;
    content: '';
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    transition: all 0.5s ease;
    z-index: -1;
  }

  &:hover:after {
    opacity: 1;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 0vh;
  overflow: hidden;
  padding-bottom: 0px;
`;

const Tab = styled.div`
  align-items: stretch;
  backdrop-filter: blur(4px);
  background-color: rgb(255, 255, 255, 0.15);
  display: flex;
  height: 100%;
  left: -25px;
  position: absolute;
  top: 0;
  transition: all 0.3s ease;
  width: 25px;

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
    padding: 0 4px;
  }
`;

const Title = styled.h2`
  cursor: pointer;
  font-size: 18px;
  height: 60px;
  line-height: 60px;
  margin: 0;
  overflow: hidden;
  padding-right: 45px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CloseButton = styled(IconButton)`
  opacity: 0;
  position: absolute !important;
  right: 10px;
  top: 15px;

  ${StyledSection}:hover & {
    opacity: 1;
  }
`;

const Section = (props) => {
  const sectionSettings = useStore(state => state.outliner[props.name]);
  const dispatchOutlinerSectionExpanded = useStore(state => state.dispatchOutlinerSectionExpanded);
  const dispatchOutlinerSectionCollapsed = useStore(state => state.dispatchOutlinerSectionCollapsed);
  const dispatchOutlinerSectionDeactivated = useStore(state => state.dispatchOutlinerSectionDeactivated);

  const content = useRef();

  const toggleMinimize = () => {
    if (sectionSettings?.expanded) {
      dispatchOutlinerSectionCollapsed(props.name);
    } else {
      dispatchOutlinerSectionExpanded(props.name);
    }
  };

  const closeSection = () => {
    if (props.onClose && typeof props.onClose === 'function') props.onClose();
    dispatchOutlinerSectionDeactivated(props.name);
  };

  useEffect(() => {
    if (!content?.current) return;
    if (sectionSettings.expanded) {
      gsap.to(content.current, {  maxHeight: '40vh', paddingBottom: '20px', duration: 0.25, ease: 'power1.in' });
    } else {
      gsap.to(content.current, {  maxHeight: '0vh', paddingBottom: '0px', duration: 0.25, ease: 'power1.out' });
    }
  }, [ content.current, sectionSettings.expanded ]);

  return (
    <StyledSection {...props}>
      <Tab>
        {props.icon}
      </Tab>
      {props.title && <Title onClick={toggleMinimize}>{props.title}</Title>}
      <CloseButton onClick={closeSection} borderless><MdClear /></CloseButton>
      <Content ref={content}>
        {props.children}
      </Content>
    </StyledSection>
  );
};

export default Section;
