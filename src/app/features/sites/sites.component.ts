import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteService } from '../../core/services/site.service';
import { Site, SiteFilter, SiteType, SITE_TYPES, TransferRequest } from '../../core/models/site.model';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.scss']
})
export class SitesComponent implements OnInit {
  // Filters
  searchTerm = signal('');
  selectedType = signal<SiteType | 'all'>('all');
  showInactive = signal(false);

  // View mode
  viewMode = signal<'grid' | 'list'>('grid');
  activeTab = signal<'sites' | 'transfers'>('sites');

  // Modal states
  showModal = signal(false);
  modalMode = signal<'add' | 'edit' | 'view'>('add');
  selectedSite = signal<Site | null>(null);
  
  // Transfer modal
  showTransferModal = signal(false);
  
  // Form data
  formData = signal({
    code: '',
    name: '',
    type: 'warehouse' as SiteType,
    street: '',
    city: '',
    postalCode: '',
    country: 'Maroc',
    phone: '',
    email: '',
    manager: '',
    capacity: 0,
    isActive: true
  });

  siteTypes = SITE_TYPES;

  filter = computed<SiteFilter>(() => ({
    search: this.searchTerm(),
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    isActive: this.showInactive() ? undefined : true
  }));

  sites = computed(() => this.siteService.getFilteredSites(this.filter())());
  siteStats = computed(() => this.siteService.getSiteStats()());
  allSites = computed(() => this.siteService.getSites()());
  transfers = computed(() => this.siteService.getTransfers()());
  pendingTransfers = computed(() => this.siteService.getPendingTransfers()());

  constructor(private siteService: SiteService) {}

  ngOnInit(): void {}

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

  setActiveTab(tab: 'sites' | 'transfers') {
    this.activeTab.set(tab);
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
      code: site.code,
      name: site.name,
      type: site.type,
      street: site.address.street,
      city: site.address.city,
      postalCode: site.address.postalCode,
      country: site.address.country,
      phone: site.phone || '',
      email: site.email || '',
      manager: site.manager || '',
      capacity: site.capacity || 0,
      isActive: site.isActive
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
      code: '',
      name: '',
      type: 'warehouse',
      street: '',
      city: '',
      postalCode: '',
      country: 'Maroc',
      phone: '',
      email: '',
      manager: '',
      capacity: 0,
      isActive: true
    });
  }

  updateFormField(field: string, value: string | number | boolean) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  saveSite() {
    const form = this.formData();
    
    if (!form.code || !form.name || !form.city) {
      return;
    }

    const siteData = {
      code: form.code,
      name: form.name,
      type: form.type,
      address: {
        street: form.street,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country
      },
      phone: form.phone,
      email: form.email,
      manager: form.manager,
      capacity: form.capacity,
      currentOccupancy: 0,
      zones: [],
      isActive: form.isActive,
      isMain: false
    };

    if (this.modalMode() === 'add') {
      this.siteService.addSite(siteData);
    } else if (this.modalMode() === 'edit' && this.selectedSite()) {
      this.siteService.updateSite(this.selectedSite()!.id, siteData);
    }

    this.closeModal();
  }

  toggleSiteStatus(site: Site) {
    this.siteService.toggleSiteStatus(site.id);
  }

  deleteSite(site: Site) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le site "${site.name}" ?`)) {
      this.siteService.deleteSite(site.id);
    }
  }

  openTransferModal() {
    this.showTransferModal.set(true);
  }

  closeTransferModal() {
    this.showTransferModal.set(false);
  }

  updateTransferStatus(transfer: TransferRequest, status: TransferRequest['status']) {
    this.siteService.updateTransferStatus(transfer.id, status);
  }

  getSiteTypeLabel(type: SiteType): string {
    return this.siteService.getSiteTypeLabel(type);
  }

  getSiteTypeIcon(type: SiteType): string {
    return this.siteService.getSiteTypeIcon(type);
  }

  getOccupancyPercent(site: Site): number {
    if (!site.capacity || !site.currentOccupancy) return 0;
    return Math.round((site.currentOccupancy / site.capacity) * 100);
  }

  getOccupancyStatus(site: Site): 'low' | 'medium' | 'high' {
    const percent = this.getOccupancyPercent(site);
    if (percent < 50) return 'low';
    if (percent < 80) return 'medium';
    return 'high';
  }

  getTransferStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'in_transit': 'En transit',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return labels[status] || status;
  }
}
