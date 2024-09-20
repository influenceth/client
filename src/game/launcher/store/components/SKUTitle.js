import styled from 'styled-components';

const Title = styled.div`
  color: white;
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  font-size: 40px;
  pointer-events: none;
  text-transform: uppercase;
`;

const Rule = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin: 10px 0 15px;
`;

const SKUTitle = ({ children }) => (
  <>
    <Title>{children}</Title>
    <Rule />
  </>
)

export default SKUTitle;
