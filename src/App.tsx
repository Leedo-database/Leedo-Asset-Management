import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Boxes,
  Building,
  Building2,
  FileSpreadsheet,
  Globe,
  Layers,
  LayoutDashboard,
  MapPin,
  Settings,
  Shield,
  Truck,
  Users,
} from 'lucide-react';
import { AddAssetModal } from './components/AddAssetModal';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AssetRegistryView } from './components/AssetRegistryView';
import { DashboardView } from './components/DashboardView';
import { DisposalsView } from './components/DisposalsView';
import { FirstLoginModal } from './components/FirstLoginModal';
import { LocationsView } from './components/LocationsView';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { NotificationToast } from './components/NotificationToast';
import { OrgSettingsView } from './components/OrgSettingsView';
import { PrintAssetTagModal } from './components/PrintAssetTagModal';
import { PrintAuditReportModal } from './components/PrintAuditReportModal';
import { PrintTagSheetModal } from './components/PrintTagSheetModal';
import { QuickConditionModal } from './components/QuickConditionModal';
import { StaffManagementView } from './components/StaffManagementView';
import { TransfersView } from './components/TransfersView';
import { UserProfileModal } from './components/UserProfileModal';
import { Language, translations } from './i18n/translations';
import { firebaseSync } from './services/firebaseSync';
import { storage } from './services/storage';
import {
  AppNotification,
  Area,
  Asset,
  AssetTransfer,
  DisposalRequest,
  OrganizationProfile,
  UsabilityStatus,
  User,
} from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [lang, setLang] = useState<Language>(() => storage.getLanguage());
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data State
  const [assets, setAssets] = useState<Asset[]>(() => storage.getAssets());
  const [areas, setAreas] = useState<Area[]>(() => storage.getAreas());
  const [transfers, setTransfers] = useState<AssetTransfer[]>(() => storage.getTransfers());
  const [disposals, setDisposals] = useState<DisposalRequest[]>(() => storage.getDisposals());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => storage.getNotifications());
  const [profile, setProfile] = useState<OrganizationProfile>(() => storage.getOrgProfile());

  // Modals
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [tagPrintAsset, setTagPrintAsset] = useState<Asset | null>(null);
  const [isTagSheetModalOpen, setIsTagSheetModalOpen] = useState(false);
  const [tagSheetAssets, setTagSheetAssets] = useState<Asset[]>([]);
  const [quickUpdateAsset, setQuickUpdateAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [disposalRequestAsset, setDisposalRequestAsset] = useState<Asset | null>(null);
  const [transferRequestAsset, setTransferRequestAsset] = useState<Asset | null>(null);
  const [confirmReceiveTransfer, setConfirmReceiveTransfer] = useState<AssetTransfer | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Subscribe to storage changes and initialize cloud sync
  useEffect(() => {
    firebaseSync.init();

    const unsubscribe = storage.subscribe(() => {
      setCurrentUser(storage.getCurrentUser());
      setAssets(storage.getAssets());
      setAreas(storage.getAreas());
      setTransfers(storage.getTransfers());
      setDisposals(storage.getDisposals());
      setNotifications(storage.getNotifications());
      setProfile(storage.getOrgProfile());
      setLang(storage.getLanguage());
    });
    return unsubscribe;
  }, []);

  const t = translations[lang];

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'bn' : 'en';
    storage.setLanguage(nextLang);
    setLang(nextLang);
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        onSuccess={(user) => {
          storage.setCurrentUser(user);
          setCurrentUser(user);
        }}
        lang={lang}
        onToggleLang={handleToggleLang}
      />
    );
  }

  // Pending badges
  const isGlobal = currentUser.assignedAreaIds.includes('ALL');
  const pendingDisposalsCount = disposals.filter((d) => {
    if (d.status !== 'Pending HO Approval') return false;
    return isGlobal || currentUser.assignedAreaIds.includes(d.assignedAreaId);
  }).length;

  const inTransitCount = transfers.filter((tr) => {
    if (tr.status !== 'In-Transit') return false;
    return (
      isGlobal ||
      currentUser.assignedAreaIds.includes(tr.destinationAreaId) ||
      currentUser.assignedAreaIds.includes(tr.sourceAreaId)
    );
  }).length;

  const handleNavigateNotification = (notif: AppNotification) => {
    setActiveTab(notif.actionTab || 'transfers');
  };

  const handleConfirmGoodsReceived = (transfer: AssetTransfer, notificationId?: string) => {
    if (notificationId) {
      storage.markNotificationRead(notificationId, currentUser.id);
    }
    setConfirmReceiveTransfer(transfer);
    setActiveTab('transfers');
  };

  const handleConfirmReceiveAsset = (asset: Asset) => {
    const matched = transfers.find(
      (tr) => (tr.id === asset.currentTransferId || tr.assetId === asset.id) && tr.status === 'In-Transit'
    );
    if (matched) {
      if (isGlobal || currentUser.assignedAreaIds.includes(matched.destinationAreaId)) {
        setConfirmReceiveTransfer(matched);
      }
      setActiveTab('transfers');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* First Login Password Change Guard */}
      {currentUser.isFirstLogin && (
        <FirstLoginModal
          isOpen={true}
          user={currentUser}
          onSuccess={(updated) => {
            setCurrentUser(updated);
          }}
          lang={lang}
        />
      )}

      {/* Voluntary Password Change Modal */}
      {isPasswordModalOpen && !currentUser.isFirstLogin && (
        <FirstLoginModal
          isOpen={true}
          user={currentUser}
          onSuccess={(updated) => {
            setCurrentUser(updated);
            setIsPasswordModalOpen(false);
          }}
          lang={lang}
          isVoluntary={true}
          onCancel={() => setIsPasswordModalOpen(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        lang={lang}
        onToggleLang={handleToggleLang}
        areas={areas}
        notifications={notifications}
        transfers={transfers}
        onMarkNotificationRead={(id) => storage.markNotificationRead(id, currentUser.id)}
        onMarkAllNotificationsRead={() => storage.markAllNotificationsRead(currentUser.id)}
        onNavigateNotification={handleNavigateNotification}
        onConfirmGoodsReceived={handleConfirmGoodsReceived}
      />

      {/* Main App Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-1 border-b border-slate-200 pb-2 mb-6 scrollbar-none no-print">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.navDashboard}</span>
          </button>

          {/* Asset Registry */}
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'assets'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{t.navAssets}</span>
          </button>

          {/* Transfers & Gate Pass */}
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'transfers'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t.navTransfers}</span>
            {inTransitCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'transfers' ? 'bg-white text-red-600' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {inTransitCount}
              </span>
            )}
          </button>

          {/* Disposals & Approvals */}
          <button
            onClick={() => setActiveTab('disposals')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'disposals'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{t.navDisposals}</span>
            {pendingDisposalsCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'disposals' ? 'bg-white text-red-600' : 'bg-red-100 text-red-700'
                }`}
              >
                {pendingDisposalsCount}
              </span>
            )}
          </button>

          {/* Locations & Centers */}
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'locations'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{t.navLocations}</span>
          </button>

          {/* Staff & RBAC (Exclusive to HR Admin Omar or HO) */}
          {currentUser.canManageStaff && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'staff'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.navStaff}</span>
            </button>
          )}

          {/* Org Settings (Exclusive to HR Admin Omar) */}
          {currentUser.canUpdateOrgInfo && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'settings'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t.navSettings}</span>
            </button>
          )}
        </div>

        {/* Tab Views */}
        <main>
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              assets={assets}
              areas={areas}
              transfers={transfers}
              disposals={disposals}
              lang={lang}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenAddAsset={() => {
                setEditingAsset(null);
                setIsAddAssetOpen(true);
              }}
              onOpenInitiateTransfer={() => setActiveTab('transfers')}
              onOpenRequestDisposal={() => setActiveTab('disposals')}
            />
          )}

          {activeTab === 'assets' && (
            <AssetRegistryView
              currentUser={currentUser}
              assets={assets}
              areas={areas}
              lang={lang}
              onOpenAddModal={() => {
                setEditingAsset(null);
                setIsAddAssetOpen(true);
              }}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onPrintTag={(asset) => setTagPrintAsset(asset)}
              onOpenPrintTagSheet={(toPrint) => {
                setTagSheetAssets(toPrint);
                setIsTagSheetModalOpen(true);
              }}
              onOpenQuickUpdate={(asset) => setQuickUpdateAsset(asset)}
              onOpenDisposalRequest={(asset) => {
                setDisposalRequestAsset(asset);
                setActiveTab('disposals');
              }}
              onOpenTransfer={(asset) => {
                setTransferRequestAsset(asset);
                setActiveTab('transfers');
              }}
              onConfirmReceiveAsset={handleConfirmReceiveAsset}
              onEditAsset={(asset) => {
                setEditingAsset(asset);
                setIsAddAssetOpen(true);
              }}
              onDeleteAsset={(asset) => {
                storage.deleteAsset(asset.id);
              }}
            />
          )}

          {activeTab === 'transfers' && (
            <TransfersView
              currentUser={currentUser}
              transfers={transfers}
              assets={assets}
              areas={areas}
              lang={lang}
              onSaveTransfer={(tr) => storage.saveTransfer(tr)}
              onRequestFromAsset={transferRequestAsset}
              onClearRequestAsset={() => setTransferRequestAsset(null)}
              onConfirmReceiveTransfer={confirmReceiveTransfer}
              onClearConfirmReceiveTransfer={() => setConfirmReceiveTransfer(null)}
            />
          )}

          {activeTab === 'disposals' && (
            <DisposalsView
              currentUser={currentUser}
              disposals={disposals}
              assets={assets}
              areas={areas}
              lang={lang}
              onSaveDisposal={(req) => storage.saveDisposal(req)}
              onRequestFromAsset={disposalRequestAsset}
              onClearRequestAsset={() => setDisposalRequestAsset(null)}
            />
          )}

          {activeTab === 'locations' && (
            <LocationsView
              currentUser={currentUser}
              areas={areas}
              assets={assets}
              lang={lang}
              onSaveArea={(area) => storage.saveArea(area)}
              onDeleteArea={(areaId) => storage.deleteArea(areaId)}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManagementView
              currentUser={currentUser}
              users={storage.getUsers()}
              areas={areas}
              lang={lang}
              onSaveUser={(user) => storage.saveUser(user)}
              onDeleteUser={(userId) => storage.deleteUser(userId)}
            />
          )}

          {activeTab === 'settings' && (
            <OrgSettingsView
              currentUser={currentUser}
              profile={profile}
              lang={lang}
              onSaveProfile={(p) => storage.saveOrgProfile(p)}
              onResetFactory={() => storage.resetToFactory()}
            />
          )}
        </main>
      </div>

      {/* Footer Credit */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-3 px-4 text-center no-print">
        <p className="text-[11px] font-medium text-slate-400">
          Developed by <span className="font-semibold text-slate-600">shadowgili</span>
        </p>
      </footer>

      {/* Modals */}
      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => {
          setIsAddAssetOpen(false);
          setEditingAsset(null);
        }}
        onSave={(asset, andPrint) => {
          const isEditing = Boolean(editingAsset);
          storage.saveAsset(asset);
          storage.notifyAssetEvent(isEditing ? 'asset_updated' : 'asset_created', asset, currentUser);
          if (andPrint) {
            setTagPrintAsset(asset);
          }
        }}
        areas={areas}
        currentUser={currentUser}
        lang={lang}
        editingAsset={editingAsset}
      />

      <AssetDetailModal
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        areas={areas}
        currentUser={currentUser}
        lang={lang}
        onPrintTag={(a) => setTagPrintAsset(a)}
        onOpenQuickUpdate={(a) => {
          setQuickUpdateAsset(a);
        }}
        onOpenDisposalRequest={(a) => {
          setDisposalRequestAsset(a);
          setActiveTab('disposals');
        }}
        onOpenTransfer={(a) => {
          setTransferRequestAsset(a);
          setActiveTab('transfers');
        }}
        onConfirmReceiveAsset={handleConfirmReceiveAsset}
        onEditAsset={(a) => {
          setEditingAsset(a);
          setIsAddAssetOpen(true);
        }}
      />

      {/* QR Code Printable Asset Tag Sticker Modal (Single Asset) */}
      <PrintAssetTagModal
        asset={tagPrintAsset}
        isOpen={Boolean(tagPrintAsset)}
        onClose={() => setTagPrintAsset(null)}
        lang={lang}
        areas={areas}
      />

      {/* QR Code Printable Asset Tag Sticker Sheet Modal (Multi-Page / Batch Selection) */}
      <PrintTagSheetModal
        isOpen={isTagSheetModalOpen}
        onClose={() => setIsTagSheetModalOpen(false)}
        selectedAssets={tagSheetAssets}
        allAssets={assets}
        areas={areas}
        lang={lang}
      />

      <QuickConditionModal
        asset={quickUpdateAsset}
        isOpen={Boolean(quickUpdateAsset)}
        onClose={() => setQuickUpdateAsset(null)}
        currentUser={currentUser}
        lang={lang}
        onSave={(assetId, updates) => {
          const asset = assets.find((a) => a.id === assetId);
          if (asset) {
            const updatedAsset: Asset = {
              ...asset,
              specificRoom: updates.specificRoom,
              usabilityStatus: updates.usabilityStatus,
              remarks: updates.remarks || asset.remarks,
              ...(updates.purchaseDate ? { purchaseDate: updates.purchaseDate } : {}),
              updatedAt: new Date().toISOString(),
            };
            storage.saveAsset(updatedAsset);
            storage.notifyAssetEvent('asset_updated', updatedAsset, currentUser);
          }
        }}
      />

      <PrintAuditReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        assets={assets}
        areas={areas}
        currentUser={currentUser}
        lang={lang}
      />

      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          areas={areas}
          lang={lang}
          onOpenPasswordModal={() => {
            setIsProfileModalOpen(false);
            setIsPasswordModalOpen(true);
          }}
        />
      )}

      {/* Live Notification Toast */}
      <NotificationToast
        currentUser={currentUser}
        notifications={notifications}
        transfers={transfers}
        lang={lang}
        onMarkRead={(id) => storage.markNotificationRead(id, currentUser.id)}
        onNavigateNotification={handleNavigateNotification}
        onConfirmGoodsReceived={handleConfirmGoodsReceived}
      />
    </div>
  );
}
