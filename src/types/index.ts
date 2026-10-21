export type UserRole =
  | 'head_office'
  | 'hr_admin'
  | 'asset_manager'
  | 'area_incharge'
  | 'field_staff';

export interface User {
  id: string;
  employeeId: string; // e.g. 1001, 1057
  numericId?: string; // e.g. 1001
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  assignedAreaIds: string[]; // ['ALL'] or list of area IDs
  designation: string;
  department?: string; // e.g. 'Admin & Finance', 'Program & Operation'
  jobLocationCategory?: string; // e.g. 'Head Office', 'Peace Home', 'Inclusive School'
  employmentNature?: 'Permanent' | 'Contractual' | 'Part Time';
  gender?: 'Male' | 'Female';
  phone: string;
  isFirstLogin: boolean;
  active: boolean;
  hasLoginPermission: boolean; // only designated 14 staff have active login permission
  canApproveDisposal: boolean;
  canManageAssets: boolean;
  canManageStaff: boolean;
  canManageAreas: boolean;
  canUpdateOrgInfo: boolean;
  avatar?: string;
}

export interface Area {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  type: 'Shelter' | 'SUS' | 'School' | 'Vocational' | 'Head Office' | 'Other';
  addressEn: string;
  addressBn: string;
  contactPerson: string;
  contactPhone: string;
  active: boolean;
}

export type AssetCategory =
  | 'IT_Electronics'
  | 'Furniture'
  | 'Vehicle'
  | 'Kitchenware'
  | 'Educational'
  | 'Appliances'
  | 'Medical'
  | 'Facility';

export type UsabilityStatus =
  | 'Usable'
  | 'Repairable'
  | 'Unusable'
  | 'Disposed';

export type InitialCondition = 'New' | 'Used';

export interface Asset {
  id: string; // e.g., LEEDO-HO-2026-0001
  titleEn: string;
  titleBn?: string;
  category: AssetCategory;
  acquisitionType: 'Purchased' | 'Donation';
  donorOrVendor: string;
  purchaseDate: string; // YYYY-MM-DD
  purchaseValueBDT: number;
  initialCondition: InitialCondition;
  usabilityStatus: UsabilityStatus;
  assignedAreaId: string;
  specificRoom: string;
  serialNumber?: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  transferStatus?: 'none' | 'in_transit' | 'transferred';
  currentTransferId?: string;
  disposalDate?: string; // YYYY-MM-DD
  disposalReason?: string;
  disposalMethod?: 'Scrapped' | 'Auction' | 'Recycled' | 'Donated';
  salvageValueBDT?: number;
}

export type DisposalStatus = 'Pending HO Approval' | 'Approved' | 'Rejected';

export interface DisposalRequest {
  id: string;
  assetId: string;
  assetTitle: string;
  category: AssetCategory;
  assignedAreaId: string;
  purchaseValueBDT: number;
  currentBookValueBDT: number;
  requestedByUserId: string;
  requestedByUserName: string;
  requestDate: string;
  reasonEn: string;
  damageDetails: string;
  status: DisposalStatus;
  proposedAction?: 'Sell as Scrap' | 'E-waste Recycling' | 'Donation to Destitute' | 'Destruction' | 'Auction';
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewDate?: string;
  reviewComments?: string;
}

export type TransferCondition = 'Good' | 'Damaged' | 'Repairable' | 'Missing parts';

export interface AssetTransfer {
  id: string;
  voucherNumber: string; // TR-2026-0001
  assetId: string;
  assetTitle: string;
  sourceAreaId: string;
  destinationAreaId: string;
  dispatchDateTime: string;
  dispatchCondition: TransferCondition;
  dispatchByUserId: string;
  dispatchByUserName: string;
  dispatchRemarks?: string;
  courierOrDriver?: string;
  status: 'In-Transit' | 'Received';
  receiveDateTime?: string;
  receiveCondition?: TransferCondition;
  receivedByUserId?: string;
  receivedByUserName?: string;
  receiveRemarks?: string;
}

export interface OrganizationProfile {
  nameEn: string;
  nameBn: string;
  shortName: string;
  logoUrl: string;
  addressEn: string;
  addressBn: string;
  email: string;
  phone: string;
  website: string;
  registrationNo: string;
  executiveDirector: string;
  categoryDepreciationRates: Record<AssetCategory, number>; // decimal, e.g. 0.20
}
