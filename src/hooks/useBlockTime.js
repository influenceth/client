import useSession from '~/hooks/useSession';

const useBlockTime = () => {
  const { blockTime } = useSession();
  return blockTime;
};

export default useBlockTime;
