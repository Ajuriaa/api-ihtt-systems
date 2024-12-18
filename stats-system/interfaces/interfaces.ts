export interface Stat {
  areaName: string;
  documentStatus: string;
  coStatus: string;
  deliveryDate: string; // ISO 8601 formatted date
  shelfNumber: string;
  rowNumber: string;
  ringNumber: string;
  certificateNumber: string;
  plateId: string;
  exploitationPermissionNumber: string;
  modality: string;
  documentType: string;
  department: string;
  requestId: string;
  fileId: string;
  isAutomaticRenewal: number; // 0 or 1
  preform: string;
  concessionaireRtn: string;
  concessionaireName: string;
  concessionairePhone: string;
  concessionaireEmail: string;
  legalRepresentativeName: string;
  legalRepresentativeEmail: string;
  legalRepresentativePhone: string;
  unifiedRequirement: string;
  noticeCode: number;
  noticeStatusDescription: string;
  totalNoticeAmount: number | string;
  systemUser: string;
  inventoryDate: string; // ISO 8601 formatted date
  certificateExpirationDate: string; // ISO 8601 formatted date
  permissionExpirationDate: string; // ISO 8601 formatted date
}
