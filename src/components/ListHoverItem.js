import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

const Description = styled.span`
  height: 40px;
  line-height: 40px;
`;

const HoverItem = styled.li`
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  max-height: 40px;
  overflow: hidden;
  padding-left: 10px;
  transition: all 0.3s ease;

  &:first-child:hover {
    border-top: 0;
  }

  &:hover {
    background-color: ${p => p.theme.colors.contentHighlight};
    border-top: 1px solid ${p => p.theme.colors.contentBorder};
    border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
    max-height: 120px;
  }

  & ${Description} {
    color: ${p => p.selected ? p.theme.colors.main : 'inherit'};
  }
`;

const Controls = styled.div`
  height: 40px;
`;

const ListHoverItem = ({ title, hoverContent, selected }) => {
  const history = useHistory();

  return (
    <HoverItem selected={selected}>
      <Description>
        {title}
      </Description>
      <Controls>
        {hoverContent}
      </Controls>
    </HoverItem>
  );
};

export default ListHoverItem;
