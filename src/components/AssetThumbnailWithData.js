import styled from 'styled-components';

const ThumbnailWithData = styled.div`
  align-items: center;
  color: #777;
  display: flex;
  flex: 1;
  position: relative;
  & > label {
    flex: 1;
    font-size: 14px;
    padding-left: 15px;
    & > h3 {
      color: white;
      font-size: 18px;
      font-weight: normal;
      margin: 0 0 4px;
      ${p => p.noWrap && `
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `}
    }
    & > footer {
      bottom: 0;
      color: ${p => p.theme.colors.main};
      position: absolute;
    }
  }
`;

export default ThumbnailWithData;
    