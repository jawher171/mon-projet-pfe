/**
 * Stock - Diagram: quantiteDisponible, seuilAlerte
 * Links Produit and Site (sujet PFE: multi-magasin)
 */
export interface Stock {
  id: number | string;
  quantiteDisponible: number;
  seuilAlerte: number;
  seuilSecurite: number;
  seuilMinimum: number;
  seuilMaximum: number;
  produitId: number | string;
  produitNom?: string;
  siteId: number | string;
  siteNom?: string;
}
