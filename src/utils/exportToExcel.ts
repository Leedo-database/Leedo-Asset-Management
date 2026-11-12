import { Area, Asset, AssetCategory } from '../types';
import { calculateDepreciation } from './depreciation';
import { inferItemTypeCode } from '../services/storage';

/**
 * Format category to human-readable label
 */
export const getCategoryName = (cat: AssetCategory, lang: 'en' | 'bn' = 'en'): string => {
  switch (cat) {
    case 'IT_Electronics':
      return lang === 'bn' ? 'আইটি ও ইলেকট্রনিক্স' : 'IT & Electronics';
    case 'Furniture':
      return lang === 'bn' ? 'আসবাবপত্র' : 'Furniture & Fixture';
    case 'Vehicle':
      return lang === 'bn' ? 'যানবাহন' : 'Vehicle & Transport';
    case 'Appliances':
      return lang === 'bn' ? 'গৃহস্থালি ও সরঞ্জাম' : 'Appliances';
    case 'Kitchenware':
      return lang === 'bn' ? 'রান্নাঘর সামগ্রী' : 'Kitchenware';
    case 'Educational':
      return lang === 'bn' ? 'শিক্ষা উপকরণ' : 'Educational Materials';
    case 'Facility':
      return lang === 'bn' ? 'স্থায়ী সুবিধা ও জেনারেটর' : 'Facility & Generator';
    case 'Medical':
      return lang === 'bn' ? 'চিকিৎসা সামগ্রী' : 'Medical & First Aid';
    default:
      return cat;
  }
};

/**
 * Clean strings for CSV/Excel export
 */
const escapeCSV = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Exports asset list to Excel-ready CSV with UTF-8 BOM
 */
export const exportAssetsToExcelCSV = (
  assets: Asset[],
  areas: Area[],
  filenamePrefix: string = 'LEEDO_Asset_Database',
  lang: 'en' | 'bn' = 'en'
) => {
  const headers = [
    'Sl. No.',
    'Asset ID Number',
    'Item Tag Code',
    'Item Name (English)',
    'Item Name (Bangla)',
    'Asset Group / Category',
    'Location Name / Center',
    'Present Location (Room Name)',
    'Acquisition Date',
    'Acquisition Cost in BDT',
    'Current Book Value in BDT',
    'Depreciation (BDT)',
    'Depreciation %',
    'Asset Status / Condition',
    'Acquisition Type',
    'Donor / Vendor',
    'Serial Number',
    'Assigned Holder / Incharge',
    'Comments / Remarks',
    'Disposal Date',
    'Disposal Method',
    'Salvage Recovered (BDT)',
  ];

  const rows = assets.map((asset, index) => {
    const area = areas.find((a) => a.id === asset.assignedAreaId);
    const areaName = area ? (lang === 'bn' ? area.nameBn : area.nameEn) : 'Head Office';
    const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);
    const code = asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);
    const categoryName = getCategoryName(asset.category, lang);

    return [
      index + 1,
      escapeCSV(asset.id),
      escapeCSV(code),
      escapeCSV(asset.titleEn),
      escapeCSV(asset.titleBn || ''),
      escapeCSV(categoryName),
      escapeCSV(areaName),
      escapeCSV(asset.specificRoom || ''),
      escapeCSV(asset.purchaseDate || ''),
      asset.purchaseValueBDT || 0,
      dep.currentBookValue || 0,
      dep.totalDepreciation || 0,
      `${dep.depreciationPercent}%`,
      escapeCSV(asset.usabilityStatus),
      escapeCSV(asset.acquisitionType),
      escapeCSV(asset.donorOrVendor || ''),
      escapeCSV(asset.serialNumber || ''),
      escapeCSV(asset.createdBy || 'LEEDO'),
      escapeCSV(asset.remarks || ''),
      escapeCSV(asset.disposalDate || ''),
      escapeCSV(asset.disposalMethod || ''),
      asset.salvageValueBDT || 0,
    ].join(',');
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel opens Bangla and English perfectly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports asset list as an HTML-based Excel spreadsheet (.xls)
 * Allows native Excel table formatting, styles, borders, and column coloring.
 */
export const exportAssetsToExcelHTML = (
  assets: Asset[],
  areas: Area[],
  filenamePrefix: string = 'LEEDO_Asset_Database',
  reportTitle: string = 'LEEDO Asset Management System - Master Inventory Report'
) => {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let totalCost = 0;
  let totalBookValue = 0;

  const rowsHtml = assets
    .map((asset, index) => {
      const area = areas.find((a) => a.id === asset.assignedAreaId);
      const areaName = area ? area.nameEn : 'Head Office';
      const dep = calculateDepreciation(asset.purchaseDate, asset.purchaseValueBDT, asset.category);
      const code = asset.itemTypeCode || inferItemTypeCode(asset.titleEn, asset.category);
      totalCost += asset.purchaseValueBDT || 0;
      totalBookValue += dep.currentBookValue || 0;

      return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-weight: bold; font-family: monospace; color: #b91c1c;">${asset.id}</td>
        <td style="text-align: center; font-weight: bold; background-color: #f1f5f9;">${code}</td>
        <td style="font-weight: 600;">${asset.titleEn}</td>
        <td>${asset.titleBn || ''}</td>
        <td>${getCategoryName(asset.category, 'en')}</td>
        <td>${areaName}</td>
        <td>${asset.specificRoom || ''}</td>
        <td style="text-align: center;">${asset.purchaseDate || ''}</td>
        <td style="text-align: right;">${(asset.purchaseValueBDT || 0).toLocaleString()}</td>
        <td style="text-align: right; font-weight: bold; color: #b91c1c;">${dep.currentBookValue.toLocaleString()}</td>
        <td style="text-align: center;">${dep.depreciationPercent}%</td>
        <td style="text-align: center; font-weight: bold;">${asset.usabilityStatus}</td>
        <td>${asset.acquisitionType}</td>
        <td>${asset.donorOrVendor || ''}</td>
        <td>${asset.serialNumber || ''}</td>
        <td>${asset.remarks || ''}</td>
      </tr>
    `;
    })
    .join('');

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>LEEDO Assets</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; }
        td { border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; }
        .header-box { background-color: #dc2626; color: white; padding: 14px; text-align: center; font-size: 16px; font-weight: bold; }
        .sub-header { font-size: 11px; color: #64748b; margin-bottom: 8px; }
        .total-row { background-color: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a; }
      </style>
    </head>
    <body>
      <div class="header-box">
        LEEDO (Peace and Love for Street Children)<br/>
        <span style="font-size: 13px; font-weight: normal;">${reportTitle} • Total Items: ${assets.length}</span>
      </div>
      <div class="sub-header">
        Generated on: ${dateStr} • Official NGO Affairs Bureau Asset Audit Registry
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">SL</th>
            <th>Asset ID Number</th>
            <th>Tag Code</th>
            <th>Item Name (English)</th>
            <th>Item Name (Bangla)</th>
            <th>Asset Group / Category</th>
            <th>Location / Center</th>
            <th>Room / Specific Dept.</th>
            <th>Acquisition Date</th>
            <th>Original Cost (BDT)</th>
            <th>Current Value (BDT)</th>
            <th>Dep %</th>
            <th>Status / Condition</th>
            <th>Acquisition Type</th>
            <th>Donor / Vendor</th>
            <th>Serial Number</th>
            <th>Comments / Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="9" style="text-align: right; font-weight: bold;">TOTAL SUMMARY (${assets.length} Assets):</td>
            <td style="text-align: right; font-weight: bold; color: #000000;">${totalCost.toLocaleString()} BDT</td>
            <td style="text-align: right; font-weight: bold; color: #b91c1c;">${totalBookValue.toLocaleString()} BDT</td>
            <td colspan="6"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
