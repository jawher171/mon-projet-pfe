/**
 * Site - Diagram: nom, adresse, ville, code_fiscale, telephone, email, responsableSite, type, capacite
 */
export interface Site {
  id: number | string;
  nom: string;
  adresse: string;
  ville: string;
  codeFiscale: string;
  telephone?: string;
  email?: string;
  responsableSite?: string;
  type: string;
  capacite?: number;
}

export type SiteType = 'warehouse' | 'store';

export interface SiteFilter {
  search?: string;
  type?: SiteType | 'all';
}

export const SITE_TYPES: { value: SiteType; label: string; icon: string }[] = [
  { value: 'warehouse', label: 'Entrepôt', icon: 'warehouse' },
  { value: 'store', label: 'Magasin', icon: 'store' },
];
