import Dialog from '~/components/Dialog';
import Construction from './actionDialogs/Construction';
import Extraction from './actionDialogs/Extraction';
import NewCoreSample from './actionDialogs/NewCoreSample';
import Deconstruct from './actionDialogs/Deconstruct';
import ImproveCoreSample from './actionDialogs/ImproveCoreSample';
import PlanConstruction from './actionDialogs/PlanConstruction';
import SurfaceTransfer from './actionDialogs/SurfaceTransfer';
import UnplanConstruction from './actionDialogs/UnplanConstruction';

const ActionDialog = ({ actionType, ...props }) => {
  return (
    <Dialog backdrop="rgba(30, 30, 35, 0.5)" opaque>
      <div style={{ position: 'relative' }}>
        {actionType === 'BLUEPRINT' && <PlanConstruction {...props} />}
        {actionType === 'CANCEL_BLUEPRINT' && <UnplanConstruction {...props} />}
        {actionType === 'CONSTRUCT' && <Construction {...props} />}
        {actionType === 'DECONSTRUCT' && <Deconstruct {...props} />}
        {actionType === 'EXTRACT_RESOURCE' && <Extraction {...props} />}
        {actionType === 'IMPROVE_CORE_SAMPLE' && <ImproveCoreSample {...props} />}
        {actionType === 'NEW_CORE_SAMPLE' && <NewCoreSample {...props} />}
        {actionType === 'SURFACE_TRANSFER' && <SurfaceTransfer {...props} />}
      </div>
    </Dialog>
  );
}

export default ActionDialog;