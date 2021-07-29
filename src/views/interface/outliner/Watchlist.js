import styled from 'styled-components';
import { AiFillEye } from 'react-icons/ai';

import useUser from '~/hooks/useUser';
import useUpdateWatchlist from '~/hooks/useUpdateWatchlist';
import Section from '~/components/Section';

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
    <Section
      name="watchlist"
      title="Watchlist"
      icon={<AiFillEye />}>
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
    </Section>
  );
};

export default Watchlist;
