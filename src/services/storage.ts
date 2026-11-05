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

// Official Registered Assets (Preserving exact institutional Asset IDs)
export const DEFAULT_ASSETS: Asset[] = [
  {
    id: 'LEEDO/HO/PC-001',
    titleEn: 'PC (ED sir room)',
    titleBn: 'কম্পিউটার পিসি (ইডি স্যারের রুম)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'LEEDO Head Office',
    purchaseDate: '2025-11-01',
    purchaseValueBDT: 36000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ho',
    specificRoom: 'ED sir room',
    remarks: 'Office Equipment | Location ID: LEEDO0001 | Holder: LEEDO | Running',
    createdBy: 'Md. Habibur Rahman (Accountant)',
    createdAt: '2025-11-01T09:00:00.000Z',
    updatedAt: '2025-11-01T09:00:00.000Z',
  },
  {
    id: 'LEEDO/HO/PC-002',
    titleEn: 'PC (Accounts Room - 1)',
    titleBn: 'কম্পিউটার পিসি (একাউন্টস রুম - ১)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'LEEDO Head Office',
    purchaseDate: '2025-11-01',
    purchaseValueBDT: 36000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ho',
    specificRoom: 'Accounts Room',
    remarks: 'Office Equipment | Location ID: LEEDO0002 | Holder: LEEDO | Running',
    createdBy: 'Md. Habibur Rahman (Accountant)',
    createdAt: '2025-11-01T09:00:00.000Z',
    updatedAt: '2025-11-01T09:00:00.000Z',
  },
  {
    id: 'LEEDO/HO/PC-003',
    titleEn: 'PC (Accounts Room - 2)',
    titleBn: 'কম্পিউটার পিসি (একাউন্টস রুম - ২)',
    category: 'IT_Electronics',
    acquisitionType: 'Purchased',
    donorOrVendor: 'LEEDO Head Office',
    purchaseDate: '2025-11-01',
    purchaseValueBDT: 36000,
    initialCondition: 'New',
    usabilityStatus: 'Usable',
    assignedAreaId: 'area-ho',
    specificRoom: 'Accounts Room',
    remarks: 'Office Equipment | Location ID: LEEDO0003 | Holder: LEEDO | Running',
    createdBy: 'Md. Habibur Rahman (Accountant)',
    createdAt: '2025-11-01T09:00:00.000Z',
    updatedAt: '2025-11-01T09:00:00.000Z',
  },
];

// Default Disposal Requests (clean and fresh database - no demo data)
export const DEFAULT_DISPOSALS: DisposalRequest[] = [];

// Default Asset Transfers (clean and fresh database - no demo data)
export const DEFAULT_TRANSFERS: AssetTransfer[] = [];

// Helper to ensure an array of assets contains strictly unique IDs
export function deduplicateAssets(assets: Asset[]): Asset[] {
  if (!Array.isArray(assets)) return [];
  const seen = new Set<string>();
  const unique: Asset[] = [];
  for (const asset of assets) {
    if (!asset || !asset.id) continue;
    const cleanId = String(asset.id).trim();
    if (!cleanId) continue;
    if (!seen.has(cleanId)) {
      seen.add(cleanId);
      unique.push({ ...asset, id: cleanId });
    }
  }
  return unique;
}

class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    const dbVersion = localStorage.getItem(`${STORAGE_PREFIX}version`);
    if (dbVersion !== 'v9_leedo_official_excel_assets') {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      localStorage.setItem(KEYS.AREAS, JSON.stringify(DEFAULT_AREAS));
      localStorage.setItem(KEYS.ASSETS, JSON.stringify(DEFAULT_ASSETS));
      localStorage.setItem(KEYS.TRANSFERS, JSON.stringify([]));
      localStorage.setItem(KEYS.DISPOSALS, JSON.stringify([]));
      localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(DEFAULT_ORG_PROFILE));
      // Start with no logged in user so login screen appears first!
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.setItem(`${STORAGE_PREFIX}version`, 'v9_leedo_official_excel_assets');
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
      localStorage.setItem(KEYS.TRANSFERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.DISPOSALS)) {
      localStorage.setItem(KEYS.DISPOSALS, JSON.stringify([]));
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

  private cloudSyncHandler?: (action: string, data: any) => void;

  public registerCloudSyncHandler(handler: (action: string, data: any) => void) {
    this.cloudSyncHandler = handler;
  }

  // Cloud sync incoming receivers
  public setAllAssetsFromCloud(assets: Asset[]): void {
    const unique = deduplicateAssets(assets);
    if (unique.length === 0) {
      // Do not wipe local assets if cloud query is temporarily empty
      const local = this.getAssets();
      if (local.length > 0) return;
    }
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(unique));
    this.notify();
  }

  public setAllTransfersFromCloud(transfers: AssetTransfer[]): void {
    localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(transfers));
    this.notify();
  }

  public setAllDisposalsFromCloud(disposals: DisposalRequest[]): void {
    localStorage.setItem(KEYS.DISPOSALS, JSON.stringify(disposals));
    this.notify();
  }

  public setAllAreasFromCloud(areas: Area[]): void {
    localStorage.setItem(KEYS.AREAS, JSON.stringify(areas));
    this.notify();
  }

  public setAllUsersFromCloud(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    this.notify();
  }

  public setOrgProfileFromCloud(profile: OrganizationProfile): void {
    localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(profile));
    this.notify();
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
    this.cloudSyncHandler?.('saveUser', user);
  }

  public deleteUser(userId: string): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    this.notify();
    this.cloudSyncHandler?.('deleteUser', userId);
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
    this.cloudSyncHandler?.('saveArea', area);
  }

  public deleteArea(areaId: string): void {
    const areas = this.getAreas().filter((a) => a.id !== areaId);
    localStorage.setItem(KEYS.AREAS, JSON.stringify(areas));
    this.notify();
    this.cloudSyncHandler?.('deleteArea', areaId);
  }

  // --- Assets ---
  public getAssets(): Asset[] {
    const raw = localStorage.getItem(KEYS.ASSETS);
    const parsed: Asset[] = raw ? JSON.parse(raw) : DEFAULT_ASSETS;
    return deduplicateAssets(parsed);
  }

  public saveAsset(asset: Asset): void {
    const assets = this.getAssets();
    const index = assets.findIndex((a) => a.id === asset.id);
    const updatedAsset = {
      ...asset,
      createdAt: asset.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      assets[index] = updatedAsset;
    } else {
      assets.unshift(updatedAsset);
    }
    const cleanAssets = deduplicateAssets(assets);
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(cleanAssets));
    this.notify();
    this.cloudSyncHandler?.('saveAsset', updatedAsset);
  }

  public deleteAsset(assetId: string): void {
    const assets = this.getAssets().filter((a) => a.id !== assetId);
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
    this.notify();
    this.cloudSyncHandler?.('deleteAsset', assetId);
  }

  public setAllAssets(newAssets: Asset[], replace = false): void {
    const cleanAssets = deduplicateAssets(newAssets);
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(cleanAssets));
    this.notify();
    this.cloudSyncHandler?.('bulkSaveAssets', { assets: cleanAssets, replace });
  }

  public clearAssets(): void {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify([]));
    this.notify();
    this.cloudSyncHandler?.('clearAllAssets', null);
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
    this.cloudSyncHandler?.('saveTransfer', transfer);
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
    this.cloudSyncHandler?.('saveDisposal', request);
  }

  // --- Org Profile ---
  public getOrgProfile(): OrganizationProfile {
    const raw = localStorage.getItem(KEYS.ORG_PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_ORG_PROFILE;
  }

  public saveOrgProfile(profile: OrganizationProfile): void {
    localStorage.setItem(KEYS.ORG_PROFILE, JSON.stringify(profile));
    this.notify();
    this.cloudSyncHandler?.('saveOrgProfile', profile);
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

