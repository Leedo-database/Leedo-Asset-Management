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
  storage,
} from './storage';

export type SyncState = 'connected' | 'syncing' | 'offline' | 'error';

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

      // 2. Ensure all old demo assets, transfers, and disposals are cleared from Cloud
      const isDemoWiped = localStorage.getItem('leedo_lams_demo_wiped_v8');
      if (!isDemoWiped) {
        await this.wipeAllDemoDataFromCloud();
        localStorage.setItem('leedo_lams_demo_wiped_v8', 'true');
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
          remoteAssets.push(doc.data() as Asset);
        });
        // Update local cache and notify listeners without triggering infinite loop
        storage.setAllAssetsFromCloud(remoteAssets);
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

  public async saveAsset(asset: Asset): Promise<void> {
    this.setStatus('syncing', 'Saving asset to Firebase Cloud...');
    try {
      const assetRef = doc(db, 'assets', asset.id);
      await setDoc(assetRef, {
        ...asset,
        updatedAt: new Date().toISOString(),
      });
      this.setStatus('connected', 'Asset saved to Firebase Cloud');
    } catch (error) {
      console.error('Error saving asset to cloud:', error);
      this.setStatus('offline', 'Saved locally. Will auto-sync to cloud when online.');
    }
  }

  public async deleteAsset(assetId: string): Promise<void> {
    this.setStatus('syncing', 'Deleting asset from Firebase Cloud...');
    try {
      const assetRef = doc(db, 'assets', assetId);
      await deleteDoc(assetRef);
      this.setStatus('connected', 'Asset removed from Firebase Cloud');
    } catch (error) {
      console.error('Error deleting asset from cloud:', error);
      this.setStatus('offline', 'Removed locally. Will sync to cloud when online.');
    }
  }

  // Delete all existing assets in cloud to replace with clean/real assets
  public async clearAllAssets(): Promise<void> {
    this.setStatus('syncing', 'Clearing assets in Firebase Cloud...');
    try {
      const snap = await getDocs(collection(db, 'assets'));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      storage.clearAssets();
      this.setStatus('connected', 'All old/demo assets cleared from Firebase Cloud');
    } catch (error) {
      console.error('Error clearing assets in cloud:', error);
      storage.clearAssets();
    }
  }

  // Bulk import multiple assets to Cloud
  public async bulkSaveAssets(newAssets: Asset[], replaceExisting = false): Promise<void> {
    this.setStatus('syncing', 'Uploading assets to Firebase Cloud...');
    try {
      if (replaceExisting) {
        await this.clearAllAssets();
      }
      
      const batch = writeBatch(db);
      newAssets.forEach((asset) => {
        const ref = doc(db, 'assets', asset.id);
        batch.set(ref, asset);
      });
      await batch.commit();
      
      this.setStatus('connected', `Successfully synced ${newAssets.length} assets to Firebase Cloud`);
    } catch (error) {
      console.error('Error bulk uploading assets to cloud:', error);
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
