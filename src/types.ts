
export interface ComputerAsset {
  id: string;
  Computername: string;
  User: string;
  Department: string;
  Model: string;
  SerialNo: string;
  Location: string;
  Status: string;
}

export type AssetFilter = {
  [K in keyof ComputerAsset]?: string;
};
