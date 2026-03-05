/**
 * Produit - Diagram: nom, description, codeBarre, prix
 * Single model for diagram a-lignment (sujet PFE: QR/code-barres)
 */
export interface Product {
  id_p: number | string;
  nom: string;
  description: string;
  codeBarre?: string;
  prix: number;
  id_c: number | string;
  categorieLibelle?: string;
}

export interface ProductFilter {
  search?: string;
  id_c?: number | string;
}
