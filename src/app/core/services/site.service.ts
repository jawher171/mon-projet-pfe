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
  private sitesSignal = signal<Site[]>([]);
  
  /** Stock transfer requests between sites */
  private transfersSignal = signal<TransferRequest[]>([]);

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

      return sites;
    });
  }

  /**
   * Get a specific site by ID
   * @param id Site identifier
   * @returns Site object or undefined if not found
   */
  getSiteById(id: string): Site | undefined {
    return this.sitesSignal().find(s => s.id === id);
  }

  /**
   * Add a new site location
   * @param site Site data without auto-generated fields
   * @returns Created site object
   */
  addSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Site {
    const newSite: Site = {
      ...site,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sitesSignal.update(sites => [...sites, newSite]);
    return newSite;
  }

  /**
   * Update an existing site
   * @param id Site identifier
   * @param updates Partial site data to update
   * @returns true if successful, false if site not found
   */
  updateSite(id: string, updates: Partial<Site>): boolean {
    const index = this.sitesSignal().findIndex(s => s.id === id);
    if (index === -1) return false;

    this.sitesSignal.update(sites => {
      const updated = [...sites];
      updated[index] = { ...updated[index], ...updates, updatedAt: new Date() };
      return updated;
    });
    return true;
  }

  /**
   * Delete a site (cannot delete main site)
   * @param id Site identifier
   * @returns true if successful, false if site not found or is main site
   */
  deleteSite(id: string): boolean {
    const site = this.getSiteById(id);
    if (!site || site.isMain) return false;

    this.sitesSignal.update(sites => sites.filter(s => s.id !== id));
    return true;
  }

  /**
   * Toggle site active/inactive status
   * @param id Site identifier
   * @returns true if successful, false if site not found
   */
  toggleSiteStatus(id: string): boolean {
    const site = this.getSiteById(id);
    if (!site) return false;

    return this.updateSite(id, { isActive: !site.isActive });
  }

  /**
   * Get all transfer requests signal
   * @returns Signal containing all transfers
   */
  getTransfers() {
    return this.transfersSignal;
  }

  /**
   * Get pending and in-transit transfer requests
   * @returns Computed signal of active transfers
   */
  getPendingTransfers() {
    return computed(() => this.transfersSignal().filter(t => t.status === 'pending' || t.status === 'in_transit'));
  }

  /**
   * Create a new transfer request between sites
   * @param transfer Transfer data without auto-generated fields
   * @returns Created transfer request object
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

  /**
   * Update transfer request status
   * @param id Transfer identifier
   * @param status New transfer status
   * @returns true if successful, false if transfer not found
   */
  updateTransferStatus(id: string, status: TransferRequest['status']): boolean {
    const index = this.transfersSignal().findIndex(t => t.id === id);
    if (index === -1) return false;

    this.transfersSignal.update(transfers => {
      const updated = [...transfers];
      updated[index] = {
        ...updated[index],
        status,
        completedAt: status === 'completed' ? new Date() : undefined
      };
      return updated;
    });
    return true;
  }

  /**
   * Get human-readable label for site type
   * @param type Site type
   * @returns Label string
   */
  getSiteTypeLabel(type: SiteType): string {
    return SITE_TYPES.find(t => t.value === type)?.label || type;
  }

  /**
   * Get icon name for site type
   * @param type Site type
   * @returns Material icon name
   */
  getSiteTypeIcon(type: SiteType): string {
    return SITE_TYPES.find(t => t.value === type)?.icon || 'store';
  }

  /**
   * Get statistics about all sites
   * Counts by type and active status
   * @returns Computed signal with site statistics
   */
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
}
