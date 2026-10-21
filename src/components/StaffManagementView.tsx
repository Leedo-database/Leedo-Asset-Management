import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Edit,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { Area, User, UserRole } from '../types';

interface StaffManagementViewProps {
  currentUser: User;
  users: User[];
  areas: Area[];
  lang: Language;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  currentUser,
  users,
  areas,
  lang,
  onSaveUser,
  onDeleteUser,
}) => {
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [jobLocationCategory, setJobLocationCategory] = useState('Head Office');
  const [employmentNature, setEmploymentNature] = useState<'Permanent' | 'Contractual' | 'Part Time'>('Contractual');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('area_incharge');
  const [assignedAreaIds, setAssignedAreaIds] = useState<string[]>([]);
  const [canApproveDisposal, setCanApproveDisposal] = useState(false);
  const [canManageAssets, setCanManageAssets] = useState(false);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [canManageAreas, setCanManageAreas] = useState(false);
  const [active, setActive] = useState(true);

  // Notice if current user is not Omar / HR admin
  if (!currentUser.canManageStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800 space-y-2">
        <ShieldAlert className="w-12 h-12 mx-auto text-red-600 mb-2" />
        <h3 className="text-base font-bold">
          {lang === 'bn' ? 'অ্যাক্সেস সংরক্ষিত: শুধুমাত্র এইচআর অ্যাডমিন (ওমর)' : 'Restricted Access: HR Admin Only'}
        </h3>
        <p className="text-xs text-red-600 max-w-md mx-auto">
          {lang === 'bn'
            ? 'কর্মী ব্যবস্থাপনা, পদবী পরিবর্তন ও এরিয়া ইনচার্জ নিয়োগ কেবল এইচআর অ্যাডমিন ওমর কর্তৃক পরিচালিত হয়।'
            : 'Staff directory management, designation updates, and area incharge assignments are strictly reserved for HR Admin (Omar).'}
        </p>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (locationFilter !== 'ALL') {
        if (u.jobLocationCategory !== locationFilter) {
          const inArea = u.assignedAreaIds.some((aid) => {
            if (locationFilter === 'Kodomtoli' && (aid === 'area-kdt' || aid === 'area-kvc')) return true;
            if (locationFilter === 'School Under the Sky' && (aid === 'area-kmp' || aid === 'area-ray' || aid === 'area-tej' || aid === 'area-mir')) return true;
            return false;
          });
          if (!inArea) return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = u.name.toLowerCase().includes(q);
        const mId = u.employeeId.toLowerCase().includes(q) || (u.numericId && u.numericId.includes(q));
        const mRole = u.designation.toLowerCase().includes(q);
        const mEmail = u.email.toLowerCase().includes(q);
        if (!mName && !mId && !mRole && !mEmail) return false;
      }
      return true;
    });
  }, [users, locationFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setEmployeeId(String(1000 + users.length + 1));
    setName('');
    setEmail('');
    setDesignation('');
    setJobLocationCategory('Head Office');
    setEmploymentNature('Contractual');
    setGender('Male');
    setPhone('');
    setRole('field_staff');
    setAssignedAreaIds([]);
    setCanApproveDisposal(false);
    setCanManageAssets(false);
    setCanManageStaff(false);
    setCanManageAreas(false);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEmployeeId(u.employeeId);
    setName(u.name);
    setEmail(u.email);
    setDesignation(u.designation);
    setJobLocationCategory(u.jobLocationCategory || 'Head Office');
    setEmploymentNature(u.employmentNature || 'Contractual');
    setGender(u.gender || 'Male');
    setPhone(u.phone);
    setRole(u.role);
    setAssignedAreaIds(u.assignedAreaIds);
    setCanApproveDisposal(u.canApproveDisposal);
    setCanManageAssets(u.canManageAssets);
    setCanManageStaff(u.canManageStaff);
    setCanManageAreas(u.canManageAreas);
    setActive(u.active);
    setIsModalOpen(true);
  };

  const handleResetPassword = (u: User) => {
    if (
      window.confirm(
        lang === 'bn'
          ? `আপনি কি ${u.name}-এর পাসওয়ার্ড তার এমপ্লয়ি আইডি (${u.employeeId})-তে রিসেট করতে চান?`
          : `Reset password for ${u.name} back to default Employee ID (${u.employeeId})?`
      )
    ) {
      onSaveUser({
        ...u,
        password: u.employeeId,
        isFirstLogin: true,
      });
      alert(
        lang === 'bn'
          ? `পাসওয়ার্ড সফলভাবে '${u.employeeId}'-তে রিসেট করা হয়েছে। কর্মী পরবর্তী লগইনে পরিবর্তনের অনুরোধ পাবেন।`
          : `Password reset to '${u.employeeId}'. User will be forced to change password on next login.`
      );
    }
  };

  const toggleAreaAssignment = (areaId: string) => {
    if (areaId === 'ALL') {
      if (assignedAreaIds.includes('ALL')) {
        setAssignedAreaIds([]);
      } else {
        setAssignedAreaIds(['ALL']);
      }
      return;
    }

    let updated = assignedAreaIds.filter((id) => id !== 'ALL');
    if (updated.includes(areaId)) {
      updated = updated.filter((id) => id !== areaId);
    } else {
      updated.push(areaId);
    }
    setAssignedAreaIds(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      employeeId: employeeId.trim(),
      numericId: employeeId.trim(),
      name: name.trim(),
      email: email.trim(),
      password: editingUser ? editingUser.password : employeeId.trim(),
      role,
      assignedAreaIds: assignedAreaIds.length === 0 ? ['ALL'] : assignedAreaIds,
      designation: designation.trim(),
      jobLocationCategory,
      employmentNature,
      gender,
      phone: phone.trim(),
      isFirstLogin: editingUser ? editingUser.isFirstLogin : true,
      active,
      hasLoginPermission: editingUser ? editingUser.hasLoginPermission : true,
      canApproveDisposal,
      canManageAssets,
      canManageStaff,
      canManageAreas,
      canUpdateOrgInfo: role === 'hr_admin',
    };

    onSaveUser(userData);
    setIsModalOpen(false);
  };

  const handleExportStaffCSV = () => {
    const headers = [
      'Employee ID',
      'Full Name',
      'Designation',
      'Job Location Category',
      'Gender',
      'Nature of Employment',
      'Email',
      'Phone',
      'Role Archetype',
      'Assigned Areas',
      'Status',
    ];

    const rows = filteredUsers.map((u) => {
      const isAll = u.assignedAreaIds.includes('ALL');
      const matched = areas
        .filter((a) => u.assignedAreaIds.includes(a.id))
        .map((a) => (lang === 'bn' ? a.nameBn : a.nameEn))
        .join('; ');
      return [
        `"${u.employeeId}"`,
        `"${u.name}"`,
        `"${u.designation}"`,
        `"${u.jobLocationCategory || ''}"`,
        `"${u.gender || ''}"`,
        `"${u.employmentNature || ''}"`,
        `"${u.email}"`,
        `"${u.phone}"`,
        `"${u.role}"`,
        `"${isAll ? 'ALL' : matched}"`,
        `"${u.active ? 'Active' : 'Inactive'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LEEDO_Staff_Database_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'hr_admin':
        return t.role_hr_admin;
      case 'head_office':
        return t.role_head_office;
      case 'asset_manager':
        return t.role_asset_manager;
      case 'area_incharge':
        return t.role_area_incharge;
      default:
        return t.role_field_staff;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">{t.staffTitle}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Omar (HR Admin Access)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {users.length} {lang === 'bn' ? 'কর্মী' : 'staff members'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t.staffSubtitle}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportStaffCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Staff CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.addNewStaff}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by Employee ID (e.g. 1001, 1002), Full Name, Designation, or Email..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Location Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs pt-1 border-t border-slate-100">
          {[
            ['ALL', `All (${users.length})`],
            ['Head Office', 'Head Office (10)'],
            ['Inclusive School', 'Inclusive School (3)'],
            ['Peace Home', 'Peace Home (9)'],
            ['Kamalapur', 'Kamalapur (3)'],
            ['Kodomtoli', 'Kodomtoli (4)'],
            ['School Under the Sky', 'SUS Centers (4)'],
          ].map(([catKey, catLabel]) => (
            <button
              key={catKey}
              onClick={() => setLocationFilter(catKey)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                locationFilter === catKey
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {catLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-left">{t.employeeId}</th>
                <th className="px-4 py-3 text-left">{t.fullName}</th>
                <th className="px-4 py-3 text-left">{t.designation}</th>
                <th className="px-4 py-3 text-left">Location & Type</th>
                <th className="px-4 py-3 text-left">{t.assignedAreas}</th>
                <th className="px-4 py-3 text-left">{t.permissions}</th>
                <th className="px-4 py-3 text-center">{t.userStatus}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {filteredUsers.map((u) => {
                const isAll = u.assignedAreaIds.includes('ALL');
                const matchedAreas = areas.filter((a) => u.assignedAreaIds.includes(a.id));

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* EID */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {u.employeeId}
                      </span>
                    </td>

                    {/* Name & Email */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Designation & Role */}
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-semibold">{u.designation}</div>
                      <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>

                    {/* Location & Employment Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {u.jobLocationCategory || 'Field Center'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                        <span>{u.gender || 'Staff'}</span>
                        <span>•</span>
                        <span className="px-1 py-0.2 rounded bg-slate-100 font-medium">
                          {u.employmentNature || 'Contractual'}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Areas */}
                    <td className="px-4 py-3.5 max-w-xs">
                      {isAll ? (
                        <span className="inline-flex items-center space-x-1 text-slate-800 font-semibold text-[11px]">
                          <Shield className="w-3.5 h-3.5 text-red-600" />
                          <span>{t.allAreasScope}</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {matchedAreas.map((ma) => (
                            <span
                              key={ma.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                            >
                              {lang === 'bn' ? ma.nameBn : ma.nameEn}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Permissions list */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {u.canApproveDisposal && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Disposal
                          </span>
                        )}
                        {u.canManageAssets && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Assets
                          </span>
                        )}
                        {u.canManageStaff && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                            HR Admin
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status & Login Permission */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.hasLoginPermission
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {u.hasLoginPermission
                            ? lang === 'bn'
                              ? 'লগইন অনুমোদিত'
                              : 'Login Active'
                            : lang === 'bn'
                            ? 'লগইন বন্ধ'
                            : 'Login Off'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title={`Reset password to default EID (${u.employeeId})`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete staff member ${u.name}?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingUser ? 'Edit Staff Member & Permissions' : t.addNewStaff}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.employeeId} (Login ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. 1001, 1002, 1014"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used as primary Login ID & default password</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.fullName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.emailAddress} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@leedo.org"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {t.designation} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Special Educator, Social Mobilizer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Location Category & Nature of Employment */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Location Category
                  </label>
                  <select
                    value={jobLocationCategory}
                    onChange={(e) => setJobLocationCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="Head Office">Head Office</option>
                    <option value="Inclusive School">Inclusive School</option>
                    <option value="Peace Home">Peace Home</option>
                    <option value="Kamalapur">Kamalapur</option>
                    <option value="Shelter">Shelter</option>
                    <option value="Vocational Trade School">Vocational Trade School</option>
                    <option value="School Under the Sky">School Under the Sky</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Employment
                  </label>
                  <select
                    value={employmentNature}
                    onChange={(e) => setEmploymentNature(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contractual">Contractual</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Role Archetype
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRole(newRole);
                      if (newRole === 'head_office' || newRole === 'hr_admin' || newRole === 'asset_manager') {
                        setAssignedAreaIds(['ALL']);
                        setCanManageAssets(true);
                        setCanApproveDisposal(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-800 outline-none"
                  >
                    <option value="head_office">{t.role_head_office}</option>
                    <option value="hr_admin">{t.role_hr_admin}</option>
                    <option value="asset_manager">{t.role_asset_manager}</option>
                    <option value="area_incharge">{t.role_area_incharge}</option>
                    <option value="field_staff">{t.role_field_staff}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Area Incharge Assignment Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase">
                    {t.assignedAreas}
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleAreaAssignment('ALL')}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    {assignedAreaIds.includes('ALL') ? 'Deselect Global' : 'Select All 13 (Global)'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                  {areas.map((a) => {
                    const isChecked =
                      assignedAreaIds.includes('ALL') || assignedAreaIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAreaAssignment(a.id)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span className="truncate">{a.code} - {a.nameEn.split(' ')[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  Granular Access Permissions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canManageAssets}
                      onChange={(e) => setCanManageAssets(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium text-slate-800">Add / Edit Assets & Transfer</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canApproveDisposal}
                      onChange={(e) => setCanApproveDisposal(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium text-slate-800">Approve Asset Disposals</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canManageAreas}
                      onChange={(e) => setCanManageAreas(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium text-slate-800">Add / Edit Center Locations</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canManageStaff}
                      onChange={(e) => setCanManageStaff(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-medium text-slate-800">Staff & Access Control</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
