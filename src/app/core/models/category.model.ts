export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  icon?: string;
  color?: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}
