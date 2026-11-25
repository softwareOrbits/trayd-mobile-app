import { getJwtClaims } from './jwt';

export type AccessViews = { employerView: boolean; employeeView: boolean };

export type TraydRoleClaim = { is_owner?: boolean; is_primary_owner?: boolean };
export type AccessRoleClaim = {
  key?: string;
  employer_view?: boolean;
  employee_view?: boolean;
};

const BOTH: AccessViews = { employerView: true, employeeView: true };
const EMPLOYEE_ONLY: AccessViews = { employerView: false, employeeView: true };

export function readTraydRole(
  accessToken: string | null | undefined,
): TraydRoleClaim | null {
  const claims = getJwtClaims(accessToken);
  return (claims?.trayd_role as TraydRoleClaim | null | undefined) ?? null;
}

export function readAccessViews(
  accessToken: string | null | undefined,
): AccessViews {
  const claims = getJwtClaims(accessToken);
  return resolveAccessViews(
    readTraydRole(accessToken),
    claims?.access_role as AccessRoleClaim | null | undefined,
  );
}

export function resolveAccessViews(
  member: TraydRoleClaim | null,
  role: AccessRoleClaim | null | undefined,
): AccessViews {

  if (member?.is_primary_owner === true || role?.key === 'employer') return BOTH;
  if (!role?.key) return member?.is_owner === true ? BOTH : EMPLOYEE_ONLY;
  if (role.key === 'employee' && member?.is_owner === true) return BOTH;

  const employerView = role.employer_view === true;
  return { employerView, employeeView: role.employee_view === true || !employerView };
}
