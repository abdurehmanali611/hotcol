import { api, API_URL } from "@/lib/api/client";

export type HrEmployee = {
  id: number;
  HotelName: string;
  fullName: string;
  phone: string;
  email: string;
  department: string;
  jobTitle: string;
  status: string;
  hireDate: string;
  endDate: string;
  wageType: string;
  baseSalaryETB: number;
  credentialUserId: number | null;
  credentialUserName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HrLeaveType = {
  id: number;
  HotelName: string;
  code: string;
  label: string;
  paid: boolean;
  defaultDays: number;
  active: boolean;
  sortOrder: number;
};

export type HrLeaveRequest = {
  id: number;
  HotelName: string;
  employeeId: number;
  leaveType: string;
  fromYmd: string;
  toYmd: string;
  days: number;
  reason: string;
  status: string;
  decidedBy: string;
  decidedAt: string | null;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrLeaveBalance = {
  id: number;
  HotelName: string;
  employeeId: number;
  leaveType: string;
  balanceDays: number;
  updatedAt: string;
  employee?: HrEmployee | null;
};

export type HrAttendance = {
  id: number;
  HotelName: string;
  employeeId: number;
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string;
  notes: string;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrShift = {
  id: number;
  HotelName: string;
  employeeId: number;
  workDate: string;
  department: string;
  startTime: string;
  endTime: string;
  notes: string;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrDocument = {
  id: number;
  HotelName: string;
  employeeId: number;
  title: string;
  docType: string;
  fileUrl: string;
  notes: string;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrPayrollPeriod = {
  id: number;
  HotelName: string;
  periodKey: string;
  fromYmd: string;
  toYmd: string;
  status: string;
  notes: string;
  closedAt: string | null;
  closedBy: string;
  createdAt: string;
};

export type HrPayslip = {
  id: number;
  HotelName: string;
  periodId: number;
  employeeId: number;
  basePayETB: number;
  overtimeETB: number;
  tipsETB: number;
  deductionsETB: number;
  netPayETB: number;
  notes: string;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrIncident = {
  id: number;
  HotelName: string;
  employeeId: number;
  kind: string;
  title: string;
  detail: string;
  occurredYmd: string;
  recordedBy: string;
  createdAt: string;
  employee?: HrEmployee | null;
};

export type HrDashboardStats = {
  headcount: number;
  onLeaveToday: number;
  pendingLeave: number;
  openShiftsToday: number;
  openPayrollPeriods: number;
};

const EMP_FIELDS = `
  id HotelName fullName phone email department jobTitle status
  hireDate endDate wageType baseSalaryETB credentialUserId credentialUserName
  notes createdAt updatedAt
`;

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await api.post(API_URL, { query, variables });
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "HR request failed");
  }
  return response.data.data;
}

export async function fetchHrDashboardStats(): Promise<HrDashboardStats> {
  const data = await gql<{ hrDashboardStats: HrDashboardStats }>(`
    query { hrDashboardStats { headcount onLeaveToday pendingLeave openShiftsToday openPayrollPeriods } }
  `);
  return data.hrDashboardStats;
}

export async function fetchHrEmployees(): Promise<HrEmployee[]> {
  const data = await gql<{ hrEmployees: HrEmployee[] }>(`
    query { hrEmployees { ${EMP_FIELDS} } }
  `);
  return data.hrEmployees || [];
}

export async function createHrEmployeeApi(input: {
  fullName: string;
  phone?: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  hireDate?: string;
  wageType?: string;
  baseSalaryETB?: number;
  notes?: string;
}): Promise<HrEmployee> {
  const data = await gql<{ createHrEmployee: HrEmployee }>(
    `mutation (
      $fullName: String!
      $phone: String
      $email: String
      $department: String
      $jobTitle: String
      $hireDate: String
      $wageType: String
      $baseSalaryETB: Float
      $notes: String
    ) {
      createHrEmployee(
        fullName: $fullName
        phone: $phone
        email: $email
        department: $department
        jobTitle: $jobTitle
        hireDate: $hireDate
        wageType: $wageType
        baseSalaryETB: $baseSalaryETB
        notes: $notes
      ) { ${EMP_FIELDS} }
    }`,
    { ...input },
  );
  return data.createHrEmployee;
}

export async function fetchHrLeaveTypes(): Promise<HrLeaveType[]> {
  const data = await gql<{ hrLeaveTypes: HrLeaveType[] }>(`
    query {
      hrLeaveTypes {
        id HotelName code label paid defaultDays active sortOrder
      }
    }
  `);
  return data.hrLeaveTypes || [];
}

export async function replaceHrLeaveTypesApi(
  types: Array<{
    code?: string;
    label: string;
    paid?: boolean;
    defaultDays?: number;
    active?: boolean;
  }>,
): Promise<HrLeaveType[]> {
  const data = await gql<{ replaceHrLeaveTypes: HrLeaveType[] }>(
    `mutation ($types: [HrLeaveTypeInput!]!) {
      replaceHrLeaveTypes(types: $types) {
        id HotelName code label paid defaultDays active sortOrder
      }
    }`,
    { types },
  );
  return data.replaceHrLeaveTypes || [];
}

export async function updateHrEmployeeApi(
  id: number,
  input: Record<string, unknown>,
): Promise<HrEmployee> {
  const data = await gql<{ updateHrEmployee: HrEmployee }>(
    `mutation (
      $id: Int!
      $fullName: String
      $phone: String
      $email: String
      $department: String
      $jobTitle: String
      $status: String
      $wageType: String
      $baseSalaryETB: Float
      $credentialUserId: Int
      $credentialUserName: String
      $notes: String
    ) {
      updateHrEmployee(
        id: $id
        fullName: $fullName
        phone: $phone
        email: $email
        department: $department
        jobTitle: $jobTitle
        status: $status
        wageType: $wageType
        baseSalaryETB: $baseSalaryETB
        credentialUserId: $credentialUserId
        credentialUserName: $credentialUserName
        notes: $notes
      ) { ${EMP_FIELDS} }
    }`,
    { id, ...input },
  );
  return data.updateHrEmployee;
}

export async function terminateHrEmployeeApi(id: number, endDate?: string) {
  const data = await gql<{ terminateHrEmployee: HrEmployee }>(
    `mutation ($id: Int!, $endDate: String) {
      terminateHrEmployee(id: $id, endDate: $endDate) { ${EMP_FIELDS} }
    }`,
    { id, endDate },
  );
  return data.terminateHrEmployee;
}

export async function fetchHrLeaveRequests(status?: string): Promise<HrLeaveRequest[]> {
  const data = await gql<{ hrLeaveRequests: HrLeaveRequest[] }>(
    `query ($status: String) {
      hrLeaveRequests(status: $status) {
        id HotelName employeeId leaveType fromYmd toYmd days reason status
        decidedBy decidedAt createdAt
        employee { id fullName department }
      }
    }`,
    { status: status || null },
  );
  return data.hrLeaveRequests || [];
}

export async function createHrLeaveRequestApi(input: {
  employeeId: number;
  leaveType: string;
  fromYmd: string;
  toYmd: string;
  days: number;
  reason?: string;
}) {
  const data = await gql<{ createHrLeaveRequest: HrLeaveRequest }>(
    `mutation (
      $employeeId: Int!
      $leaveType: String!
      $fromYmd: String!
      $toYmd: String!
      $days: Float
      $reason: String
    ) {
      createHrLeaveRequest(
        employeeId: $employeeId
        leaveType: $leaveType
        fromYmd: $fromYmd
        toYmd: $toYmd
        days: $days
        reason: $reason
      ) { id status days leaveType fromYmd toYmd }
    }`,
    { ...input },
  );
  return data.createHrLeaveRequest;
}

export async function decideHrLeaveRequestApi(id: number, approve: boolean) {
  const data = await gql<{ decideHrLeaveRequest: HrLeaveRequest }>(
    `mutation ($id: Int!, $approve: Boolean!) {
      decideHrLeaveRequest(id: $id, approve: $approve) { id status }
    }`,
    { id, approve },
  );
  return data.decideHrLeaveRequest;
}

export async function upsertHrLeaveBalanceApi(input: {
  employeeId: number;
  leaveType: string;
  balanceDays: number;
}) {
  const data = await gql<{ upsertHrLeaveBalance: HrLeaveBalance }>(
    `mutation ($employeeId: Int!, $leaveType: String!, $balanceDays: Float!) {
      upsertHrLeaveBalance(
        employeeId: $employeeId
        leaveType: $leaveType
        balanceDays: $balanceDays
      ) { id leaveType balanceDays }
    }`,
    { ...input },
  );
  return data.upsertHrLeaveBalance;
}

export async function fetchHrLeaveBalances(
  employeeId?: number,
): Promise<HrLeaveBalance[]> {
  const data = await gql<{ hrLeaveBalances: HrLeaveBalance[] }>(
    `query ($employeeId: Int) {
      hrLeaveBalances(employeeId: $employeeId) {
        id employeeId leaveType balanceDays updatedAt
        employee { id fullName }
      }
    }`,
    { employeeId: employeeId ?? null },
  );
  return data.hrLeaveBalances || [];
}

export async function fetchHrAttendance(
  fromYmd: string,
  toYmd: string,
  employeeId?: number,
): Promise<HrAttendance[]> {
  const data = await gql<{ hrAttendance: HrAttendance[] }>(
    `query ($fromYmd: String!, $toYmd: String!, $employeeId: Int) {
      hrAttendance(fromYmd: $fromYmd, toYmd: $toYmd, employeeId: $employeeId) {
        id employeeId workDate clockInAt clockOutAt status notes
        employee { id fullName }
      }
    }`,
    { fromYmd, toYmd, employeeId: employeeId ?? null },
  );
  return data.hrAttendance || [];
}

export async function clockHrAttendanceApi(input: {
  employeeId: number;
  action: "in" | "out";
}) {
  const data = await gql<{ clockHrAttendance: HrAttendance }>(
    `mutation ($employeeId: Int!, $action: String!) {
      clockHrAttendance(employeeId: $employeeId, action: $action) {
        id workDate clockInAt clockOutAt status
      }
    }`,
    { employeeId: input.employeeId, action: input.action },
  );
  return data.clockHrAttendance;
}

export async function fetchHrShifts(
  fromYmd: string,
  toYmd: string,
): Promise<HrShift[]> {
  const data = await gql<{ hrShifts: HrShift[] }>(
    `query ($fromYmd: String!, $toYmd: String!) {
      hrShifts(fromYmd: $fromYmd, toYmd: $toYmd) {
        id employeeId workDate department startTime endTime notes
        employee { id fullName }
      }
    }`,
    { fromYmd, toYmd },
  );
  return data.hrShifts || [];
}

export async function createHrShiftApi(input: {
  employeeId: number;
  workDate: string;
  department?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}) {
  const data = await gql<{ createHrShift: HrShift }>(
    `mutation (
      $employeeId: Int!
      $workDate: String!
      $department: String
      $startTime: String
      $endTime: String
      $notes: String
    ) {
      createHrShift(
        employeeId: $employeeId
        workDate: $workDate
        department: $department
        startTime: $startTime
        endTime: $endTime
        notes: $notes
      ) { id workDate startTime endTime }
    }`,
    { ...input },
  );
  return data.createHrShift;
}

export async function deleteHrShiftApi(id: number) {
  await gql(`mutation ($id: Int!) { deleteHrShift(id: $id) }`, { id });
}

export async function fetchHrDocuments(employeeId?: number): Promise<HrDocument[]> {
  const data = await gql<{ hrDocuments: HrDocument[] }>(
    `query ($employeeId: Int) {
      hrDocuments(employeeId: $employeeId) {
        id employeeId title docType fileUrl notes createdAt
        employee { id fullName }
      }
    }`,
    { employeeId: employeeId ?? null },
  );
  return data.hrDocuments || [];
}

export async function createHrDocumentApi(input: {
  employeeId: number;
  title: string;
  docType?: string;
  fileUrl?: string;
  notes?: string;
}) {
  const data = await gql<{ createHrDocument: HrDocument }>(
    `mutation (
      $employeeId: Int!
      $title: String!
      $docType: String
      $fileUrl: String
      $notes: String
    ) {
      createHrDocument(
        employeeId: $employeeId
        title: $title
        docType: $docType
        fileUrl: $fileUrl
        notes: $notes
      ) { id title docType fileUrl }
    }`,
    { ...input },
  );
  return data.createHrDocument;
}

export async function deleteHrDocumentApi(id: number) {
  await gql(`mutation ($id: Int!) { deleteHrDocument(id: $id) }`, { id });
}

export async function fetchHrPayrollPeriods(): Promise<HrPayrollPeriod[]> {
  const data = await gql<{ hrPayrollPeriods: HrPayrollPeriod[] }>(`
    query {
      hrPayrollPeriods {
        id periodKey fromYmd toYmd status notes closedAt closedBy createdAt
      }
    }
  `);
  return data.hrPayrollPeriods || [];
}

export async function createHrPayrollPeriodApi(input: {
  periodKey: string;
  fromYmd: string;
  toYmd: string;
  notes?: string;
}) {
  const data = await gql<{ createHrPayrollPeriod: HrPayrollPeriod }>(
    `mutation (
      $periodKey: String!
      $fromYmd: String!
      $toYmd: String!
      $notes: String
    ) {
      createHrPayrollPeriod(
        periodKey: $periodKey
        fromYmd: $fromYmd
        toYmd: $toYmd
        notes: $notes
      ) { id periodKey status }
    }`,
    { ...input },
  );
  return data.createHrPayrollPeriod;
}

export async function closeHrPayrollPeriodApi(id: number) {
  const data = await gql<{ closeHrPayrollPeriod: HrPayrollPeriod }>(
    `mutation ($id: Int!) { closeHrPayrollPeriod(id: $id) { id status closedAt } }`,
    { id },
  );
  return data.closeHrPayrollPeriod;
}

export async function fetchHrPayslips(periodId: number): Promise<HrPayslip[]> {
  const data = await gql<{ hrPayslips: HrPayslip[] }>(
    `query ($periodId: Int!) {
      hrPayslips(periodId: $periodId) {
        id periodId employeeId basePayETB overtimeETB tipsETB deductionsETB netPayETB notes
        employee { id fullName }
      }
    }`,
    { periodId },
  );
  return data.hrPayslips || [];
}

export async function upsertHrPayslipApi(input: {
  periodId: number;
  employeeId: number;
  basePayETB?: number;
  overtimeETB?: number;
  tipsETB?: number;
  deductionsETB?: number;
  notes?: string;
}) {
  const data = await gql<{ upsertHrPayslip: HrPayslip }>(
    `mutation (
      $periodId: Int!
      $employeeId: Int!
      $basePayETB: Float
      $overtimeETB: Float
      $tipsETB: Float
      $deductionsETB: Float
      $notes: String
    ) {
      upsertHrPayslip(
        periodId: $periodId
        employeeId: $employeeId
        basePayETB: $basePayETB
        overtimeETB: $overtimeETB
        tipsETB: $tipsETB
        deductionsETB: $deductionsETB
        notes: $notes
      ) { id netPayETB basePayETB tipsETB deductionsETB }
    }`,
    { ...input },
  );
  return data.upsertHrPayslip;
}

export async function fetchHrIncidents(employeeId?: number): Promise<HrIncident[]> {
  const data = await gql<{ hrIncidents: HrIncident[] }>(
    `query ($employeeId: Int) {
      hrIncidents(employeeId: $employeeId) {
        id employeeId kind title detail occurredYmd recordedBy createdAt
        employee { id fullName }
      }
    }`,
    { employeeId: employeeId ?? null },
  );
  return data.hrIncidents || [];
}

export async function createHrIncidentApi(input: {
  employeeId: number;
  kind?: string;
  title: string;
  detail?: string;
  occurredYmd?: string;
}) {
  const data = await gql<{ createHrIncident: HrIncident }>(
    `mutation (
      $employeeId: Int!
      $kind: String
      $title: String!
      $detail: String
      $occurredYmd: String
    ) {
      createHrIncident(
        employeeId: $employeeId
        kind: $kind
        title: $title
        detail: $detail
        occurredYmd: $occurredYmd
      ) { id kind title }
    }`,
    { ...input },
  );
  return data.createHrIncident;
}

export async function deleteHrIncidentApi(id: number) {
  await gql(`mutation ($id: Int!) { deleteHrIncident(id: $id) }`, { id });
}
