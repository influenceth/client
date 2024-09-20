import styled from 'styled-components';

import theme from '~/theme';

const gradientOpacity = 0.9;
const purchaseFormColors = {
  green: theme.colors.glowGreen,
  orange: theme.colors.lightOrange,
  purple: theme.colors.txButton,
  main: theme.colors.main,
  gradient: {
    green: `rgba(8, 94, 55, ${gradientOpacity})`,
    orange: `rgba(63, 49, 27, ${gradientOpacity})`,
    purple: `rgba(35, 34, 67, ${gradientOpacity})`,
    main: `rgba(21, 51, 71, ${gradientOpacity})`,
  }
};

export const PurchaseForm = styled.div`
  ${p => p.asButton && `
    outline: 1px solid #333;
    border-radius: 6px;
    cursor: ${p.theme.cursors.active};
    opacity: 1;
    transition: opacity 150ms ease, outline 150ms linear;
    &:hover {
      opacity: 1;
      outline-color: ${purchaseFormColors[p.color || 'main']};
      outline-width: 4px;
    }
  `}

  align-self: stretch;
  background: linear-gradient(
    to bottom,
    ${p => purchaseFormColors.gradient[p.color || 'main']},
    transparent
  );
  color: white;
  display: flex;
  flex-direction: column;
  flex: 0 0 340px;
  padding: 5px;
  position: relative;
  & > h2 {
    background: rgba(${p => p.theme.hexToRGB(purchaseFormColors[p.color || 'main'])}, 0.6);
    font-size: 18px;
    font-weight: normal;
    margin: 0;
    padding: 12px 10px;
    position: relative;
    text-align: center;
    text-transform: uppercase;
  }
  & > h3 {
    align-items: center;
    background: rgba(${p => p.theme.hexToRGB(purchaseFormColors[p.color || 'main'])}, 0.5);
    display: flex;
    font-size: 16px;
    justify-content: space-between;
    margin: 0;
    padding: 10px 10px;
    text-transform: uppercase;
    & > span:last-child {
      color: rgba(255, 255, 255, 0.5);
      font-weight: normal;
      & > b {
        color: white;
        font-weight: normal;
        margin-left: 4px;
      }
    }
  }
  & > footer {
    color: #777;
    font-size: 14px;
    margin-top: 16px;
    text-align: center;
    & > b {
      color: white;
      font-weight: normal;
    }
  }
`;

export const PurchaseFormRows = styled.div`
  & > div {
    align-items: center;
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 14px;
    height: 28px;
    justify-content: space-between;
    padding: 0 8px;
    & > label {
      opacity: 0.7;
    }
    & > span {
      align-items: center;
      display: flex;
      & > input {
        width: 80px;
      }
    }
  }
`;