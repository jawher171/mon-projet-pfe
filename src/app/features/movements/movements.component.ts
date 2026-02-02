/**
 * Movements Component
 * Manages stock movements (entries and exits).
 * Allows recording, viewing, and filtering inventory transactions.
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovementService } from '../../core/services/movement.service';
import { SiteService } from '../../core/services/site.service';
import { StockMovement, MovementFilter, MovementReason, MOVEMENT_REASONS } from '../../core/models/movement.model';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.scss']
})
export class MovementsComponent implements OnInit {
  // Filter signals
  /** Search term for movement number or product name */
  searchTerm = signal('');
  
  /** Filter by movement type (entry/exit) */
  selectedType = signal<'all' | 'entry' | 'exit'>('all');
  
  /** Filter by site location */
  selectedSite = signal('');
  
  /** Filter by movement reason */
  selectedReason = signal<MovementReason | ''>('');
  
  // Modal states
  /** Show/hide new movement modal */
  showModal = signal(false);
  
  /** Modal mode: add new or view existing */
  modalMode = signal<'add' | 'view'>('add');
  
  /** Currently selected movement */
  selectedMovement = signal<StockMovement | null>(null);
  
  /** Type for new movement */
  movementType = signal<'entry' | 'exit'>('entry');
  
  // Form data
  /** Form fields for new movement */
  formData = signal({
    productId: '',
    productName: '',
    quantity: 0,
    reason: '' as MovementReason | '',
    siteId: '',
    reference: '',
    barcode: '',
    notes: ''
  });

  // Get data from services
  sites = computed(() => this.siteService.getActiveSites()());
  
  filter = computed<MovementFilter>(() => ({
    search: this.searchTerm(),
    type: this.selectedType() === 'all' ? undefined : this.selectedType(),
    siteId: this.selectedSite() || undefined,
    reason: this.selectedReason() || undefined
  }));

  movements = computed(() => this.movementService.getFilteredMovements(this.filter())());
  summary = computed(() => this.movementService.getMovementSummary());
  
  entryReasons = MOVEMENT_REASONS.filter(r => r.type === 'entry');
  exitReasons = MOVEMENT_REASONS.filter(r => r.type === 'exit');

  constructor(
    private movementService: MovementService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {}

  /**
   * Handle search input changes
   * @param event Input change event
   */
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /**
   * Filter by movement type (entry/exit)
   * @param type Selected movement type
   */
  /**
   * Handle site filter change
   * @param event Select change event
   */
  onTypeChange(type: 'all' | 'entry' | 'exit') {
    this.selectedType.set(type);
  }

  onSiteChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSite.set(select.value);
  }

  openAddModal(type: 'entry' | 'exit') {
    this.modalMode.set('add');
    this.movementType.set(type);
    this.resetForm();
    this.showModal.set(true);
  }

  openViewModal(movement: StockMovement) {
    this.modalMode.set('view');
    this.selectedMovement.set(movement);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedMovement.set(null);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      productId: '',
      productName: '',
      quantity: 0,
      reason: '',
      siteId: '',
      reference: '',
      barcode: '',
      notes: ''
    });
  }

  updateFormField(field: string, value: string | number) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  saveMovement() {
    const form = this.formData();
    const site = this.sites().find(s => s.id === form.siteId);
    
    if (!form.productName || !form.quantity || !form.reason || !form.siteId) {
      return;
    }

    this.movementService.addMovement({
      type: this.movementType(),
      reason: form.reason as MovementReason,
      productId: form.productId || 'prod_' + Math.random().toString(36).substring(2, 8),
      productName: form.productName,
      quantity: form.quantity,
      previousStock: 100, // Mock value
      newStock: this.movementType() === 'entry' ? 100 + form.quantity : 100 - form.quantity,
      siteId: form.siteId,
      siteName: site?.name || '',
      reference: form.reference,
      barcode: form.barcode,
      notes: form.notes,
      performedBy: 'Current User',
      performedAt: new Date()
    });

    this.closeModal();
  }

  getReasonLabel(reason: MovementReason): string {
    return this.movementService.getReasonLabel(reason);
  }

  getReasonsByType(type: 'entry' | 'exit') {
    return type === 'entry' ? this.entryReasons : this.exitReasons;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
