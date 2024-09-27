import styled from 'styled-components';

const SKUInputRow = styled.div`
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.5);
  margin: 6px 0;
  padding: 6px;

  input {
    background: rgba(0, 0, 0, 0.6);
    border-color: transparent;
    font-size: 105%;
    height: 32px;
    width: 100%;
  }
`;

export default SKUInputRow;