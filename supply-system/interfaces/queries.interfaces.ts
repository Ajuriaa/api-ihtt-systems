import { IEntry, IGroup, IOutput, IProduct, IBatch, IProductRequisition, IRequisition, IState, ISupplier } from ".";

export interface IEntriesQuery {
  data: Partial<IEntry>[];
}

export interface IHistoryQuery {
  entries: Partial<IEntry>[];
  outputs: Partial<IOutput>[];
}

export interface IEntryQuery {
  data: Partial<IEntry>;
}

export interface IStatesQuery {
  data: Partial<IState>[];
}

export interface IStateQuery {
  data: Partial<IState>;
}

export interface IGroupsQuery {
  data: Partial<IGroup>[];
}

export interface IGroupQuery {
  data: Partial<IGroup>;
}

export interface IProductsQuery {
  data: Partial<IProduct>[];
}

export interface IProductQuery {
  data: Partial<IProduct>;
}

export interface IProductRequisitionsQuery {
  data: Partial<IProductRequisition>[];
}

export interface IProductRequisitionQuery {
  data: Partial<IProductRequisition>;
}

export interface ISuppliersQuery {
  data: Partial<ISupplier>[];
}

export interface ISupplierQuery {
  data: Partial<ISupplier>;
}

export interface IRequisitionsQuery {
  data: Partial<IRequisition>[];
}

export interface IRequisitionQuery {
  data: Partial<IRequisition>;
}

export interface IOutputsQuery {
  data: Partial<IOutput>[];
}

export interface IOutputQuery {
  data: Partial<IOutput>[];
}

export interface IBatchesQuery {
  data: Partial<IBatch>[];
}

export interface IBatchQuery {
  data: Partial<IBatch>;
}
