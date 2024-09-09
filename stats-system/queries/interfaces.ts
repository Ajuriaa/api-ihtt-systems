export interface IExpedientRenovationQuery {
  cityCode: string;
  normalProcessExpedientCount: number;
  automaticRenovationExpedientCount: number;
}

export interface IExpedientByProcedureAndCategoryQuery {
  procedureType: string;
  category: string;
  expedientCount: number;
}

export interface IExpedientByModalityAndProcedureQuery {
  procedureType: string;
  modalityOrCategory: string;
  expedientCount: number;
}

export interface IEmissionsByExpirationAndAmountQuery {
  year: number;
  month: string;
  modality: string;
  expiredCertificateCount: number;
  amountToCollect: number;
}

export interface IFinesByRegionalQuery {
  officeId: number;
  officeDescription: string;
  totalRegional: number;
}

export interface IFinesByInfractionQuery {
  infractionId: string;
  infractionType: string;
  totalByInfraction: number;
}

export interface IFinesByDepartmentQuery {
  departmentDescription: string;
  departmentId: number;
  totalByDepartment: number;
}

export interface ISeizuresByDepartmentQuery {
  departmentDescription: string;
  departmentId: number;
  totalByDepartment: number;
}

export interface IFinesByInfractionDescriptionQuery {
  infractionAbbreviation: string;
  totalInfraction: number;
}

export interface IFinesByTypeQuery {
  detail: string;
  totalFines: number;
}

export interface IChargesSummaryQuery {
  procedureTypeCode: string;
  detailDescription: string;
  amount: number;
  count: number;
  totalAmount: number;
}
