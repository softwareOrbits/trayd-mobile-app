import { View } from 'react-native';

import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveBodyStyles } from '@/styles/leave.styles';
import {
  LEAVE_STATUSES,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL,
  type LeaveRequest,
  type LeaveStatusFilter,
  type LeaveTypeFilter,
} from '@/types';
import LeaveDropdown, { type DropdownOption } from './LeaveDropdown';

type LeaveFiltersProps = {
  requests: LeaveRequest[];
  typeFilter: LeaveTypeFilter;
  statusFilter: LeaveStatusFilter;
  onTypeChange: (t: LeaveTypeFilter) => void;
  onStatusChange: (s: LeaveStatusFilter) => void;
};

export const LeaveFilters = ({
  requests,
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}: LeaveFiltersProps) => {
  const styles = useThemedStyles(makeLeaveBodyStyles);

  const typeOptions: DropdownOption[] = [
    { key: 'all', label: 'All types', count: requests.length },
    ...LEAVE_TYPES.map(t => ({
      key: t,
      label: LEAVE_TYPE_LABEL[t],
      count: requests.filter(r => r.type === t).length,
    })),
  ];

  const statusOptions: DropdownOption[] = [
    { key: 'all', label: 'All statuses', count: requests.length },
    ...LEAVE_STATUSES.map(s => ({
      key: s,
      label: LEAVE_STATUS_LABEL[s],
      count: requests.filter(r => r.status === s).length,
    })),
  ];

  return (
    <View style={styles.filterRow}>
      <LeaveDropdown
        label="LEAVE TYPE"
        value={typeFilter}
        options={typeOptions}
        onChange={k => onTypeChange(k as LeaveTypeFilter)}
      />
      <LeaveDropdown
        label="STATUS"
        value={statusFilter}
        options={statusOptions}
        onChange={k => onStatusChange(k as LeaveStatusFilter)}
      />
    </View>
  );
};

export default LeaveFilters;
