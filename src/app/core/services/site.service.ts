/**
 * Site Service - Diagram: nom, adresse, ville, code_fiscale, telephone, email, responsableSite, type, capacite
 * Sujet PFE: multi-magasin
 */
import { Injectable, signal, computed } from '@angular/core';
import { Site, SiteFilter, SITE_TYPES } from '../models/site.model';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, USE_BACKEND } from '../../app.config';

interface SiteDto {
  id_site?: string;
  id?: string;
  nom: string;
  adresse: string;
  ville: string;
  code_fiscale?: string;
  codeFiscale?: string;
  telephone?: string;
  email?: string;
  responsableSite?: string;
  type: string;
  capacite?: number;
}

@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly http = inject(HttpClient);
  private sitesSignal = signal<Site[]>([
    { id: 1, nom: 'poulina pricipale', adresse: 'Zone industriel', ville: 'hammem lif', codeFiscale: '20000', telephone: '+212 5XX XXX XXX', type: 'warehouse', capacite: 10000 },
    { id: 2, nom: 'mazzraa sousse', adresse: 'Avenue Mohammed V', ville: 'sousse', codeFiscale: '10000', type: 'store', capacite: 500 }
  ]);

  getSites() {
    return this.sitesSignal;
  }

  private dtoToSite(dto: SiteDto): Site {
    return {
      id: dto.id ?? dto.id_site ?? '',
      nom: dto.nom,
      adresse: dto.adresse,
      ville: dto.ville,
      codeFiscale: dto.codeFiscale ?? dto.code_fiscale ?? '',
      telephone: dto.telephone,
      email: dto.email,
      responsableSite: dto.responsableSite,
      type: dto.type,
      capacite: dto.capacite
    };
  }

  async fetchSites(): Promise<Site[]> {
    if (USE_BACKEND) {
      const dtos = await firstValueFrom(this.http.get<SiteDto[]>(`${API_BASE_URL}/api/Sites/GetSites`));
      const mapped = (dtos ?? []).map(d => this.dtoToSite(d));
      this.sitesSignal.set(mapped);
      return mapped;
    }
    return this.sitesSignal();
  }

  async fetchSite(id: string | number): Promise<Site | undefined> {
    if (USE_BACKEND) {
      const dto = await firstValueFrom(this.http.get<SiteDto>(`${API_BASE_URL}/api/Sites/GetSite/${id}`));
      return dto ? this.dtoToSite(dto) : undefined;
    }
    return this.getSiteById(id);
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

  async addSiteApi(site: Omit<Site, 'id'>): Promise<Site> {
    if (USE_BACKEND) {
      const dto: Partial<SiteDto> = {
        nom: site.nom,
        adresse: site.adresse,
        ville: site.ville,
        code_fiscale: site.codeFiscale,
        telephone: site.telephone,
        email: site.email,
        responsableSite: site.responsableSite,
        type: site.type,
        capacite: site.capacite
      };
      const result = await firstValueFrom(this.http.post<SiteDto>(`${API_BASE_URL}/api/Sites/AddSite`, dto));
      const created = this.dtoToSite(result);
      this.sitesSignal.update(sites => [...sites, created]);
      return created;
    }
    return this.addSite(site);
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

  async updateSiteApi(id: string | number, updates: Partial<Site>): Promise<boolean> {
    if (USE_BACKEND) {
      const current = this.sitesSignal().find(s => String(s.id) === String(id));
      if (!current) return false;
      const merged = { ...current, ...updates };
      const dto: Partial<SiteDto> = {
        id_site: String(id),
        nom: merged.nom,
        adresse: merged.adresse,
        ville: merged.ville,
        code_fiscale: merged.codeFiscale,
        telephone: merged.telephone,
        email: merged.email,
        responsableSite: merged.responsableSite,
        type: merged.type,
        capacite: merged.capacite
      };
      const result = await firstValueFrom(this.http.put<SiteDto>(`${API_BASE_URL}/api/Sites/UpdateSite`, dto));
      const updated = this.dtoToSite(result);
      this.sitesSignal.update(sites => sites.map(s => String(s.id) === String(id) ? updated : s));
      return true;
    }
    return this.updateSite(id, updates);
  }

  deleteSite(id: string | number): boolean {
    this.sitesSignal.update(sites => sites.filter(s => String(s.id) !== String(id)));
    return true;
  }

  async deleteSiteApi(id: string | number): Promise<boolean> {
    if (USE_BACKEND) {
      await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/Sites/DeleteSite/${id}`));
    }
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
