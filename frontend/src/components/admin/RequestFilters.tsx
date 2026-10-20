import { useEffect, useRef, useState } from 'react';
import '../../styles/components/card.css';
import '../../styles/pages/dashboard.css';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useCategories, useSubCounties } from '../../hooks/useReferenceData';
import type { AdminRequestFilters, RequestStatus } from '../../types/api';
import { STATUS_META, STATUS_ORDER } from '../../utils/status';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface RequestFiltersProps {
  value: AdminRequestFilters;
  onChange: (next: AdminRequestFilters) => void;
}

const isStatus = (value: string): value is RequestStatus =>
  (STATUS_ORDER as string[]).includes(value);

export function RequestFilters({ value, onChange }: RequestFiltersProps) {
  const categories = useCategories();
  const subCounties = useSubCounties();
  const [search, setSearch] = useState(value.search ?? '');
  const debouncedSearch = useDebouncedValue(search.trim());

  // Fire only when the debounced text itself changes, so clearing filters or
  // changing a select never re-applies a stale search term.
  const lastSearch = useRef(debouncedSearch);
  useEffect(() => {
    if (lastSearch.current === debouncedSearch) return;
    lastSearch.current = debouncedSearch;
    onChange({ ...value, search: debouncedSearch || undefined });
  }, [debouncedSearch, value, onChange]);

  const hasFilters = Boolean(value.status ?? value.categoryId ?? value.subCountyId ?? value.search);

  return (
    <div className="card filter-bar" role="search" aria-label="Filter requests">
      <Input
        label="Search"
        type="search"
        placeholder="Reference, location or description"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
      />
      <Select
        label="Status"
        placeholder="All statuses"
        value={value.status ?? ''}
        options={STATUS_ORDER.map((status) => ({
          value: status,
          label: STATUS_META[status].label,
        }))}
        onChange={(event) => {
          onChange({
            ...value,
            status: isStatus(event.target.value) ? event.target.value : undefined,
          });
        }}
      />
      <Select
        label="Category"
        placeholder="All categories"
        value={value.categoryId ?? ''}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        onChange={(event) => {
          onChange({ ...value, categoryId: event.target.value || undefined });
        }}
      />
      <Select
        label="Sub-county"
        placeholder="All sub-counties"
        value={value.subCountyId ?? ''}
        options={(subCounties.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        onChange={(event) => {
          onChange({ ...value, subCountyId: event.target.value || undefined });
        }}
      />
      <Button
        variant="ghost"
        icon="bx-reset"
        disabled={!hasFilters}
        onClick={() => {
          setSearch('');
          lastSearch.current = '';
          onChange({});
        }}
      >
        Clear
      </Button>
    </div>
  );
}
