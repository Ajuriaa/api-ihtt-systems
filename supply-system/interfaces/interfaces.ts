export interface IEntry {
  id: number;
  supplierId: number;
  date: Date;
  invoiceUrl: string | null;
}

export interface IState {
  id: number;
  state: string;
}

export interface IGroup {
  id: number;
  name: string;
  description?: string | null;
}

export interface IProduct {
  id: number;
  name: string;
  groupId: number;
  unit: string;
  minimum: number;
  imageUrl?: string | null;
}

export interface IProductRequisition {
  id: number;
  productId: number;
  requisitionId: number;
  systemUser: string;
  quantity: number;
}

export interface ISupplier {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  rtn?: string | null;
}

export interface IRequisition {
  id: number;
  employeeId: number;
  department: string;
  stateId: number;
  documentUrl?: string | null;
}

export interface IOutput {
  id: number;
  productId: number;
  observation?: string | null;
  quantity: number;
  requisitionId?: number | null;
  motive: string | null;
}

export interface IBatch {
  id: number;
  productId: number;
  entryId: number;
  due: Date;
  quantity: number;
  price: number;
}
