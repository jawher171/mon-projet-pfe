/**
 * Site Service
 * Manages physical inventory locations (warehouses, stores, distribution centers).
 * Handles site information, warehouse zones, stock transfers, and location management.
 */

import { Injectable, signal, computed } from '@angular/core';
import { Site, SiteFilter, SiteType, SiteStock, TransferRequest, SITE_TYPES } from '../models/site.model';

@Injectable({
  providedIn: 'root'
})
export class SiteService {
  /** All physical sites/locations */
  private sitesSignal = signal<Site[]>(this.getMockSites());
  
  /** Stock transfer requests between sites */
  private transfersSignal = signal<TransferRequest[]>(this.getMockTransfers());

  /**
   * Get all sites signal
   * @returns Signal containing all sites
   */
  getSites() {
    return this.sitesSignal;
  }

  /**
   * Get only active sites
   * @returns Computed signal of active sites
   */
  getActiveSites() {
    return computed(() => this.sitesSignal().filter(s => s.isActive));
  }

  /**
   * Get sites filtered by multiple criteria
   * @param filter Site filter criteria (search, type, status)
   * @returns Computed signal of filtered sites
   */
  getFilteredSites(filter: SiteFilter) {
    return computed(() => {
      let sites = this.sitesSignal();

      if (filter.search) {
        const search = filter.search.toLowerCase();
        sites = sites.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.code.toLowerCase().includes(search) ||
          s.address.city.toLowerCase().includes(search)
        );
      }

      if (filter.type && filter.type !== 'all') {
        sites = sites.filter(s => s.type === filter.type);
      }

      if (filter.isActive !== undefined) {
        sites = sites.filter(s => s.isActive === filter.isActive);
      }
/**
   * Get a specific site by ID
   * @param id Site identifier
   * @returns Site object or undefined if not found
   */
  
      return sites;
    });
  }
/**
   * Add a new site location
   * @param site Site data without auto-generated fields
   * @returns Created site object
   */
  
  getSiteById(id: string): Site | undefined {
    return this.sitesSignal().find(s => s.id === id);
  }

  addSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Site {
    const newSite: Site = {
  /**
   * Update an existing site
   * @param id Site identifier
   * @param updates Partial site data to update
   * @returns true if successful, false if site not found
   */
      ...site,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sitesSignal.update(sites => [...sites, newSite]);
    return newSite;
  }

  updateSite(id: string, updates: Partial<Site>): boolean {
  /**
   * Delete a site (cannot delete main site)
   * @param id Site identifier
   * @returns true if successful, false if site not found or is main site
   */
    const index = this.sitesSignal().findIndex(s => s.id === id);
    if (index === -1) return false;

    this.sitesSignal.update(sites => {
      const updated = [...sites];
      updated[index] = { ...updated[index], ...updates, updatedAt: new Date() };
      return updated;
    });
  /**
   * Toggle site active/inactive status
   * @param id Site identifier
   * @returns true if successful, false if site not found
   */
    return true;
  }

  deleteSite(id: string): boolean {
    const site = this.getSiteById(id);
    if (!site || site.isMain) return false;

    this.sitesSignal.update(sites => sites.filter(s => s.id !== id));
  /**
   * Get all transfer requests signal
   * @returns Signal containing all transfers
   */
    return true;
  }

  toggleSiteStatus(id: string): boolean {
    const site = this.getSiteById(id);
  /**
   * Get pending and in-transit transfer requests
   * @returns Computed signal of active transfers
   */
    if (!site) return false;

    return this.updateSite(id, { isActive: !site.isActive });
  }

  /**
   * Create a new transfer request between sites
   * @param transfer Transfer data without auto-generated fields
   * @returns Created transfer request object
   */
  getTransfers() {
    return this.transfersSignal;
  }

  getPendingTransfers() {
    return computed(() => this.transfersSignal().filter(t => t.status === 'pending' || t.status === 'in_transit'));
  }

  /**
   * Update transfer request status
   * @param id Transfer identifier
   * @param status New transfer status
   * @returns true if successful, false if transfer not found
   */
  createTransfer(transfer: Omit<TransferRequest, 'id' | 'transferNumber' | 'status' | 'requestedAt'>): TransferRequest {
    const newTransfer: TransferRequest = {
      ...transfer,
      id: this.generateId(),
      transferNumber: this.generateTransferNumber(),
      status: 'pending',
      requestedAt: new Date()
    };

    this.transfersSignal.update(transfers => [newTransfer, ...transfers]);
    return newTransfer;
  }

  updateTransferStatus(id: string, status: TransferRequest['status']): boolean {
    const index = this.transfersSignal().findIndex(t => t.id === id);
    if (index === -1) return false;

    this.transfersSignal.update(transfers => {
  /**
   * Get human-readable label for site type
   * @param type Site type
   * @returns Label string
  /**
   * Get icon name for site type
   * @param type Site type
   * @returns Material icon name
   */
   */
      const updated = [...transfers];
      updated[index] = {
        ...updated[index],
  /**
   * Get statistics about all sites
   * Counts by type and active status
   * @returns Computed signal with site statistics
   */
        status,
        completedAt: status === 'completed' ? new Date() : undefined
      };
      return updated;
    });
    return true;
  }

  getSiteTypeLabel(type: SiteType): string {
    return SITE_TYPES.find(t => t.value === type)?.label || type;
  }

  getSiteTypeIcon(type: SiteType): string {
    return SITE_TYPES.find(t => t.value === type)?.icon || 'store';
  }

  getSiteStats() {
    return computed(() => {
      const sites = this.sitesSignal();
      return {
        total: sites.length,
        active: sites.filter(s => s.isActive).length,
        warehouses: sites.filter(s => s.type === 'warehouse').length,
        stores: sites.filter(s => s.type === 'store').length,
        distributionCenters: sites.filter(s => s.type === 'distribution_center').length,
        productionSites: sites.filter(s => s.type === 'production').length
      };
    });
  }

  private generateId(): string {
    return 'site_' + Math.random().toString(36).substring(2, 11);
  }

  private generateTransferNumber(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TR-${dateStr}-${random}`;
  }

  private getMockSites(): Site[] {
    return [
      {
        id: 'site_001',
        code: 'WH-MAIN',
        name: 'Entrepôt Principal',
        type: 'warehouse',
        address: {
          street: '123 Zone Industrielle',
          city: 'Casablanca',
          postalCode: '20000',
          country: 'Maroc',
          latitude: 33.5731,
          longitude: -7.5898
        },
        phone: '+212 522 123 456',
        email: 'entrepot.principal@inventaire.ma',
        manager: 'Ahmed Ben Ali',
        managerId: 'user_001',
        capacity: 10000,
        currentOccupancy: 7500,
        zones: [
          { id: 'zone_a', code: 'A', name: 'Zone A - Électronique', type: 'storage', capacity: 3000, currentStock: 2500 },
          { id: 'zone_b', code: 'B', name: 'Zone B - Informatique', type: 'storage', capacity: 3000, currentStock: 2200 },
          { id: 'zone_c', code: 'C', name: 'Zone C - Réception', type: 'receiving', capacity: 2000, currentStock: 1500 },
          { id: 'zone_d', code: 'D', name: 'Zone D - Expédition', type: 'shipping', capacity: 2000, currentStock: 1300 }
        ],
        isActive: true,
        isMain: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2026-01-15')
      },
      {
        id: 'site_002',
        code: 'ST-CV',
        name: 'Magasin Centre Ville',
        type: 'store',
        address: {
          street: '45 Boulevard Mohammed V',
          city: 'Casablanca',
          postalCode: '20100',
          country: 'Maroc',
          latitude: 33.5892,
          longitude: -7.6114
        },
        phone: '+212 522 234 567',
        email: 'magasin.cv@inventaire.ma',
        manager: 'Fatima Zahra',
        managerId: 'user_002',
        capacity: 500,
        currentOccupancy: 380,
        zones: [
          { id: 'zone_show', code: 'SHOW', name: 'Showroom', type: 'storage', capacity: 300, currentStock: 250 },
          { id: 'zone_back', code: 'BACK', name: 'Réserve', type: 'storage', capacity: 200, currentStock: 130 }
        ],
        isActive: true,
        isMain: false,
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2026-01-10')
      },
      {
        id: 'site_003',
        code: 'DC-NORD',
        name: 'Centre Distribution Nord',
        type: 'distribution_center',
        address: {
          street: '78 Route de Tanger',
          city: 'Rabat',
          postalCode: '10000',
          country: 'Maroc',
          latitude: 34.0209,
          longitude: -6.8416
        },
        phone: '+212 537 345 678',
        email: 'dc.nord@inventaire.ma',
        manager: 'Mohamed Salah',
        managerId: 'user_003',
        capacity: 5000,
        currentOccupancy: 3200,
        zones: [
          { id: 'zone_rec', code: 'REC', name: 'Réception', type: 'receiving', capacity: 1500, currentStock: 800 },
          { id: 'zone_stk', code: 'STK', name: 'Stockage', type: 'storage', capacity: 2500, currentStock: 1800 },
          { id: 'zone_exp', code: 'EXP', name: 'Expédition', type: 'shipping', capacity: 1000, currentStock: 600 }
        ],
        isActive: true,
        isMain: false,
        createdAt: new Date('2024-06-01'),
        updatedAt: new Date('2026-01-12')
      },
      {
        id: 'site_004',
        code: 'ST-MAR',
        name: 'Magasin Marrakech',
        type: 'store',
        address: {
          street: '12 Avenue Hassan II',
          city: 'Marrakech',
          postalCode: '40000',
          country: 'Maroc',
          latitude: 31.6295,
          longitude: -7.9811
        },
        phone: '+212 524 456 789',
        email: 'magasin.marrakech@inventaire.ma',
        manager: 'Youssef Amrani',
        managerId: 'user_004',
        capacity: 400,
        currentOccupancy: 320,
        zones: [
          { id: 'zone_vente', code: 'VNT', name: 'Espace Vente', type: 'storage', capacity: 250, currentStock: 200 },
          { id: 'zone_res', code: 'RES', name: 'Réserve', type: 'storage', capacity: 150, currentStock: 120 }
        ],
        isActive: true,
        isMain: false,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2026-01-08')
      },
      {
        id: 'site_005',
        code: 'WH-SUD',
        name: 'Entrepôt Sud',
        type: 'warehouse',
        address: {
          street: '56 Zone Franche',
          city: 'Agadir',
          postalCode: '80000',
          country: 'Maroc',
          latitude: 30.4278,
          longitude: -9.5981
        },
        phone: '+212 528 567 890',
        email: 'entrepot.sud@inventaire.ma',
        manager: 'Leila Khaldi',
        managerId: 'user_005',
        capacity: 3000,
        currentOccupancy: 1800,
        zones: [
          { id: 'zone_gen', code: 'GEN', name: 'Stockage Général', type: 'storage', capacity: 2000, currentStock: 1200 },
          { id: 'zone_froid', code: 'FRD', name: 'Zone Froide', type: 'cold', capacity: 500, currentStock: 300 },
          { id: 'zone_quar', code: 'QUA', name: 'Quarantaine', type: 'quarantine', capacity: 500, currentStock: 300 }
        ],
        isActive: false,
        isMain: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2026-01-05')
      }
    ];
  }

  private getMockTransfers(): TransferRequest[] {
    const now = new Date();
    return [
      {
        id: 'tr_001',
        transferNumber: 'TR-202601-0001',
        fromSiteId: 'site_001',
        fromSiteName: 'Entrepôt Principal',
        toSiteId: 'site_002',
        toSiteName: 'Magasin Centre Ville',
        items: [
          { productId: 'prod_001', productName: 'Laptop Dell XPS 15', productSku: 'DELL-XPS15-001', quantity: 10 },
          { productId: 'prod_002', productName: 'Souris Sans Fil Logitech', productSku: 'LOG-MX-001', quantity: 25 }
        ],
        status: 'in_transit',
        requestedBy: 'Mohamed Salah',
        requestedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'tr_002',
        transferNumber: 'TR-202601-0002',
        fromSiteId: 'site_003',
        fromSiteName: 'Centre Distribution Nord',
        toSiteId: 'site_004',
        toSiteName: 'Magasin Marrakech',
        items: [
          { productId: 'prod_003', productName: 'Clavier Mécanique RGB', productSku: 'KB-MECH-001', quantity: 15 }
        ],
        status: 'pending',
        requestedBy: 'Youssef Amrani',
        requestedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      }
    ];
  }
}
