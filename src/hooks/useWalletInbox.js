import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';
import useUser from '~/hooks/useUser';

const lorem = `Sed ut perspiciatis, unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa, quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt, explicabo. Nemo enim ipsam voluptatem, quia voluptas sit, aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos, qui ratione voluptatem sequi nesciunt, neque porro quisquam est, qui dolorem ipsum, quia dolor sit amet consectetur adipisci[ng] velit, sed quia non numquam [do] eius modi tempora inci[di]dunt, ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum[d] exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? [D]Quis autem vel eum i[r]ure reprehenderit, qui in ea voluptate velit esse, quam nihil molestiae consequatur, vel illum, qui dolorem eum fugiat, quo voluptas nulla pariatur?`;

const useWalletInbox = () => {
  const { accountAddress } = useSession();
  const { data: user, isLoading: userIsLoading } = useUser();

  const { data, isLoading } = useQuery(
    [ 'inbox', accountAddress ],
    async () => {
      return [
        { id: 1, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}`, read: false },
        { id: 2, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}\n\n${lorem}`, read: false },
        { id: 3, from: accountAddress, timestamp: Date.now(), content: `${lorem}`, read: true },
        { id: 4, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}`, read: true },
        { id: 5, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}\n\n${lorem}`, read: true },
        { id: 6, from: accountAddress, timestamp: Date.now(), content: `${lorem}`, read: true },
        { id: 7, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}`, read: true },
        { id: 8, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}\n\n${lorem}`, read: true },
        { id: 9, from: accountAddress, timestamp: Date.now(), content: `${lorem}`, read: true },
        { id: 10, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}`, read: true },
        { id: 11, from: accountAddress, timestamp: Date.now(), content: `${lorem}\n\n${lorem}\n\n${lorem}`, read: true },
        { id: 12, from: accountAddress, timestamp: Date.now(), content: `${lorem}`, read: true }
      ];
    },
    { enabled: !!accountAddress, }
  );

  return {
    isLoading: isLoading || userIsLoading,
    hasNoPublicKey: !userIsLoading && !user?.directMessagePublicKey,
    messages: data,
    unreadTally: data?.filter((m) => !m.read)?.length || 0
  }
};

export default useWalletInbox;