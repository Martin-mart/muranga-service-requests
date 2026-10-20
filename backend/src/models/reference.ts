export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface SubCounty {
  id: string;
  slug: string;
  name: string;
}

export interface ReferenceItem {
  id: string;
  slug: string;
  name: string;
}
