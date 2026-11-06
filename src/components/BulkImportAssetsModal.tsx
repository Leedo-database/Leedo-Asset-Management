import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  FileSpreadsheet,
  Table,
  Upload,
  X,
  Trash2,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { deduplicateAssets, detectAssetCategory, storage } from '../services/storage';
import { Area, Asset, AssetCategory, UsabilityStatus, User } from '../types';

interface BulkImportAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  currentUser: User;
  lang: Language;
  onImportComplete: () => void;
}

/**
 * Robust TSV / CSV parser that handles quotes, multiline cells, and tab/comma delimiters.
 * Ensures newline within quotes (like "Sl. \n No.") doesn't split lines improperly.
 */
function parseDelimitedText(text: string): string[][] {
  if (!text || !text.trim()) return [];

  // Normalize all line breaks
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect delimiter: tab (\t) or comma (,)
  let tabCount = 0;
  let commaCount = 0;
  for (let i = 0; i < Math.min(cleaned.length, 3000); i++) {
    if (cleaned[i] === '\t') tabCount++;
    else if (cleaned[i] === ',') commaCount++;
  }
  const delimiter = tabCount > 0 ? '\t' : (commaCount > 0 ? ',' : '\t');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.replace(/[\r\n]+/g, ' ').trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.replace(/[\r\n]+/g, ' ').trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Push remaining cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.replace(/[\r\n]+/g, ' ').trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Find area ID by Location ID, Location Name, or Asset ID prefix
function findAreaId(
  areas: Area[],
  locationNameOrCode: string,
  locationIdOrCode?: string,
  assetId?: string
): string {
  const rawLoc = (locationNameOrCode || '').toLowerCase().trim();
  const rawId = (locationIdOrCode || '').toLowerCase().trim();
  const rawAsset = (assetId || '').toUpperCase().trim();

  // 1. Direct match on Location Name or Location ID (highest priority & user intent)
  // Kadamtali Vocational Center (direct or keyword)
  if (
    rawLoc.includes('vocational') ||
    rawLoc.includes('voc.t.center') ||
    rawLoc.includes('ভোকেশনাল') ||
    rawId.includes('kvc') ||
    rawLoc.includes('kvc')
  ) {
    return 'area-kvc';
  }

  // Kadamtali Shelter
  if (
    rawLoc.includes('kadamtali') ||
    rawLoc.includes('কদমতলী') ||
    rawLoc.includes('kdt') ||
    rawId.includes('kdt')
  ) {
    return 'area-kdt';
  }

  // Kamalapur (Shelter vs SUS)
  if (
    rawLoc.includes('kamalapur') ||
    rawLoc.includes('kamlapur') ||
    rawLoc.includes('কমলাপুর') ||
    rawId.includes('kms') ||
    rawId.includes('kmp')
  ) {
    if (
      rawLoc.includes('shelter') ||
      rawLoc.includes('শেল্টার') ||
      rawLoc.includes('kms') ||
      rawId.includes('kms')
    ) {
      return 'area-kms';
    }
    return 'area-kmp';
  }

  // Peace Home
  if (
    rawLoc.includes('peace home') ||
    rawLoc.includes('peace') ||
    rawLoc.includes('konabari') ||
    rawLoc.includes('gazipur') ||
    rawLoc.includes('পিস হোম') ||
    rawLoc.includes('pch') ||
    rawId.includes('pch')
  ) {
    return 'area-pch';
  }

  // Head Office (ensure word boundary for 'ho' so 'home' is not matched)
  if (
    rawLoc.includes('head office') ||
    rawLoc.includes('প্রধান কার্যালয়') ||
    rawLoc.includes('হেড অফিস') ||
    /\bho\b/i.test(rawLoc) ||
    rawId.includes('leedo000') ||
    /\bho\b/i.test(rawId)
  ) {
    return 'area-ho';
  }

  if (rawLoc.includes('inclusive') || rawLoc.includes('school') || rawLoc.includes('ইনক্লুসিভ') || rawId.includes('ins')) {
    return 'area-ins';
  }
  if (rawLoc.includes('mirpur') || rawLoc.includes('মিরপুর') || rawId.includes('mir')) {
    return 'area-mir';
  }
  if (rawLoc.includes('shadarghat') || rawLoc.includes('sadarghat') || rawLoc.includes('সদরঘাট') || rawId.includes('sdg')) {
    return 'area-sdg';
  }
  if (rawLoc.includes('shambazar') || rawLoc.includes('shyambazar') || rawLoc.includes('শ্যামবাজার') || rawId.includes('smb')) {
    return 'area-smb';
  }
  if (rawLoc.includes('airport') || rawLoc.includes('বিমানবন্দর') || rawId.includes('apt')) {
    return 'area-apt';
  }
  if (rawLoc.includes('tejgaon') || rawLoc.includes('তেজগাঁও') || rawId.includes('tej')) {
    return 'area-tej';
  }
  if (rawLoc.includes('rayerbazar') || rawLoc.includes('রায়েরবাজার') || rawId.includes('ray')) {
    return 'area-ray';
  }

  // 2. Direct match on Area ID / Code / Exact Names
  const match = areas.find((a) => {
    const aId = a.id.toLowerCase();
    const aCode = a.code.toLowerCase();
    const aEn = a.nameEn.toLowerCase();
    const aBn = a.nameBn.toLowerCase();

    return (
      (rawId && (aId === rawId || aCode === rawId)) ||
      (rawLoc &&
        (aId === rawLoc ||
          aCode === rawLoc ||
          aEn === rawLoc ||
          aBn === rawLoc ||
          rawLoc.includes(aEn) ||
          rawLoc.includes(aBn)))
    );
  });

  if (match) return match.id;

  // 3. Fallback to Asset ID Code Prefix / Pattern
  // Kadamtali Vocational
  if (
    rawAsset.includes('-KVC-') ||
    rawAsset.includes('/KVC/') ||
    rawAsset.startsWith('LEEDO-KVC') ||
    rawAsset.includes('KVC') ||
    rawAsset.includes('VOC')
  ) {
    return 'area-kvc';
  }

  // Kadamtali Shelter (TSSBKDMS, TSSBKAD, BKDMS, KDMS, BKAD, KDT)
  if (
    rawAsset.includes('BKDMS') ||
    rawAsset.includes('KDMS') ||
    rawAsset.includes('BKAD') ||
    rawAsset.includes('TSSBKDMS') ||
    rawAsset.includes('TSSBKAD') ||
    rawAsset.includes('-KDT-') ||
    rawAsset.includes('/KDT/') ||
    rawAsset.startsWith('LEEDO-KDT') ||
    rawAsset.startsWith('LEEDO/KDT') ||
    rawAsset.includes('KDT')
  ) {
    return 'area-kdt';
  }

  // Kamalapur Shelter (KMS / TSSBK / TSSBKP / TSSBKO / TSSBKW)
  if (
    rawAsset.includes('TSSBK') ||
    rawAsset.includes('TSSB') ||
    rawAsset.includes('-KMS-') ||
    rawAsset.includes('/KMS/') ||
    rawAsset.startsWith('LEEDO-KMS') ||
    rawAsset.includes('KMS')
  ) {
    return 'area-kms';
  }

  // Kamalapur SUS (KMP)
  if (
    rawAsset.includes('-KMP-') ||
    rawAsset.includes('/KMP/') ||
    rawAsset.startsWith('LEEDO-KMP') ||
    rawAsset.includes('KMP')
  ) {
    return 'area-kmp';
  }

  // Peace Home
  if (
    rawAsset.includes('-PH-') ||
    rawAsset.includes('/PH/') ||
    rawAsset.startsWith('LEEDO-PH') ||
    rawAsset.includes('PCH') ||
    rawAsset.includes('PEACE')
  ) {
    return 'area-pch';
  }

  // Head Office
  if (
    rawAsset.includes('-HO-') ||
    rawAsset.includes('/HO/') ||
    rawAsset.startsWith('LEEDO-HO') ||
    rawAsset.startsWith('LEEDO/HO')
  ) {
    return 'area-ho';
  }

  if (rawAsset.includes('-MIR-') || rawAsset.includes('/MIR/') || rawAsset.includes('MIR')) {
    return 'area-mir';
  }
  if (rawAsset.includes('-INS-') || rawAsset.includes('/INS/') || rawAsset.includes('INS')) {
    return 'area-ins';
  }
  if (rawAsset.includes('-SDG-') || rawAsset.includes('/SDG/') || rawAsset.includes('SDG')) {
    return 'area-sdg';
  }
  if (rawAsset.includes('-SMB-') || rawAsset.includes('/SMB/') || rawAsset.includes('SMB')) {
    return 'area-smb';
  }
  if (rawAsset.includes('-APT-') || rawAsset.includes('/APT/') || rawAsset.includes('APT')) {
    return 'area-apt';
  }
  if (rawAsset.includes('-TEJ-') || rawAsset.includes('/TEJ/') || rawAsset.includes('TEJ')) {
    return 'area-tej';
  }
  if (rawAsset.includes('-RAY-') || rawAsset.includes('/RAY/') || rawAsset.includes('RAY')) {
    return 'area-ray';
  }

  return 'area-ho';
}

// Normalize Category using centralized intelligent detection
function normalizeCategory(groupStr: string, itemStr = ''): AssetCategory {
  return detectAssetCategory(itemStr, groupStr);
}

// Normalize Usability condition from Excel columns (e.g. 'Runing', 'Active', 'Good', 'Repairable')
function normalizeStatus(conditionStr: string, statusStr = ''): UsabilityStatus {
  const s = `${conditionStr} ${statusStr}`.toLowerCase();
  if (s.includes('repair') || s.includes('damage') || s.includes('মেরামত')) return 'Repairable';
  if (s.includes('unusable') || s.includes('broken') || s.includes('dead') || s.includes('অকেজো')) return 'Unusable';
  if (s.includes('disp') || s.includes('scrap') || s.includes('বাতিল')) return 'Disposed';
  return 'Usable';
}

// Normalize Acquisition Date (e.g. 'Nov-2025', '2025-11-01', '15/11/2025', 'Nov 2025')
function normalizeDate(rawDate: string): string {
  if (!rawDate || !rawDate.trim()) return new Date().toISOString().slice(0, 10);
  const s = rawDate.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial number format (e.g., 45620)
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s, 10);
    const excelEpoch = new Date(1899, 11, 30);
    const dateFromSerial = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(dateFromSerial.getTime())) {
      return dateFromSerial.toISOString().slice(0, 10);
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Month-Year like Nov-2025 or Nov 2025 or November-2025
  const monthNames: { [key: string]: string } = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  const myMatch = s.match(/^([a-zA-Z]+)[\s\-\,\/]+(\d{2,4})$/);
  if (myMatch) {
    const monthKey = myMatch[1].toLowerCase().slice(0, 3);
    let year = myMatch[2];
    if (year.length === 2) {
      year = parseInt(year, 10) >= 50 ? `19${year}` : `20${year}`;
    }
    const monthNum = monthNames[monthKey] || '01';
    return `${year}-${monthNum}-01`;
  }

  // Year-Month like 2025-Nov or 25-Nov
  const ymMatch = s.match(/^(\d{2,4})[\s\-\,\/]+([a-zA-Z]+)$/);
  if (ymMatch) {
    let year = ymMatch[1];
    if (year.length === 2) {
      year = parseInt(year, 10) >= 50 ? `19${year}` : `20${year}`;
    }
    const monthKey = ymMatch[2].toLowerCase().slice(0, 3);
    const monthNum = monthNames[monthKey] || '01';
    return `${year}-${monthNum}-01`;
  }

  // Standard JavaScript Date parsing fallback
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

export const BulkImportAssetsModal: React.FC<BulkImportAssetsModalProps> = ({
  isOpen,
  onClose,
  areas,
  currentUser,
  lang,
  onImportComplete,
}) => {
  const t = translations[lang];
  const [inputText, setInputText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Partial<Asset>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showColumnGuide, setShowColumnGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-parse immediately when inputText changes (e.g. user pastes or types)
  useEffect(() => {
    if (inputText.trim()) {
      parseRowsFromText(inputText);
    } else {
      setParsedPreview([]);
      setErrorMsg('');
    }
  }, [inputText]);

  // Parse text into asset objects
  function parseRowsFromText(text: string) {
    setErrorMsg('');
    if (!text || !text.trim()) {
      setParsedPreview([]);
      return;
    }

    const rows = parseDelimitedText(text);
    if (rows.length === 0) {
      setParsedPreview([]);
      setErrorMsg(lang === 'bn' ? 'কোনো ডাটা পাওয়া যায়নি।' : 'No data rows found.');
      return;
    }

    // Determine if first row is a header row
    const firstRowText = rows[0].join(' ').toLowerCase();
    const hasHeader =
      firstRowText.includes('item name') ||
      firstRowText.includes('asset id') ||
      firstRowText.includes('location id') ||
      firstRowText.includes('location name') ||
      firstRowText.includes('asset group') ||
      firstRowText.includes('acquisition date') ||
      firstRowText.includes('cost in bdt') ||
      firstRowText.includes('sl.') ||
      firstRowText.includes('present location') ||
      firstRowText.includes('current holder');

    const colMap: { [key: string]: number } = {};

    if (hasHeader) {
      rows[0].forEach((col, idx) => {
        const c = col.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (c.includes('asset id')) colMap['assetId'] = idx;
        else if (c.includes('item name') || c === 'item') colMap['itemName'] = idx;
        else if (c.includes('item desc') || c.includes('description')) colMap['itemDesc'] = idx;
        else if (c.includes('location id') || c === 'loc id') colMap['locationId'] = idx;
        else if (
          (c === 'location name' || c === 'location' || c === 'branch' || c === 'center' ||
           (c.includes('location') && !c.includes('id') && !c.includes('present') && !c.includes('dept') && !c.includes('using') && !c.includes('room'))) &&
          colMap['locationName'] === undefined
        ) {
          colMap['locationName'] = idx;
        }
        else if (c.includes('dept') || c.includes('department') || c.includes('using')) {
          colMap['dept'] = idx;
        }
        else if (c.includes('group') || c.includes('category')) colMap['group'] = idx;
        else if (c.includes('acquisition date') || c.includes('purchase date') || (c.includes('date') && !c.includes('dispose'))) colMap['date'] = idx;
        else if (c.includes('acquisition cost') || c.includes('purchase cost') || c === 'cost' || c.includes('cost in bdt')) colMap['cost'] = idx;
        else if ((c.includes('cost') || c.includes('price') || c.includes('value') || c.includes('bdt')) && colMap['cost'] === undefined) colMap['cost'] = idx;
        else if (c.includes('present condition')) colMap['condition'] = idx;
        else if (c.includes('condition') && colMap['condition'] === undefined) colMap['condition'] = idx;
        else if (c.includes('status')) colMap['status'] = idx;
        else if (c.includes('room') || c.includes('present location')) colMap['room'] = idx;
        else if (c.includes('procured') || c.includes('vendor') || c.includes('transferred')) colMap['vendor'] = idx;
        else if (c.includes('holder')) colMap['holder'] = idx;
        else if (c.includes('comment') || c.includes('remarks')) colMap['comments'] = idx;
      });
    }

    const dataRows = hasHeader ? rows.slice(1) : rows;
    const results: Partial<Asset>[] = [];

    dataRows.forEach((row) => {
      if (!row || row.length === 0) return;
      if (row.every((cell) => !cell || !cell.trim())) return;

      let assetId = '';
      let itemName = '';
      let itemDesc = '';
      let locationName = '';
      let locationId = '';
      let assetGroup = '';
      let acqDate = '';
      let costValue = 0;
      let conditionText = '';
      let statusText = '';
      let roomName = '';
      let vendorText = '';
      let commentsText = '';
      let holderText = '';

      if (colMap['itemName'] !== undefined || colMap['assetId'] !== undefined) {
        assetId = colMap['assetId'] !== undefined ? row[colMap['assetId']] || '' : '';
        itemName = colMap['itemName'] !== undefined ? row[colMap['itemName']] || '' : '';
        itemDesc = colMap['itemDesc'] !== undefined ? row[colMap['itemDesc']] || '' : '';
        locationName = colMap['locationName'] !== undefined ? row[colMap['locationName']] || '' : '';
        locationId = colMap['locationId'] !== undefined ? row[colMap['locationId']] || '' : '';
        assetGroup = colMap['group'] !== undefined ? row[colMap['group']] || '' : '';
        acqDate = colMap['date'] !== undefined ? row[colMap['date']] || '' : '';
        const rawCost = colMap['cost'] !== undefined ? row[colMap['cost']] || '0' : '0';
        costValue = parseFloat(rawCost.replace(/[^0-9.]/g, '')) || 0;
        conditionText = colMap['condition'] !== undefined ? row[colMap['condition']] || '' : '';
        statusText = colMap['status'] !== undefined ? row[colMap['status']] || '' : '';
        roomName = colMap['room'] !== undefined ? row[colMap['room']] || '' : '';
        vendorText = colMap['vendor'] !== undefined ? row[colMap['vendor']] || '' : '';
        commentsText = colMap['comments'] !== undefined ? row[colMap['comments']] || '' : '';
        holderText = colMap['holder'] !== undefined ? row[colMap['holder']] || '' : '';
      } else if (row.length >= 8) {
        const startsWithSlNo = /^\d+$/.test(row[0].trim());
        const offset = startsWithSlNo ? 0 : -1;

        if (offset === 0) {
          locationId = row[1] || '';
          locationName = row[2] || '';
          itemName = row[3] || '';
          itemDesc = row[4] || '';
          assetId = row[5] || '';
          assetGroup = row[7] || '';
          acqDate = row[8] || '';
          costValue = parseFloat((row[9] || '0').replace(/[^0-9.]/g, '')) || 0;
          vendorText = row[10] || '';
          holderText = row[11] || '';
          statusText = row[12] || '';
          conditionText = row[14] || '';
          roomName = row[15] || '';
          commentsText = row[16] || '';
        } else {
          if (/^LEEDO\d+/i.test(row[0])) {
            locationId = row[0] || '';
            locationName = row[1] || '';
            itemName = row[2] || '';
            itemDesc = row[3] || '';
            assetId = row[4] || '';
            assetGroup = row[6] || '';
            acqDate = row[7] || '';
            costValue = parseFloat((row[8] || '0').replace(/[^0-9.]/g, '')) || 0;
            holderText = row[10] || '';
            statusText = row[11] || '';
            conditionText = row[13] || '';
            roomName = row[14] || '';
          } else {
            itemName = row[0] || '';
            itemDesc = row[1] || '';
            assetId = row[2] || '';
            assetGroup = row[3] || '';
            locationName = row[4] || '';
            costValue = parseFloat((row[5] || '0').replace(/[^0-9.]/g, '')) || 0;
          }
        }
      } else {
        itemName = row[0] || '';
        assetGroup = row[1] || '';
        locationName = row[2] || '';
        acqDate = row[3] || '';
        costValue = parseFloat((row[4] || '0').replace(/[^0-9.]/g, '')) || 0;
        conditionText = row[5] || '';
        roomName = row[6] || '';
      }

      if (!assetId) {
        const foundId = row.find(
          (cell) =>
            (cell.includes('/') || cell.includes('-')) &&
            /[a-zA-Z]/.test(cell) &&
            /\d/.test(cell) &&
            (cell.toUpperCase().includes('LEEDO') || cell.length >= 6)
        );
        if (foundId) assetId = foundId.trim();
      }

      if (!itemName) {
        const possibleName = row.find(
          (c) => c && c.length >= 2 && !/^\d+$/.test(c) && !c.includes('/') && !/^LEEDO\d+/i.test(c)
        );
        if (possibleName) itemName = possibleName;
      }

      if (!itemName && !assetId) return;

      const finalItemName = itemName || (assetId ? `Asset ${assetId}` : 'Equipment Item');
      const fullTitleEn =
        itemDesc && itemDesc.toLowerCase() !== 'new' && itemDesc.toLowerCase() !== 'used'
          ? `${finalItemName} - ${itemDesc}`
          : finalItemName;

      const areaId = findAreaId(areas, locationName, locationId, assetId);
      const parsedDate = normalizeDate(acqDate);
      const category = normalizeCategory(assetGroup, finalItemName);
      const usabilityStatus = normalizeStatus(conditionText, statusText);
      const initialCond = (itemDesc || '').toLowerCase().includes('used') ? 'Used' : 'New';

      const remarksParts = [];
      if (assetGroup) remarksParts.push(`Group: ${assetGroup}`);
      if (locationId) remarksParts.push(`Location ID: ${locationId}`);
      if (holderText) remarksParts.push(`Holder: ${holderText}`);
      if (conditionText) remarksParts.push(`Condition: ${conditionText}`);
      if (commentsText) remarksParts.push(commentsText);

      results.push({
        id: assetId.trim() || undefined,
        titleEn: fullTitleEn,
        category,
        assignedAreaId: areaId,
        purchaseDate: parsedDate,
        purchaseValueBDT:
          costValue > 0
            ? costValue
            : category === 'IT_Electronics'
            ? 36000
            : category === 'Furniture'
            ? 8000
            : category === 'Appliances'
            ? 3500
            : 2500,
        initialCondition: initialCond,
        usabilityStatus,
        specificRoom: roomName || 'General Store',
        donorOrVendor: vendorText || holderText || 'LEEDO Head Office',
        remarks: remarksParts.join(' | ') || 'Registered through Excel Bulk Import',
        createdBy: currentUser.name,
      });
    });

    if (results.length === 0) {
      setParsedPreview([]);
      setErrorMsg(
        lang === 'bn'
          ? 'কোনো বৈধ সম্পদ সারি শনাক্ত করা যায়নি। এক্সেল থেকে সারিগুলো কপি করে আবার পেস্ট করুন।'
          : 'Could not detect any valid asset rows. Please copy rows from Excel and paste again.'
      );
    } else {
      // Disambiguate duplicate IDs in user's pasted rows so no asset is lost
      const seenIds = new Map<string, number>();
      const disambiguatedResults = results.map((item) => {
        if (!item.id) return item;
        const count = seenIds.get(item.id) || 0;
        seenIds.set(item.id, count + 1);
        if (count === 0) return item;
        return {
          ...item,
          id: `${item.id}-${count + 1}`,
        };
      });

      const cleanResults = deduplicateAssets(disambiguatedResults as Asset[]);
      setParsedPreview(cleanResults);
      setErrorMsg('');
    }
  }

  // Handle direct paste from clipboard API button
  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setInputText(text);
          return;
        }
      }
    } catch {
      // Clipboard access denied, fallback to focusing the textarea
    }
    textareaRef.current?.focus();
  };

  // Save parsed items to storage and Firebase Cloud
  const handleSaveToDatabase = () => {
    if (parsedPreview.length === 0) {
      setErrorMsg(lang === 'bn' ? 'সংরক্ষণ করার আগে এক্সেল ডেটা দিন।' : 'Please provide Excel data before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const currentYear = new Date().getFullYear();
      const finalAssets: Asset[] = parsedPreview.map((item, idx) => {
        const area = areas.find((a) => a.id === item.assignedAreaId) || areas[0];
        const areaCode = area ? area.code : 'HO';

        const exactAssetId =
          item.id && item.id.trim().length > 0
            ? item.id.trim()
            : `LEEDO-${areaCode}-${currentYear}-${String(idx + 1).padStart(4, '0')}`;

        return {
          id: exactAssetId,
          titleEn: item.titleEn || 'Asset Item',
          titleBn: item.titleBn || '',
          category: item.category || 'IT_Electronics',
          acquisitionType: item.acquisitionType || 'Purchased',
          donorOrVendor: item.donorOrVendor || 'LEEDO Head Office',
          purchaseDate: item.purchaseDate || new Date().toISOString().slice(0, 10),
          purchaseValueBDT: item.purchaseValueBDT || 36000,
          initialCondition: item.initialCondition || 'New',
          usabilityStatus: item.usabilityStatus || 'Usable',
          assignedAreaId: item.assignedAreaId || 'area-ho',
          specificRoom: item.specificRoom || 'General Store',
          remarks: item.remarks || 'Registered through Excel bulk import',
          createdBy: currentUser.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const saveSeenIds = new Map<string, number>();
      const disambiguatedFinal = finalAssets.map((item) => {
        if (!item.id) return item;
        const count = saveSeenIds.get(item.id) || 0;
        saveSeenIds.set(item.id, count + 1);
        if (count === 0) return item;
        return {
          ...item,
          id: `${item.id}-${count + 1}`,
        };
      });

      const uniqueFinal = deduplicateAssets(disambiguatedFinal);

      if (replaceExisting) {
        storage.setAllAssets(uniqueFinal, true);
      } else {
        const existing = storage.getAssets();
        const newIds = new Set(uniqueFinal.map((a) => a.id));
        const filteredExisting = existing.filter((a) => !newIds.has(a.id));
        storage.setAllAssets(deduplicateAssets([...uniqueFinal, ...filteredExisting]), false);
      }

      setSaveSuccess(true);
      onImportComplete();

      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(lang === 'bn' ? 'সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err?.message || '') : 'Failed to save: ' + (err?.message || ''));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  // Do not render anything when modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-600 rounded-xl shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center space-x-2">
                <span>
                  {lang === 'bn'
                    ? 'এক্সেল থেকে বাল্ক সম্পদ আপলোড ও নিবন্ধন'
                    : 'Bulk Asset Upload & Registration from Excel'}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                  18-Column Excel Ready
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'এক্সেল থেকে সরাসরি কপি (Ctrl+C) করে এখানে পেস্ট (Ctrl+V) করুন — সিস্টেম তাৎক্ষণিকভাবে শনাক্ত করবে'
                  : 'Copy (Ctrl+C) directly from Excel and paste (Ctrl+V) below — auto-detects instantly'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Action Mode Radio (Append vs Replace) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                {lang === 'bn' ? 'আমদানি মোড (Import Action):' : 'Import Action Mode:'}
              </span>
              <p className="text-[11px] text-slate-600">
                {lang === 'bn'
                  ? 'বিদ্যমান তালিকার সাথে যোগ করতে চান নাকি সম্পূর্ণ নতুন তালিকা দিয়ে প্রতিস্থাপন করতে চান নির্বাচন করুন।'
                  : 'Choose whether to append these rows to existing assets or replace all existing records.'}
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <input
                  type="radio"
                  name="importMode"
                  checked={!replaceExisting}
                  onChange={() => setReplaceExisting(false)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>{lang === 'bn' ? 'বিদ্যমানের সাথে যোগ (Append)' : 'Append to Existing'}</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <input
                  type="radio"
                  name="importMode"
                  checked={replaceExisting}
                  onChange={() => setReplaceExisting(true)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>{lang === 'bn' ? 'নতুন দিয়ে প্রতিস্থাপন (Replace All)' : 'Replace All Existing'}</span>
              </label>
            </div>
          </div>

          {/* Column Guide Accordion */}
          <div className="border border-blue-200 bg-blue-50/60 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowColumnGuide(!showColumnGuide)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left text-blue-900 font-bold hover:bg-blue-100/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Table className="w-4 h-4 text-blue-600" />
                <span>
                  {lang === 'bn'
                    ? 'আপনার এক্সেল ফাইলের কলামের ক্রম নির্দেশিকা (LEEDO Official 18 Columns)'
                    : 'Excel Column Order Guide (LEEDO Official 18 Columns)'}
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                  {showColumnGuide ? (lang === 'bn' ? 'লুকান' : 'দেখুন') : (lang === 'bn' ? 'দেখুন' : 'Show')}
                </span>
              </div>
              {showColumnGuide ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
            </button>

            {showColumnGuide && (
              <div className="p-3.5 border-t border-blue-200 bg-white space-y-2 text-[11px] text-slate-700">
                <p className="font-semibold text-slate-900">
                  {lang === 'bn'
                    ? 'এক্সেল থেকে কলামগুলো সরাসরি সিলেক্ট করে কপি (Ctrl+C) করে নিচের বক্সে পেস্ট (Ctrl+V) করুন:'
                    : 'Select and copy (Ctrl+C) columns from your Excel sheet and paste (Ctrl+V) into the box below:'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 font-mono text-[10px]">
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">1. Sl. No.</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">2. Location ID</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">3. Location Name</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-red-700">4. Item Name</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">5. Item Description</span>
                  <span className="p-1.5 bg-emerald-50 border border-emerald-300 rounded font-bold text-emerald-800">6. Asset ID Number ⭐</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">7. Qty.</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">8. ASSET GROUP</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">9. Acquisition Date</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">10. Cost in BDT</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">11. Procured by</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">12. Current Holder</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">13. Asset Status</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">14. HQ Availability</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">15. Present Condition</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">16. Room Name</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">17. Comments</span>
                  <span className="p-1.5 bg-slate-50 border border-slate-200 rounded">18. Dispose Date</span>
                </div>
                <p className="text-[10px] text-emerald-800 font-medium">
                  💡 {lang === 'bn'
                    ? 'বিশেষ সুবিধা: আপনি হেডারসহ বা হেডার ছাড়া যেকোনো ভাবে পেস্ট করতে পারেন। পেস্ট করার সাথে সাথে স্বয়ংক্রিয়ভাবে নিচে প্রিভিউ চলে আসবে।'
                    : 'Note: You can paste with or without headers. The system will auto-detect and show the preview instantly.'}
                </p>
              </div>
            )}
          </div>

          {/* Paste Input Area */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <span>{lang === 'bn' ? 'এক্সেল থেকে কপি করে নিচে পেস্ট করুন (Paste Rows from Excel):' : 'Paste Rows from Excel / CSV:'}</span>
              </label>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClipboardPaste}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-300 text-[11px] transition-colors cursor-pointer"
                  title="Paste directly from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                  <span>{lang === 'bn' ? 'ক্লিপবোর্ড থেকে পেস্ট করুন' : 'Paste from Clipboard'}</span>
                </button>

                <label className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer border border-slate-300 text-[11px] transition-colors">
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>{lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}</span>
                  <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'আপনার এক্সেল শিট থেকে সারিগুলো সিলেক্ট ও কপি করে (Ctrl + C) এখানে পেস্ট (Ctrl + V) করুন...\nপেস্ট করার সাথে সাথেই সিস্টেম স্বয়ংক্রিয়ভাবে সম্পদগুলো শনাক্ত করে নিচে তালিকা দেখাবে।'
                  : 'Select and copy rows from your Excel sheet (Ctrl + C) and paste (Ctrl + V) here...\nRows will be parsed automatically upon paste.'
              }
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 shadow-inner leading-relaxed focus:bg-white transition-colors"
            />
          </div>

          {/* Quick status & clear button */}
          <div className="flex items-center justify-between text-xs">
            {parsedPreview.length > 0 ? (
              <div className="flex items-center space-x-2 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {lang === 'bn'
                    ? `✓ সফলভাবে ${parsedPreview.length}টি সম্পদ শনাক্ত হয়েছে!`
                    : `✓ Successfully detected ${parsedPreview.length} asset items!`}
                </span>
              </div>
            ) : inputText.trim() ? (
              <span className="text-slate-500 flex items-center space-x-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />
                <span>{lang === 'bn' ? 'ডাটা বিশ্লেষণ করা হচ্ছে...' : 'Parsing data...'}</span>
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">
                {lang === 'bn'
                  ? '💡 এক্সেলের ১৮টি কলামের যেকোনো সারি কপি করে সরাসরি পেস্ট করুন'
                  : '💡 Copy any rows from your 18-column Excel sheet and paste above'}
              </span>
            )}

            {inputText.trim() && (
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setParsedPreview([]);
                  setErrorMsg('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center space-x-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'বক্স পরিষ্কার করুন (Clear)' : 'Clear Text'}</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 shadow-2xs">
              <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === 'bn'
                      ? `যাচাইকৃত সম্পদ তালিকা (${parsedPreview.length} টি আইটেম পাওয়া গেছে)`
                      : `Verified Asset Items (${parsedPreview.length} items parsed)`}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                  {lang === 'bn' ? '✓ ক্লাউড ডেটাবেজে সংরক্ষণের জন্য প্রস্তুত' : '✓ Ready for Cloud Save'}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto text-[11px]">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600 sticky top-0 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2 text-left">SL</th>
                      <th className="px-3 py-2 text-left font-bold text-red-700">Asset ID Number</th>
                      <th className="px-3 py-2 text-left">Item Name</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Location (Center)</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Cost (BDT)</th>
                      <th className="px-3 py-2 text-center">Condition</th>
                      <th className="px-3 py-2 text-left">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedPreview.map((item, i) => {
                      const matchedArea = areas.find((a) => a.id === item.assignedAreaId);
                      return (
                        <tr key={`${item.id || 'auto'}_${i}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-red-600 whitespace-nowrap">
                            <span className="bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px]">
                              {item.id || 'Auto ID'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">{item.titleEn}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.category}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {matchedArea ? (lang === 'bn' ? matchedArea.nameBn : matchedArea.nameEn) : 'Head Office'}
                          </td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-mono">{item.purchaseDate}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {(item.purchaseValueBDT || 0).toLocaleString()} ৳
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.usabilityStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{item.specificRoom}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors cursor-pointer text-xs"
          >
            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={parsedPreview.length === 0 || isSaving}
            onClick={handleSaveToDatabase}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-md transition-all text-xs cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : isSaving
                ? 'bg-slate-700 text-slate-200 cursor-wait'
                : parsedPreview.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {saveSuccess
                ? lang === 'bn'
                  ? '✓ সফলভাবে সংরক্ষিত হয়েছে!'
                  : '✓ Successfully Saved!'
                : isSaving
                ? lang === 'bn'
                  ? `সংরক্ষণ করা হচ্ছে... (${parsedPreview.length}টি সম্পদ)`
                  : `Saving ${parsedPreview.length} assets...`
                : replaceExisting
                ? lang === 'bn'
                  ? `সম্পূর্ণ নতুন ${parsedPreview.length}টি সম্পদ দিয়ে প্রতিস্থাপন ও সেভ করুন`
                  : `Replace All & Save ${parsedPreview.length} Assets`
                : lang === 'bn'
                ? `${parsedPreview.length}টি সম্পদ ক্লাউড ডেটাবেজে যুক্ত করুন`
                : `Save ${parsedPreview.length} Assets to Cloud Database`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
