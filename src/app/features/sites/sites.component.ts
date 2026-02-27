/**
 * Sites Component - Diagram: nom, adresse, ville, codeFiscale, telephone, email, responsableSite, type, capacite
 * Sujet PFE: multi-magasin
 */

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SiteService } from '../../core/services/site.service';
import { Site, SiteFilter, SiteType, SITE_TYPES } from '../../core/models/site.model';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.scss']
})
export class SitesComponent {
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
    capacite: 0
  });

  siteTypes = SITE_TYPES;

  filter = computed<SiteFilter>(() => ({
    search: this.searchTerm(),
    type: this.selectedType() === 'all' ? undefined : this.selectedType()
  }));

  sites = computed(() => this.siteService.getFilteredSites(this.filter())());
  siteStats = computed(() => this.siteService.getSiteStats()());

  constructor(private siteService: SiteService) {}

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
      capacite: site.capacite || 0
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
      capacite: 0
    });
  }

  updateFormField(field: string, value: string | number) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  saveSite() {
    const form = this.formData();
    if (!form.nom || !form.ville) return;

    const siteData = {
      nom: form.nom,
      adresse: form.adresse,
      ville: form.ville,
      codeFiscale: form.codeFiscale,
      telephone: form.telephone || undefined,
      email: form.email || undefined,
      responsableSite: form.responsableSite || undefined,
      type: form.type,
      capacite: form.capacite || undefined
    };

    if (this.modalMode() === 'add') {
      this.siteService.addSite(siteData);
    } else if (this.modalMode() === 'edit' && this.selectedSite()) {
      this.siteService.updateSite(this.selectedSite()!.id, siteData);
    }
    this.closeModal();
  }

  deleteSite(site: Site) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le site "${site.nom}" ?`)) {
      this.siteService.deleteSite(site.id);
    }
  }

  getSiteTypeLabel(type: string): string {
    return this.siteService.getSiteTypeLabel(type);
  }

  getSiteTypeIcon(type: string): string {
    return this.siteService.getSiteTypeIcon(type);
  }
}
