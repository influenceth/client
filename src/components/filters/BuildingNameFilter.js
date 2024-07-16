import { Entity } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import Autocomplete from '../Autocomplete';
import { InputBlock, SearchMenu } from './components';

const fieldName = 'name';

const NameFilter = ({ assetType, filters, onChange, isListView }) => {
  const asteroidId = useStore((s) => s.asteroids.origin);
  const dispatchLotSelected = useStore((s) => s.dispatchLotSelected);

  const handleSelect = (v) => {
    if (v?.Location?.location?.label === Entity.IDS.LOT) {
      dispatchLotSelected(v.Location.location.id);
    }
  };

  return (
    <SearchMenu
      assetType={assetType}
      fieldName={fieldName}
      filters={filters}
      title="Building Name">

      <InputBlock>
        <div>
          <Autocomplete
            allowCustomInput
            assetType="buildings"
            meta={{ asteroidId }}
            onSelect={handleSelect}
            placeholder="Building Name..."
            width={336}
          />
        </div>
      </InputBlock>
    </SearchMenu>
  );
};

export default NameFilter;
