import { DateRangeFilter } from '@/components/ui/DateRangeFilter';

type Props = {
  from: string | null;
  to: string | null;
  count: number;
  jobDates: string[];
  onChange: (from: string | null, to: string | null) => void;
};

export const CompletedDateFilter = ({
  from,
  to,
  count,
  jobDates,
  onChange,
}: Props) => (
  <DateRangeFilter
    from={from}
    to={to}
    onChange={onChange}
    count={count}
    markedDates={jobDates}
    noun={{ one: 'job', many: 'jobs' }}
    summaryNoun={{ one: 'completed job', many: 'completed jobs' }}
  />
);

export default CompletedDateFilter;
