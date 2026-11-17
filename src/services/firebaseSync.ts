import {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppNotification, Area, Asset, AssetTransfer, DisposalRequest, OrganizationProfile, User } from '../types';
import {
  DEFAULT_AREAS,
  DEFAULT_ASSETS,
  DEFAULT_DISPOSALS,
  DEFAULT_ORG_PROFILE,
  DEFAULT_TRANSFERS,
  DEFAULT_USERS,
  deduplicateAssets,
  storage,
} from './storage';

export type SyncState = 'connected' | 'syncing' | 'offline' | 'error';

/**
 * Recursively strips undefined fields from an object so Firestore's
 * setDoc / WriteBatch.set never throws Unsupported field value: undefined
 */
export function sanitizeForFirestore(data: any): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

enum FirestoreOp {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function logFirestoreError(error: unknown, operationType: FirestoreOp, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.warn('Firestore operation notice:', JSON.stringify(errInfo));
}

class FirebaseSyncService {
  private syncState: SyncState = 'syncing';
  private statusListeners: ((state: SyncState, message?: string) => void)[] = [];
  private unsubscribers: Unsubscribe[] = [];
  private isInitialized = false;

  constructor() {
    // Start syncing when instantiated
    this.registerStorageListener();
    this.init();
  }

  private registerStorageListener() {
    storage.registerCloudSyncHandler((action: string, data: any) => {
      switch (action) {
        case 'saveAsset':
          this.saveAsset(data);
          break;
        case 'deleteAsset':
          this.deleteAsset(data);
          break;
        case 'bulkSaveAssets':
          this.bulkSaveAssets(data.assets, data.replace);
          break;
        case 'clearAllAssets':
          this.clearAllAssets();
          break;
        case 'saveTransfer':
          this.saveTransfer(data);
          break;
        case 'saveDisposal':
          this.saveDisposal(data);
          break;
        case 'saveUser':
          this.saveUser(data);
          break;
        case 'saveArea':
          this.saveArea(data);
          break;
        case 'saveOrgProfile':
          this.saveOrgProfile(data);
          break;
        case 'saveNotification':
          this.saveNotification(data);
          break;
      }
    });
  }

  public subscribeStatus(listener: (state: SyncState, message?: string) => void) {
    this.statusListeners.push(listener);
    listener(this.syncState);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(state: SyncState, message?: string) {
    this.syncState = state;
    this.statusListeners.forEach((l) => l(state, message));
  }

  public getStatus(): SyncState {
    return this.syncState;
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setStatus('syncing', 'Connecting to Firebase Cloud...');

    try {
      // Test server connectivity
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (err: any) {
        // Ignored if test doc does not exist, check offline message
        if (err?.message?.includes('the client is offline')) {
          this.setStatus('offline', 'Offline: Local cache active. Will auto-sync when online.');
        }
      }

      // Check if Firestore has assets seeded
      await this.checkAndSeedDefaults();

      // Listen to real-time collections
      this.setupRealtimeListeners();

      this.setStatus('connected', 'Firebase Cloud: Real-Time Auto Sync Active');
    } catch (error: any) {
      console.warn('Firebase initialization note:', error);
      this.setStatus('connected', 'Firebase Cloud: Auto-Sync Active');
      // Still set up listeners for offline/cached operation
      this.setupRealtimeListeners();
    }
  }

  private async checkAndSeedDefaults() {
    try {
      // 1. Ensure baseline organizational areas and authorized users exist in Firestore
      const areasSnap = await getDocs(query(collection(db, 'areas'), limit(500)));
      if (areasSnap.empty) {
        console.info('Seeding baseline LEEDO areas, users, and org profile to Firebase Cloud...');
        const batch = writeBatch(db);

        DEFAULT_AREAS.forEach((area) => {
          const ref = doc(db, 'areas', area.id);
          batch.set(ref, sanitizeForFirestore(area));
        });

        DEFAULT_USERS.forEach((user) => {
          const ref = doc(db, 'users', user.id);
          batch.set(ref, sanitizeForFirestore(user));
        });

        const orgRef = doc(db, 'settings', 'orgProfile');
        batch.set(orgRef, sanitizeForFirestore(DEFAULT_ORG_PROFILE));

        await batch.commit();
      }

      // 2. Seed initial official LEEDO Excel assets to Firestore if assets collection is empty
      const assetsSnap = await getDocs(query(collection(db, 'assets'), limit(5000)));
      if (assetsSnap.empty && DEFAULT_ASSETS.length > 0) {
        console.info('Seeding official LEEDO Excel assets to Firebase Cloud...');
        const batch = writeBatch(db);
        DEFAULT_ASSETS.forEach((asset) => {
          const ref = doc(db, 'assets', this.toSafeDocId(asset.id));
          batch.set(ref, sanitizeForFirestore(asset));
        });
        await batch.commit();
      }
    } catch (err) {
      logFirestoreError(err, FirestoreOp.GET, 'seedDefaults');
    }
  }

  public async wipeAllDemoDataFromCloud(): Promise<void> {
    try {
      this.setStatus('syncing', 'Purging demo data from cloud...');
      const snap = await getDocs(query(collection(db, 'assets'), limit(5000)));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      storage.clearAssets();
      this.setStatus('connected', 'Firebase Cloud: Synced');
    } catch (err) {
      logFirestoreError(err, FirestoreOp.DELETE, 'assets');
    }
  }

  private setupRealtimeListeners() {
    // 1. Assets Collection Listener
    const unsubAssets = onSnapshot(
      query(collection(db, 'assets'), limit(5000)),
      (snapshot) => {
        const remoteAssets: Asset[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Asset;
          remoteAssets.push({
            ...data,
            id: data.id || doc.id,
          });
        });
        const unique = deduplicateAssets(remoteAssets);
        // Only update local cache from cloud if remote actually has records
        if (unique.length > 0) {
          storage.setAllAssetsFromCloud(unique);
        }
        this.setStatus('connected', 'Firebase Cloud: Synced');
      },
      (error) => {
        logFirestoreError(error, FirestoreOp.LIST, 'assets');
        this.setStatus('offline', 'Operating in local offline cache mode');
      }
    );
    this.unsubscribers.push(unsubAssets);

    // 2. Transfers Collection Listener
    const unsubTransfers = onSnapshot(
      query(collection(db, 'transfers'), limit(1000)),
      (snapshot) => {
        const remoteTransfers: AssetTransfer[] = [];
        snapshot.forEach((doc) => {
          remoteTransfers.push(doc.data() as AssetTransfer);
        });
        storage.setAllTransfersFromCloud(remoteTransfers);
      },
      (error) => logFirestoreError(error, FirestoreOp.LIST, 'transfers')
    );
    this.unsubscribers.push(unsubTransfers);

    // 3. Disposals Collection Listener
    const unsubDisposals = onSnapshot(
      query(collection(db, 'disposals'), limit(1000)),
      (snapshot) => {
        const remoteDisposals: DisposalRequest[] = [];
        snapshot.forEach((doc) => {
          remoteDisposals.push(doc.data() as DisposalRequest);
        });
        storage.setAllDisposalsFromCloud(remoteDisposals);
      },
      (error) => logFirestoreError(error, FirestoreOp.LIST, 'disposals')
    );
    this.unsubscribers.push(unsubDisposals);

    // 4. Areas Collection Listener
    const unsubAreas = onSnapshot(
      query(collection(db, 'areas'), limit(500)),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteAreas: Area[] = [];
          snapshot.forEach((doc) => {
            remoteAreas.push(doc.data() as Area);
          });
          storage.setAllAreasFromCloud(remoteAreas);
        }
      },
      (error) => logFirestoreError(error, FirestoreOp.LIST, 'areas')
    );
    this.unsubscribers.push(unsubAreas);

    // 5. Users Collection Listener
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(500)),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: User[] = [];
          snapshot.forEach((doc) => {
            remoteUsers.push(doc.data() as User);
          });
          storage.setAllUsersFromCloud(remoteUsers);
        }
      },
      (error) => logFirestoreError(error, FirestoreOp.LIST, 'users')
    );
    this.unsubscribers.push(unsubUsers);

    // 6. Settings / OrgProfile Listener
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'orgProfile'),
      (docSnap) => {
        if (docSnap.exists()) {
          storage.setOrgProfileFromCloud(docSnap.data() as OrganizationProfile);
        }
      },
      (error) => logFirestoreError(error, FirestoreOp.GET, 'settings/orgProfile')
    );
    this.unsubscribers.push(unsubSettings);

    // 7. Notifications Collection Listener (Real-time latest 150)
    const notifQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );
    const unsubNotifications = onSnapshot(
      notifQuery,
      (snapshot) => {
        const remoteNotifs: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          remoteNotifs.push(docSnap.data() as AppNotification);
        });
        storage.setAllNotificationsFromCloud(remoteNotifs);
      },
      (error) => logFirestoreError(error, FirestoreOp.LIST, 'notifications')
    );
    this.unsubscribers.push(unsubNotifications);
  }

  // --- Cloud Write Operations ---

  // Helper to ensure Asset IDs with slashes (e.g. LEEDO/HO/PC-001) are safely addressed in Firestore document paths
  private toSafeDocId(id: string): string {
    return encodeURIComponent(id).replace(/%/g, '_');
  }

  // Clamp asset fields to match firebase-blueprint.json & firestore.rules volumetric bounds
  private clampAssetForFirestore(asset: Asset) {
    const validCategories = new Set([
      'IT_Electronics',
      'Furniture',
      'Vehicle',
      'Kitchenware',
      'Educational',
      'Appliances',
      'Medical',
      'Facility',
    ]);
    const validStatuses = new Set(['Usable', 'Repairable', 'Unusable', 'Disposed']);
    const validTransfers = new Set(['none', 'in_transit', 'transferred']);
    const validDisposalMethods = new Set(['Scrapped', 'Auction', 'Recycled', 'Donated']);

    return sanitizeForFirestore({
      ...asset,
      id: String(asset.id || '').slice(0, 128),
      titleEn: String(asset.titleEn || 'Asset').slice(0, 256),
      titleBn: asset.titleBn ? String(asset.titleBn).slice(0, 256) : undefined,
      category: validCategories.has(asset.category) ? asset.category : 'Facility',
      itemTypeCode: asset.itemTypeCode ? String(asset.itemTypeCode).slice(0, 16) : undefined,
      acquisitionType: asset.acquisitionType === 'Donation' ? 'Donation' : 'Purchased',
      donorOrVendor: asset.donorOrVendor ? String(asset.donorOrVendor).slice(0, 256) : undefined,
      purchaseDate: String(asset.purchaseDate || new Date().toISOString().split('T')[0]).slice(0, 32),
      purchaseValueBDT: Math.max(0, Math.min(1000000000, Number(asset.purchaseValueBDT) || 0)),
      initialCondition: asset.initialCondition === 'Used' ? 'Used' : 'New',
      usabilityStatus: validStatuses.has(asset.usabilityStatus) ? asset.usabilityStatus : 'Usable',
      assignedAreaId: String(asset.assignedAreaId || 'area-ho').slice(0, 128),
      specificRoom: asset.specificRoom ? String(asset.specificRoom).slice(0, 128) : undefined,
      serialNumber: asset.serialNumber ? String(asset.serialNumber).slice(0, 128) : undefined,
      remarks: asset.remarks ? String(asset.remarks).slice(0, 1000) : undefined,
      createdBy: asset.createdBy ? String(asset.createdBy).slice(0, 128) : undefined,
      createdAt: asset.createdAt ? String(asset.createdAt).slice(0, 64) : undefined,
      updatedAt: asset.updatedAt ? String(asset.updatedAt).slice(0, 64) : undefined,
      transferStatus:
        asset.transferStatus && validTransfers.has(asset.transferStatus) ? asset.transferStatus : undefined,
      currentTransferId: asset.currentTransferId ? String(asset.currentTransferId).slice(0, 128) : undefined,
      disposalDate: asset.disposalDate ? String(asset.disposalDate).slice(0, 32) : undefined,
      disposalReason: asset.disposalReason ? String(asset.disposalReason).slice(0, 512) : undefined,
      disposalMethod:
        asset.disposalMethod && validDisposalMethods.has(asset.disposalMethod) ? asset.disposalMethod : undefined,
      salvageValueBDT:
        asset.salvageValueBDT !== undefined && asset.salvageValueBDT !== null
          ? Math.max(0, Math.min(1000000000, Number(asset.salvageValueBDT) || 0))
          : undefined,
    });
  }

  public async saveAsset(asset: Asset): Promise<void> {
    this.setStatus('syncing', 'Saving asset to Firebase Cloud...');
    try {
      const clean = this.clampAssetForFirestore({
        ...asset,
        updatedAt: new Date().toISOString(),
      });
      const assetRef = doc(db, 'assets', this.toSafeDocId(asset.id));
      await setDoc(assetRef, clean);
      this.setStatus('connected', 'Asset saved to Firebase Cloud');
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `assets/${this.toSafeDocId(asset.id)}`);
      this.setStatus('offline', 'Saved locally. Will auto-sync to cloud when online.');
    }
  }

  public async deleteAsset(assetId: string): Promise<void> {
    this.setStatus('syncing', 'Deleting asset from Firebase Cloud...');
    try {
      const assetRef = doc(db, 'assets', this.toSafeDocId(assetId));
      await deleteDoc(assetRef);
      this.setStatus('connected', 'Asset removed from Firebase Cloud');
    } catch (error) {
      logFirestoreError(error, FirestoreOp.DELETE, `assets/${this.toSafeDocId(assetId)}`);
      this.setStatus('offline', 'Removed locally. Will sync to cloud when online.');
    }
  }

  // Delete all existing assets in cloud to replace with clean/real assets
  public async clearAllAssets(): Promise<void> {
    this.setStatus('syncing', 'Clearing assets in Firebase Cloud...');
    try {
      const snap = await getDocs(query(collection(db, 'assets'), limit(5000)));
      if (!snap.empty) {
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 300) {
          const chunk = docs.slice(i, i + 300);
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      this.setStatus('connected', 'All assets cleared from Firebase Cloud');
    } catch (error) {
      logFirestoreError(error, FirestoreOp.DELETE, 'assets');
    }
  }

  // Bulk import multiple assets to Cloud
  public async bulkSaveAssets(newAssets: Asset[], replaceExisting = false): Promise<void> {
    this.setStatus('syncing', `Uploading ${newAssets.length} assets to Firebase Cloud...`);
    try {
      const uniqueAssets = deduplicateAssets(newAssets);
      if (uniqueAssets.length === 0) return;

      // 1. Upload/Update all new assets to Cloud first in batches of 300
      for (let i = 0; i < uniqueAssets.length; i += 300) {
        const chunk = uniqueAssets.slice(i, i + 300);
        const batch = writeBatch(db);
        chunk.forEach((asset) => {
          const clean = this.clampAssetForFirestore(asset);
          const ref = doc(db, 'assets', this.toSafeDocId(asset.id));
          batch.set(ref, clean);
        });
        await batch.commit();
      }

      // 2. If replaceExisting is true, remove only the obsolete orphan docs that aren't in newAssets
      if (replaceExisting) {
        const safeDocIds = new Set(uniqueAssets.map((a) => this.toSafeDocId(a.id)));
        const snap = await getDocs(query(collection(db, 'assets'), limit(5000)));
        const orphans = snap.docs.filter((d) => !safeDocIds.has(d.id));
        if (orphans.length > 0) {
          for (let i = 0; i < orphans.length; i += 300) {
            const chunk = orphans.slice(i, i + 300);
            const batch = writeBatch(db);
            chunk.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }
      
      this.setStatus('connected', `Successfully synced ${uniqueAssets.length} assets to Firebase Cloud`);
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, 'assets');
      this.setStatus('offline', 'Saved to local buffer.');
    }
  }

  public async saveTransfer(transfer: AssetTransfer): Promise<void> {
    this.setStatus('syncing', 'Updating transfer in Firebase Cloud...');
    try {
      const ref = doc(db, 'transfers', transfer.id);
      await setDoc(ref, sanitizeForFirestore(transfer));
      this.setStatus('connected', 'Transfer synced to Firebase Cloud');
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `transfers/${transfer.id}`);
    }
  }

  public async saveDisposal(disposal: DisposalRequest): Promise<void> {
    this.setStatus('syncing', 'Updating disposal in Firebase Cloud...');
    try {
      const ref = doc(db, 'disposals', disposal.id);
      await setDoc(ref, sanitizeForFirestore(disposal));
      this.setStatus('connected', 'Disposal request synced to Firebase Cloud');
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `disposals/${disposal.id}`);
    }
  }

  public async saveUser(user: User): Promise<void> {
    try {
      const ref = doc(db, 'users', user.id);
      await setDoc(ref, sanitizeForFirestore(user));
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `users/${user.id}`);
    }
  }

  public async saveArea(area: Area): Promise<void> {
    try {
      const ref = doc(db, 'areas', area.id);
      await setDoc(ref, sanitizeForFirestore(area));
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `areas/${area.id}`);
    }
  }

  public async saveOrgProfile(profile: OrganizationProfile): Promise<void> {
    try {
      const ref = doc(db, 'settings', 'orgProfile');
      await setDoc(ref, sanitizeForFirestore(profile));
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, 'settings/orgProfile');
    }
  }

  public async saveNotification(notification: AppNotification): Promise<void> {
    try {
      const ref = doc(db, 'notifications', notification.id);
      await setDoc(ref, sanitizeForFirestore(notification));
    } catch (error) {
      logFirestoreError(error, FirestoreOp.WRITE, `notifications/${notification.id}`);
    }
  }

  public cleanup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}

export const firebaseSync = new FirebaseSyncService();
