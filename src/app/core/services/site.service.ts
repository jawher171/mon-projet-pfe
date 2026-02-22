/**
 * Site Service - Diagram: nom, adresse, ville, code_fiscale, telephone, email, responsableSite, type, capacite
 * Sujet PFE: multi-magasin
 */
import { Injectable, signal, computed } from '@angular/core';
import { Site, SiteFilter, SITE_TYPES } from '../models/site.model';

@Injectable({ providedIn: 'root' })
export class SiteService {
  private sitesSignal = signal<Site[]>([
    { id: 1, nom: 'poulina pricipale', adresse: 'Zone industriel', ville: 'hammem lif', codeFiscale: '20000', telephone: '+212 5XX XXX XXX', type: 'warehouse', capacite: 10000 },
    { id: 2, nom: 'mazzraa sousse', adresse: 'Avenue Mohammed V', ville: 'sousse', codeFiscale: '10000', type: 'store', capacite: 500 }
  ]);

  getSites() {
    return this.sitesSignal;
  }

  getActiveSites() {
    return computed(() => this.sitesSignal());
  }

  getFilteredSites(filter: SiteFilter) {
    return computed(() => {
      let sites = this.sitesSignal();
      if (filter.search) {
        const search = filter.search.toLowerCase();
        sites = sites.filter(s =>
          s.nom.toLowerCase().includes(search) ||
          s.ville.toLowerCase().includes(search)
        );
      }
      if (filter.type && filter.type !== 'all') {
        sites = sites.filter(s => s.type === filter.type);
      }
      return sites;
    });
  }

  getSiteById(id: string | number): Site | undefined {
    return this.sitesSignal().find(s => String(s.id) === String(id));
  }

  addSite(site: Omit<Site, 'id'>): Site {
    const newSite: Site = { ...site, id: 'site_' + Date.now() };
    this.sitesSignal.update(sites => [...sites, newSite]);
    return newSite;
  }

  updateSite(id: string | number, updates: Partial<Site>): boolean {
    const index = this.sitesSignal().findIndex(s => String(s.id) === String(id));
    if (index === -1) return false;
    this.sitesSignal.update(sites => {
      const updated = [...sites];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
    return true;
  }

  deleteSite(id: string | number): boolean {
    this.sitesSignal.update(sites => sites.filter(s => String(s.id) !== String(id)));
    return true;
  }

  getSiteTypeLabel(type: string): string {
    return SITE_TYPES.find(t => t.value === type)?.label ?? type;
  }

  getSiteTypeIcon(type: string): string {
    return SITE_TYPES.find(t => t.value === type)?.icon ?? 'store';
  }

  getSiteStats() {
    return computed(() => {
      const sites = this.sitesSignal();
      return {
        total: sites.length,
        active: sites.length,
        warehouses: sites.filter(s => s.type === 'warehouse').length,
        stores: sites.filter(s => s.type === 'store').length
      };
    });
  }
}
