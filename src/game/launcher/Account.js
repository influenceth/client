import { useEffect } from 'react';

import useAuth from '~/hooks/useAuth'
import { useControlledAlert } from '~/game/interface/Alerts';
import { InfluenceIcon } from '~/components/Icons';
import styled from 'styled-components';

const Content = styled.div`
  color: ${p => p.theme.colors.main};
  a {
    text-decoration: none;
    white-space: nowrap;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Account = () => {
  return null;
}

export default Account;