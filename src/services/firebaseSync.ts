import {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Area, Asset, AssetTransfer, DisposalRequest, OrganizationProfile, User } from '../types';
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
      const areasSnap = await getDocs(collection(db, 'areas'));
      if (areasSnap.empty) {
        console.info('Seeding baseline LEEDO areas, users, and org profile to Firebase Cloud...');
        const batch = writeBatch(db);

        DEFAULT_AREAS.forEach((area) => {
          const ref = doc(db, 'areas', area.id);
          batch.set(ref, area);
        });

        DEFAULT_USERS.forEach((user) => {
          const ref = doc(db, 'users', user.id);
          batch.set(ref, user);
        });

        const orgRef = doc(db, 'settings', 'orgProfile');
        batch.set(orgRef, DEFAULT_ORG_PROFILE);

        await batch.commit();
      }

      // 2. Seed initial official LEEDO Excel assets to Firestore if assets collection is empty
      const assetsSnap = await getDocs(collection(db, 'assets'));
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
      console.warn('Seeding check note:', err);
    }
  }

  public async wipeAllDemoDataFromCloud(): Promise<void> {
    try {
      this.setStatus('syncing', 'Purging demo data from cloud...');
      const collectionsToPurge = ['assets', 'transfers', 'disposals'];
      for (const col of collectionsToPurge) {
        const snap = await getDocs(collection(db, col));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      storage.clearAssets();
      storage.setAllTransfersFromCloud([]);
      storage.setAllDisposalsFromCloud([]);
      this.setStatus('connected', 'Firebase Cloud: Synced');
    } catch (err) {
      console.warn('Wipe demo data notice:', err);
    }
  }

  private setupRealtimeListeners() {
    // 1. Assets Collection Listener
    const unsubAssets = onSnapshot(
      collection(db, 'assets'),
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
        console.warn('Assets listener error:', error);
        this.setStatus('offline', 'Operating in local offline cache mode');
      }
    );
    this.unsubscribers.push(unsubAssets);

    // 2. Transfers Collection Listener
    const unsubTransfers = onSnapshot(
      collection(db, 'transfers'),
      (snapshot) => {
        const remoteTransfers: AssetTransfer[] = [];
        snapshot.forEach((doc) => {
          remoteTransfers.push(doc.data() as AssetTransfer);
        });
        storage.setAllTransfersFromCloud(remoteTransfers);
      },
      (error) => console.warn('Transfers listener note:', error)
    );
    this.unsubscribers.push(unsubTransfers);

    // 3. Disposals Collection Listener
    const unsubDisposals = onSnapshot(
      collection(db, 'disposals'),
      (snapshot) => {
        const remoteDisposals: DisposalRequest[] = [];
        snapshot.forEach((doc) => {
          remoteDisposals.push(doc.data() as DisposalRequest);
        });
        storage.setAllDisposalsFromCloud(remoteDisposals);
      },
      (error) => console.warn('Disposals listener note:', error)
    );
    this.unsubscribers.push(unsubDisposals);

    // 4. Areas Collection Listener
    const unsubAreas = onSnapshot(
      collection(db, 'areas'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteAreas: Area[] = [];
          snapshot.forEach((doc) => {
            remoteAreas.push(doc.data() as Area);
          });
          storage.setAllAreasFromCloud(remoteAreas);
        }
      },
      (error) => console.warn('Areas listener note:', error)
    );
    this.unsubscribers.push(unsubAreas);

    // 5. Users Collection Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: User[] = [];
          snapshot.forEach((doc) => {
            remoteUsers.push(doc.data() as User);
          });
          storage.setAllUsersFromCloud(remoteUsers);
        }
      },
      (error) => console.warn('Users listener note:', error)
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
      (error) => console.warn('Settings listener note:', error)
    );
    this.unsubscribers.push(unsubSettings);
  }

  // --- Cloud Write Operations ---

  // Helper to ensure Asset IDs with slashes (e.g. LEEDO/HO/PC-001) are safely addressed in Firestore document paths
  private toSafeDocId(id: string): string {
    return encodeURIComponent(id).replace(/%/g, '_');
  }

  public async saveAsset(asset: Asset): Promise<void> {
    this.setStatus('syncing', 'Saving asset to Firebase Cloud...');
    try {
      const clean = sanitizeForFirestore({
        ...asset,
        updatedAt: new Date().toISOString(),
      });
      const assetRef = doc(db, 'assets', this.toSafeDocId(asset.id));
      await setDoc(assetRef, clean);
      this.setStatus('connected', 'Asset saved to Firebase Cloud');
    } catch (error) {
      console.warn('Save asset notice:', error);
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
      console.warn('Delete asset notice:', error);
      this.setStatus('offline', 'Removed locally. Will sync to cloud when online.');
    }
  }

  // Delete all existing assets in cloud to replace with clean/real assets
  public async clearAllAssets(): Promise<void> {
    this.setStatus('syncing', 'Clearing assets in Firebase Cloud...');
    try {
      const snap = await getDocs(collection(db, 'assets'));
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
      console.warn('Notice clearing assets in cloud:', error);
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
          const clean = sanitizeForFirestore(asset);
          const ref = doc(db, 'assets', this.toSafeDocId(asset.id));
          batch.set(ref, clean);
        });
        await batch.commit();
      }

      // 2. If replaceExisting is true, remove only the obsolete orphan docs that aren't in newAssets
      if (replaceExisting) {
        const safeDocIds = new Set(uniqueAssets.map((a) => this.toSafeDocId(a.id)));
        const snap = await getDocs(collection(db, 'assets'));
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
      console.warn('Bulk save note:', error);
      this.setStatus('offline', 'Saved to local buffer.');
    }
  }

  public async saveTransfer(transfer: AssetTransfer): Promise<void> {
    this.setStatus('syncing', 'Updating transfer in Firebase Cloud...');
    try {
      const ref = doc(db, 'transfers', transfer.id);
      await setDoc(ref, transfer);
      this.setStatus('connected', 'Transfer synced to Firebase Cloud');
    } catch (error) {
      console.error('Error saving transfer to cloud:', error);
    }
  }

  public async saveDisposal(disposal: DisposalRequest): Promise<void> {
    this.setStatus('syncing', 'Updating disposal in Firebase Cloud...');
    try {
      const ref = doc(db, 'disposals', disposal.id);
      await setDoc(ref, disposal);
      this.setStatus('connected', 'Disposal request synced to Firebase Cloud');
    } catch (error) {
      console.error('Error saving disposal to cloud:', error);
    }
  }

  public async saveUser(user: User): Promise<void> {
    try {
      const ref = doc(db, 'users', user.id);
      await setDoc(ref, user);
    } catch (error) {
      console.error('Error saving user to cloud:', error);
    }
  }

  public async saveArea(area: Area): Promise<void> {
    try {
      const ref = doc(db, 'areas', area.id);
      await setDoc(ref, area);
    } catch (error) {
      console.error('Error saving area to cloud:', error);
    }
  }

  public async saveOrgProfile(profile: OrganizationProfile): Promise<void> {
    try {
      const ref = doc(db, 'settings', 'orgProfile');
      await setDoc(ref, profile);
    } catch (error) {
      console.error('Error saving org profile to cloud:', error);
    }
  }

  public cleanup() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}

export const firebaseSync = new FirebaseSyncService();
