/**
 * Alert Service - Diagram: type, message, dateCreation, resolue
 * Sujet PFE: alertes automatiques selon règles métier
 */
import { Injectable, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Alert, AlertFilter, AlertStats, AlertSeverity, ALERT_TYPES, SEVERITY_CONFIG } from '../models/alert.model';
import { API_BASE_URL } from '../../app.config';

interface AlertDto {
  id_a?: string;
  id?: string;
  type: string;
  message: string;
  dateCreation: string | Date;
  resolue: boolean;
  severity?: string;
  status?: string;
  id_s?: string;
  produitNom?: string;
  siteNom?: string;
  utilisateurNom?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);
  private alertsSignal = signal<Alert[]>([]);
  private readonly READ_IDS_KEY = 'alerts_read_ids';

  private getReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.READ_IDS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  }

  private saveReadIds(ids: Set<string>): void {
    localStorage.setItem(this.READ_IDS_KEY, JSON.stringify([...ids]));
  }

  getAlerts() {
    return this.alertsSignal;
  }

  private dtoToAlert(dto: AlertDto): Alert {
    const id = dto.id ?? dto.id_a ?? '';
    const readIds = this.getReadIds();
    return {
      id,
      type: dto.type,
      message: dto.message,
      dateCreation: new Date(dto.dateCreation),
      resolue: dto.resolue,
      severity: (dto.severity ?? 'Info').toLowerCase(),
      status: dto.status ?? 'Open',
      stockId: dto.id_s,
      isRead: readIds.has(String(id)),
      produitNom: dto.produitNom,
      siteNom: dto.siteNom,
      utilisateurNom: dto.utilisateurNom
    };
  }

  async fetchAlerts(): Promise<Alert[]> {
    const dtos = await firstValueFrom(this.http.get<AlertDto[]>(`${API_BASE_URL}/api/Alerts/GetAlerts`));
    const mapped = (dtos ?? []).map(d => this.dtoToAlert(d));
    this.alertsSignal.set(mapped);
    return mapped;
  }

  getActiveAlerts() {
    return computed(() => this.alertsSignal().filter(a => !a.resolue));
  }

  getUnreadAlerts() {
    return computed(() => this.alertsSignal().filter(a => !a.resolue && !(a.isRead ?? false)));
  }

  getFilteredAlerts(filter: AlertFilter) {
    return computed(() => {
      let alerts = this.alertsSignal();
      if (filter.resolue !== undefined) {
        alerts = alerts.filter(a => a.resolue === filter.resolue);
      }
      if (filter.type) {
        alerts = alerts.filter(a => a.type === filter.type);
      }
      if (filter.severity) {
        alerts = alerts.filter(a => a.severity === filter.severity);
      }
      if (filter.siteNom) {
        alerts = alerts.filter(a => a.siteNom === filter.siteNom);
      }
      if (filter.date) {
        const d = filter.date; // YYYY-MM-DD
        alerts = alerts.filter(a => {
          const ad = new Date(a.dateCreation);
          const yyyy = ad.getFullYear();
          const mm = String(ad.getMonth() + 1).padStart(2, '0');
          const dd = String(ad.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}` === d;
        });
      }
      if (filter.produitNom) {
        alerts = alerts.filter(a => a.produitNom === filter.produitNom);
      }
      return alerts.sort((a, b) =>
        new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      );
    });
  }

  getAlertStats(): AlertStats {
    const allAlerts = this.alertsSignal();
    const unresolved = allAlerts.filter(a => !a.resolue);
    const unread = unresolved.filter(a => !(a.isRead ?? false));
    const byType: Record<string, number> = {};
    ALERT_TYPES.forEach(t => { byType[t.value] = unresolved.filter(a => a.type === t.value).length; });
    const critical = unresolved.filter(a => a.severity === 'critical').length;
    const high = unresolved.filter(a => a.severity === 'warning').length;
    const medium = unresolved.filter(a => a.severity === 'info').length;
    return { total: unresolved.length, unread: unread.length, critical, high, medium, byType };
  }

  async createAlertApi(alert: Omit<Alert, 'id'>): Promise<Alert> {
    const dto: Partial<AlertDto> = {
      type: alert.type,
      message: alert.message,
      dateCreation: alert.dateCreation instanceof Date ? alert.dateCreation.toISOString() : alert.dateCreation,
      resolue: alert.resolue ?? false,
      id_s: alert.stockId ? String(alert.stockId) : undefined
    };
    const result = await firstValueFrom(
      this.http.post<AlertDto>(`${API_BASE_URL}/api/Alerts/AddAlert`, dto)
    );
    const created = this.dtoToAlert(result);
    this.alertsSignal.update(alerts => [created, ...alerts]);
    return created;
  }

  async resolveAlertApi(id: string | number): Promise<boolean> {
    const alert = this.alertsSignal().find(a => String(a.id) === String(id));
    if (!alert) return false;
    const dto: Partial<AlertDto> = {
      id_a: String(id),
      type: alert.type,
      message: alert.message,
      dateCreation: alert.dateCreation instanceof Date ? alert.dateCreation.toISOString() : alert.dateCreation,
      resolue: true,
      id_s: alert.stockId ? String(alert.stockId) : undefined
    };
    await firstValueFrom(
      this.http.put<AlertDto>(`${API_BASE_URL}/api/Alerts/UpdateAlert`, dto)
    );
    // Update local state
    const index = this.alertsSignal().findIndex(a => String(a.id) === String(id));
    if (index !== -1) {
      this.alertsSignal.update(alerts => {
        const updated = [...alerts];
        updated[index] = { ...updated[index], resolue: true };
        return updated;
      });
    }
    return true;
  }

  async deleteAlertApi(id: string | number): Promise<boolean> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/Alerts/DeleteAlert/${id}`)
    );
    this.alertsSignal.update(alerts => alerts.filter(a => String(a.id) !== String(id)));
    return true;
  }

  getAlertTypeConfig(type: string) {
    return ALERT_TYPES.find(t => t.value === type);
  }

  getSeverityConfig(severity: string | AlertSeverity | undefined) {
    return severity ? SEVERITY_CONFIG[severity] : undefined;
  }

  markAsRead(id: string | number): void {
    const index = this.alertsSignal().findIndex(a => String(a.id) === String(id));
    if (index === -1) return;
    const readIds = this.getReadIds();
    readIds.add(String(id));
    this.saveReadIds(readIds);
    this.alertsSignal.update(alerts => {
      const updated = [...alerts];
      updated[index] = { ...updated[index], isRead: true };
      return updated;
    });
  }

  markAllAsRead(): void {
    const readIds = this.getReadIds();
    this.alertsSignal().forEach(a => readIds.add(String(a.id)));
    this.saveReadIds(readIds);
    this.alertsSignal.update(alerts =>
      alerts.map(a => ({ ...a, isRead: true }))
    );
  }

}
