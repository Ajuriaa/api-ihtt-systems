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
  description?: string;
}

export interface IProduct {
  id: number;
  name: string;
  groupId: number;
  unit: string;
  imageUrl?: string | null;
}

export interface IProductRequisition {
  id: number;
  productId: number;
  requisitionId: number;
  quantity: number;
}

export interface ISupplier {
  id: number;
  name: string;
}

export interface IRequisition {
  id: number;
  employeeId: number;
  department: string;
  stateId: number;
  documentUrl: string;
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