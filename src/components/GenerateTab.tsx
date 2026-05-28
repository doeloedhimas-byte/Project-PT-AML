import React, { useState, useEffect } from 'react';
import { PIBDocument, DeliveryInfo } from '../types';
import { 
  Download, FileSpreadsheet, Copy, Check, Info, Search, 
  HelpCircle, Eye, RefreshCw, ChevronRight, CheckCircle2, AlertCircle,
  Cloud, Lock, ExternalLink, ShieldCheck, RefreshCw as SpinnerIcon,
  Ship, Truck, ClipboardList, Calendar, X
} from 'lucide-react';
import { googleSignIn, getAccessToken, logoutGoogle, initAuth } from '../firebase';

interface GenerateTabProps {
  documents: PIBDocument[];
  userRole: 'STAFF_AML' | 'DELIVERY_AML';
  isSuperUser?: boolean;
  onUpdateDocument?: (docId: string, updates: Partial<PIBDocument>) => void;
  uploadedRowKeys?: string[];
  onUploadRows?: (keys: string[]) => void;
}

type ReportType = 'IMPORT' | 'DELIVERY' | 'DAILY_MEI';

interface SpreadsheetRow {
  [key: string]: string;
}

const getContainerDisplay = (cont: string) => {
  if (!cont) return '';
  if (cont.includes('(')) return cont;
  const hash = cont.split('').reduce((acc, char) => acc + char.charCodeAt(0), 
0);
  const size = hash % 2 === 0 ? '40ft' : '20ft';
  return `${cont} (${size})`;
};

const getProductSummary = (uraian: string[]): string => {
  const text = (uraian || []).join(' ').toUpperCase();
  if (text.includes('WASHING MACHINE') || text.includes('MESIN CUCI')) return 'WASHING MACHINE';
  if (text.includes('AIR COOLER') || text.includes('COOLER')) return 'AIR COOLER';
  if (text.includes('CHEST FREEZER')) return 'CHEST FREEZER';
  if (text.includes('REFRIGERATOR') || text.includes('KULKAS') || text.includes('FRIDGE') || text.includes('FREEZER')) return 'REFRIGERATOR';
  if (text.includes('WATER HEATER') || text.includes('HEATER')) return 'ELECTRIC WATER HEATER';
  if (text.includes('COMMERCIAL AC') || text.includes('CHILLER') || text.includes('COMPRESSOR') || text.includes('SP')) return 'COMMERCIAL AC & SP';
  if (text.includes('AIR CONDITIONING') || text.includes('AIR CONDITIONER') || text.includes('AC ')) return 'AIR CONDITIONING';
  if (text.includes('AIR FRYER') || text.includes('FRYER') || text.includes('FIYER')) return 'AIR FRYER';
  
  // Return the first item or a clean catalog default
  if (uraian && uraian.length > 0) {
    const cleanFirstItem = uraian[0].split(',')[0].split('-')[0].trim().toUpperCase();
    if (cleanFirstItem.length > 3) return cleanFirstItem;
  }
  
  const catalog = ['WASHING MACHINE', 'AIR COOLER', 'REFRIGERATOR', 'CHEST FREEZER', 'COMMERCIAL AC & SP', 'ELECTRIC WATER HEATER', 'AIR CONDITIONING', 'AIR FRYER'];
  const index = Math.abs((uraian || []).join('').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % catalog.length;
  return catalog[index];
};

const getBrand = (uraian: string[]): string => {
  const text = (uraian || []).join(' ').toUpperCase();
  if (text.includes('MIDEA')) return 'MIDEA';
  if (text.includes('TOSHIBA')) return 'TOSHIBA';
  if (text.includes('CARRIER')) return 'CARRIER';
  return 'MIDEA';
};

export default function GenerateTab({ 
  documents, 
  userRole, 
  isSuperUser, 
  onUpdateDocument,
  uploadedRowKeys = [],
  onUploadRows
}: GenerateTabProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('IMPORT');

  useEffect(() => {
    if (userRole === 'DELIVERY_AML' && !isSuperUser) {
      setActiveReport('DELIVERY');
    }
  }, [userRole, isSuperUser]);
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  const [importRows, setImportRows] = useState<SpreadsheetRow[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<SpreadsheetRow[]>([]);
  const [dailyMeiRows, setDailyMeiRows] = useState<SpreadsheetRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [importLimit, setImportLimit] = useState<'15' | 'all'>('15');
  const [copied, setCopied] = useState(false);
  const [editedCell, setEditedCell] = useState<{ rowRef: SpreadsheetRow; columnKey: string } | null>(null);
  const [tempValue, setTempValue] = useState('');

  const [deliveryAllDataMode, setDeliveryAllDataMode] = useState<boolean>(false);
  const [deliveryCurrentPage, setDeliveryCurrentPage] = useState<number>(1);
  const [importCurrentPage, setImportCurrentPage] = useState<number>(1);
  const [dailyMeiCurrentPage, setDailyMeiCurrentPage] = useState<number>(1);
  const [selectedDeliveryRowKeys, setSelectedDeliveryRowKeys] = useState<string[]>([]);

  const getRowKey = (row: SpreadsheetRow) => {
    return `${row.noContainer || ''}_${row.docId || ''}_${row.tglPengiriman || ''}`;
  };

  useEffect(() => {
    setDeliveryCurrentPage(1);
    setImportCurrentPage(1);
    setDailyMeiCurrentPage(1);
  }, [deliveryAllDataMode, searchTerm, selectedDate, activeReport]);

  // Google Sheets Export States
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [authorizedUser, setAuthorizedUser] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Google Sheets Batch Export States
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [batchExportStatus, setBatchExportStatus] = useState<{
    IMPORT?: 'pending' | 'success' | 'error';
    DELIVERY?: 'pending' | 'success' | 'error';
    DAILY_MEI?: 'pending' | 'success' | 'error';
  }>({});
  const [batchUrls, setBatchUrls] = useState<{
    IMPORT?: string;
    DELIVERY?: string;
    DAILY_MEI?: string;
  }>({});

  const [exportedRowKeys, setExportedRowKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('aml_exported_row_keys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [showSuccessExportMsg, setShowSuccessExportMsg] = useState(false);

  // Compile raw uploaded portal data
  const uploadedPortalRows = React.useMemo(() => {
    const rows: any[] = [];
    if (!documents) return rows;
    
    documents.forEach((doc) => {
      doc.containers.forEach((cont) => {
        const rowKey = `${doc.id}_${cont}`;
        if (!uploadedRowKeys.includes(rowKey)) {
          return;
        }

        const info = doc.containers.length > 1 
          ? doc.deliveryInfoMap?.[cont] 
          : doc.deliveryInfo;

        const tglPengiriman = info?.tglPengiriman || (info ? info.scheduledDate : '-');
        const tempatPenimbunan = info?.tempatPenimbunan || info?.vendorDepo || 'TPS Lini 1 Tanjung Priok';
        const lokasiBongkar = info?.lokasiBongkar || info?.warehouseTarget || 'Belum Ditentukan';
        const vendorArmada = info?.vendorArmada || '-';
        const namaSupirArmada = info?.driverName || '-';
        const statusPengirimanContainer = info?.pengiriman || (info ? (info.status === 'Selesai' ? 'Selesai Bongkar' : info.status) : 'Belum Dijadwalkan');
        const suratJalan = info?.suratJalan || (info?.status === 'Selesai' || info?.suratJalanDiterima ? 'Sudah Diterima' : 'Belum Diterima');
        const detailBarang = doc.uraianBarang && doc.uraianBarang.length > 0 ? doc.uraianBarang.join(', ') : '-';
        const remark = info?.remark || '-';

        rows.push({
          key: rowKey,
          docId: doc.id,
          nomorPengajuan: doc.noPengajuan || '-',
          namaImportir: doc.importer || '-',
          nomorContainer: cont,
          tanggalBilling: doc.billingDate || '-',
          tanggalSppb: doc.sppbDate || '-',
          tanggalPengiriman: tglPengiriman,
          tempatPenimbunan,
          lokasiBongkar,
          vendorArmada,
          namaSupirArmada,
          statusPengirimanContainer,
          suratJalan,
          detailBarang,
          remark
        });
      });
    });
    return rows;
  }, [documents, uploadedRowKeys]);

  // Authentication State Subscriber
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsGoogleAuthorized(true);
        setAuthorizedUser(user);
      },
      () => {
        setIsGoogleAuthorized(false);
        setAuthorizedUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAuthorizeGoogle = async () => {
    try {
      setExportError(null);
      const res = await googleSignIn();
      if (res) {
        setIsGoogleAuthorized(true);
        setAuthorizedUser(res.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err && (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request'))) {
        console.warn('Popup request cancelled or another popup was opened.');
        return;
      }
      if (err && (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user'))) {
        setExportError('Otorisasi dibatalkan karena jendela popup ditutup.');
        return;
      }
      if (err && (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked'))) {
        setExportError('Jendela popup diblokir oleh browser. Silakan aktifkan popup untuk situs ini.');
        return;
      }
      setExportError('Otorisasi Google gagal. Mohon pilih akun dhimas.agungmakmur@gmail.com.');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await logoutGoogle();
      setIsGoogleAuthorized(false);
      setAuthorizedUser(null);
      setExportSuccessUrl(null);
    } catch (err) {
      console.error(err);
    }
  };

  const exportSingleReport = async (reportType: 'IMPORT' | 'DELIVERY' | 'DAILY_MEI', token: string) => {
    const reportTitle = reportType === 'IMPORT'
      ? "Data Import and Export"
      : reportType === 'DELIVERY'
        ? "Data Delivery Plan"
        : "Data Daily Report PT MEI";
    let spreadsheetId = '';

    // 1. Search for existing spreadsheet by name reportTitle
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name = '${reportTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
      )}&fields=files(id,name)`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        spreadsheetId = searchData.files[0].id;
      }
    }

    // 2. If it does not exist, create it
    if (!spreadsheetId) {
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: reportTitle,
          mimeType: 'application/vnd.google-apps.spreadsheet'
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Google Drive API error (${reportTitle}): ${errorText}`);
      }

      const fileData = await createResponse.json();
      spreadsheetId = fileData.id;
    }

    // Determine dedicated tab name based on active report
    const tabNameMap = {
      IMPORT: 'Data Import',
      DELIVERY: 'Data Delivery',
      DAILY_MEI: 'Daily Report MEI'
    };
    const tabName = tabNameMap[reportType];

    // Check if this sheet tab exists inside the spreadsheet
    let sheetExists = false;
    try {
      const sheetsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (sheetsRes.ok) {
        const sheetsData = await sheetsRes.json();
        const existingSheets = sheetsData.sheets || [];
        sheetExists = existingSheets.some(
          (s: any) => s.properties?.title === tabName
        );
      }
    } catch (metaErr) {
      console.error('Error fetching sheets metadata:', metaErr);
    }

    // Create sheet tab if it does not already exist
    if (!sheetExists) {
      const addSheetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabName
                  }
                }
              }
            ]
          })
        }
      );
      if (!addSheetRes.ok) {
        console.warn('Failed to automatically create sheet tab, continuing anyway.');
      }
    }

    // 3. Get existing spreadsheet values
    let existingValues: string[][] = [];
    try {
      const getValuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A:Z')}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (getValuesRes.ok) {
        const getValuesData = await getValuesRes.json();
        existingValues = getValuesData.values || [];
      }
    } catch (getErr) {
      console.error('Error fetching sheet values:', getErr);
    }

    // Determine rows to write
    let payloadRows = reportType === 'IMPORT' 
      ? importRows 
      : reportType === 'DELIVERY' 
        ? deliveryRows 
        : dailyMeiRows;

    const activeCols = columns[reportType];
    const headers = activeCols.map(c => c.label);

    if (existingValues.length > 0) {
      // Find container column in existing values to avoid duplication
      const headerRow = existingValues[0];
      const containerColIdx = headerRow.findIndex(h => {
        const hLower = String(h || '').trim().toLowerCase();
        return hLower.includes('container') || hLower.includes('no cont') || hLower.includes('cont');
      });

      let newDisplayRows = payloadRows;
      if (containerColIdx !== -1) {
        const existingContainers = new Set(
          existingValues.slice(1).map(row => 
            String(row[containerColIdx] || '').trim().toUpperCase()
          )
        );
        newDisplayRows = payloadRows.filter(row => {
          const rawCont = row.noContainer || row.noCont || '';
          const contClean = String(rawCont).trim().toUpperCase();
          return !existingContainers.has(contClean);
        });
      }

      // Only append if there are genuinely new rows
      if (newDisplayRows.length > 0) {
        let nextNoUrut = existingValues.length;
        const dataRowsToAppend = newDisplayRows.map((row, idx) => {
          return activeCols.map(col => {
            if (col.key === 'noUrut' || col.key === 'no') {
              return String(nextNoUrut + idx);
            }
            return String(row[col.key] || '');
          });
        });

        const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: dataRowsToAppend })
          }
        );

        if (!appendResponse.ok) {
          const errorText = await appendResponse.text();
          throw new Error(`Google Sheets Append error (${reportTitle}): ${errorText}`);
        }
      }
    } else {
      // If sheet has no content, write headers and all rows
      const dataRows = payloadRows.map(row => 
        activeCols.map(col => String(row[col.key] || ''))
      );
      const values = [headers, ...dataRows];

      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Google Sheets Write error (${reportTitle}): ${errorText}`);
      }
    }

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  };

  const handleExportAllToGoogleSheets = async () => {
    if (!isGoogleAuthorized) {
      await handleAuthorizeGoogle();
      return;
    }

    setIsExportingAll(true);
    setExportError(null);
    setBatchExportStatus({ IMPORT: 'pending', DAILY_MEI: 'pending' });

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Akses token tidak tersedia. Silakan hubungkan kembali.');
      }

      // 1. Export Import & Export
      let urlImport = '';
      try {
        urlImport = await exportSingleReport('IMPORT', token);
        setBatchExportStatus(prev => ({ ...prev, IMPORT: 'success' }));
        setBatchUrls(prev => ({ ...prev, IMPORT: urlImport }));
      } catch (e: any) {
        setBatchExportStatus(prev => ({ ...prev, IMPORT: 'error' }));
        console.error(e);
      }

      // 2. Export Daily Report PT MEI
      let urlMei = '';
      try {
        urlMei = await exportSingleReport('DAILY_MEI', token);
        setBatchExportStatus(prev => ({ ...prev, DAILY_MEI: 'success' }));
        setBatchUrls(prev => ({ ...prev, DAILY_MEI: urlMei }));
      } catch (e: any) {
        setBatchExportStatus(prev => ({ ...prev, DAILY_MEI: 'error' }));
        console.error(e);
      }

      setExportSuccessUrl(urlImport || urlMei);

      // Save current uploadedRowKeys as exportedRowKeys
      const currentKeys = [...uploadedRowKeys];
      setExportedRowKeys(currentKeys);
      localStorage.setItem('aml_exported_row_keys', JSON.stringify(currentKeys));

      // Clear the uploadedRowKeys in state and localStorage so the table becomes empty
      onUploadRows?.([]);
      setShowSuccessExportMsg(true);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'Gagal mengekspor data ke Google Sheets.');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleExportToGoogleSheets = async () => {
    if (!isGoogleAuthorized) {
      await handleAuthorizeGoogle();
      return;
    }

    setIsExporting(true);
    setExportSuccessUrl(null);
    setExportError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Akses token tidak tersedia. Silakan hubungkan kembali.');
      }

      const reportTitle = activeReport === 'IMPORT'
        ? "Data Import and Export"
        : activeReport === 'DELIVERY'
          ? "Data Delivery Plan"
          : "Data Daily Report PT MEI";
      let spreadsheetId = '';

      // 1. Search for existing spreadsheet by name reportTitle
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name = '${reportTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
        )}&fields=files(id,name)`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
          spreadsheetId = searchData.files[0].id;
        }
      }

      // 2. If it does not exist, create it
      if (!spreadsheetId) {
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: reportTitle,
            mimeType: 'application/vnd.google-apps.spreadsheet'
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Google Drive API error: ${errorText}`);
        }

        const fileData = await createResponse.json();
        spreadsheetId = fileData.id;
      }

      // Determine dedicated tab name based on active report
      const tabNameMap = {
        IMPORT: 'Data Import',
        DELIVERY: 'Data Delivery',
        DAILY_MEI: 'Daily Report MEI'
      };
      const tabName = tabNameMap[activeReport];

      // Check if this sheet tab exists inside the spreadsheet
      let sheetExists = false;
      try {
        const sheetsRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (sheetsRes.ok) {
          const sheetsData = await sheetsRes.json();
          const existingSheets = sheetsData.sheets || [];
          sheetExists = existingSheets.some(
            (s: any) => s.properties?.title === tabName
          );
        }
      } catch (metaErr) {
        console.error('Error fetching sheets metadata:', metaErr);
      }

      // Create sheet tab if it does not already exist
      if (!sheetExists) {
        const addSheetRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: tabName
                    }
                  }
                }
              ]
            })
          }
        );
        if (!addSheetRes.ok) {
          console.warn('Failed to automatically create sheet tab, continuing anyway.');
        }
      }

      // 3. Get existing spreadsheet values to do direct comparison and avoid duplicates
      let existingValues: string[][] = [];
      try {
        const getValuesRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A:Z')}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (getValuesRes.ok) {
          const getValuesData = await getValuesRes.json();
          existingValues = getValuesData.values || [];
        }
      } catch (getErr) {
        console.error('Error fetching sheet values:', getErr);
      }

      let payloadRows = displayRows;
      if (activeReport === 'DELIVERY') {
        payloadRows = displayRows.filter(row => selectedDeliveryRowKeys.includes(getRowKey(row)));
        if (payloadRows.length === 0) {
          throw new Error('Gagal mengekspor: Silakan pilih/centang terlebih dahulu baris data yang ingin diekspor pada kolom kiri table.');
        }
      }

      const activeCols = columns[activeReport];
      const headers = activeCols.map(c => c.label);

      if (existingValues.length > 0) {
        // Find container column in existing values to avoid duplication
        const headerRow = existingValues[0];
        const containerColIdx = headerRow.findIndex(h => 
          String(h || '').trim().toLowerCase().includes('container')
        );

        let newDisplayRows = payloadRows;
        if (containerColIdx !== -1) {
          const existingContainers = new Set(
            existingValues.slice(1).map(row => 
              String(row[containerColIdx] || '').trim().toUpperCase()
            )
          );
          newDisplayRows = payloadRows.filter(row => {
            const contClean = String(row.noContainer || '').trim().toUpperCase();
            return !existingContainers.has(contClean);
          });
        }

        // Only append if there are genuinely new rows
        if (newDisplayRows.length > 0) {
          // Add rows starting with correct custom serial noUrut
          let nextNoUrut = existingValues.length; // 1 header + current rows count
          const dataRowsToAppend = newDisplayRows.map((row, idx) => {
            return activeCols.map(col => {
              if (col.key === 'noUrut' || col.key === 'no') {
                return String(nextNoUrut + idx);
              }
              return String(row[col.key] || '');
            });
          });

          const appendResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: dataRowsToAppend })
            }
          );

          if (!appendResponse.ok) {
            const errorText = await appendResponse.text();
            throw new Error(`Google Sheets Append error: ${errorText}`);
          }
        }
      } else {
        // If sheet has no content, write headers and all rows
        const dataRows = payloadRows.map(row => 
          activeCols.map(col => String(row[col.key] || ''))
        );
        const values = [headers, ...dataRows];

        // Update values in range TabName!A1
        const updateResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A1')}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Google Sheets Write error: ${errorText}`);
        }
      }

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      setExportSuccessUrl(sheetUrl);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'Gagal mengekspor data ke Google Sheets.');
    } finally {
      setIsExporting(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshFromSpreadsheet = async (silent = false) => {
    if (!isGoogleAuthorized) {
      if (!silent) {
        await handleAuthorizeGoogle();
      }
      return;
    }
    if (!silent) setIsRefreshing(true);
    setExportError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        if (!silent) throw new Error('Akses token tidak tersedia. Silakan hubungkan kembali.');
        return;
      }

      // Determine report title
      const reportTitle = activeReport === 'IMPORT'
        ? "Data Import and Export"
        : activeReport === 'DELIVERY'
          ? "Data Delivery Plan"
          : "Data Daily Report PT MEI";

      // 1. Search for existing spreadsheet by name reportTitle
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name = '${reportTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
        )}&fields=files(id,name)`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Gagal mencari Google Spreadsheet "${reportTitle}".`);
      }

      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        const spreadsheetId = searchData.files[0].id;
        
        // Determine dedicated tab name based on active report
        const tabNameMap = {
          IMPORT: 'Data Import',
          DELIVERY: 'Data Delivery',
          DAILY_MEI: 'Daily Report MEI'
        };
        const tabName = tabNameMap[activeReport];

        // Fetch values
        const getValuesRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName + '!A:Z')}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (getValuesRes.ok) {
          const getValuesData = await getValuesRes.json();
          const existingValues: string[][] = getValuesData.values || [];

          if (existingValues.length > 1) {
            const activeCols = columns[activeReport];
            const headerRow = existingValues[0] || [];
            
            // Map columns by matching header cells case insensitively
            const colIndices = activeCols.map(col => {
              const idx = headerRow.findIndex(h => 
                String(h || '').trim().toLowerCase() === col.label.trim().toLowerCase()
              );
              return { key: col.key, idx };
            });

            const fetchedRows: SpreadsheetRow[] = existingValues.slice(1).map((sheetRow) => {
              const rowObj: SpreadsheetRow = {};
              colIndices.forEach(({ key, idx }) => {
                if (idx !== -1) {
                  rowObj[key] = String(sheetRow[idx] || '');
                } else {
                  rowObj[key] = '';
                }
              });
              // Ensure critical fields are set
              if (!rowObj.docId) {
                rowObj.docId = rowObj.noPengajuanLast4 || rowObj.noBl || 'sheet_row';
              }
              if (!rowObj.createdAt) {
                rowObj.createdAt = '';
              }
              return rowObj;
            });

             // Set state
            if (activeReport === 'IMPORT') {
              setImportRows(fetchedRows);
            } else if (activeReport === 'DELIVERY') {
              setDeliveryRows(fetchedRows);
            } else {
              setDailyMeiRows(fetchedRows);
            }

            // Sync retrieved rows back into database documents
            if (onUpdateDocument) {
              fetchedRows.forEach(row => {
                const doc = documents.find(d => 
                  String(d.noPengajuan || d.id) === String(row.docId) ||
                  (row.noPengajuanLast4 && d.noPengajuan && d.noPengajuan.slice(-4) === row.noPengajuanLast4)
                );

                if (doc) {
                  const cont = doc.containers.find(c => getContainerDisplay(c) === row.noContainer) || doc.containers[0];
                  const currentInfo = (doc.containers.length > 1 
                    ? doc.deliveryInfoMap?.[cont] 
                    : doc.deliveryInfo) || {
                      driverName: '',
                      driverPhone: '',
                      plateNumber: '',
                      warehouseTarget: '',
                      scheduledDate: '',
                      status: 'Belum Dikirim',
                      deliveryNoteNumber: '',
                      suratJalanDiterima: false
                    };

                  const updatedInfo: any = { ...currentInfo };
                  const docUpdates: Partial<PIBDocument> = {};

                  if (activeReport === 'IMPORT') {
                    if (row.namaImportir) docUpdates.importer = row.namaImportir;
                    if (row.statusPib) docUpdates.status = row.statusPib as any;
                    if (row.pengirimanSementara) {
                      updatedInfo.pengirimanSementara = row.pengirimanSementara;
                      updatedInfo.warehouseTarget = row.pengirimanSementara;
                    }
                    if (row.tglMasukDepo) {
                      updatedInfo.tglMasukDepo = row.tglMasukDepo;
                      updatedInfo.scheduledDate = row.tglMasukDepo;
                    }
                    if (row.vendorDepo) {
                      updatedInfo.vendorDepo = row.vendorDepo;
                      updatedInfo.driverName = row.vendorDepo;
                    }
                    if (row.pengirimanFinal) {
                      updatedInfo.pengirimanFinal = row.pengirimanFinal;
                      if (row.pengirimanFinal !== '-') {
                        updatedInfo.status = 'Selesai';
                      }
                    }
                    if (row.tglPengirimanFinal) {
                      updatedInfo.tglPengirimanFinal = row.tglPengirimanFinal;
                      updatedInfo.scheduledDate = row.tglPengirimanFinal;
                    }
                    if (row.vendorPengirimanFinal) {
                      updatedInfo.vendorPengirimanFinal = row.vendorPengirimanFinal;
                      if (row.vendorPengirimanFinal.includes('(')) {
                        const parts = row.vendorPengirimanFinal.split('(');
                        updatedInfo.driverName = parts[0].trim();
                        updatedInfo.plateNumber = parts[1].replace(')', '').trim();
                      } else {
                        updatedInfo.driverName = row.vendorPengirimanFinal;
                      }
                    }
                    if (row.realRemark || row.remark) {
                      updatedInfo.remark = row.realRemark || row.remark;
                    }
                  } else if (activeReport === 'DELIVERY') {
                    if (row.tglPengiriman) {
                      updatedInfo.tglPengiriman = row.tglPengiriman;
                      updatedInfo.scheduledDate = row.tglPengiriman;
                    }
                    if (row.lokasiBongkar) {
                      updatedInfo.lokasiBongkar = row.lokasiBongkar;
                      updatedInfo.warehouseTarget = row.lokasiBongkar;
                    }
                    if (row.statusPengirimanContainer) {
                      updatedInfo.pengiriman = row.statusPengirimanContainer;
                      updatedInfo.status = (row.statusPengirimanContainer === 'Selesai Bongkar' || row.statusPengirimanContainer === 'Selesai') ? 'Selesai' : row.statusPengirimanContainer as any;
                    }
                    if (row.namaSupirArmada) {
                      updatedInfo.driverName = row.namaSupirArmada;
                    }
                    if (row.vendorArmada) {
                      updatedInfo.vendorArmada = row.vendorArmada;
                    }
                    if (row.suratJalan) {
                      updatedInfo.suratJalan = row.suratJalan;
                      updatedInfo.suratJalanDiterima = row.suratJalan.toLowerCase().includes('sudah');
                    }
                    if (row.remark) {
                      updatedInfo.remark = row.remark;
                    }
                  } else if (activeReport === 'DAILY_MEI') {
                    if (row.tglKeluarMasuk) {
                      updatedInfo.tglKeluarMasuk = row.tglKeluarMasuk;
                      updatedInfo.scheduledDate = row.tglKeluarMasuk;
                    }
                    if (row.driverPlat) {
                      updatedInfo.driverPlat = row.driverPlat;
                      if (row.driverPlat.includes('-')) {
                        const parts = row.driverPlat.split('-');
                        updatedInfo.driverName = parts[0].trim();
                        updatedInfo.plateNumber = parts[1].trim();
                      } else {
                        updatedInfo.driverName = row.driverPlat;
                      }
                    }
                    if (row.statusPengiriman) {
                      updatedInfo.status = row.statusPengiriman as any;
                    }
                    if (row.suratJalan) {
                      updatedInfo.suratJalan = row.suratJalan;
                      updatedInfo.suratJalanDiterima = row.suratJalan.toLowerCase().includes('sudah');
                    }
                    if (row.remark) {
                      updatedInfo.remark = row.remark;
                    }
                  }

                  if (doc.containers.length > 1) {
                    docUpdates.deliveryInfoMap = {
                      ...(doc.deliveryInfoMap || {}),
                      [cont]: updatedInfo
                    };
                    if (doc.containers[0] === cont) {
                      docUpdates.deliveryInfo = updatedInfo;
                    }
                  } else {
                    docUpdates.deliveryInfo = updatedInfo;
                    docUpdates.deliveryInfoMap = {
                      ...(doc.deliveryInfoMap || {}),
                      [cont]: updatedInfo
                    };
                    docUpdates.deliveryPlanned = true;
                  }

                  onUpdateDocument(doc.id, docUpdates);
                }
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error refreshing from spreadsheet:', err);
      if (!silent) {
        setExportError(`Error Sinkronisasi: ${err.message || err}`);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Auto Refresh data when login or activeReport changes
  useEffect(() => {
    if (isGoogleAuthorized) {
      handleRefreshFromSpreadsheet(true);
    }
  }, [isGoogleAuthorized, activeReport]);

  // Define columns based on active report
  const columns = {
    IMPORT: [
      { key: 'noUrut', label: 'Nomor Urut' },
      { key: 'noPengajuanLast4', label: 'No AJU' },
      { key: 'noContainer', label: 'Nomor Container' },
      { key: 'namaImportir', label: 'Nama Importir' },
      { key: 'statusPib', label: 'Status/Respon PIB' },
      { key: 'pengirimanSementara', label: 'Pengiriman Sementara' },
      { key: 'tglMasukDepo', label: 'Tanggal Masuk Depo Penitipan' },
      { key: 'vendorDepo', label: 'Vendor Depo Penitipan' },
      { key: 'pengirimanFinal', label: 'Pengiriman Final' },
      { key: 'tglPengirimanFinal', label: 'Tanggal Pengiriman Final' },
      { key: 'vendorPengirimanFinal', label: 'Vendor Pengiriman Final' },
      { key: 'suratJalan', label: 'Surat Jalan (sudah/belum)' },
      { key: 'remark', label: 'Detail barang' },
      { key: 'realRemark', label: 'Remark' }
    ],
    DELIVERY: [
      { key: 'noUrut', label: 'No' },
      { key: 'tglPengiriman', label: 'Tanggal Pengiriman' },
      { key: 'noContainer', label: 'Nomor Container' },
      { key: 'namaImportir', label: 'Nama Importir' },
      { key: 'tempatPenimbunan', label: 'Tempat Penimbunan' },
      { key: 'lokasiBongkar', label: 'Lokasi Bongkar' },
      { key: 'vendorArmada', label: 'Nama Vendor Armada' },
      { key: 'namaSupirArmada', label: 'Nama Supir Armada' },
      { key: 'statusPengirimanContainer', label: 'Status Pengiriman Container' },
      { key: 'suratJalan', label: 'Surat Jalan' },
      { key: 'remark', label: 'Remark' }
    ],
    DAILY_MEI: [
      { key: 'noUrut', label: 'No' },
      { key: 'invPlNo', label: 'INV/PL No.' },
      { key: 'shipperName', label: 'SHIPPER/EXPORTER NAME' },
      { key: 'poNo', label: 'PO. No.' },
      { key: 'blNo', label: 'BL No.' },
      { key: 'product', label: 'PRODUCT' },
      { key: 'brand', label: 'BRAND' },
      { key: 'noCont', label: 'NO CONT' },
      { key: 'qty', label: 'QTY' },
      { key: 'model', label: 'MODEL' },
      { key: 'fortyHc', label: '40 HC' },
      { key: 'twentyFt', label: '20 FT' },
      { key: 'shippingCompany', label: 'SHIPPING COMPANY' },
      { key: 'vesselName', label: 'VESSEL NAME' },
      { key: 'etd', label: 'ETD' },
      { key: 'etaPort', label: 'ETA PORT' },
      { key: 'cargoLocation', label: 'CARGO LOCATION' },
      { key: 'pol', label: 'POL' },
      { key: 'pod', label: 'POD' },
      { key: 'currency', label: 'CURRENCY' }
    ]
  };

  // Helper mock generation to ensure PT MEI / Daily reports are never blank or empty
  const getMeiDefaultRows = (): SpreadsheetRow[] => {
    return [
      {
        noUrut: '1',
        invPlNo: 'INV/MIE/7781912/2026',
        shipperName: 'GD MIDEA AIR-CONDITIONING EQUIPMENT CO., LTD.',
        poNo: '-',
        blNo: 'MEDUM99212001',
        product: 'AIR CONDITIONING',
        brand: 'MIDEA',
        noCont: 'MSKU4988120',
        qty: '-',
        model: '-',
        fortyHc: '1',
        twentyFt: '',
        shippingCompany: '-',
        vesselName: 'KOTA RATNA V.0182N',
        etd: '-',
        etaPort: '2026-05-18',
        cargoLocation: 'UTC3',
        pol: 'SHANGHAI, CN',
        pod: 'TANJUNG PRIOK, ID',
        currency: 'USD',
        docId: 'mock-1'
      },
      {
        noUrut: '2',
        invPlNo: 'INV/MIE/3381901/2026',
        shipperName: 'MIDEA CONSUMER ELECTRIC CO., LTD.',
        poNo: '-',
        blNo: 'HLXJKT99018A',
        product: 'REFRIGERATOR',
        brand: 'MIDEA',
        noCont: 'HLXU8821932',
        qty: '-',
        model: '-',
        fortyHc: '',
        twentyFt: '1',
        shippingCompany: '-',
        vesselName: 'COSCO SINGAPORE V.142S',
        etd: '-',
        etaPort: '2026-05-19',
        cargoLocation: 'UTC3',
        pol: 'GUANGZHOU, CN',
        pod: 'TANJUNG PRIOK, ID',
        currency: 'USD',
        docId: 'mock-2'
      }
    ];
  };

  // Regenerate/compile the data rows on documents changes
  useEffect(() => {
    if (!documents) return;

    // 1. Compile IMPORT
    const rawImport: SpreadsheetRow[] = [];
    let importCounter = 1;
    const importKeys = exportedRowKeys.length > 0 ? exportedRowKeys : uploadedRowKeys;
    documents.forEach((doc) => {
      const docId = doc.noPengajuan || doc.id;
      doc.containers.forEach((cont) => {
        if (!importKeys.includes(`${doc.id}_${cont}`)) {
          return;
        }
        const info = doc.containers.length > 1 
          ? doc.deliveryInfoMap?.[cont] 
          : doc.deliveryInfo;

        const tempDelivery = info?.pengirimanSementara || (info ? (info.warehouseTarget ? info.warehouseTarget : '-') : '-');
        const tglMasukDepo = info?.tglMasukDepo || (info ? info.scheduledDate : '-');
        const vendorDepo = info?.vendorDepo || (info ? (info.driverName ? info.driverName : '-') : '-');
        const pengirimanFinal = info?.pengirimanFinal || (info?.status === 'Selesai' ? 'Lokal Gudang' : '-');
        const tglPengirimanFinal = info?.tglPengirimanFinal || (info?.status === 'Selesai' ? info.scheduledDate : '-');
        const vendorPengirimanFinal = info?.vendorPengirimanFinal || (info?.status === 'Selesai' ? `${info.driverName} (${info.plateNumber})` : '-');
        const suratJalan = info?.status === 'Selesai' ? 'Sudah Diterima' : 'Belum Diterima';

        rawImport.push({
          noUrut: String(importCounter++),
          noPengajuanLast4: doc.noPengajuan ? doc.noPengajuan.slice(-4) : '-',
          noContainer: getContainerDisplay(cont),
          namaImportir: doc.importer,
          statusPib: doc.status,
          pengirimanSementara: tempDelivery,
          tglMasukDepo,
          vendorDepo,
          pengirimanFinal,
          tglPengirimanFinal,
          vendorPengirimanFinal,
          suratJalan,
          remark: doc.uraianBarang.join(', ') || 'No special remarks',
          realRemark: info?.remark || '',
          docId: String(docId),
          createdAt: doc.createdAt || ''
        });
      });
    });

    rawImport.sort((a, b) => {
      const dateA = String(a.createdAt || '');
      const dateB = String(b.createdAt || '');
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return String(b.docId || '').localeCompare(String(a.docId || ''));
    });
    setImportRows(rawImport);

    // 2. Compile DELIVERY
    const rawDelivery: SpreadsheetRow[] = [];
    let deliveryCounter = 1;
    documents.forEach((doc) => {
      const docId = doc.noPengajuan || doc.id;
      doc.containers.forEach((cont) => {
        const info = doc.containers.length > 1 
          ? doc.deliveryInfoMap?.[cont] 
          : doc.deliveryInfo;

        if (doc.status === 'SPPB' || info) {
          const tglPengiriman = info?.tglPengiriman || (info ? info.scheduledDate : new Date().toISOString().split('T')[0]);
          const lokasiBongkar = info?.lokasiBongkar || info?.warehouseTarget || (info ? info.warehouseTarget : 'Belum Ditentukan');
          const statusPengirimanContainer = info?.pengiriman || (info ? (info.status === 'Selesai' ? 'Selesai Bongkar' : info.status) : 'Belum Dijadwalkan');
          const namaSupirArmada = info?.driverName || '-';
          const suratJalan = info?.suratJalan || (info?.status === 'Selesai' || info?.suratJalanDiterima ? 'Sudah Diterima' : 'Belum Diterima');
          const remark = info?.remark || (info ? `No SJ: ${info.deliveryNoteNumber}` : '-');

          rawDelivery.push({
            noUrut: String(deliveryCounter++),
            tglPengiriman,
            noContainer: getContainerDisplay(cont),
            namaImportir: doc.importer,
            tempatPenimbunan: 'TPS Lini 1 Tanjung Priok',
            lokasiBongkar,
            vendorArmada: info?.vendorArmada || '-',
            namaSupirArmada,
            statusPengirimanContainer,
            suratJalan,
            remark,
            docId: String(docId),
            createdAt: doc.createdAt || ''
          });
        }
      });
    });

    rawDelivery.sort((a, b) => {
      const dateA = String(a.createdAt || '');
      const dateB = String(b.createdAt || '');
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return String(b.docId || '').localeCompare(String(a.docId || ''));
    });
    setDeliveryRows(rawDelivery);

    // 3. Compile DAILY_MEI
    const rawDailyMei: SpreadsheetRow[] = [];
    let meiCounter = 1;
    const meiKeys = exportedRowKeys.length > 0 ? exportedRowKeys : uploadedRowKeys;
    const meiDocs = documents.filter(doc => {
      const importerUpper = (doc.importer || '').trim().toUpperCase();
      return importerUpper === 'PT. MIDEA ELECTRONICS INDONESIA' || importerUpper === 'PT MIDEA ELECTRONICS INDONESIA';
    });

    if (meiDocs.length > 0) {
      meiDocs.forEach((doc) => {
        const docId = doc.noPengajuan || doc.id;
        doc.containers.forEach((cont) => {
          if (!meiKeys.includes(`${doc.id}_${cont}`)) {
            return;
          }
          const info = doc.containers.length > 1 
            ? doc.deliveryInfoMap?.[cont] 
            : doc.deliveryInfo;

          const contDisplay = getContainerDisplay(cont);
          const noCont = contDisplay.split(' ')[0] || cont;
          const is40 = contDisplay.toLowerCase().includes('40');
          const is20 = contDisplay.toLowerCase().includes('20');

          const tglKeluarMasuk = info?.tglKeluarMasuk || (info ? info.scheduledDate : doc.blDate || new Date().toISOString().split('T')[0]);
          const invPlNo = doc.invPlNo || ("INV/MIE/" + doc.noPengajuan.replace(/[^0-9]/g, '').slice(-6) + "/2026");
          const shipperName = doc.shipperName || "GD MIDEA AIR-CONDITIONING EQUIPMENT CO., LTD.";
          const product = getProductSummary(doc.uraianBarang);
          const brand = getBrand(doc.uraianBarang);
          const vesselName = doc.vesselName || "KOTA RATNA V.0182N";
          const etaPort = doc.etaPort || doc.blDate || tglKeluarMasuk;
          const cargoLocation = doc.cargoLocation || (info?.tempatPenimbunan || "UTC3");
          const pol = doc.pol || "SHANGHAI, CN";
          const pod = doc.pod || "TANJUNG PRIOK, ID";
          const currency = doc.currency || "USD";

          rawDailyMei.push({
            noUrut: String(meiCounter++),
            invPlNo,
            shipperName,
            poNo: '-',
            blNo: doc.blNumber,
            product,
            brand,
            noCont,
            qty: '-',
            model: '-',
            fortyHc: is40 ? '1' : '',
            twentyFt: is20 ? '1' : '',
            shippingCompany: '-',
            vesselName,
            etd: '-',
            etaPort,
            cargoLocation,
            pol,
            pod,
            currency,
            docId: String(docId),
            createdAt: doc.createdAt || ''
          });
        });
      });

      rawDailyMei.sort((a, b) => {
        const dateA = String(a.createdAt || '');
        const dateB = String(b.createdAt || '');
        if (dateA && dateB) return dateB.localeCompare(dateA);
        return String(b.docId || '').localeCompare(String(a.docId || ''));
      });
      setDailyMeiRows(rawDailyMei);
    } else {
      setDailyMeiRows(getMeiDefaultRows());
    }
  }, [documents, uploadedRowKeys, exportedRowKeys]);

  const currentRows = activeReport === 'IMPORT' 
    ? importRows 
    : activeReport === 'DELIVERY' 
      ? deliveryRows 
      : dailyMeiRows;

  // Handle cell edit save
  const handleCellBlur = () => {
    if (editedCell) {
      const { rowRef, columnKey } = editedCell;
      if (activeReport === 'IMPORT') {
        const masterIdx = importRows.indexOf(rowRef);
        if (masterIdx !== -1) {
          const updated = [...importRows];
          updated[masterIdx] = { ...updated[masterIdx], [columnKey]: tempValue };
          setImportRows(updated);
        }
      } else if (activeReport === 'DELIVERY') {
        const masterIdx = deliveryRows.indexOf(rowRef);
        if (masterIdx !== -1) {
          const updated = [...deliveryRows];
          updated[masterIdx] = { ...updated[masterIdx], [columnKey]: tempValue };
          setDeliveryRows(updated);
        }
      } else {
        const masterIdx = dailyMeiRows.indexOf(rowRef);
        if (masterIdx !== -1) {
          const updated = [...dailyMeiRows];
          updated[masterIdx] = { ...updated[masterIdx], [columnKey]: tempValue };
          setDailyMeiRows(updated);
        }
      }

      // Propagate update directly into matching database documents
      const doc = documents.find(d => String(d.noPengajuan || d.id) === String(rowRef.docId));
      if (doc && onUpdateDocument) {
        // Find which container matches rowRef.noContainer
        const cont = doc.containers.find(c => getContainerDisplay(c) === rowRef.noContainer) || doc.containers[0];
        
        // Get current DeliveryInfo
        const currentInfo = (doc.containers.length > 1 
          ? doc.deliveryInfoMap?.[cont] 
          : doc.deliveryInfo) || {
            driverName: '',
            driverPhone: '',
            plateNumber: '',
            warehouseTarget: '',
            scheduledDate: '',
            status: 'Belum Dikirim',
            deliveryNoteNumber: '',
            suratJalanDiterima: false
          };

        const updatedInfo: any = { ...currentInfo };
        const docUpdates: Partial<PIBDocument> = {};

        // Update correct property on updatedInfo based on columnKey
        if (columnKey === 'namaImportir') {
          docUpdates.importer = tempValue;
        } else if (columnKey === 'statusPib' || columnKey === 'statusBc') {
          docUpdates.status = tempValue as any;
        } else if (columnKey === 'pengirimanSementara') {
          updatedInfo.pengirimanSementara = tempValue;
          updatedInfo.warehouseTarget = tempValue;
        } else if (columnKey === 'tglMasukDepo') {
          updatedInfo.tglMasukDepo = tempValue;
          updatedInfo.scheduledDate = tempValue;
        } else if (columnKey === 'vendorDepo') {
          updatedInfo.vendorDepo = tempValue;
          updatedInfo.driverName = tempValue;
        } else if (columnKey === 'pengirimanFinal') {
          updatedInfo.pengirimanFinal = tempValue;
          if (tempValue && tempValue !== '-') {
            updatedInfo.status = 'Selesai';
          }
        } else if (columnKey === 'tglPengirimanFinal') {
          updatedInfo.tglPengirimanFinal = tempValue;
          updatedInfo.scheduledDate = tempValue;
        } else if (columnKey === 'vendorPengirimanFinal') {
          updatedInfo.vendorPengirimanFinal = tempValue;
          if (tempValue.includes('(')) {
            const parts = tempValue.split('(');
            updatedInfo.driverName = parts[0].trim();
            updatedInfo.plateNumber = parts[1].replace(')', '').trim();
          } else {
            updatedInfo.driverName = tempValue;
          }
        } else if (columnKey === 'tglPengiriman' || columnKey === 'tglKeluarMasuk') {
          updatedInfo.tglPengiriman = tempValue;
          updatedInfo.tglKeluarMasuk = tempValue;
          updatedInfo.scheduledDate = tempValue;
        } else if (columnKey === 'lokasiBongkar') {
          updatedInfo.lokasiBongkar = tempValue;
          updatedInfo.warehouseTarget = tempValue;
        } else if (columnKey === 'namaSupirArmada') {
          updatedInfo.driverName = tempValue;
        } else if (columnKey === 'statusPengirimanContainer') {
          updatedInfo.pengiriman = tempValue;
          updatedInfo.status = (tempValue === 'Selesai Bongkar' || tempValue === 'Selesai') ? 'Selesai' : tempValue as any;
        } else if (columnKey === 'pengiriman' || columnKey === 'statusPengiriman') {
          updatedInfo.pengiriman = tempValue;
          updatedInfo.status = (tempValue === 'Selesai Bongkar' || tempValue === 'Selesai') ? 'Selesai' : tempValue as any;
        } else if (columnKey === 'vendorArmada') {
          updatedInfo.vendorArmada = tempValue;
        } else if (columnKey === 'vendorPengiriman') {
          updatedInfo.vendorPengiriman = tempValue;
          if (tempValue.includes('(')) {
            const parts = tempValue.split('(');
            updatedInfo.driverName = parts[0].trim();
          } else {
            updatedInfo.driverName = tempValue;
          }
        } else if (columnKey === 'driverPlat') {
          updatedInfo.driverPlat = tempValue;
          if (tempValue.includes('-')) {
            const parts = tempValue.split('-');
            updatedInfo.driverName = parts[0].trim();
            updatedInfo.plateNumber = parts[1].trim();
          } else {
            updatedInfo.driverName = tempValue;
          }
        } else if (columnKey === 'suratJalan') {
          updatedInfo.suratJalan = tempValue;
          updatedInfo.suratJalanDiterima = tempValue.toLowerCase().includes('sudah');
        } else if (columnKey === 'remark' || columnKey === 'realRemark') {
          updatedInfo.remark = tempValue;
        }

        // Apply back to document updates
        if (doc.containers.length > 1) {
          docUpdates.deliveryInfoMap = {
            ...(doc.deliveryInfoMap || {}),
            [cont]: updatedInfo
          };
          if (doc.containers[0] === cont) {
            docUpdates.deliveryInfo = updatedInfo;
          }
        } else {
          docUpdates.deliveryInfo = updatedInfo;
          docUpdates.deliveryInfoMap = {
            ...(doc.deliveryInfoMap || {}),
            [cont]: updatedInfo
          };
          docUpdates.deliveryPlanned = true;
        }

        onUpdateDocument(doc.id, docUpdates);
      }

      setEditedCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditedCell(null);
    }
  };

  // Filter rows based on search term & selectedDate
  const filteredRows = currentRows.filter(row => {
    // 1. Search term check
    const matchesSearch = Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchesSearch) return false;

    // 2. Calendar / Date check (Only for DELIVERY, bypassed for IMPORT and DAILY_MEI)
    if (activeReport === 'DELIVERY') {
      if (selectedDate) {
        return row.tglPengiriman === selectedDate;
      }
    }

    return true;
  });

  // Assign clean sequential numbers to all filtered rows globally first, so they are robust against slice/pagination
  let ajuCounter = 0;
  const docIdToNoUrutMap: Record<string, string> = {};

  const preppedFilteredRows = filteredRows.map((row, idx) => {
    let noUrut = String(idx + 1);
    if (activeReport === 'IMPORT') {
      const docId = row.docId || '';
      if (docId) {
        if (!docIdToNoUrutMap[docId]) {
          ajuCounter++;
          docIdToNoUrutMap[docId] = String(ajuCounter);
        }
        noUrut = docIdToNoUrutMap[docId];
      } else {
        ajuCounter++;
        noUrut = String(ajuCounter);
      }
    } else if (activeReport === 'DELIVERY') {
      noUrut = String(idx + 1);
    } else if (activeReport === 'DAILY_MEI') {
      noUrut = String(idx + 1);
    }
    return {
      ...row,
      noUrut
    };
  });

  // Limit display rows based on active report putting them in pages of 15
  const displayRows = (() => {
    if (activeReport === 'IMPORT') {
      const startIndex = (importCurrentPage - 1) * 15;
      return preppedFilteredRows.slice(startIndex, startIndex + 15);
    } else if (activeReport === 'DELIVERY') {
      const startIndex = (deliveryCurrentPage - 1) * 15;
      return preppedFilteredRows.slice(startIndex, startIndex + 15);
    } else if (activeReport === 'DAILY_MEI') {
      const startIndex = (dailyMeiCurrentPage - 1) * 15;
      return preppedFilteredRows.slice(startIndex, startIndex + 15);
    }
    return preppedFilteredRows;
  })();

  const getRowSpan = (rIdx: number, colKey: string): number => {
    if (activeReport === 'IMPORT') {
      const mergeKeys = ['noUrut', 'noPengajuanLast4', 'namaImportir', 'statusPib', 'remark'];
      if (!mergeKeys.includes(colKey)) {
        return 1;
      }
    } else {
      if (colKey === 'noContainer' || (colKey === 'noUrut' && activeReport !== 'IMPORT')) {
        return 1;
      }
    }

    const currentRow = displayRows[rIdx];
    if (!currentRow || !currentRow.docId) {
      return 1;
    }

    // Check if the previous row has the same docId.
    if (rIdx > 0 && displayRows[rIdx - 1].docId === currentRow.docId) {
      return 0; // Skip rendering
    }

    // Count how many consecutive rows have the same docId.
    let span = 1;
    for (let i = rIdx + 1; i < displayRows.length; i++) {
      if (displayRows[i].docId === currentRow.docId) {
        span++;
      } else {
        break;
      }
    }
    return span;
  };

  // Extract CSV and download
  const handleExportCSV = () => {
    const activeCols = columns[activeReport];
    const headers = activeCols.map(c => c.label).join(',');
    
    const csvContent = [
      headers,
      ...displayRows.map(row => 
        activeCols.map(col => {
          const value = row[col.key] || '';
          // Escape quotes and wrap in quotes to prevent delimiter collision
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `PT_AML_Spreadsheet_${activeReport}_${dateStr}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    const activeCols = columns[activeReport];
    const headers = activeCols.map(c => c.label).join('\t');
    const tableText = [
      headers,
      ...displayRows.map(row => activeCols.map(col => row[col.key] || '').join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tableText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold tracking-wider uppercase">
              Google Workspace Engine
            </span>
            <span className="text-slate-500 text-xs font-mono">• Direct Google Sheets Integration</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Generate Laporan & Spreadsheet Terpadu
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Sistem pengumpulan rekap PIB, planning armada logistik, dan laporan supir langsung ke akun Google Sheets secara online.
          </p>

          {isGoogleAuthorized && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-3 py-1.5 font-mono max-w-fit mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Terhubung: <strong>{authorizedUser?.email || 'dhimas.agungmakmur@gmail.com'}</strong></span>
              <span className="text-slate-700">|</span>
              <button 
                onClick={handleDisconnectGoogle}
                className="text-rose-450 text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-705 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Data Grid
              </>
            )}
          </button>
          
          {isGoogleAuthorized ? (
            <button
              onClick={handleExportToGoogleSheets}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-850 disabled:text-slate-500 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10"
            >
              {isExporting ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Export ke Google Sheets
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleAuthorizeGoogle}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-slate-950 hover:bg-teal-400 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-teal-500/10"
            >
              <Cloud className="w-4 h-4 text-slate-950" />
              Hubungkan Google Sheets
            </button>
          )}
        </div>
      </div>

      {/* Success feedback state */}
      {exportSuccessUrl && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-white text-sm">Berhasil Diekspor ke Google Sheets!</h5>
              <p className="text-slate-400 text-xs font-sans">Spreadsheet "{activeReport === 'IMPORT' ? 'Data Import and Export' : activeReport === 'DELIVERY' ? 'Data Delivery Plan' : 'Data Daily Report PT MEI'}" (tab {activeReport === 'IMPORT' ? 'Data Import' : activeReport === 'DELIVERY' ? 'Data Delivery' : 'Daily Report MEI'}) telah disinkronkan dan diperbarui secara real-time tanpa duplikasi.</p>
            </div>
          </div>
          <a
            href={exportSuccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-500 text-slate-950 hover:bg-teal-450 hover:bg-teal-400 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Buka Google Sheets
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Error feedback state */}
      {exportError && (
        <div className="bg-rose-955/40 bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="bg-rose-500/15 p-2 rounded-xl text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-white text-sm">Gagal Melakukan Ekspor</h5>
            <p className="text-slate-400 text-xs">{exportError}</p>
          </div>
        </div>
      )}

      {/* Grid Menu Selections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 order-2">
        {/* Card 1: Import Data */}
        <div 
          onClick={() => {
            if (userRole === 'DELIVERY_AML' && !isSuperUser) return;
            setActiveReport('IMPORT');
          }}
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-40 group ${
            userRole === 'DELIVERY_AML' && !isSuperUser
              ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900'
              : activeReport === 'IMPORT'
                ? 'bg-slate-800/40 border-teal-500/50 shadow-lg shadow-teal-500/5 cursor-pointer'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700/60 hover:bg-slate-850/60 cursor-pointer'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl transition-all ${
                activeReport === 'IMPORT' ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Ship className="w-5 h-5" />
              </span>
              {userRole === 'DELIVERY_AML' && !isSuperUser && (
                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 font-sans">
                  <Lock className="w-2.5 h-2.5" /> Akses Terbatas
                </span>
              )}
            </div>
            <h3 className={`font-bold mt-3 text-sm tracking-wide ${activeReport === 'IMPORT' ? 'text-teal-400' : 'text-slate-200'}`}>
              Database Import & Export
            </h3>
            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
              PIB status, depo penitipan sementara, vendor depo, pengiriman final, dan validasi Surat Jalan.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 transition-colors uppercase pt-2">
            {userRole === 'DELIVERY_AML' && !isSuperUser ? 'Hanya Untuk Staff AML' : 'Lihat Grid Preview'}
            {!(userRole === 'DELIVERY_AML' && !isSuperUser) && <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
          </div>
        </div>

        {/* Card 2: Daily Report PT MEI */}
        <div 
          onClick={() => {
            if (userRole === 'DELIVERY_AML' && !isSuperUser) return;
            setActiveReport('DAILY_MEI');
          }}
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-40 group ${
            userRole === 'DELIVERY_AML' && !isSuperUser
              ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900'
              : activeReport === 'DAILY_MEI'
                ? 'bg-slate-800/40 border-teal-500/50 shadow-lg shadow-teal-500/5 cursor-pointer'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700/60 hover:bg-slate-850/60 cursor-pointer'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl transition-all ${
                activeReport === 'DAILY_MEI' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <ClipboardList className="w-5 h-5" />
              </span>
              {userRole === 'DELIVERY_AML' && !isSuperUser && (
                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 font-sans">
                  <Lock className="w-2.5 h-2.5" /> Akses Terbatas
                </span>
              )}
            </div>
            <h3 className={`font-bold mt-3 text-sm tracking-wide ${activeReport === 'DAILY_MEI' ? 'text-rose-400' : 'text-slate-200'}`}>
              Database Daily Report PT MEI
            </h3>
            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
              Daily Report import khusus PT Midea Electronic Indonesia yang menampilkan nomor container, supir, plat nomor, dan status.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 transition-colors uppercase pt-2">
            {userRole === 'DELIVERY_AML' && !isSuperUser ? 'Hanya Untuk Staff AML' : 'Lihat Grid Preview'}
            {!(userRole === 'DELIVERY_AML' && !isSuperUser) && <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />}
          </div>
        </div>

        {/* Card 3: Delivery Data */}
        <div 
          onClick={() => setActiveReport('DELIVERY')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-40 group ${
            activeReport === 'DELIVERY'
              ? 'bg-slate-800/40 border-teal-500/50 shadow-lg shadow-teal-500/5'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700/60 hover:bg-slate-850/60'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl transition-all ${
                activeReport === 'DELIVERY' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Truck className="w-5 h-5" />
              </span>
            </div>
            <h3 className={`font-bold mt-3 text-sm tracking-wide ${activeReport === 'DELIVERY' ? 'text-amber-400' : 'text-slate-200'}`}>
              Database Delivery
            </h3>
            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
              Tanggal dispatch, lokasi penimbunan kontainer (TPS), lokasi bongkar, vendor pengiriman, dan remark supir.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase pt-2">
            Lihat Grid Preview
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 5. Table Data Portal - Data Upload Dokumen */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4 order-1">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              Data Upload Dokumen
            </h3>
            <p className="text-slate-400 text-xs">
              Portal data kontainer yang berhasil terpilih dan di-upload dari tab <strong>Preview Data</strong>. Siap ditransfer secara sinkron ke Google Sheets.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
            Total Dokumen Upload: <strong className="text-indigo-400">{uploadedPortalRows.length}</strong>
          </div>
        </div>        {showSuccessExportMsg && uploadedPortalRows.length === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-emerald-400 font-extrabold text-lg tracking-wide">Success export</h4>
              <p className="text-slate-300 text-sm max-w-md mx-auto">
                Seluruh data dokumen berhasil diekspor ke dalam 2 database utama secara sinkron dan real-time.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessExportMsg(false)}
              className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-all uppercase tracking-wider cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        ) : (
          /* The Upload List Table */
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-300 divide-x divide-slate-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-3 py-3.5 text-center w-12 font-bold">No</th>
                  <th className="px-4 py-3.5 text-center font-bold">NO AJU</th>
                  <th className="px-4 py-3.5 text-center font-bold">Nama Importir</th>
                  <th className="px-4 py-3.5 text-center font-bold">Nomor Container</th>
                  <th className="px-4 py-3.5 text-center font-bold">Tanggal Billing</th>
                  <th className="px-4 py-3.5 text-center font-bold">Tanggal SPPB</th>
                  <th className="px-4 py-3.5 text-center font-bold">Tanggal Pengiriman</th>
                  <th className="px-4 py-3.5 text-center font-bold">Tempat Penimbunan</th>
                  <th className="px-4 py-3.5 text-center font-bold">Lokasi Bongkar</th>
                  <th className="px-4 py-3.5 text-center font-bold">Nama Vendor Armada</th>
                  <th className="px-4 py-3.5 text-center font-bold">Nama Supir Armada</th>
                  <th className="px-4 py-3.5 text-center font-bold">Status Pengiriman</th>
                  <th className="px-4 py-3.5 text-center font-bold">Surat Jalan</th>
                  <th className="px-4 py-3.5 text-center font-bold">DETAIL BARANG</th>
                  <th className="px-4 py-3.5 text-center font-bold">REMARK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/10">
                {uploadedPortalRows.length > 0 ? (
                  uploadedPortalRows.map((row, index) => (
                    <tr key={row.key} className="hover:bg-slate-800/20 transition-colors duration-150 divide-x divide-slate-800/40">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-300 text-center" title={`No Aju Lengkap: ${row.nomorPengajuan}`}>
                        {row.nomorPengajuan && row.nomorPengajuan !== '-' 
                          ? (row.nomorPengajuan.length > 5 ? row.nomorPengajuan.slice(-5) : row.nomorPengajuan) 
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{row.namaImportir}</td>
                      <td className="px-4 py-3 text-slate-200 font-bold font-mono">{row.nomorContainer}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-center">{row.tanggalBilling}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-center">{row.tanggalSppb}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-center">{row.tanggalPengiriman}</td>
                      <td className="px-4 py-3 text-slate-300">{row.tempatPenimbunan}</td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{row.lokasiBongkar}</td>
                      <td className="px-4 py-3 text-slate-300">{row.vendorArmada}</td>
                      <td className="px-4 py-3 text-slate-300">{row.namaSupirArmada}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${
                          row.statusPengirimanContainer === 'Selesai Bongkar' || row.statusPengirimanContainer === 'Selesai'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : row.statusPengirimanContainer === 'Delivery'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-450 border border-slate-700/60'
                        }`}>
                          {row.statusPengirimanContainer}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                          row.suratJalan === 'Sudah Diterima'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-450 text-rose-450 border border-rose-500/30'
                        }`}>
                          {row.suratJalan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-sans truncate max-w-[150px]" title={row.detailBarang}>
                        {row.detailBarang}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-sans italic truncate max-w-[120px]" title={row.remark}>
                        {row.remark}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-600" />
                        <p className="font-bold text-slate-400 text-sm">Belum ada data dokumen yang berhasil di-upload.</p>
                        <p className="text-slate-500 text-xs">Silakan menuju ke tab <strong>Preview Data</strong>, beri checklist pada data, dan tekan tombol <strong>Upload Data</strong>.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Feature to export to google sheet with dhimas.agungmakmur@gmail.com */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="font-bold text-white text-sm">Export Google Sheets</p>
              <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded-md px-2.5 py-0.5 font-bold font-mono">
                dhimas.agungmakmur@gmail.com
              </span>
            </div>
            <p className="text-slate-450 text-slate-400 text-xs max-w-xl">
              Tekan tombol export di samping untuk mentransfer dan menyinkronkan seluruh data upload ke dalam 2 templat file Google Spreadsheet di Google Drive Anda secara bersamaan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {!isGoogleAuthorized ? (
              <button
                onClick={handleAuthorizeGoogle}
                className="flex items-center justify-center gap-2 px-5 py-3 w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold uppercase tracking-wider text-[11px] rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-500/10 active:scale-98"
              >
                <Cloud className="w-4 h-4 text-slate-950" />
                Hubungkan Akun Google
              </button>
            ) : (
              <button
                onClick={handleExportAllToGoogleSheets}
                disabled={isExportingAll || uploadedPortalRows.length === 0}
                className={`flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto font-extrabold uppercase tracking-widest text-[11px] rounded-xl transition-all cursor-pointer shadow-lg active:scale-98 ${
                  uploadedPortalRows.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {isExportingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengekspor Data...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    Export 2 Database
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 7. Export division status checklist */}
        {isGoogleAuthorized && (isExportingAll || Object.keys(batchExportStatus).length > 0) && (
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4.5 space-y-3.5">
            <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">Status Sinkronisasi Google Sheets</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1 */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                <div className="space-y-1">
                  <p className="text-white font-bold">1. Data Import and Export</p>
                  <p className="text-[10px] text-slate-500 font-mono">File: Data Import and Export (Data Import)</p>
                  {batchUrls.IMPORT && (
                    <a href={batchUrls.IMPORT} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-bold underline inline-flex items-center gap-1 text-[10px] mt-1">
                      Buka Sheet <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {batchExportStatus.IMPORT === 'pending' && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                {batchExportStatus.IMPORT === 'success' && <div className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px]">Success</div>}
                {batchExportStatus.IMPORT === 'error' && <div className="bg-rose-500/15 text-rose-450 px-2 py-0.5 rounded text-[10px]">Error</div>}
              </div>

              {/* Box 2 */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                <div className="space-y-1">
                  <p className="text-white font-bold">2. Data Daily Report PT MEI</p>
                  <p className="text-[10px] text-slate-500 font-mono">File: Data Daily Report PT MEI (Daily Report MEI)</p>
                  {batchUrls.DAILY_MEI && (
                    <a href={batchUrls.DAILY_MEI} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-bold underline inline-flex items-center gap-1 text-[10px] mt-1">
                      Buka Sheet <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {batchExportStatus.DAILY_MEI === 'pending' && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                {batchExportStatus.DAILY_MEI === 'success' && <div className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px]">Success</div>}
                {batchExportStatus.DAILY_MEI === 'error' && <div className="bg-rose-500/15 text-rose-450 px-2 py-0.5 rounded text-[10px]">Error</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Control bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5 order-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <h4 className="font-bold text-white text-md flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                activeReport === 'IMPORT' ? 'bg-teal-500' : activeReport === 'DELIVERY' ? 'bg-amber-500' : 'bg-rose-500'
              } ${activeReport === 'DELIVERY' ? 'bg-amber-500' : ''}`}></span>
              {activeReport === 'IMPORT' 
                ? 'Excel Preview : Database Import & Export' 
                : activeReport === 'DELIVERY'
                  ? 'Excel Preview Database : Database Delivery' 
                  : 'Daily Report PT Midea Electronic Indonesia'}
            </h4>
            <p className="text-[11px] text-slate-400">
              *Klik ganda pada sel untuk menyunting nilai secara langsung sebelum diunduh ke format Spreadsheet Excel.
            </p>
            <p className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
              • Sinkronisasi aktif dengan Google Spreadsheet "{activeReport === 'IMPORT' ? 'Data Import and Export' : activeReport === 'DELIVERY' ? 'Data Delivery Plan' : 'Data Daily Report PT MEI'}" (dhimas.agungmakmur@gmail.com)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleRefreshFromSpreadsheet(false)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 border border-teal-500/25 hover:bg-teal-500/20 disabled:opacity-50 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-teal-500/5 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Merefresh...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Calendar and Search Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 border-b border-slate-800/60 font-sans">
          {/* Calendar Picker or Limit Controller */}
          {activeReport === 'DELIVERY' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Tanggal Pengiriman:
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Input */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 transition-colors font-mono font-bold"
                />

                {/* Quick Pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      selectedDate === ''
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      selectedDate === todayStr
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(yesterdayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      selectedDate === yesterdayStr
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Yesterday
                  </button>
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300 transition-colors flex items-center justify-center"
                      title="Hapus Filter Tanggal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">
                {activeReport === 'IMPORT' ? 'Database Import & Export' : 'Database Daily Report PT Midea Electronic Indonesia'}
              </span>
            </div>
          )}

          {/* Search bar & reset */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Cari kata kunci..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs font-semibold text-slate-300 placeholder-slate-500 focus:border-teal-500 outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDate('');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
              title="Reset Semua Filter"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="overflow-x-auto mt-4 max-h-[480px]">
          <table className="w-full text-left border-collapse border border-slate-800 font-sans text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 font-bold uppercase tracking-wider divide-x divide-slate-800">
                {activeReport === 'DELIVERY' && (
                  <th className="px-3 py-3 w-12 text-center border-b border-slate-800 select-none">
                    <input 
                      type="checkbox"
                      className="accent-amber-500 cursor-pointer w-4 h-4 rounded border-slate-850"
                      checked={displayRows.length > 0 && displayRows.every(row => selectedDeliveryRowKeys.includes(getRowKey(row)))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allKeys = displayRows.map(row => getRowKey(row));
                          setSelectedDeliveryRowKeys(prev => {
                            const newSet = new Set([...prev, ...allKeys]);
                            return Array.from(newSet);
                          });
                        } else {
                          const visibleKeys = displayRows.map(row => getRowKey(row));
                          setSelectedDeliveryRowKeys(prev => prev.filter(k => !visibleKeys.includes(k)));
                        }
                      }}
                    />
                  </th>
                )}
                {columns[activeReport].map((col) => (
                  <th 
                    key={col.key} 
                    className={`px-4 py-3 border-b border-slate-800 text-[10px] select-none ${
                      activeReport === 'DELIVERY'
                        ? 'font-bold text-center text-slate-200'
                        : 'font-mono text-slate-400'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayRows.length > 0 ? (
                displayRows.map((row, rIdx) => {
                  const rKey = getRowKey(row);
                  const isSelected = selectedDeliveryRowKeys.includes(rKey);
                  return (
                    <tr 
                      key={rIdx} 
                      className={`hover:bg-slate-800/30 transition-colors group divide-x divide-slate-800 ${
                        isSelected && activeReport === 'DELIVERY' ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {activeReport === 'DELIVERY' && (
                        <td className="px-3 py-2.5 text-center w-12 align-middle">
                          <input 
                            type="checkbox"
                            className="accent-amber-500 cursor-pointer w-4 h-4 rounded"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDeliveryRowKeys(prev => [...prev, rKey]);
                              } else {
                                setSelectedDeliveryRowKeys(prev => prev.filter(k => k !== rKey));
                              }
                            }}
                          />
                        </td>
                      )}
                      {columns[activeReport].map((col) => {
                        const rowSpan = getRowSpan(rIdx, col.key);
                        if (rowSpan === 0) {
                          return null; // Skip rendering since a previous row spans this cell
                        }

                      const isEdited = editedCell?.rowRef === row && editedCell?.columnKey === col.key;
                      const value = row[col.key] || '';
                      
                      return (
                        <td 
                          key={col.key} 
                          rowSpan={rowSpan}
                          className={`px-4 py-2.5 text-slate-300 cursor-text transition-all align-middle ${
                            isEdited ? 'bg-teal-950/40 text-white p-0' : 'hover:bg-teal-500/5'
                          }`}
                          onDoubleClick={() => {
                            setEditedCell({ rowRef: row, columnKey: col.key });
                            let initialVal = value;
                            if (['tglMasukDepo', 'tglPengirimanFinal', 'tglPengiriman', 'tglKeluarMasuk'].includes(col.key)) {
                              if (!value || value === '-' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                initialVal = new Date().toISOString().split('T')[0];
                              }
                            }
                            setTempValue(initialVal);
                          }}
                        >
                          {isEdited ? (
                            col.key === 'pengirimanSementara' ? (
                              <select
                                value={tempValue}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setTempValue(newVal);
                                  if (editedCell) {
                                    const { rowRef, columnKey } = editedCell;
                                    const updateRows = (rowsList: any[], setter: any) => {
                                      const idx = rowsList.indexOf(rowRef);
                                      if (idx !== -1) {
                                        const updated = [...rowsList];
                                        updated[idx] = { ...updated[idx], [columnKey]: newVal };
                                        setter(updated);
                                      }
                                    };
                                    if (activeReport === 'IMPORT') {
                                      updateRows(importRows, setImportRows);
                                    } else if (activeReport === 'DELIVERY') {
                                      updateRows(deliveryRows, setDeliveryRows);
                                    } else {
                                      updateRows(dailyMeiRows, setDailyMeiRows);
                                    }
                                    setEditedCell(null);
                                  }
                                }}
                                onBlur={handleCellBlur}
                                autoFocus
                                className="w-full bg-slate-900 border border-teal-500 text-teal-400 font-bold px-2 py-1 rounded outline-none font-sans text-xs min-w-[130px]"
                              >
                                {!['Depo JARIO', 'Depo SJP', 'Depo Lainnya'].includes(tempValue) && (
                                  <option value={tempValue}>{tempValue || '-- Pilih Depo --'}</option>
                                )}
                                <option value="Depo JARIO">Depo JARIO</option>
                                <option value="Depo SJP">Depo SJP</option>
                                <option value="Depo Lainnya">Depo Lainnya</option>
                              </select>
                            ) : ['vendorDepo', 'vendorPengirimanFinal', 'vendorPengiriman'].includes(col.key) ? (
                              <select
                                value={tempValue}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setTempValue(newVal);
                                  if (editedCell) {
                                    const { rowRef, columnKey } = editedCell;
                                    const updateRows = (rowsList: any[], setter: any) => {
                                      const idx = rowsList.indexOf(rowRef);
                                      if (idx !== -1) {
                                        const updated = [...rowsList];
                                        updated[idx] = { ...updated[idx], [columnKey]: newVal };
                                        setter(updated);
                                      }
                                    };
                                    if (activeReport === 'IMPORT') {
                                      updateRows(importRows, setImportRows);
                                    } else if (activeReport === 'DELIVERY') {
                                      updateRows(deliveryRows, setDeliveryRows);
                                    } else {
                                      updateRows(dailyMeiRows, setDailyMeiRows);
                                    }
                                    setEditedCell(null);
                                  }
                                }}
                                onBlur={handleCellBlur}
                                autoFocus
                                className="w-full bg-slate-900 border border-teal-500 text-teal-400 font-bold px-2 py-1 rounded outline-none font-sans text-xs min-w-[150px]"
                              >
                                {![
                                  'T Sutrisno BCHK', 'APL', 'Duta', 'AMA', 'CV. Cahyo', 'DMT', 'DKTM', 'VTI', 
                                  'Casinih', 'Yona', 'Mamora', 'Urip', 'Edi', 'Beri', 'Rizki', 'Fajar', 
                                  'Jimlee', 'Kasmidi LCL', 'Muhadi LCL', 'SINLog SMG', 'Java SBY', 'Amerta SBY'
                                ].includes(tempValue) && (
                                  <option value={tempValue}>{tempValue || '-- Pilih Vendor --'}</option>
                                )}
                                <option value="T Sutrisno BCHK">T Sutrisno BCHK</option>
                                <option value="APL">APL</option>
                                <option value="Duta">Duta</option>
                                <option value="AMA">AMA</option>
                                <option value="CV. Cahyo">CV. Cahyo</option>
                                <option value="DMT">DMT</option>
                                <option value="DKTM">DKTM</option>
                                <option value="VTI">VTI</option>
                                <option value="Casinih">Casinih</option>
                                <option value="Yona">Yona</option>
                                <option value="Mamora">Mamora</option>
                                <option value="Urip">Urip</option>
                                <option value="Edi">Edi</option>
                                <option value="Beri">Beri</option>
                                <option value="Rizki">Rizki</option>
                                <option value="Fajar">Fajar</option>
                                <option value="Jimlee">Jimlee</option>
                                <option value="Kasmidi LCL">Kasmidi LCL</option>
                                <option value="Muhadi LCL">Muhadi LCL</option>
                                <option value="SINLog SMG">SINLog SMG</option>
                                <option value="Java SBY">Java SBY</option>
                                <option value="Amerta SBY">Amerta SBY</option>
                              </select>
                            ) : col.key === 'pengirimanFinal' ? (
                              <select
                                value={tempValue}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setTempValue(newVal);
                                  if (editedCell) {
                                    const { rowRef, columnKey } = editedCell;
                                    const updateRows = (rowsList: any[], setter: any) => {
                                      const idx = rowsList.indexOf(rowRef);
                                      if (idx !== -1) {
                                        const updated = [...rowsList];
                                        updated[idx] = { ...updated[idx], [columnKey]: newVal };
                                        setter(updated);
                                      }
                                    };
                                    if (activeReport === 'IMPORT') {
                                      updateRows(importRows, setImportRows);
                                    } else if (activeReport === 'DELIVERY') {
                                      updateRows(deliveryRows, setDeliveryRows);
                                    } else {
                                      updateRows(dailyMeiRows, setDailyMeiRows);
                                    }
                                    setEditedCell(null);
                                  }
                                }}
                                onBlur={handleCellBlur}
                                autoFocus
                                className="w-full bg-slate-900 border border-teal-500 text-teal-400 font-bold px-2 py-1 rounded outline-none font-sans text-xs min-w-[150px]"
                              >
                                {![
                                  'WH Paskem', 'OFWH BPL', 'Direct Kosambi', 'Direct Lainnya', 
                                  'WH Cikokol', 'WH Semarang', 'WH Surabaya'
                                ].includes(tempValue) && (
                                  <option value={tempValue}>{tempValue || '-- Pilih Pengiriman --'}</option>
                                )}
                                <option value="WH Paskem">WH Paskem</option>
                                <option value="OFWH BPL">OFWH BPL</option>
                                <option value="Direct Kosambi">Direct Kosambi</option>
                                <option value="Direct Lainnya">Direct Lainnya</option>
                                <option value="WH Cikokol">WH Cikokol</option>
                                <option value="WH Semarang">WH Semarang</option>
                                <option value="WH Surabaya">WH Surabaya</option>
                              </select>
                            ) : ['tglMasukDepo', 'tglPengirimanFinal', 'tglPengiriman', 'tglKeluarMasuk'].includes(col.key) ? (
                              <input
                                type="date"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full bg-slate-900 border border-teal-500 text-white px-2 py-1 rounded outline-none font-sans text-xs min-w-[130px]"
                              />
                            ) : (
                              <input
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full h-full bg-teal-950/80 text-white px-4 py-2 border-0 outline-none ring-2 ring-teal-500 rounded-sm font-sans text-xs"
                              />
                            )
                          ) : (
                            <span className="flex items-center gap-1.5 font-medium">
                              {/* Specially format status columns for premium coloring in sandbox */}
                              {col.key === 'suratJalan' ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  value === 'sudah diterima' || value === 'sudah'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                                }`}>
                                  {value}
                                </span>
                              ) : col.key === 'statusPib' || col.key === 'statusBc' ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  value === 'SPPB' || value === 'SPPB (Disetujui)'
                                    ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                                    : value === 'SPJM' || value.includes('Jalur Merah')
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                    : value === 'NHI'
                                    ? 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20'
                                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {value}
                                </span>
                              ) : col.key === 'statusPengiriman' ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  value === 'Selesai'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                    : value === 'Delivery'
                                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {value}
                                </span>
                              ) : (
                                value
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={columns[activeReport].length + (activeReport === 'DELIVERY' ? 1 : 0)} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <p className="font-medium text-slate-400">Tidak ada baris data yang cocok dengan pencarian Anda.</p>
                      <p className="text-[11px] text-slate-500">Silakan tambahkan dokumen rekap PIB di tab rekap terlebih dahulu atau hapus pencarian.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {((activeReport === 'IMPORT') || (activeReport === 'DELIVERY') || (activeReport === 'DAILY_MEI')) && (
          <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-2 mt-3 font-sans">
            <div className="text-xs text-slate-400">
              Menampilkan {displayRows.length > 0 ? (
                activeReport === 'IMPORT' ? (importCurrentPage - 1) * 15 + 1 :
                activeReport === 'DELIVERY' ? (deliveryCurrentPage - 1) * 15 + 1 :
                (dailyMeiCurrentPage - 1) * 15 + 1
              ) : 0} - {
                activeReport === 'IMPORT' ? Math.min(importCurrentPage * 15, filteredRows.length) :
                activeReport === 'DELIVERY' ? Math.min(deliveryCurrentPage * 15, filteredRows.length) :
                Math.min(dailyMeiCurrentPage * 15, filteredRows.length)
              } dari {filteredRows.length} baris data
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (activeReport === 'IMPORT') setImportCurrentPage(p => Math.max(1, p - 1));
                  else if (activeReport === 'DELIVERY') setDeliveryCurrentPage(p => Math.max(1, p - 1));
                  else setDailyMeiCurrentPage(p => Math.max(1, p - 1));
                }}
                disabled={
                  activeReport === 'IMPORT' ? importCurrentPage === 1 :
                  activeReport === 'DELIVERY' ? deliveryCurrentPage === 1 :
                  dailyMeiCurrentPage === 1
                }
                className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Sebelumnya
              </button>
              <div className="text-xs text-slate-400 font-mono font-bold px-2">
                Halaman {
                  activeReport === 'IMPORT' ? importCurrentPage :
                  activeReport === 'DELIVERY' ? deliveryCurrentPage :
                  dailyMeiCurrentPage
                } / {Math.max(1, Math.ceil(filteredRows.length / 15))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (activeReport === 'IMPORT') setImportCurrentPage(p => Math.min(Math.ceil(filteredRows.length / 15), p + 1));
                  else if (activeReport === 'DELIVERY') setDeliveryCurrentPage(p => Math.min(Math.ceil(filteredRows.length / 15), p + 1));
                  else setDailyMeiCurrentPage(p => Math.min(Math.ceil(filteredRows.length / 15), p + 1));
                }}
                disabled={
                  activeReport === 'IMPORT' ? importCurrentPage >= Math.ceil(filteredRows.length / 15) :
                  activeReport === 'DELIVERY' ? deliveryCurrentPage >= Math.ceil(filteredRows.length / 15) :
                  dailyMeiCurrentPage >= Math.ceil(filteredRows.length / 15)
                }
                className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}

        {/* Metadata stats bottom bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 gap-2 border-t border-slate-800/60 pt-4">
          <div className="flex items-center gap-1.5 font-mono">
            <Info className="w-3.5 h-3.5 text-teal-500/80" />
            <span>Terpajang: <strong>{displayRows.length}</strong> baris data</span>
            <span>•</span>
            <span>Total: <strong>{currentRows.length}</strong> baris</span>
            {activeReport === 'DELIVERY' && (
              <>
                <span>•</span>
                <span className="text-amber-400">Terpilih: <strong>{selectedDeliveryRowKeys.length}</strong> container</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 pl-0 sm:pl-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> Double-click cell to edit
            </span>
            <span className="text-slate-750 font-mono">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              File type: Google Workspace Live Spreadsheet (Sheets/Drive Online)
            </span>
          </div>
        </div>
      </div>

      {/* Guide Card of Spreadsheet integration */}
      <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-6 order-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
          TIPS DAN CARA INTEGRASI KE SPREADSHEETS (GOOGLE SHEETS)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-400 leading-relaxed">
          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-200">1. Ekspor Online Google Sheets</h5>
            <p>
              Gunakan tombol <strong>"Export ke Google Sheets"</strong> untuk membuat lembar Spreadsheet secara live di Google Drive akun <code>dhimas.agungmakmur@gmail.com</code> Anda.
            </p>
          </div>
          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-200">2. Copy & Paste Terpadu</h5>
            <p>
              Gunakan tombol <strong>"Copy Data Grid"</strong> untuk langsung menyalin seluruh baris preview sandbox ke papan klip untuk ditempelkan secara manual kapan saja.
            </p>
          </div>
          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-200">3. Daily Report PT Midea Electronic Indonesia</h5>
            <p>
              Seluruh rekapitulasi container untuk importir <strong>PT Midea Electronic Indonesia</strong> dikumpulkan secara otomatis pada Tab 3 untuk kemudahan filter laporan harian.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
