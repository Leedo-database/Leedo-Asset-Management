import { Asset, AssetCategory } from '../types';

export const DEFAULT_DEPRECIATION_RATES: Record<AssetCategory, number> = {
  IT_Electronics: 0.20, // 20% per year after year 1
  Furniture: 0.10,      // 10% per year after year 1
  Vehicle: 0.15,        // 15% per year after year 1
  Kitchenware: 0.15,    // 15% per year after year 1
  Educational: 0.10,    // 10% per year after year 1
  Appliances: 0.15,     // 15% per year after year 1
  Medical: 0.15,        // 15% per year after year 1
  Facility: 0.12,       // 12% per year after year 1
};

export interface DepreciationResult {
  purchaseValue: number;
  currentBookValue: number;
  totalDepreciation: number;
  depreciationPercent: number;
  ageInYears: number;
  ageYearsOnly: number;
  ageMonthsOnly: number;
  ageFormatted: string;
  salvageFloor: number;
  rateApplied: number;
}

/**
 * Calculates asset depreciation based on LEEDO's specific NGO financial model:
 * - Year 1: Asset value drops by 50% upon completion of year 1.
 *   (If less than 1 year, we prorate down linearly: e.g. 6 months = 25% drop).
 * - Subsequent Years (Year 2 onwards): Depreciates by category rate (10% - 20%) per year on diminishing book value.
 * - Minimum salvage floor: 5% of original purchase value (cannot go below zero or 5% residual scrap value).
 */
export function calculateDepreciation(
  purchaseDateStr: string,
  purchaseValue: number,
  category: AssetCategory,
  customRates?: Record<AssetCategory, number>,
  asOfDateStr?: string
): DepreciationResult {
  if (!purchaseValue || purchaseValue <= 0) {
    return {
      purchaseValue: 0,
      currentBookValue: 0,
      totalDepreciation: 0,
      depreciationPercent: 0,
      ageInYears: 0,
      ageYearsOnly: 0,
      ageMonthsOnly: 0,
      ageFormatted: '0 mo',
      salvageFloor: 0,
      rateApplied: 0,
    };
  }

  const purchaseDate = new Date(purchaseDateStr);
  const targetDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

  // Difference in milliseconds
  const diffMs = Math.max(0, targetDate.getTime() - purchaseDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const ageInYears = diffDays / 365.25;

  const totalMonths = Math.floor(diffDays / 30.4375);
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  let ageFormatted = '';
  if (years > 0 && remainingMonths > 0) {
    ageFormatted = `${years}y ${remainingMonths}m`;
  } else if (years > 0) {
    ageFormatted = `${years} yr${years > 1 ? 's' : ''}`;
  } else {
    ageFormatted = `${remainingMonths} mo${remainingMonths !== 1 ? 's' : ''}`;
  }

  const rates = customRates || DEFAULT_DEPRECIATION_RATES;
  const subsequentRate = rates[category] ?? 0.15;
  const salvageFloor = Math.round(purchaseValue * 0.05); // 5% minimum floor

  let currentBookValue = purchaseValue;

  if (ageInYears <= 1) {
    // During first year: drops by 50% proportionally
    const year1DepreciationPercent = 0.50 * ageInYears;
    currentBookValue = purchaseValue * (1 - year1DepreciationPercent);
  } else {
    // Year 1 complete: drops 50%
    const valueAfterYear1 = purchaseValue * 0.50;
    const additionalYears = ageInYears - 1;
    // Diminishing balance method for subsequent years
    currentBookValue = valueAfterYear1 * Math.pow(1 - subsequentRate, additionalYears);
  }

  // Ensure value stays within sensible bounds
  currentBookValue = Math.max(salvageFloor, Math.round(currentBookValue));
  if (currentBookValue > purchaseValue) {
    currentBookValue = purchaseValue;
  }

  const totalDepreciation = Math.max(0, purchaseValue - currentBookValue);
  const depreciationPercent = Math.round((totalDepreciation / purchaseValue) * 100);

  return {
    purchaseValue,
    currentBookValue,
    totalDepreciation,
    depreciationPercent,
    ageInYears: parseFloat(ageInYears.toFixed(2)),
    ageYearsOnly: years,
    ageMonthsOnly: remainingMonths,
    ageFormatted,
    salvageFloor,
    rateApplied: subsequentRate,
  };
}

/**
 * Format numbers into Bangladeshi Taka (BDT)
 */
export function formatBDT(amount: number, includeSymbol = true): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));

  return includeSymbol ? `৳ ${formatted}` : formatted;
}
