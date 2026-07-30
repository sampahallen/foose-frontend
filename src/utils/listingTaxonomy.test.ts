import { describe, expect, it } from 'vitest'
import {
  LISTING_CATEGORIES,
  LISTING_FOOTWEAR_SIZES,
  categoryUsesField,
  fieldsForCategory,
  normalizeCategorySelection,
  pruneListingAttributes,
  sizeLabelForCategory,
} from './listingTaxonomy'

describe('listing taxonomy', () => {
  it('defines a usable field set for every category', () => {
    expect(LISTING_CATEGORIES).toHaveLength(6)
    expect(LISTING_CATEGORIES.map((category) => category.label)).not.toContain('Wholesale Bales')
    LISTING_CATEGORIES.forEach((category) => {
      expect(category.fields.length).toBeGreaterThan(0)
      expect(fieldsForCategory(category.label)).toEqual(category.fields)
    })
  })

  it('exposes focused fields for different category families', () => {
    expect(categoryUsesField('Clothing', 'fit', 'Outerwear')).toBe(true)
    expect(categoryUsesField('Traditional & Fabrics', 'pattern', 'Traditional Wear & Prints')).toBe(true)
    expect(categoryUsesField('Clothing', 'baleGrade', 'Outerwear', 'wholesale')).toBe(true)
    expect(categoryUsesField('Accessories', 'size', 'Jewelry & Watches')).toBe(false)
    expect(sizeLabelForCategory('Traditional & Fabrics', 'Fabric & Textiles')).toBe('Length or dimensions')
  })

  it('prunes attributes that do not apply to the selected category', () => {
    expect(pruneListingAttributes('Footwear', {
      baleGrade: 'grade-a',
      fit: 'relaxed',
      material: 'cotton',
    }, 'Sneakers', 'wholesale')).toEqual({ baleGrade: 'grade-a', material: 'cotton' })
  })

  it('normalizes old category links into the consolidated taxonomy', () => {
    expect(normalizeCategorySelection('T-Shirts')).toEqual({ category: 'Clothing', subcategory: 'Tops & Shirts' })
    expect(normalizeCategorySelection('Wholesale Bales')).toEqual({ category: 'Other', subcategory: '' })
  })

  it('uses Ghana-friendly EU footwear sizes', () => {
    expect(LISTING_FOOTWEAR_SIZES).toContain('EU 35')
    expect(LISTING_FOOTWEAR_SIZES).toContain('EU 50')
    expect(sizeLabelForCategory('Footwear')).toBe('Footwear size (EU)')
  })
})
