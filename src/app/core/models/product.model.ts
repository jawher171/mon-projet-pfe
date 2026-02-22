/**
 * Produit - Diagram: nom, description, codeBarre, prix
 * Single model for diagram alignment (sujet PFE: QR/code-barres)
 */
export interface Product {
  id: number | string;
  nom: string;
  description: string;
  codeBarre?: string;
  prix: number;
  categorieId: number;
  categorieLibelle?: string;
}

export interface ProductFilter {
  search?: string;
  categorieId?: number;
}
