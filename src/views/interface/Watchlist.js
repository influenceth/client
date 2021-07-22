import styled from 'styled-components';

import useUser from '~/hooks/useUser';
import useUpdateWatchlist from '~/hooks/useUpdateWatchlist';

const StyledWatchlist = styled.div`
  pointer-events: auto;
  right: 0;
  position: absolute;
  top: 0;
`;

const Watchlist = (props) => {
  const user = useUser();
  const { mutate } = useUpdateWatchlist();

  return (
    <StyledWatchlist>
      <ul>
        {user.isSuccess && user.data.watchlist.map((w) => {
          return (
            <li key={w.i}>
              <span>{w.i}</span>
              <span>{JSON.stringify(w.tags)}</span>
            </li>
          );
        })}
      </ul>
    </StyledWatchlist>
  );
};

export default Watchlist;
