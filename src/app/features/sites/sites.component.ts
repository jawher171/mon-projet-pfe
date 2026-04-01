/**
 * Sites Component - Diagram: nom, adresse, ville, codeFiscale, telephone, email, responsableSite, type, capacite
 * Sujet PFE: multi-magasin
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SiteService } from '../../core/services/site.service';
import { StockService } from '../../core/services/stock.service';
import { AuthService } from '../../core/services/auth.service';
import { Site, SiteFilter, SiteType, SITE_TYPES } from '../../core/models/site.model';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.scss']
})
export class SitesComponent implements OnInit {
  searchTerm = signal('');
  selectedType = signal<SiteType | 'all'>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showModal = signal(false);
  modalMode = signal<'add' | 'edit' | 'view'>('add');
  selectedSite = signal<Site | null>(null);

  formData = signal({
    nom: '',
    adresse: '',
    ville: '',
    codeFiscale: '',
    telephone: '',
    email: '',
    responsableSite: '',
    type: 'warehouse' as SiteType,
    capacite: 0,
    estEntrepotPrincipal: false
  });

  formErrors = signal<Record<string, string>>({});

  // Delete confirmation modal
  showDeleteModal = signal(false);
  siteToDelete = signal<Site | null>(null);
  deleting = signal(false);
  deleteError = signal('');

  siteTypes = SITE_TYPES;

  filter = computed<SiteFilter>(() => ({
    search: this.searchTerm(),
    type: this.selectedType() === 'all' ? undefined : this.selectedType()
  }));

  sites = computed(() => this.siteService.getFilteredSites(this.filter())());
  siteStats = computed(() => this.siteService.getSiteStats()());

  /** Map of siteId → total stock quantity, updated on init */
  siteStockUsage = signal<Record<string, number>>({});

  constructor(private siteService: SiteService, private stockService: StockService, private authService: AuthService) {}

  ngOnInit(): void {
    this.siteService.fetchSites();
    this.loadStockUsage();
  }

  async loadStockUsage() {
    const stocks = await this.stockService.fetchStocks();
    const usage: Record<string, number> = {};
    for (const stock of stocks) {
      const key = String(stock.siteId);
      usage[key] = (usage[key] || 0) + stock.quantiteDisponible;
    }
    this.siteStockUsage.set(usage);
  }

  getUsedCapacity(site: Site): number {
    return this.siteStockUsage()[String(site.id)] || 0;
  }

  getCapacityPercent(site: Site): number {
    if (!site.capacite || site.capacite <= 0) return 0;
    return Math.min(100, Math.round((this.getUsedCapacity(site) / site.capacite) * 100));
  }

  getCapacityColor(site: Site): string {
    const pct = this.getCapacityPercent(site);
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-orange-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onTypeChange(type: SiteType | 'all') {
    this.selectedType.set(type);
  }

  toggleViewMode() {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  openAddModal() {
    this.modalMode.set('add');
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(site: Site) {
    this.modalMode.set('edit');
    this.selectedSite.set(site);
    this.formData.set({
      nom: site.nom,
      adresse: site.adresse,
      ville: site.ville,
      codeFiscale: site.codeFiscale,
      telephone: site.telephone || '',
      email: site.email || '',
      responsableSite: site.responsableSite || '',
      type: site.type as SiteType,
      capacite: site.capacite || 0,
      estEntrepotPrincipal: site.estEntrepotPrincipal || false
    });
    this.showModal.set(true);
  }

  openViewModal(site: Site) {
    this.modalMode.set('view');
    this.selectedSite.set(site);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedSite.set(null);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      nom: '',
      adresse: '',
      ville: '',
      codeFiscale: '',
      telephone: '',
      email: '',
      responsableSite: '',
      type: 'warehouse',
      capacite: 0,
      estEntrepotPrincipal: false
    });
    this.formErrors.set({});
  }

  updateFormField(field: string, value: string | number | boolean) {
    this.formData.update(data => ({ ...data, [field]: field === 'estEntrepotPrincipal' ? !!value : value }));
  }

  private readonly NAME_PATTERN = /^[A-Za-zÀ-ÿ0-9\s\-']+$/;

  async saveSite() {
    const form = this.formData();
    const errors: Record<string, string> = {};

    if (!form.nom?.trim()) {
      errors['nom'] = 'Le nom du site est obligatoire.';
    } else if (!this.NAME_PATTERN.test(form.nom)) {
      errors['nom'] = 'Le nom du site contient des caractères non autorisés.';
    } else if (!/[A-Za-zÀ-ÿ]/.test(form.nom)) {
      errors['nom'] = 'Le nom du site doit contenir au moins une lettre.';
    }
    if (!form.ville?.trim()) {
      errors['ville'] = 'La ville est obligatoire.';
    } else if (!this.NAME_PATTERN.test(form.ville)) {
      errors['ville'] = 'La ville contient des caractères non autorisés.';
    }
    if (form.responsableSite && !this.NAME_PATTERN.test(form.responsableSite)) {
      errors['responsableSite'] = 'Le nom du responsable contient des caractères non autorisés.';
    }

    this.formErrors.set(errors);
    if (Object.keys(errors).length > 0) return;

    const siteData = {
      nom: form.nom,
      adresse: form.adresse,
      ville: form.ville,
      codeFiscale: form.codeFiscale,
      telephone: form.telephone || undefined,
      email: form.email || undefined,
      responsableSite: form.responsableSite || undefined,
      type: form.type,
      capacite: form.capacite || undefined,
      estEntrepotPrincipal: form.type === 'warehouse' ? form.estEntrepotPrincipal : false
    };

    if (this.modalMode() === 'add') {
      await this.siteService.addSiteApi(siteData);
    } else if (this.modalMode() === 'edit' && this.selectedSite()) {
      await this.siteService.updateSiteApi(this.selectedSite()!.id, siteData);
    }
    this.closeModal();
    await this.siteService.fetchSites();
  }

  siteHasStock(site: Site): boolean {
    const stocks = this.stockService.getStocksBySite(site.id);
    return stocks.length > 0;
  }

  deleteSite(site: Site) {
    this.deleteError.set('');
    if (this.siteHasStock(site)) {
      this.deleteError.set(
        `Impossible de supprimer le site "${site.nom}" car il contient encore des stocks. Veuillez d'abord supprimer ou transférer tous les stocks de ce site.`
      );
      this.siteToDelete.set(site);
      this.showDeleteModal.set(true);
      return;
    }
    this.siteToDelete.set(site);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.siteToDelete.set(null);
    this.deleteError.set('');
  }

  async confirmDelete() {
    const site = this.siteToDelete();
    if (!site) return;
    this.deleting.set(true);
    try {
      await this.siteService.deleteSiteApi(site.id);
      await this.siteService.fetchSites();
    } finally {
      this.deleting.set(false);
      this.cancelDelete();
    }
  }

  getSiteTypeLabel(type: string): string {
    return this.siteService.getSiteTypeLabel(type);
  }

  getSiteTypeIcon(type: string): string {
    return this.siteService.getSiteTypeIcon(type);
  }

  canManageSites(): boolean {
    return this.authService.hasPermission('manage_sites');
  }
}
