import {
  Area,
  Asset,
  AssetTransfer,
  DisposalRequest,
  OrganizationProfile,
  User,
} from '../types';
import { calculateDepreciation, DEFAULT_DEPRECIATION_RATES } from '../utils/depreciation';

// Storage Keys
const STORAGE_PREFIX = 'leedo_lams_';
const KEYS = {
  USERS: `${STORAGE_PREFIX}users`,
  CURRENT_USER: `${STORAGE_PREFIX}current_user`,
  AREAS: `${STORAGE_PREFIX}areas`,
  ASSETS: `${STORAGE_PREFIX}assets`,
  TRANSFERS: `${STORAGE_PREFIX}transfers`,
  DISPOSALS: `${STORAGE_PREFIX}disposals`,
  ORG_PROFILE: `${STORAGE_PREFIX}org_profile`,
  LANG: `${STORAGE_PREFIX}language`,
};

// Default 13 Areas
export const DEFAULT_AREAS: Area[] = [
  {
    id: 'area-apt',
    code: 'APT',
    nameEn: 'Airport SUS',
    nameBn: 'বিমানবন্দর এসইউএস',
    type: 'SUS',
    addressEn: 'Airport Railway Station Area, Dhaka',
    addressBn: 'বিমানবন্দর রেলওয়ে স্টেশন এলাকা, ঢাকা',
    contactPerson: 'Opu',
    contactPhone: '+880 1711-200001',
    active: true,
  },
  {
    id: 'area-mir',
    code: 'MIR',
    nameEn: 'Mirpur SUS',
    nameBn: 'মিরপুর এসইউএস',
    type: 'SUS',
    addressEn: 'Section 10, Mirpur, Dhaka',
    addressBn: 'সেকশন ১০, মিরপুর, ঢাকা',
    contactPerson: 'Opu',
    contactPhone: '+880 1711-200002',
    active: true,
  },
  {
    id: 'area-tej',
    code: 'TEJ',
    nameEn: 'Tejgaon SUS',
    nameBn: 'তেজগাঁও এসইউএস',
    type: 'SUS',
    addressEn: 'Tejgaon Industrial Area, Dhaka',
    addressBn: 'তেজগাঁও শিল্প এলাকা, ঢাকা',
    contactPerson: 'Opu',
    contactPhone: '+880 1711-200003',
    active: true,
  },
  {
    id: 'area-ray',
    code: 'RAY',
    nameEn: 'Rayerbazar SUS',
    nameBn: 'রায়েরবাজার এসইউএস',
    type: 'SUS',
    addressEn: 'Rayerbazar Beribadh, Dhaka',
    addressBn: 'রায়েরবাজার বেড়িবাঁধ, ঢাকা',
    contactPerson: 'Farhana',
    contactPhone: '+880 1711-200004',
    active: true,
  },
  {
    id: 'area-kmp',
    code: 'KMP',
    nameEn: 'Kamalapur SUS',
    nameBn: 'কমলাপুর এসইউএস',
    type: 'SUS',
    addressEn: 'Kamalapur Railway Station Area, Dhaka',
    addressBn: 'কমলাপুর রেলওয়ে স্টেশন এলাকা, ঢাকা',
    contactPerson: 'Masud',
    contactPhone: '+880 1711-200005',
    active: true,
  },
  {
    id: 'area-kms',
    code: 'KMS',
    nameEn: 'Kamalapur Shelter',
    nameBn: 'কমলাপুর শেল্টার',
    type: 'Shelter',
    addressEn: 'Near Kamalapur Stadium, Dhaka',
    addressBn: 'কমলাপুর স্টেডিয়াম সংলগ্ন, ঢাকা',
    contactPerson: 'Masud',
    contactPhone: '+880 1711-200006',
    active: true,
  },
  {
    id: 'area-sdg',
    code: 'SDG',
    nameEn: 'Shadarghat SUS',
    nameBn: 'সদরঘাট এসইউএস',
    type: 'SUS',
    addressEn: 'Sadarghat Launch Terminal, Old Dhaka',
    addressBn: 'সদরঘাট লঞ্চ টার্মিনাল, পুরান ঢাকা',
    contactPerson: 'Sajon',
    contactPhone: '+880 1711-200007',
    active: true,
  },
  {
    id: 'area-smb',
    code: 'SMB',
    nameEn: 'Shambazar SUS',
    nameBn: 'শ্যামবাজার এসইউএস',
    type: 'SUS',
    addressEn: 'Shambazar Ghat, Old Dhaka',
    addressBn: 'শ্যামবাজার ঘাট, পুরান ঢাকা',
    contactPerson: 'Sajon',
    contactPhone: '+880 1711-200008',
    active: true,
  },
  {
    id: 'area-kdt',
    code: 'KDT',
    nameEn: 'Kadamtali Shelter',
    nameBn: 'কদমতলী শেল্টার',
    type: 'Shelter',
    addressEn: 'Kadamtali, Keraniganj, Dhaka',
    addressBn: 'কদমতলী, কেরানীগঞ্জ, ঢাকা',
    contactPerson: 'Sajon',
    contactPhone: '+880 1711-200009',
    active: true,
  },
  {
    id: 'area-kvc',
    code: 'KVC',
    nameEn: 'Kadamtali Vocational Center',
    nameBn: 'কদমতলী ভোকেশনাল সেন্টার',
    type: 'Vocational',
    addressEn: 'Kadamtali Industrial Road, Dhaka',
    addressBn: 'কদমতলী ইন্ডাস্ট্রিয়াল রোড, ঢাকা',
    contactPerson: 'Sajon',
    contactPhone: '+880 1711-200010',
    active: true,
  },
  {
    id: 'area-ins',
    code: 'INS',
    nameEn: 'Inclusive School',
    nameBn: 'ইনক্লুসিভ স্কুল',
    type: 'School',
    addressEn: 'Bosila Road, Mohammadpur, Dhaka',
    addressBn: 'বসিলা রোড, মোহাম্মদপুর, ঢাকা',
    contactPerson: 'Kazi Tahmina',
    contactPhone: '+880 1711-200011',
    active: true,
  },
  {
    id: 'area-pch',
    code: 'PCH',
    nameEn: 'Peace Home',
    nameBn: 'পিস হোম (Peace Home)',
    type: 'Shelter',
    addressEn: 'LEEDO Village, Konabari, Gazipur',
    addressBn: 'লিডো ভিলেজ, কোনাবাড়ী, গাজীপুর',
    contactPerson: 'Sohel Rana',
    contactPhone: '+880 1711-200012',
    active: true,
  },
  {
    id: 'area-ho',
    code: 'HO',
    nameEn: 'Head Office',
    nameBn: 'প্রধান কার্যালয় (হেড অফিস)',
    type: 'Head Office',
    addressEn: 'House 35, Road 9/A, Dhanmondi, Dhaka-1209',
    addressBn: 'বাড়ি ৩৫, রোড ৯/এ, ধানমন্ডি, ঢাকা-১২০৯',
    contactPerson: 'Omar',
    contactPhone: '+880 1711-200013',
    active: true,
  },
];

// Pre-seeded Users matching LEEDO Official Employee Database
export const DEFAULT_USERS: User[] = [
  // --- 14 PERMITTED STAFF WITH ACTIVE LOGIN ACCESS ---

  // 1. SL 1 | EID 1001: Forhad Hossain - Founder & ED (Head Office)
  {
    id: 'user-1001',
    employeeId: '1001',
    numericId: '1001',
    name: 'Forhad Hossain',
    email: 'forhad@leedo.org',
    password: '1001',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Founder & ED',
    department: 'Executive Management',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01819-291567',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 2. SL 2 | EID 1002: Murshida Akhter Kanta - Director - Admin & Finance (Head Office)
  {
    id: 'user-1002',
    employeeId: '1002',
    numericId: '1002',
    name: 'Murshida Akhter Kanta',
    email: 'kanta@leedo.org',
    password: '1002',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Director - Admin & Finance',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01861-676979',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 3. SL 3 | EID 1004: Md. Habibur Rahman - Accountant (Head Office)
  {
    id: 'user-1004',
    employeeId: '1004',
    numericId: '1004',
    name: 'Md. Habibur Rahman',
    email: 'habibur@leedo.org',
    password: '1004',
    role: 'asset_manager',
    assignedAreaIds: ['ALL'],
    designation: 'Accountant (Asset Manager & Approval)',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01733-336365',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 4. SL 4 | EID 1007: Athui Marma - Monitoring Officer (Head Office)
  {
    id: 'user-1007',
    employeeId: '1007',
    numericId: '1007',
    name: 'Athui Marma',
    email: 'athui@leedo.org',
    password: '1007',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Monitoring Officer',
    department: 'Program & Operation',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01533-650126',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 5. SL 5 | EID 1008: Tawhid Ahmeed - Young Volunteer (Head Office)
  {
    id: 'user-1008',
    employeeId: '1008',
    numericId: '1008',
    name: 'Tawhid Ahmeed',
    email: 'tawhid@leedo.org',
    password: '1008',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Young Volunteer',
    department: 'Program & Operation',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Contractual',
    gender: 'Male',
    phone: '01893-636383',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 6. SL 6 | EID 1009: Rone Ahammed - Logistics Officer (Head Office)
  {
    id: 'user-1009',
    employeeId: '1009',
    numericId: '1009',
    name: 'Rone Ahammed',
    email: 'rone@leedo.org',
    password: '1009',
    role: 'asset_manager',
    assignedAreaIds: ['ALL'],
    designation: 'Logistics Officer (Asset Manager & Verifier)',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01818-202173',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 8. SL 8 | EID 1013: Md. Sohel Rana - Manager (Head Office)
  {
    id: 'user-1013',
    employeeId: '1013',
    numericId: '1013',
    name: 'Md. Sohel Rana',
    email: 'sohel@leedo.org',
    password: '1013',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Manager',
    department: 'Program & Operation',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01728-790037',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 16. SL 16 | EID 1023: Md. Masud - Social Mobilizer (Incharge) (Kamalapur)
  {
    id: 'user-1023',
    employeeId: '1023',
    numericId: '1023',
    name: 'Md. Masud',
    email: 'masud@leedo.org',
    password: '1023',
    role: 'area_incharge',
    assignedAreaIds: ['area-kmp', 'area-kms'],
    designation: 'Social Mobilizer (Incharge)',
    department: 'Program & Operation',
    jobLocationCategory: 'Kamalapur',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01304-035081',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 17. SL 17 | EID 1028: Saidur Rahman Sajan - Social Mobilizer (Kodomtoli)
  {
    id: 'user-1028',
    employeeId: '1028',
    numericId: '1028',
    name: 'Saidur Rahman Sajan',
    email: 'sajan@leedo.org',
    password: '1028',
    role: 'area_incharge',
    assignedAreaIds: ['area-sdg', 'area-smb', 'area-kdt', 'area-kvc'],
    designation: 'Social Mobilizer (Incharge)',
    department: 'Program & Operation',
    jobLocationCategory: 'Kodomtoli',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01632-147709',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 19. SL 19 | EID 1032: Nazirul Islam Opu - Senior Social Mobilzer (Incharge) (Mirpur)
  {
    id: 'user-1032',
    employeeId: '1032',
    numericId: '1032',
    name: 'Nazirul Islam Opu',
    email: 'opu@leedo.org',
    password: '1032',
    role: 'area_incharge',
    assignedAreaIds: ['area-apt', 'area-mir', 'area-tej'],
    designation: 'Senior Social Mobilizer (Incharge)',
    department: 'Program & Operation',
    jobLocationCategory: 'Mirpur',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01615-190173',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 24. SL 24 | EID 1038: Kazi Tahmin Sultana - Special Educator (Inclusive School)
  {
    id: 'user-1038',
    employeeId: '1038',
    numericId: '1038',
    name: 'Kazi Tahmin Sultana',
    email: 'tahmin@leedo.org',
    password: '1038',
    role: 'field_staff',
    assignedAreaIds: ['area-ins'],
    designation: 'Special Educator',
    department: 'Program & Operation',
    jobLocationCategory: 'Inclusive School',
    employmentNature: 'Contractual',
    gender: 'Female',
    phone: '01619-845002',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 25. SL 25 | EID 1039: Tahmina Haque Tonima - Special Educator (Inclusive School)
  {
    id: 'user-1039',
    employeeId: '1039',
    numericId: '1039',
    name: 'Tahmina Haque Tonima',
    email: 'tonima@leedo.org',
    password: '1039',
    role: 'field_staff',
    assignedAreaIds: ['area-ins'],
    designation: 'Special Educator',
    department: 'Program & Operation',
    jobLocationCategory: 'Inclusive School',
    employmentNature: 'Contractual',
    gender: 'Female',
    phone: '01962-678701',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // 30. SL 30 | EID 1057: Md. Omar Faruque - Manager HR & Admin (Head Office)
  {
    id: 'user-1057',
    employeeId: '1057',
    numericId: '1057',
    name: 'Md. Omar Faruque',
    email: 'omar@leedo.org',
    password: '1057',
    role: 'hr_admin',
    assignedAreaIds: ['ALL'],
    designation: 'Manager HR & Admin',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '016714-32484',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: true,
    canManageAreas: true,
    canUpdateOrgInfo: true,
  },

  // 42. SL 42 | EID 1079: Sazzad Hosen - Assistant Accountant (Head Office)
  {
    id: 'user-1079',
    employeeId: '1079',
    numericId: '1079',
    name: 'Sazzad Hosen',
    email: 'sazzad@leedo.org',
    password: '1079',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Assistant Accountant (Admin & Finance)',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01680-882718',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: true,
    canApproveDisposal: true,
    canManageAssets: true,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // --- OTHER STAFF (Login Permission Access OFF / Disabled) ---

  // SL 7 | EID 1010: Ibrahim - Driver
  {
    id: 'user-1010',
    employeeId: '1010',
    numericId: '1010',
    name: 'Ibrahim',
    email: 'ibrahim@leedo.org',
    password: '1010',
    role: 'field_staff',
    assignedAreaIds: ['area-ho'],
    designation: 'Driver',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01764-614539',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 9 | EID 1014: Tania Akter - Assistant Home Super (Peace Home)
  {
    id: 'user-1014',
    employeeId: '1014',
    numericId: '1014',
    name: 'Tania Akter',
    email: 'tania@leedo.org',
    password: '1014',
    role: 'field_staff',
    assignedAreaIds: ['area-pch'],
    designation: 'Assistant Home Super',
    department: 'Program & Operation',
    jobLocationCategory: 'Peace Home',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01952-509518',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 10 | EID 1015: Parvin Akter - Mother (Peace Home)
  {
    id: 'user-1015',
    employeeId: '1015',
    numericId: '1015',
    name: 'Parvin Akter',
    email: 'parvin@leedo.org',
    password: '1015',
    role: 'field_staff',
    assignedAreaIds: ['area-pch'],
    designation: 'Mother',
    department: 'Program & Operation',
    jobLocationCategory: 'Peace Home',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01919-490307',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 11 | EID 1016: Vulu Rani Mollik - Cook (Peace Home)
  {
    id: 'user-1016',
    employeeId: '1016',
    numericId: '1016',
    name: 'Vulu Rani Mollik',
    email: 'vulu@leedo.org',
    password: '1016',
    role: 'field_staff',
    assignedAreaIds: ['area-pch'],
    designation: 'Cook',
    department: 'Program & Operation',
    jobLocationCategory: 'Peace Home',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01752-841427',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 12 | EID 1017: Nargis Akhter - Psycho-social Facilitator (Peace Home)
  {
    id: 'user-1017',
    employeeId: '1017',
    numericId: '1017',
    name: 'Nargis Akhter',
    email: 'nargis@leedo.org',
    password: '1017',
    role: 'field_staff',
    assignedAreaIds: ['area-pch'],
    designation: 'Psycho-social Facilitator',
    department: 'Program & Operation',
    jobLocationCategory: 'Peace Home',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01712-884445',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 15 | EID 1022: Sahela Khan Rimu - Mother (Kamalapur)
  {
    id: 'user-1022',
    employeeId: '1022',
    numericId: '1022',
    name: 'Sahela Khan Rimu',
    email: 'sahela@leedo.org',
    password: '1022',
    role: 'field_staff',
    assignedAreaIds: ['area-kms'],
    designation: 'Mother',
    department: 'Program & Operation',
    jobLocationCategory: 'Kamalapur',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01813-253769',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 18 | EID 1030: Shahnaz Parvin - Cook (Kodomtoli)
  {
    id: 'user-1030',
    employeeId: '1030',
    numericId: '1030',
    name: 'Shahnaz Parvin',
    email: 'shahnaz@leedo.org',
    password: '1030',
    role: 'field_staff',
    assignedAreaIds: ['area-kdt'],
    designation: 'Cook',
    department: 'Program & Operation',
    jobLocationCategory: 'Kodomtoli',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01934-229459',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 20 | EID 1034: Leo Gomes - Street Educator (Tejgaon)
  {
    id: 'user-1034',
    employeeId: '1034',
    numericId: '1034',
    name: 'Leo Gomes',
    email: 'leo@leedo.org',
    password: '1034',
    role: 'field_staff',
    assignedAreaIds: ['area-tej'],
    designation: 'Street Educator',
    department: 'Program & Operation',
    jobLocationCategory: 'Tejgaon',
    employmentNature: 'Permanent',
    gender: 'Male',
    phone: '01618-235848',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 21 | EID 1035: Shuchitra Rani Barman - Street Educator (Tejgaon)
  {
    id: 'user-1035',
    employeeId: '1035',
    numericId: '1035',
    name: 'Shuchitra Rani Barman',
    email: 'shuchitra@leedo.org',
    password: '1035',
    role: 'field_staff',
    assignedAreaIds: ['area-tej'],
    designation: 'Street Educator',
    department: 'Program & Operation',
    jobLocationCategory: 'Tejgaon',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01968-356611',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 23 | EID 1037: Farhana - Social Mobilizer (Rayerbazar)
  {
    id: 'user-1037',
    employeeId: '1037',
    numericId: '1037',
    name: 'Farhana',
    email: 'farhana@leedo.org',
    password: '1037',
    role: 'field_staff',
    assignedAreaIds: ['area-ray'],
    designation: 'Social Mobilizer',
    department: 'Program & Operation',
    jobLocationCategory: 'Rayerbazar',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01869-653139',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 26 | EID 1040: Lipi Khanom - Street Educator (Airport)
  {
    id: 'user-1040',
    employeeId: '1040',
    numericId: '1040',
    name: 'Lipi Khanom',
    email: 'lipi@leedo.org',
    password: '1040',
    role: 'field_staff',
    assignedAreaIds: ['area-apt'],
    designation: 'Street Educator',
    department: 'Program & Operation',
    jobLocationCategory: 'Airport',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01710-184566',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 27 | EID 1042: Shanta Islam - Shelter Supervisor (Kamalapur)
  {
    id: 'user-1042',
    employeeId: '1042',
    numericId: '1042',
    name: 'Shanta Islam',
    email: 'shanta@leedo.org',
    password: '1042',
    role: 'field_staff',
    assignedAreaIds: ['area-kms'],
    designation: 'Shelter Supervisor',
    department: 'Program & Operation',
    jobLocationCategory: 'Kamalapur',
    employmentNature: 'Permanent',
    gender: 'Female',
    phone: '01777-223190',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 31 | EID 1059: Mim Akter Oishi - Young Volunteer (Head Office)
  {
    id: 'user-1059',
    employeeId: '1059',
    numericId: '1059',
    name: 'Mim Akter Oishi',
    email: 'mim@leedo.org',
    password: '1059',
    role: 'field_staff',
    assignedAreaIds: ['area-ho'],
    designation: 'Young Volunteer',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Contractual',
    gender: 'Female',
    phone: '01918-058097',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 33 | EID 1062: Sharmin Akter Puspo - Young Volunteer (Head Office)
  {
    id: 'user-1062',
    employeeId: '1062',
    numericId: '1062',
    name: 'Sharmin Akter Puspo',
    email: 'puspo@leedo.org',
    password: '1062',
    role: 'field_staff',
    assignedAreaIds: ['area-ho'],
    designation: 'Young Volunteer',
    department: 'Admin & Finance',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Contractual',
    gender: 'Female',
    phone: '01867-074900',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },

  // SL 34 | EID 1063: Mohammed Sakaitul Hideer - Project Manager
  {
    id: 'user-1063',
    employeeId: '1063',
    numericId: '1063',
    name: 'Mohammed Sakaitul Hideer',
    email: 'sakaitul@leedo.org',
    password: '1063',
    role: 'head_office',
    assignedAreaIds: ['ALL'],
    designation: 'Project Manager',
    department: 'Program & Operation',
    jobLocationCategory: 'Head Office',
    employmentNature: 'Contractual',
    gender: 'Male',
    phone: '01718-479633',
    isFirstLogin: true,
    active: true,
    hasLoginPermission: false, // Login permission OFF
    canApproveDisposal: false,
    canManageAssets: false,
    canManageStaff: false,
    canManageAreas: false,
    canUpdateOrgInfo: false,
  },
];

// Default Org Profile
export const DEFAULT_ORG_PROFILE: OrganizationProfile = {
  nameEn: 'LEEDO (Local Education and Economic Development Organization)',
  nameBn: 'লোকাল এডুকেশন অ্যান্ড ইকোনমিক ডেভেলপমেন্ট অর্গানাইজেশন (লিডো)',
  shortName: 'LEEDO',
  logoUrl: '/assets/aistudio/Logo-of-LEEDO-Short-01-746x1024_a345b8a2.png',
  addressEn: 'House 35, Road 9/A, Dhanmondi R/A, Dhaka-1209, Bangladesh',
  addressBn: 'বাড়ি ৩৫, রোড ৯/এ, ধানমন্ডি আ/এ, ঢাকা-১২০৯, বাংলাদেশ',
  email: 'hr.leedo2000@gmail.com',
  phone: '+880 2-9118800, +880 1711-200000',
  website: 'https://leedobd.org',
  registrationNo: 'FDSR/NGOAB/2384',
  executiveDirector: 'Forhad Hossain',
  categoryDepreciationRates: DEFAULT_DEPRECIATION_RATES,
};

// Default Realistic Initial Assets across different areas
export const DEFAULT_ASSETS: Asset[] = [
  {
    id: 'LEEDO-HO-2024-0001',
    titleEn: 'Dell Latitude 5420 Laptop',
    titleBn: 'ডেল ল্যাপটপ ৫৪২০ (হেড অফিস)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Star Tech Ltd',
    purchaseDate: '2024-02-15',
    purchaseValueBDT: 85000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ho',
    specificRoom: 'Admin Room 101',
    serialNumber: 'DL-882910-K',
    remarks: 'Assigned to HR & Accounts',
    createdBy: 'Habib Rahman',
    createdAt: '2024-02-15T10:00:00.000Z',
    updatedAt: '2024-02-15T10:00:00.000Z',
  },
  {
    id: 'LEEDO-PCH-2023-0002',
    titleEn: 'Toyota HiAce Ambulance & Transport Microbus',
    titleBn: 'টয়োটা হাইএস মাইক্রোবাস (পিস হোম)',
    category: 'Vehicle',
    acquisitionType: 'Donation',
    donorOrVendor: 'Kindness Foundation UK',
    purchaseDate: '2023-06-10',
    purchaseValueBDT: 2400000,
    initialCondition: 'Used',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-pch',
    specificRoom: 'Garage Bay 1',
    serialNumber: 'DHAKA-METRO-CHA-51-9981',
    remarks: 'Used for child rescue and emergency healthcare transport',
    createdBy: 'Habib Rahman',
    createdAt: '2023-06-10T11:00:00.000Z',
    updatedAt: '2023-06-10T11:00:00.000Z',
  },
  {
    id: 'LEEDO-INS-2025-0003',
    titleEn: 'Interactive Touch Smart Board 75"',
    titleBn: 'ইন্টারেক্টিভ স্মার্ট বোর্ড ৭৫ ইঞ্চি',
    category: 'Educational',
    acquisitionType: 'Donation',
    donorOrVendor: 'UNICEF Bangladesh',
    purchaseDate: '2025-01-12',
    purchaseValueBDT: 195000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ins',
    specificRoom: 'Multimedia Classroom 2',
    serialNumber: 'SB-75X-2025',
    remarks: 'Used for inclusive multimedia audio-visual lessons',
    createdBy: 'Sazzad Ahmed',
    createdAt: '2025-01-12T09:30:00.000Z',
    updatedAt: '2025-01-12T09:30:00.000Z',
  },
  {
    id: 'LEEDO-KMP-2024-0004',
    titleEn: 'Commercial Heavy-Duty Water Purifier Ro-100G',
    titleBn: 'বাণিজ্যিক ওয়াটার পিউরিফায়ার (কমলাপুর)',
    category: 'Appliances',
    acquisitionType: 'Purchased',
    donorOrVendor: 'PureIT Bangladesh',
    purchaseDate: '2024-05-20',
    purchaseValueBDT: 42000,
    initialCondition: 'New',
    usabilityStatus: 'Repairable',
    assignedAreaId: 'area-kmp',
    specificRoom: 'Dining & Kitchen Hall',
    serialNumber: 'RO-100-8812',
    remarks: 'Filter cartridge needs scheduled replacement',
    createdBy: 'Habib Rahman',
    createdAt: '2024-05-20T14:15:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'LEEDO-APT-2023-0005',
    titleEn: 'HP LaserJet Pro M404dn Network Printer',
    titleBn: 'এইচপি লেজারজেট প্রো প্রিন্টার (এয়ারপোর্ট)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Ryans Computers',
    purchaseDate: '2023-09-01',
    purchaseValueBDT: 38000,
    initialCondition: 'New',
    usabilityStatus: 'Unusable',
    assignedAreaId: 'area-apt',
    specificRoom: 'Station Counseling Desk',
    serialNumber: 'HP-PRN-99881',
    remarks: 'Motherboard short-circuited during power surge. Repair quote exceeds residual value.',
    createdBy: 'Rone Gomez',
    createdAt: '2023-09-01T12:00:00.000Z',
    updatedAt: '2026-02-10T16:00:00.000Z',
  },
  {
    id: 'LEEDO-KVC-2024-0006',
    titleEn: 'Singer Industrial Sewing Machine (Model 191D)',
    titleBn: 'সিঙ্গার ইন্ডাস্ট্রিয়াল সেলাই মেশিন (কদমতলী)',
    category: 'Facility',
    acquisitionType: 'Donation',
    donorOrVendor: 'Rotary Club of Dhaka Buriganga',
    purchaseDate: '2024-03-18',
    purchaseValueBDT: 28500,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-kvc',
    specificRoom: 'Tailoring Workshop Room 3',
    serialNumber: 'SNG-191D-4019',
    remarks: 'Used for adolescent vocational sewing training',
    createdBy: 'Sazzad Ahmed',
    createdAt: '2024-03-18T10:20:00.000Z',
    updatedAt: '2024-03-18T10:20:00.000Z',
  },
  {
    id: 'LEEDO-SDG-2024-0007',
    titleEn: 'Solid Teak Office Executive Desk & Chairs Set',
    titleBn: 'সেগুন কাঠের এক্সিকিউটিভ টেবিল ও চেয়ার সেট',
    category: 'Furniture',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Otobi Furniture Ltd',
    purchaseDate: '2024-08-11',
    purchaseValueBDT: 35000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-sdg',
    specificRoom: 'Supervisor Office',
    serialNumber: 'OTB-DK-882',
    remarks: 'Well maintained, scratch protected',
    createdBy: 'Habib Rahman',
    createdAt: '2024-08-11T13:40:00.000Z',
    updatedAt: '2024-08-11T13:40:00.000Z',
  },
  {
    id: 'LEEDO-KMS-2023-0008',
    titleEn: 'Heavy Duty Commercial Gas Cooker (4 Burners)',
    titleBn: 'বাণিজ্যিক ৪ বার্নার গ্যাস চুলা (শেল্টার)',
    category: 'Kitchenware',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Nawabpur Metal Mart',
    purchaseDate: '2023-11-05',
    purchaseValueBDT: 32000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-kms',
    specificRoom: 'Shelter Main Kitchen',
    serialNumber: 'CK-4B-1102',
    remarks: 'Daily food preparation for 40 resident children',
    createdBy: 'Habib Rahman',
    createdAt: '2023-11-05T09:00:00.000Z',
    updatedAt: '2023-11-05T09:00:00.000Z',
  },
  {
    id: 'LEEDO-MIR-2025-0009',
    titleEn: 'Gree 1.5 Ton Split Inverter Air Conditioner',
    titleBn: 'গ্রী ১.৫ টন স্প্লিট এয়ার কন্ডিশনার',
    category: 'Appliances',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Electra International',
    purchaseDate: '2025-04-10',
    purchaseValueBDT: 68000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-mir',
    specificRoom: 'Children Counseling Room',
    serialNumber: 'GR-AC-18INV-551',
    remarks: 'Under 5-year compressor warranty',
    createdBy: 'Rone Gomez',
    createdAt: '2025-04-10T15:00:00.000Z',
    updatedAt: '2025-04-10T15:00:00.000Z',
  },
  {
    id: 'LEEDO-TEJ-2022-0010',
    titleEn: 'Canon imageRUNNER 2006N Photocopier',
    titleBn: 'ক্যানন ফটোকপিয়ার মেশিন (তেজগাঁও)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Flora Limited',
    purchaseDate: '2022-07-15',
    purchaseValueBDT: 92000,
    initialCondition: 'New',
    usabilityStatus: 'Disposed',
    assignedAreaId: 'area-tej',
    specificRoom: 'Documentation Store',
    serialNumber: 'CN-IR-2006N',
    remarks: 'Disposed after 4 years of continuous heavy operation, drum damaged.',
    createdBy: 'Habib Rahman',
    createdAt: '2022-07-15T11:00:00.000Z',
    updatedAt: '2026-01-20T10:00:00.000Z',
  },
  {
    id: 'LEEDO-RAY-2024-0011',
    titleEn: 'Lenovo ThinkPad E14 Laptop (Core i5)',
    titleBn: 'লেনোভো থিঙ্কপ্যাড ল্যাপটপ (রায়েরবাজার)',
    category: 'IT_Electronics',
    acquisitionType: 'Donation',
    donorOrVendor: 'ActionAid Bangladesh',
    purchaseDate: '2024-06-15',
    purchaseValueBDT: 78000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ray',
    specificRoom: 'Street Education Office',
    serialNumber: 'LNV-TP-E14-9901',
    remarks: 'Used for field surveys and child case documentation',
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'LEEDO-SMB-2024-0012',
    titleEn: 'Stainless Steel Commercial Water Dispenser Cooler',
    titleBn: 'স্টেইনলেস স্টিল ওয়াটার ডিসপেনসার (শ্যামবাজার)',
    category: 'Appliances',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Walton Hi-Tech',
    purchaseDate: '2024-04-05',
    purchaseValueBDT: 26000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-smb',
    specificRoom: 'Community Outreach Corner',
    serialNumber: 'WLT-WDC-3301',
    remarks: 'Clean drinking water for vulnerable river terminal children',
    createdBy: 'Rone Ahammed',
    createdAt: '2024-04-05T11:30:00.000Z',
    updatedAt: '2024-04-05T11:30:00.000Z',
  },
  {
    id: 'LEEDO-KDT-2023-0013',
    titleEn: 'Double Bunk Heavy Steel Beds with Mattresses (Set of 6)',
    titleBn: 'ডাবল বাংক স্টিল বেড ও তোশক সেট (কদমতলী)',
    category: 'Furniture',
    acquisitionType: 'Donation',
    donorOrVendor: 'Rotary Club of Dhaka',
    purchaseDate: '2023-10-12',
    purchaseValueBDT: 65000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-kdt',
    specificRoom: 'Boys Dormitory Room 2',
    serialNumber: 'KDT-BUNK-06',
    remarks: 'Accommodates 12 resident shelter boys safely',
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2023-10-12T14:00:00.000Z',
    updatedAt: '2023-10-12T14:00:00.000Z',
  },
  {
    id: 'LEEDO-PCH-2024-0014',
    titleEn: '5KW Solar Hybrid Inverter & Lithium Battery System',
    titleBn: '৫ কিলোওয়াট হাইব্রিড সোলার ইনভার্টার (পিস হোম)',
    category: 'Facility',
    acquisitionType: 'Donation',
    donorOrVendor: 'Green Energy for Children Germany',
    purchaseDate: '2024-01-20',
    purchaseValueBDT: 340000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-pch',
    specificRoom: 'Power Utility Room',
    serialNumber: 'SOL-5KW-LITH-108',
    remarks: 'Provides 24/7 uninterrupted solar electricity to Peace Home village dormitories',
    createdBy: 'Sazzad Ahmed',
    createdAt: '2024-01-20T09:00:00.000Z',
    updatedAt: '2024-01-20T09:00:00.000Z',
  },
  {
    id: 'LEEDO-INS-2024-0015',
    titleEn: 'Ergonomic Student Wooden Desks & Benches Set (20 Sets)',
    titleBn: 'শিক্ষার্থীদের কাঠের ডেস্ক ও বেঞ্চ সেট (২০ সেট)',
    category: 'Furniture',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Partex Star Group',
    purchaseDate: '2024-02-10',
    purchaseValueBDT: 54000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ins',
    specificRoom: 'Primary Classroom 1',
    serialNumber: 'PTX-DSK-2024-20',
    remarks: 'Specially designed rounded corners for child safety in Inclusive School',
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2024-02-10T12:00:00.000Z',
    updatedAt: '2024-02-10T12:00:00.000Z',
  },
  // --- Historical Disposed Assets Register (For Head Office Disposed Asset List & Audit) ---
  {
    id: 'LEEDO-HO-2021-0016',
    titleEn: 'Sharp AR-6020 Digital Heavy-Duty Photocopier',
    titleBn: 'শার্প ডিজিটাল ফটোকপিয়ার মেশিন (হেড অফিস)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Flora Systems Ltd',
    purchaseDate: '2021-04-10',
    purchaseValueBDT: 72000,
    initialCondition: 'New',
    usabilityStatus: 'Disposed',
    assignedAreaId: 'area-ho',
    specificRoom: 'Head Office Central Documentation Archive',
    serialNumber: 'SH-AR6020-0091',
    remarks: 'Disposed by HO Disposal Committee after 4.5 years of continuous NGO reporting workload.',
    disposalDate: '2025-11-18',
    disposalReason: 'Drum unit and optical laser scanner burnt out. Official service quote exceeds asset residual value.',
    disposalMethod: 'Auction',
    salvageValueBDT: 7500,
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2021-04-10T10:00:00.000Z',
    updatedAt: '2025-11-18T16:00:00.000Z',
  },
  {
    id: 'LEEDO-KMP-2022-0017',
    titleEn: 'Singer 2-Ton Window Air Conditioner Unit',
    titleBn: 'সিঙ্গার ২ টন উইন্ডো এয়ার কন্ডিশনার (কমলাপুর)',
    category: 'Appliances',
    acquisitionType: 'Purchased',
    donorOrVendor: 'Singer Bangladesh Ltd',
    purchaseDate: '2022-03-15',
    purchaseValueBDT: 46000,
    initialCondition: 'New',
    usabilityStatus: 'Disposed',
    assignedAreaId: 'area-kmp',
    specificRoom: 'Kamalapur Street Unit Staff Office',
    serialNumber: 'SNG-AC-2022-81',
    remarks: 'Approved by Executive Director for environmental e-waste scrapping.',
    disposalDate: '2025-09-12',
    disposalReason: 'Compressor copper coil melted during power grid surge. Freon gas leakage verified by technician.',
    disposalMethod: 'Scrapped',
    salvageValueBDT: 4200,
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2022-03-15T11:00:00.000Z',
    updatedAt: '2025-09-12T15:30:00.000Z',
  },
  {
    id: 'LEEDO-KDT-2021-0018',
    titleEn: 'Brother High-Speed Automatic Sheet Scanner',
    titleBn: 'ব্রাদার হাই-স্পিড অটোমেটিক ডকুমেন্ট স্ক্যানার (কদমতলী)',
    category: 'IT_Electronics',
    acquisitionType: 'Donation',
    donorOrVendor: 'Save The Children',
    purchaseDate: '2021-08-20',
    purchaseValueBDT: 34000,
    initialCondition: 'New',
    usabilityStatus: 'Disposed',
    assignedAreaId: 'area-kdt',
    specificRoom: 'Kadamtali Child Records Room',
    serialNumber: 'BR-ADS-2200-K',
    remarks: 'Disposed through verified NGO certified recycling agency.',
    disposalDate: '2025-12-05',
    disposalReason: 'Main optical CIS sensor and feed roller broken. Spare parts discontinued by manufacturer.',
    disposalMethod: 'Recycled',
    salvageValueBDT: 2800,
    createdBy: 'Sazzad Hosen',
    createdAt: '2021-08-20T14:00:00.000Z',
    updatedAt: '2025-12-05T12:00:00.000Z',
  },
  {
    id: 'LEEDO-INS-2022-0019',
    titleEn: 'Epson EB-X05 Multimedia Classroom Projector',
    titleBn: 'এপসন মাল্টিমিডিয়া প্রজেক্টর (ইনক্লুসিভ স্কুল)',
    category: 'Educational',
    acquisitionType: 'Donation',
    donorOrVendor: 'Terre des Hommes Netherlands',
    purchaseDate: '2022-05-14',
    purchaseValueBDT: 42000,
    initialCondition: 'New',
    usabilityStatus: 'Disposed',
    assignedAreaId: 'area-ins',
    specificRoom: 'Inclusive Audio-Visual Classroom',
    serialNumber: 'EP-EB-X05-992',
    remarks: 'Scrapped as metal/plastic parts following lightning thunderstorm strike.',
    disposalDate: '2026-02-01',
    disposalReason: 'Lightning surge caused ballast lamp explosion and internal optical prism cracking.',
    disposalMethod: 'Scrapped',
    salvageValueBDT: 3500,
    createdBy: 'Md. Habibur Rahman',
    createdAt: '2022-05-14T09:00:00.000Z',
    updatedAt: '2026-02-01T14:00:00.000Z',
  },
];

// Pre-seeded Disposal Requests
export const DEFAULT_DISPOSALS: DisposalRequest[] = [
  {
    id: 'DISP-2026-001',
    assetId: 'LEEDO-APT-2023-0005',
    assetTitle: 'HP LaserJet Pro M404dn Network Printer',
    category: 'IT_Electronics',
    assignedAreaId: 'area-apt',
    purchaseValueBDT: 38000,
    currentBookValueBDT: calculateDepreciation('2023-09-01', 38000, 'IT_Electronics').currentBookValue,
    requestedByUserId: 'user-1032',
    requestedByUserName: 'Nazirul Islam Opu (Area Incharge)',
    requestDate: '2026-03-05',
    reasonEn: 'Motherboard completely burned due to thunderstorm surge. Repair vendor estimate is BDT 24,000 which exceeds current book value.',
    damageDetails: 'Burnt logic board, power board capacitor explosion, paper roller cracked.',
    status: 'Pending HO Approval',
    proposedAction: 'E-waste Recycling',
  },
];

// Pre-seeded Asset Transfers
export const DEFAULT_TRANSFERS: AssetTransfer[] = [
  {
    id: 'TR-2026-0001',
    voucherNumber: 'LEEDO-TR-2026-001',
    assetId: 'LEEDO-HO-2024-0001',
    assetTitle: 'Dell Latitude 5420 Laptop',
    sourceAreaId: 'area-ho',
    destinationAreaId: 'area-ins',
    dispatchDateTime: '2026-03-10T10:30',
    dispatchCondition: 'Good',
    dispatchByUserId: 'user-1004',
    dispatchByUserName: 'Md. Habibur Rahman (Asset Manager)',
    courierOrDriver: 'Ibrahim (LEEDO Staff Driver)',
    dispatchRemarks: 'Dispatched for Inclusive School administration computer lab setup.',
    status: 'In-Transit',
  },
];

class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    const dbVersion = localStorage.getItem(`${STORAGE_PREFIX}version`);
    if (dbVersion !== 'v6_leedo_14_staff_official_reports') {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      localStorage.setItem(KEYS.AREAS, JSON.stringify(DEFAULT_AREAS));
      localStorage.setItem(KEYS.ASSETS, JSON.stringify(DEFAULT_ASSETS));
      localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(DEFAULT_TRANSFERS));
      localStorage.setItem(KEYS.DISPOSALS, JSON.stringify(DEFAULT_DISPOSALS));
      localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(DEFAULT_ORG_PROFILE));
      // Start with no logged in user so login screen appears first!
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.setItem(`${STORAGE_PREFIX}version`, 'v6_leedo_14_staff_official_reports');
    }

    if (!localStorage.getItem(KEYS.AREAS)) {
      localStorage.setItem(KEYS.AREAS, JSON.stringify(DEFAULT_AREAS));
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(KEYS.ASSETS)) {
      localStorage.setItem(KEYS.ASSETS, JSON.stringify(DEFAULT_ASSETS));
    }
    if (!localStorage.getItem(KEYS.TRANSFERS)) {
      localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(DEFAULT_TRANSFERS));
    }
    if (!localStorage.getItem(KEYS.DISPOSALS)) {
      localStorage.setItem(KEYS.DISPOSALS, JSON.stringify(DEFAULT_DISPOSALS));
    }
    if (!localStorage.getItem(KEYS.ORG_PROFILE)) {
      localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(DEFAULT_ORG_PROFILE));
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Auth & Users ---
  public getUsers(): User[] {
    const raw = localStorage.getItem(KEYS.USERS);
    return raw ? JSON.parse(raw) : DEFAULT_USERS;
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Update current user if matches
    const current = this.getCurrentUser();
    if (current && current.id === user.id) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    }
    this.notify();
  }

  public deleteUser(userId: string): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    this.notify();
  }

  public getCurrentUser(): User | null {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  }

  public setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
    this.notify();
  }

  public authenticate(identifier: string, pass: string): { user: User | null; error?: string } {
    const users = this.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.active &&
        (u.employeeId.toLowerCase() === cleanId ||
         (u.numericId && u.numericId.toLowerCase() === cleanId) ||
         u.email.toLowerCase() === cleanId ||
         u.name.toLowerCase() === cleanId ||
         u.id.toLowerCase() === cleanId ||
         u.id.replace('user-', '').toLowerCase() === cleanId)
    );

    if (!found) {
      return {
        user: null,
        error:
          'ইউজার খুঁজে পাওয়া যায়নি। আপনার সঠিক এমপ্লয়ী আইডি দিন। / User ID not found. Please enter your valid Employee ID.',
      };
    }

    const ALLOWED_LOGIN_EIDS = [
      '1001', '1002', '1004', '1007', '1008', '1009', '1013',
      '1023', '1028', '1032', '1038', '1039', '1057', '1079'
    ];

    if (!found.hasLoginPermission || (!ALLOWED_LOGIN_EIDS.includes(found.employeeId) && !found.canManageStaff)) {
      return {
        user: null,
        error:
          'এই আইডির জন্য লগইন পারমিশন অ্যাক্সেস বন্ধ রয়েছে। অনুগ্রহ করে এইচআর ম্যানেজার (মোঃ ওমর ফারুক - EID 1057) এর সাথে যোগাযোগ করুন। / Login permission access is disabled for this Employee ID. Please contact HR Manager (Md. Omar Faruque - EID 1057).',
      };
    }

    // Default password is EID or numericId if not set
    const validPassword = found.password || found.employeeId;
    if (
      pass === validPassword ||
      pass === found.employeeId ||
      (found.numericId && pass === found.numericId)
    ) {
      return { user: found };
    }

    return {
      user: null,
      error:
        'ভুল পাসওয়ার্ড। প্রাথমিক ডিফল্ট পাসওয়ার্ড আপনার এমপ্লয়ী আইডি। / Incorrect password. Initial temporary password is your Employee ID.',
    };
  }

  // --- Areas ---
  public getAreas(): Area[] {
    const raw = localStorage.getItem(KEYS.AREAS);
    return raw ? JSON.parse(raw) : DEFAULT_AREAS;
  }

  public saveArea(area: Area): void {
    const areas = this.getAreas();
    const index = areas.findIndex((a) => a.id === area.id);
    if (index >= 0) {
      areas[index] = area;
    } else {
      areas.push(area);
    }
    localStorage.setItem(KEYS.AREAS, JSON.stringify(areas));
    this.notify();
  }

  public deleteArea(areaId: string): void {
    const areas = this.getAreas().filter((a) => a.id !== areaId);
    localStorage.setItem(KEYS.AREAS, JSON.stringify(areas));
    this.notify();
  }

  // --- Assets ---
  public getAssets(): Asset[] {
    const raw = localStorage.getItem(KEYS.ASSETS);
    return raw ? JSON.parse(raw) : DEFAULT_ASSETS;
  }

  public saveAsset(asset: Asset): void {
    const assets = this.getAssets();
    const index = assets.findIndex((a) => a.id === asset.id);
    if (index >= 0) {
      assets[index] = { ...asset, updatedAt: new Date().toISOString() };
    } else {
      assets.unshift({
        ...asset,
        createdAt: asset.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
    this.notify();
  }

  public deleteAsset(assetId: string): void {
    const assets = this.getAssets().filter((a) => a.id !== assetId);
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
    this.notify();
  }

  public setAllAssets(newAssets: Asset[]): void {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(newAssets));
    this.notify();
  }

  public clearAssets(): void {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify([]));
    this.notify();
  }

  public generateAssetId(areaCode: string, year = new Date().getFullYear()): string {
    const assets = this.getAssets();
    const prefix = `LEEDO-${areaCode}-${year}-`;
    const matching = assets.filter((a) => a.id.startsWith(prefix));
    const nextSeq = matching.length + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // --- Transfers ---
  public getTransfers(): AssetTransfer[] {
    const raw = localStorage.getItem(KEYS.TRANSFERS);
    return raw ? JSON.parse(raw) : DEFAULT_TRANSFERS;
  }

  public saveTransfer(transfer: AssetTransfer): void {
    const transfers = this.getTransfers();
    const index = transfers.findIndex((t) => t.id === transfer.id);
    if (index >= 0) {
      transfers[index] = transfer;
    } else {
      transfers.unshift(transfer);
    }
    localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(transfers));

    // Update asset status
    const assets = this.getAssets();
    const asset = assets.find((a) => a.id === transfer.assetId);
    if (asset) {
      if (transfer.status === 'In-Transit') {
        asset.transferStatus = 'in_transit';
        asset.currentTransferId = transfer.id;
      } else if (transfer.status === 'Received') {
        asset.transferStatus = 'none';
        asset.assignedAreaId = transfer.destinationAreaId;
        asset.currentTransferId = undefined;
      }
      this.saveAsset(asset);
    }

    this.notify();
  }

  public generateVoucherNumber(): string {
    const transfers = this.getTransfers();
    const year = new Date().getFullYear();
    const seq = transfers.length + 1;
    return `LEEDO-TR-${year}-${String(seq).padStart(3, '0')}`;
  }

  // --- Disposals ---
  public getDisposals(): DisposalRequest[] {
    const raw = localStorage.getItem(KEYS.DISPOSALS);
    return raw ? JSON.parse(raw) : DEFAULT_DISPOSALS;
  }

  public saveDisposal(request: DisposalRequest): void {
    const disposals = this.getDisposals();
    const index = disposals.findIndex((d) => d.id === request.id);
    if (index >= 0) {
      disposals[index] = request;
    } else {
      disposals.unshift(request);
    }
    localStorage.setItem(KEYS.DISPOSALS, JSON.stringify(disposals));

    // If approved, update asset status to Disposed
    if (request.status === 'Approved') {
      const assets = this.getAssets();
      const asset = assets.find((a) => a.id === request.assetId);
      if (asset) {
        asset.usabilityStatus = 'Disposed';
        asset.disposalDate = request.reviewDate || new Date().toISOString().slice(0, 10);
        asset.disposalReason = request.reasonEn || request.reviewComments || 'Approved for disposal';
        this.saveAsset(asset);
      }
    }

    this.notify();
  }

  // --- Org Profile ---
  public getOrgProfile(): OrganizationProfile {
    const raw = localStorage.getItem(KEYS.ORG_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_ORG_PROFILE;
  }

  public saveOrgProfile(profile: OrganizationProfile): void {
    localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(profile));
    this.notify();
  }

  // --- Language ---
  public getLanguage(): 'en' | 'bn' {
    return (localStorage.getItem(KEYS.LANG) as 'en' | 'bn') || 'en';
  }

  public setLanguage(lang: 'en' | 'bn'): void {
    localStorage.setItem(KEYS.LANG, lang);
    this.notify();
  }

  // Reset to initial demo factory state
  public resetToFactory(): void {
    localStorage.removeItem(KEYS.AREAS);
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.ASSETS);
    localStorage.removeItem(KEYS.TRANSFERS);
    localStorage.removeItem(KEYS.DISPOSALS);
    localStorage.removeItem(KEYS.ORG_PROFILE);
    this.initDefaults();
    this.notify();
  }
}

export const storage = new StorageService();
