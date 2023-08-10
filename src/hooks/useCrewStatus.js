// TODO: ecs refactor
// TODO: this may not make sense as a hook depending on how the data is stored
const useCrewStatus = () => {
  return ({
    asteroid: 1000,
    lot: 123,
    currentStation: {
      type: 'SHIP',
      i: 123,
      isMine: false
    },
    currentAction: null,
  });
};

export default useCrewStatus;