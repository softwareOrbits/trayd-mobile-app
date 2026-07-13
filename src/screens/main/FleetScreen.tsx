import { AskTraydFab, ComingSoon } from '@/components/ui';

const FleetScreen = () => (
  <ComingSoon
    title="Fleet"
    icon="bus-outline"
    message="Vehicles and equipment will be managed here."
    action={<AskTraydFab />}
  />
);

export default FleetScreen;
