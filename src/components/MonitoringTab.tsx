import React, { useState, useEffect } from 'react';
import { PIBDocument, DocumentStatus, DeliveryInfo } from '../types';
// @ts-ignore
import amlLogo from '../assets/images/aml_logo_solid_white_1784613581619.jpg';
import { 
  Search, Shield, CheckCircle, AlertTriangle, FileText, Printer, 
  Truck, ArrowRight, ShieldCheck, DollarSign, RefreshCw, Layers, Edit, Eye, Trash2, Edit3
} from 'lucide-react';
import EditDocumentModal from './EditDocumentModal';
import { motion, AnimatePresence } from 'motion/react';

interface MonitoringTabProps {
  documents: PIBDocument[];
  onUpdateDocument: (docId: string, updates: Partial<PIBDocument>) => void;
  onDeleteDocument: (docId: string) => void;
  userRole: 'STAFF_AML' | 'DELIVERY_AML';
  isSuperUser?: boolean;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  deliveryFilter: string;
  setDeliveryFilter: (status: string) => void;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;
}

const getContainerDisplay = (cont: string) => {
  if (!cont) return '';
  if (cont.includes('(')) return cont;
  const hash = cont.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const size = hash % 2 === 0 ? '40ft' : '20ft';
  return `${cont} (${size})`;
};

const SPJM_STEPS = [
  { id: 'SPJM', label: '1. SPJM (Jalur Merah)', roleAllowed: 'ALL' },
  { id: 'Submit File SPJM', label: '2. Submit File SPJM', roleAllowed: 'STAFF_AML' },
  { id: 'Penarikan Container Ke Lokasi Behandle', label: '3. Penarikan Container Ke Lokasi Behandle', roleAllowed: 'DELIVERY_AML' },
  { id: 'Antrian Pemeriksa', label: '4. Antrian Pemeriksa', roleAllowed: 'DELIVERY_AML' },
  { id: 'Pemeriksaan Barang', label: '5. Pemeriksaan Barang', roleAllowed: 'DELIVERY_AML' },
  { id: 'Selesai Pemeriksaan', label: '6. Selesai Pemeriksaan', roleAllowed: 'DELIVERY_AML' },
];

const getCurrentSPJMStepIndex = (doc: any) => {
  const currentStatus = doc.spjmStatus || 'SPJM';
  const idx = SPJM_STEPS.findIndex(step => step.id === currentStatus);
  return idx === -1 ? 0 : idx;
};

export const VENDOR_OPTIONS = [
  "T Sutrisno BCHK",
  "APL",
  "Duta",
  "AMA",
  "DMT",
  "CV Cahyo",
  "DKTM",
  "VTI",
  "Yona",
  "Casinih",
  "Urip",
  "Edi",
  "Mamora",
  "Beri",
  "Rizki",
  "Fajar",
  "Jimmy Lee",
  "Kasmidi LCL",
  "Muhadi LCL",
  "SInLog Semarang",
  "Java Surabaya",
  "Vendor Lainnya"
];

export default function MonitoringTab({ 
  documents, 
  onUpdateDocument, 
  onDeleteDocument, 
  userRole,
  isSuperUser,
  statusFilter,
  setStatusFilter,
  deliveryFilter,
  setDeliveryFilter,
  selectedDocId,
  setSelectedDocId
}: MonitoringTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, _setSelectedDoc] = useState<PIBDocument | null>(null);
  const [activeContainer, setActiveContainer] = useState<string>('');
  const [editingDoc, setEditingDoc] = useState<PIBDocument | null>(null);

  const setSelectedDoc = (val: PIBDocument | null | ((prev: PIBDocument | null) => PIBDocument | null)) => {
    if (typeof val === 'function') {
      _setSelectedDoc(prev => {
        const computed = val(prev);
        setSelectedDocId(computed ? computed.id : null);
        return computed;
      });
    } else {
      _setSelectedDoc(val);
      setSelectedDocId(val ? val.id : null);
    }
  };

  // Sync selectedDoc with selectedDocId from parent
  useEffect(() => {
    if (selectedDocId) {
      const found = documents.find(d => d.id === selectedDocId);
      if (found) {
        _setSelectedDoc(found);
        return;
      }
    }
    _setSelectedDoc(null);
  }, [selectedDocId, documents]);
  
  // Delivery form states
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [warehouseTarget, setWarehouseTarget] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [vendorArmada, setVendorArmada] = useState('');

  // Synchronize input fields when activeContainer or selectedDoc changes
  useEffect(() => {
    if (!selectedDoc) return;
    
    const isMulti = selectedDoc.containers.length > 1;
    const currentCont = isMulti ? activeContainer : (selectedDoc.containers[0] || '');
    if (isMulti && !activeContainer) {
      setActiveContainer(selectedDoc.containers[0] || '');
      return;
    }
    
    const info = isMulti 
      ? selectedDoc.deliveryInfoMap?.[currentCont] 
      : selectedDoc.deliveryInfo;

    if (info) {
      setDriverName(info.driverName || '');
      setDriverPhone(info.driverPhone || '');
      setPlateNumber(info.plateNumber || '');
      setWarehouseTarget(info.warehouseTarget || '');
      setScheduledDate(info.scheduledDate || '');
      setDeliveryNoteNumber(info.deliveryNoteNumber || `SJ/AML/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
      setVendorArmada(info.vendorArmada || '');
    } else {
      setDriverName('');
      setDriverPhone('');
      setPlateNumber('');
      setWarehouseTarget('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setDeliveryNoteNumber(`SJ/AML/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
      setVendorArmada('');
    }
  }, [activeContainer, selectedDoc]);

  const renderSPJMJourney = (doc: PIBDocument) => {
    const currentIdx = getCurrentSPJMStepIndex(doc);
    
    const handleSetSPJMStep = (stepId: string) => {
      onUpdateDocument(doc.id, { spjmStatus: stepId });
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc({ ...selectedDoc, spjmStatus: stepId });
      }
    };

    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 font-sans mt-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-[11px] font-bold text-pink-600 uppercase tracking-widest pl-1">
            Perjalanan Status Dokumen SPJM
          </span>
        </div>

        <div className="space-y-4 relative pl-4 border-l border-slate-200 ml-2">
          {SPJM_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;
            const isPending = idx > currentIdx;

            let circleStyle = 'bg-slate-100 border-slate-200 text-slate-500';
            let labelStyle = 'text-slate-500 font-sans';
            
            if (isCompleted) {
              circleStyle = 'bg-emerald-50 border-emerald-300 text-emerald-700';
              labelStyle = 'text-slate-700 font-medium font-sans';
            } else if (isActive) {
              circleStyle = 'bg-pink-50 border-pink-400 text-pink-700 font-bold';
              labelStyle = 'text-slate-900 font-bold font-sans';
            }

            return (
              <div key={step.id} className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                {/* Connector Point */}
                <div className={`absolute -left-[24px] top-1 w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-mono transition-colors ${circleStyle}`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>

                <div className="pl-2">
                  <p className={`text-xs ${labelStyle} flex items-center gap-1.5`}>
                    {step.label}
                    {isActive && (
                      <span className="text-[9px] bg-pink-100 px-1.5 py-0.5 rounded text-pink-700 font-semibold animate-pulse uppercase">
                        Active
                      </span>
                    )}
                  </p>
                </div>

                {/* Cancel button for the last step when completed */}
                {idx === currentIdx && currentIdx === SPJM_STEPS.length - 1 && (
                  <div className="sm:text-right pl-2 sm:pl-0 flex flex-wrap items-center gap-2 justify-end">
                    {(() => {
                      const isStaffDoc = userRole === 'STAFF_AML';
                      const isStaffDelivery = userRole === 'DELIVERY_AML';
                      const prevStepInfo = SPJM_STEPS[currentIdx];
                      const isAllowedCancel = 
                        prevStepInfo.roleAllowed === 'ALL' ||
                        (prevStepInfo.roleAllowed === 'STAFF_AML' && (isStaffDoc || isSuperUser)) ||
                        (prevStepInfo.roleAllowed === 'DELIVERY_AML' && (isStaffDelivery || isSuperUser));

                      if (isAllowedCancel && currentIdx > 0) {
                        return (
                          <button
                            type="button"
                            onClick={() => handleSetSPJMStep(SPJM_STEPS[currentIdx - 1].id)}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-3 py-1 rounded shadow-sm cursor-pointer transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
                          >
                            Cancel
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {idx === currentIdx + 1 && (
                  <div className="sm:text-right pl-2 sm:pl-0 flex flex-wrap items-center gap-2 justify-end">
                    {(() => {
                      const isStaffDoc = userRole === 'STAFF_AML';
                      const isStaffDelivery = userRole === 'DELIVERY_AML';
                      const isAllowedDone = 
                        (step.roleAllowed === 'STAFF_AML' && (isStaffDoc || isSuperUser)) ||
                        (step.roleAllowed === 'DELIVERY_AML' && (isStaffDelivery || isSuperUser));

                      const prevStepInfo = SPJM_STEPS[currentIdx];
                      const isAllowedCancel = 
                        currentIdx > 0 && (
                          prevStepInfo.roleAllowed === 'ALL' ||
                          (prevStepInfo.roleAllowed === 'STAFF_AML' && (isStaffDoc || isSuperUser)) ||
                          (prevStepInfo.roleAllowed === 'DELIVERY_AML' && (isStaffDelivery || isSuperUser))
                        );

                      return (
                        <>
                          {isAllowedCancel && (
                            <button
                              type="button"
                              onClick={() => handleSetSPJMStep(SPJM_STEPS[currentIdx - 1].id)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-3 py-1 rounded shadow-sm cursor-pointer transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
                            >
                              Cancel
                            </button>
                          )}
                          {isAllowedDone ? (
                            <button
                              type="button"
                              onClick={() => handleSetSPJMStep(step.id)}
                              className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-[10px] px-3 py-1 rounded shadow-sm cursor-pointer transition-colors uppercase tracking-wider"
                            >
                              Done
                            </button>
                          ) : (
                            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded italic font-mono uppercase">
                              Terkunci ({step.roleAllowed === 'STAFF_AML' ? 'Staff Doc Only' : 'Staff Delivery Only'})
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isSuperUser && currentIdx > 0 && (
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => handleSetSPJMStep('SPJM')}
              className="text-[9px] font-bold text-slate-500 hover:text-rose-600 transition-colors uppercase cursor-pointer"
            >
              Reset SPJM Step Tracker
            </button>
          </div>
        )}
      </div>
    );
  };

  // Filtering documents
  const filteredDocs = documents.filter(doc => {
    if (userRole === 'DELIVERY_AML' && !isSuperUser && !['SPPB', 'SPJM', 'NHI'].includes(doc.status)) {
      return false;
    }

    const matchesSearch = 
      doc.noPengajuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.importer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.invPlNo && doc.invPlNo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      matchesStatus = doc.status === statusFilter;
    }
    
    let matchesDelivery = true;
    if (deliveryFilter === 'Belum Dijadwalkan') {
      matchesDelivery = doc.status === 'SPPB' && (!doc.deliveryPlanned || doc.containers.some(c => !doc.deliveryInfoMap?.[c]));
    } else if (deliveryFilter === 'Delivery') {
      matchesDelivery = doc.status === 'SPPB' && (
        doc.containers.length > 1 
          ? Object.values(doc.deliveryInfoMap || {}).some(d => d?.status === 'Delivery')
          : doc.deliveryInfo?.status === 'Delivery'
      );
    } else if (deliveryFilter === 'Selesai') {
      matchesDelivery = doc.status === 'SPPB' && (
        doc.containers.length > 1 
          ? Object.values(doc.deliveryInfoMap || {}).some(d => d?.status === 'Selesai')
          : doc.deliveryInfo?.status === 'Selesai'
      );
    }
    
    return matchesSearch && matchesStatus && matchesDelivery;
  });

  // Sort documents based on the last 6 digits of noPengajuan (Z to A - largest/newest on top)
  const getAjuSortKey = (no: string) => {
    if (!no) return '';
    const clean = no.replace(/[^0-9a-zA-Z]/g, '');
    return clean.slice(-6);
  };

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const startScheduleDelivery = (doc: PIBDocument) => {
    const defaultCont = doc.containers[0] || '';
    setActiveContainer(defaultCont);
    const randomNoteNum = `SJ/AML/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    setDeliveryNoteNumber(randomNoteNum);
    
    const info = doc.containers.length > 1 
      ? doc.deliveryInfoMap?.[defaultCont] 
      : doc.deliveryInfo;

    if (info) {
      setDriverName(info.driverName || '');
      setDriverPhone(info.driverPhone || '');
      setPlateNumber(info.plateNumber || '');
      setWarehouseTarget(info.warehouseTarget || '');
      setScheduledDate(info.scheduledDate || '');
      setDeliveryNoteNumber(info.deliveryNoteNumber || randomNoteNum);
      setVendorArmada(info.vendorArmada || '');
    } else {
      setDriverName('');
      setDriverPhone('');
      setPlateNumber('');
      setWarehouseTarget('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setVendorArmada('');
    }
    setSelectedDoc(doc);
  };

  const handleSaveDeliveryInfo = () => {
    if (!selectedDoc) return;
    
    const infoStatus = selectedDoc.containers.length > 1 
      ? (selectedDoc.deliveryInfoMap?.[activeContainer]?.status || 'Belum Dikirim')
      : (selectedDoc.deliveryInfo?.status || 'Belum Dikirim');

    const currentSuratJalanDiterima = selectedDoc.containers.length > 1
      ? selectedDoc.deliveryInfoMap?.[activeContainer]?.suratJalanDiterima
      : selectedDoc.deliveryInfo?.suratJalanDiterima;

    const info: DeliveryInfo = {
      driverName,
      driverPhone,
      plateNumber,
      warehouseTarget,
      scheduledDate,
      status: infoStatus,
      deliveryNoteNumber,
      suratJalanDiterima: currentSuratJalanDiterima ?? false,
      vendorArmada
    };

    let updates: Partial<PIBDocument> = {};

    if (selectedDoc.containers.length > 1) {
      const updatedMap = {
        ...(selectedDoc.deliveryInfoMap || {}),
        [activeContainer]: info
      };
      const deliveryPlanned = Object.values(updatedMap).some(d => d && (d as any).driverName);
      updates = {
        deliveryPlanned,
        deliveryInfoMap: updatedMap,
        deliveryInfo: updatedMap[selectedDoc.containers[0]] || info
      };
    } else {
      updates = {
        deliveryPlanned: true,
        deliveryInfo: info,
        deliveryInfoMap: {
          [selectedDoc.containers[0] || '']: info
        }
      };
    }

    onUpdateDocument(selectedDoc.id, updates);

    // Refresh local selected state
    setSelectedDoc({
      ...selectedDoc,
      ...updates
    });
  };

  const updateDeliveryStatus = (newStatus: 'Belum Dikirim' | 'Delivery' | 'Selesai' | 'Dibatalkan') => {
    if (!selectedDoc) return;
    
    let updates: Partial<PIBDocument> = {};

    if (selectedDoc.containers.length > 1) {
      const currentCont = activeContainer || selectedDoc.containers[0] || '';
      const currentContainerInfo = selectedDoc.deliveryInfoMap?.[currentCont];
      if (!currentContainerInfo) return;
      
      const updatedInfo = {
        ...currentContainerInfo,
        status: newStatus
      };
      
      const updatedMap = {
        ...(selectedDoc.deliveryInfoMap || {}),
        [currentCont]: updatedInfo
      };
      
      updates = {
        deliveryInfoMap: updatedMap,
        deliveryInfo: updatedMap[selectedDoc.containers[0]] || updatedInfo
      };
    } else {
      if (!selectedDoc.deliveryInfo) return;
      
      const updatedInfo = {
        ...selectedDoc.deliveryInfo,
        status: newStatus
      };
      updates = {
        deliveryInfo: updatedInfo,
        deliveryInfoMap: {
          [selectedDoc.containers[0] || '']: updatedInfo
        }
      };
    }

    onUpdateDocument(selectedDoc.id, updates);

    setSelectedDoc({
      ...selectedDoc,
      ...updates
    });
  };

  const toggleSuratJalanDiterima = () => {
    if (!selectedDoc) return;
    
    let updates: Partial<PIBDocument> = {};

    if (selectedDoc.containers.length > 1) {
      const currentCont = activeContainer || selectedDoc.containers[0] || '';
      const currentContainerInfo = selectedDoc.deliveryInfoMap?.[currentCont];
      if (!currentContainerInfo) return;
      
      const updatedInfo = {
        ...currentContainerInfo,
        suratJalanDiterima: !currentContainerInfo.suratJalanDiterima
      };
      
      const updatedMap = {
        ...(selectedDoc.deliveryInfoMap || {}),
        [currentCont]: updatedInfo
      };
      
      updates = {
        deliveryInfoMap: updatedMap,
        deliveryInfo: updatedMap[selectedDoc.containers[0]] || updatedInfo
      };
    } else {
      if (!selectedDoc.deliveryInfo) return;
      
      const updatedInfo = {
        ...selectedDoc.deliveryInfo,
        suratJalanDiterima: !selectedDoc.deliveryInfo.suratJalanDiterima
      };
      updates = {
        deliveryInfo: updatedInfo,
        deliveryInfoMap: {
          [selectedDoc.containers[0] || '']: updatedInfo
        }
      };
    }

    onUpdateDocument(selectedDoc.id, updates);

    setSelectedDoc({
      ...selectedDoc,
      ...updates
    });
  };

  const handlePrintSuratJalan = (doc: PIBDocument, containerNo?: string) => {
    const cont = containerNo || (doc.containers.length > 1 ? activeContainer : doc.containers[0]) || '';
    const info = doc.containers.length > 1 
      ? doc.deliveryInfoMap?.[cont] 
      : doc.deliveryInfo;

    if (!info) return;

    // Helper to format date string to dd-mm-yyyy
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '-';
      try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          if (parts[2].length === 4) {
            return dateStr;
          }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        }
      } catch (e) {
        // Fallback
      }
      return dateStr;
    };
    const formattedDate = formatDate(info.scheduledDate);
    
    // Create printable elements in a new temporary window or overlay
    const printContent = `
      <html>
        <head>
          <title>Surat Jalan PT AML</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              margin: 0;
              padding: 0;
              color: #1e293b; 
              background-color: #f8fafc;
            }
            .print-container {
              background: #ffffff;
              max-width: 900px;
              margin: 20px auto;
              padding: 25px 30px;
              box-sizing: border-box;
              border-radius: 8px;
              box-shadow: 0 4px 10px rgb(0 0 0 / 0.05);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 600px;
            }
            .header-container { 
              border-bottom: 3px double #0f172a; 
              padding-bottom: 12px; 
              margin-bottom: 18px; 
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-section { display: flex; align-items: center; justify-content: center; gap: 16px; }
            .logo-img { height: 55px; object-fit: contain; mix-blend-mode: multiply; }
            .company-info { text-align: center; }
            .company-name { margin: 0; font-size: 19px; color: #0f172a; font-weight: 850; letter-spacing: -0.5px; }
            .company-address { margin: 3px 0 0 0; font-size: 10px; color: #334155; font-weight: 500; line-height: 1.3; }
            .company-contact { margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-family: monospace; }
            
            .title { text-align: center; text-transform: uppercase; margin-bottom: 18px; }
            .title h2 { margin: 0; font-size: 15px; color: #0f172a; letter-spacing: 0.5px; font-weight: 800; }
            .title p { margin: 4px 0 0 0; font-size: 12px; font-weight: bold; font-family: monospace; color: #334155; }
            
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 18px; }
            .box { border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; font-size: 11.5px; line-height: 1.5; background-color: #f8fafc; }
            .box h3 { margin-top: 0; margin-bottom: 8px; font-size: 12px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; color: #0f172a; font-weight: 700; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            table, th, td { border: 1.5px solid #0f172a; }
            th { background-color: #f1f5f9; padding: 10px; text-align: left; color: #0d1e2d; font-weight: bold; }
            td { padding: 12px 10px; color: #0f172a; vertical-align: top; }
            .height-cell { height: 160px; }
            
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-top: 45px; font-size: 11.5px; }
            .sig-space { height: 60px; }
            .sig-box { text-align: center; }
            .sig-title { margin-bottom: 8px; font-weight: 600; color: #475569; }
            .footer-note { margin-top: 55px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
 
            @media print {
              @page { size: A5 landscape; margin: 2mm 3mm !important; }
              html, body {
                width: 100%;
                height: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff;
              }
              .print-container {
                width: 100%;
                height: 100vh;
                min-height: 100vh;
                max-height: 100vh;
                margin: 0 !important;
                padding: 3mm 4mm !important;
                border-radius: 0;
                box-shadow: none;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                overflow: hidden;
              }
              .header-container { padding-bottom: 4px; margin-bottom: 6px; justify-content: center; }
              .logo-img { height: 38px; }
              .company-name { font-size: 14px; }
              .company-address { font-size: 8px; }
              .company-contact { font-size: 7px; }
              .company-info { text-align: center; }
              .title { margin-bottom: 6px; }
              .title h2 { font-size: 11px; }
              .title p { font-size: 9px; }
              .grid { gap: 6px; margin-bottom: 6px; }
              .box { padding: 4px 8px; font-size: 9px; border-radius: 4px; line-height: 1.3; }
              .box h3 { font-size: 9.5px; margin-bottom: 2px; padding-bottom: 1px; }
              table { margin-bottom: 6px; font-size: 10.5px; }
              th { padding: 4px 6px; font-size: 9.5px; }
              td { padding: 5px 6px; font-size: 9.5px; }
              .height-cell { height: 180px !important; }
              .signatures { margin-top: 15px; font-size: 9.5px; gap: 8px; }
              .sig-space { height: 32px; }
              .footer-note { margin-top: 15px !important; padding-top: 5px; font-size: 8.5px; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="content-top">
              <div class="header-container">
                <div class="logo-section">
                  <img class="logo-img" src="${amlLogo}" alt="PT Agung Makmur Logistik Logo" referrerPolicy="no-referrer" />
                  <div class="company-info">
                    <h1 class="company-name">PT AGUNG MAKMUR LOGISTIK</h1>
                    <p class="company-address">Jln Kesemek No 11 RT 001 RW 012, Semper Barat, Cilincing, Jakarta Utara</p>
                    <p class="company-contact">Email: agungmakmur61@gmail.com | Telp: (021) 4589-9921</p>
                  </div>
                </div>
              </div>
              
              <div class="title">
                <h2>SURAT JALAN PENGIRIMAN KONTAINER</h2>
                <p>No: ${info.deliveryNoteNumber}</p>
              </div>
     
              <div class="grid">
                <div class="box">
                  <h3>Detail Dokumen & Armada</h3>
                  <strong>No. Pengajuan PIB:</strong> ${(doc.noPengajuan || '').slice(-6)}<br/>
                  <strong>No. Bill of Lading:</strong> ${doc.blNumber}<br/>
                  <strong>Supir Armada:</strong> ${info.driverName || '-'} (${info.driverPhone || '-'})<br/>
                  <strong>No. Plat Kendaraan:</strong> ${info.plateNumber || '-'}
                </div>
    
                <div class="box">
                  <h3>Informasi Importir & Pengiriman</h3>
                  <strong>Nama Importir:</strong> ${doc.importer}<br/>
                  <strong>Alamat Gudang Tujuan:</strong> ${info.warehouseTarget || '-'}<br/>
                  <strong>Tanggal Pengiriman:</strong> ${formattedDate}
                </div>
              </div>
     
              <h3 style="font-size: 12px; margin-bottom: 8px; color: #0f172a; font-weight: 700;">DAFTAR/DETAIL KONTAINER</h3>
              <table>
                <thead>
                  <tr>
                    <th style="width: 8%; text-align: center;">No</th>
                    <th style="width: 45%;">Nomor Container</th>
                    <th style="width: 20%;">Tipe & Ukuran</th>
                    <th style="width: 27%;">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="height-cell" style="text-align: center; padding-top: 15px;">1</td>
                    <td style="padding-top: 15px;"><strong>${cont}</strong></td>
                    <td style="padding-top: 15px;">FCL 40ft HC</td>
                    <td class="height-cell"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="content-bottom">
              <div class="signatures">
                <div class="sig-box">
                  <p class="sig-title">Dibuat Oleh,</p>
                  <div class="sig-space"></div>
                  <p><strong>(${userRole === 'STAFF_AML' ? 'Staff Document' : 'Operasional AML'})</strong></p>
                  <p style="font-size: 10px; color: #64748b; margin-top: 2px;">PT Agung Makmur Logistik</p>
                </div>
                <div class="sig-box">
                  <p class="sig-title">Membawa / Supir,</p>
                  <div class="sig-space"></div>
                  <p><strong>(${info.driverName})</strong></p>
                  <p style="font-size: 10px; color: #64748b; margin-top: 2px;">Logistik Driver</p>
                </div>
                <div class="sig-box">
                  <p class="sig-title">Diterima Oleh,</p>
                  <div class="sig-space"></div>
                  <p><strong>(____________________)</strong></p>
                  <p style="font-size: 10px; color: #64748b; margin-top: 2px;">Gudang Importir</p>
                </div>
              </div>
     
              <div class="footer-note">
                Validasi Dokumen Rekap Elektronik PT Agung Makmur Logistik
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert('Tolong aktifkan izin pop-up browser untuk mencetak Surat Jalan.');
    }
  };

  // Helper colors for status badges
  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Draft PIB':
        return 'bg-indigo-50 border-indigo-200 text-indigo-600';
      case 'Billing DJBC':
        return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'SPPB':
        return 'bg-teal-50 border-teal-200 text-teal-600';
      case 'SPJM':
        return 'bg-pink-50 border-pink-200 text-pink-600';
      case 'NHI':
        return 'bg-purple-50 border-purple-200 text-purple-600';
      case 'SPTNP':
        return 'bg-rose-50 border-rose-200 text-rose-600';
      case 'SPBL':
        return 'bg-red-50 border-red-200 text-red-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No Pengajuan, Importir, No. Invoice, atau B/L..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Filter Status:</span>
          {((userRole === 'STAFF_AML' || isSuperUser) ? ['All', 'Draft PIB', 'Billing DJBC', 'SPPB', 'SPJM', 'NHI'] : ['All', 'SPPB', 'SPJM', 'NHI']).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setDeliveryFilter('All');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                statusFilter === status && deliveryFilter === 'All'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {status === 'Draft PIB' ? 'Draft PIB & PEB' : status}
            </button>
          ))}
          {deliveryFilter !== 'All' && (
            <button
              onClick={() => {
                setDeliveryFilter('All');
                setStatusFilter('All');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold tracking-wide bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Filter Pengiriman: {deliveryFilter === 'Belum Dijadwalkan' ? 'Belum dikirim' : deliveryFilter} ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6 items-start">
        {/* Left Column: Documents List */}
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              DAFTAR DOKUMEN PIB & PEB ({sortedDocs.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">PT AML Database</span>
          </div>

          {sortedDocs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Tidak ada dokumen PIB yang sesuai</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Silakan ubah kata kunci pencarian atau unggah file PIB baru di tab kedua.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div key={doc.id} className="space-y-3">
                    <motion.div
                      layoutId={`doc-card-${doc.id}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDoc(null);
                          setActiveContainer('');
                        } else {
                          setSelectedDoc(doc);
                          const defaultCont = doc.containers[0] || '';
                          setActiveContainer(defaultCont);
                          
                          // Pre-fill delivery inputs if available
                          const info = doc.containers.length > 1 
                            ? doc.deliveryInfoMap?.[defaultCont] 
                            : doc.deliveryInfo;

                          if (info) {
                            setDriverName(info.driverName || '');
                            setDriverPhone(info.driverPhone || '');
                            setPlateNumber(info.plateNumber || '');
                            setWarehouseTarget(info.warehouseTarget || '');
                            setScheduledDate(info.scheduledDate || '');
                            setDeliveryNoteNumber(info.deliveryNoteNumber || `SJ/AML/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
                          } else {
                            setDriverName('');
                            setDriverPhone('');
                            setPlateNumber('');
                            setWarehouseTarget('');
                            setScheduledDate(new Date().toISOString().split('T')[0]);
                            setDeliveryNoteNumber(`SJ/AML/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
                          }
                        }
                      }}
                      className={`p-5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-teal-500 shadow-md shadow-teal-500/5'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">NO PENGAJUAN PIB</span>
                          <p className="text-xs font-mono font-bold text-slate-800 tracking-wide truncate max-w-xs">{doc.noPengajuan}</p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            title="Edit / Revisi Dokumen"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDoc(doc);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Edit3 className="w-3 h-3 text-amber-600" />
                            <span>Edit</span>
                          </button>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(doc.status)}`}>
                            {doc.status === 'Draft PIB' ? 'Draft PIB & PEB' : doc.status}
                          </span>
                          {doc.deliveryPlanned && (
                            <span className="bg-teal-50 text-teal-600 border border-teal-200 px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1">
                              <Truck className="w-2.5 h-2.5" />
                              Planned
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Perusahaan Importir</p>
                          <p className="text-slate-700 font-semibold truncate">{doc.importer}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">No. Invoice (Inv / PL)</p>
                          <p className="text-slate-700 font-mono font-bold truncate">{doc.invPlNo || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">No. Bill of Lading</p>
                          <p className="text-slate-700 font-medium truncate">{doc.blNumber} <span className="text-slate-400 font-mono">({doc.blDate})</span></p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded font-mono text-[9px]" title="Jumlah Container FCL">
                            {doc.containers.length} Ctr
                          </span>
                          <span className="text-slate-500 font-mono text-[10px] truncate max-w-[320px]">
                            Container: {doc.containers.map(c => {
                              const isContPlanned = doc.containers.length > 1 
                                ? !!doc.deliveryInfoMap?.[c] 
                                : doc.deliveryPlanned;
                              return `${getContainerDisplay(c)}${isContPlanned ? ' (Planned)' : ' (Not Planned)'}`;
                            }).join(', ')}
                          </span>
                        </div>
                        
                        <div className="text-teal-600 font-semibold flex items-center gap-1 text-xs">
                          {isSelected ? 'Tutup Detail' : 'Action & Manajemen Status'}
                          <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-250 ${isSelected ? 'rotate-90 text-teal-600' : ''}`} />
                        </div>
                      </div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="bg-slate-50 border border-teal-500/20 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 overflow-hidden"
                        >
                          {/* Panel Header */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                Detail Status PIB dan PEB
                              </h4>
                              <p className="text-slate-500 text-[10px] mt-0.5 font-mono">ID: {doc.id}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                title="Edit / Revisi Dokumen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDoc(doc);
                                }}
                                className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl text-amber-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                Edit / Revisi
                              </button>
                              {isSuperUser && (
                                <button
                                  title="Hapus Dokumen"
                                  onClick={() => {
                                    if (confirm('Apakah Anda yakin ingin menghapus dokumen PIB ini secara permanen dari sistem?')) {
                                      onDeleteDocument(doc.id);
                                      setSelectedDoc(null);
                                    }
                                  }}
                                  className="p-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-rose-600 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Hapus
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedDoc(null)}
                                className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Tutup
                              </button>
                            </div>
                          </div>

                          {/* Status progress overview */}
                          <div>
                            <div className="flex justify-between items-center text-xs font-semibold mb-2">
                              <span className="text-slate-600">Status Saat Ini:</span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusBadge(doc.status)}`}>
                                {doc.status === 'Draft PIB' ? 'Draft PIB & PEB' : doc.status}
                              </span>
                            </div>

                            {/* Flow guide message depending on current status */}
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed mb-4 shadow-sm">
                              {doc.status === 'Draft PIB' && (
                                <p>
                                  💡 <strong>Langkah Berikutnya:</strong> PIB ini baru saja direkap Gemini. Staff kantor perlu mengoordinasikan penerbitan billing kementerian Keuangan (DJBC). Silakan klik <span className="text-amber-600 font-bold">Terbitkan Billing</span> untuk merubah status.
                                </p>
                              )}
                              {doc.status === 'Billing DJBC' && (
                                <div className="space-y-2">
                                  <p>
                                    💡 <strong>Status Pembayaran Billing:</strong> {doc.billingPaid ? '✅ Selesai Dibayar' : '⚠️ Menunggu Pembayaran dari Importir'}
                                  </p>
                                  {!doc.billingPaid ? (
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { billingPaid: true });
                                        setSelectedDoc({ ...doc, billingPaid: true });
                                      }}
                                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      Setujui Pelunasan Billing Importir
                                    </button>
                                  ) : (
                                    <div className="p-2.5 border border-emerald-200 bg-emerald-50 rounded-xl text-[10px] text-emerald-700 font-medium">
                                      Pembayaran Bea Cukai telah divalidasi. Silakan tentukan Respon Resmi Beacukai di bawah untuk rilis kontainer.
                                    </div>
                                  )}
                                </div>
                              )}
                              {doc.status === 'SPJM' && (
                                <div className="space-y-2.5">
                                  <p className="text-pink-600 font-bold">⚠️ Jalur pemeriksaan fisik barang</p>
                                  <p className="text-[11px]">
                                    Kontainer wajib diperiksa oleh aparat Bea Cukai. Selesai pemeriksaan fisik, Bea Cukai akan menerbitkan respon final: SPPB atau SPTNP (Surat Penetapan Tarif/Nilai Pabean).
                                  </p>
                                  {renderSPJMJourney(doc)}
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPPB' });
                                        setSelectedDoc({ ...doc, status: 'SPPB' });
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      Release SPPB
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPTNP', sptnpPaid: false });
                                        setSelectedDoc({ ...doc, status: 'SPTNP', sptnpPaid: false });
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      SPTNP
                                    </button>
                                  </div>
                                </div>
                              )}
                              {doc.status === 'SPTNP' && (
                                <div className="space-y-2.5">
                                  <p className="text-rose-600 font-bold">⚠️ Menunggu Pelunasan SPTNP</p>
                                  <p className="text-[11px]">
                                    Pembayaran tambahan Bea Masuk dari Importir wajib dilunasi terlebih dahulu.
                                  </p>
                                  {!doc.sptnpPaid ? (
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { sptnpPaid: true });
                                        setSelectedDoc({ ...doc, sptnpPaid: true });
                                      }}
                                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      Konfirmasi Pajak SPTNP Telah Dibayar
                                    </button>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="p-1 px-2 border border-emerald-200 bg-emerald-50 rounded-xl text-[10px] text-emerald-700 text-center font-bold">
                                        SPTNP LULUS PELUNASAN
                                      </div>
                                      <button
                                        onClick={() => {
                                          onUpdateDocument(doc.id, { status: 'SPPB' });
                                          setSelectedDoc({ ...doc, status: 'SPPB' });
                                        }}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-xl text-[10px] cursor-pointer"
                                      >
                                        Selesaikan & Terbitkan SPPB Rilis
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {doc.status === 'NHI' && (
                                <div className="space-y-2.5">
                                  <p className="text-purple-600 font-bold">🕵️ Nota Hasil Intelijen (NHI)</p>
                                  <p className="text-[11px]">
                                    Pemeriksaan mendalam atas kecurigaan khusus kepabeanan. Evaluasi keputusan instansi penegak hukum:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPPB' });
                                        setSelectedDoc({ ...doc, status: 'SPPB' });
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      Lulus (Set SPPB)
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPBL' });
                                        setSelectedDoc({ ...doc, status: 'SPBL' });
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-xl text-[10px] cursor-pointer"
                                    >
                                      Re-Ekspor (SPBL)
                                    </button>
                                  </div>
                                </div>
                              )}
                              {doc.status === 'SPBL' && (
                                <p className="text-rose-600">
                                  🛑 <strong>Status Surat Bukti Larangan (SPBL):</strong> Kontainer dilarang masuk Indonesia dan wajib dikembalikan (re-ekspor) ke pelabuhan asal negara importir. Pengiriman dibekukan.
                                </p>
                              )}
                              {doc.status === 'SPPB' && (
                                <p className="text-teal-600 font-bold">
                                  🎉 Dokumen Resmi SPPB Rilis! Kontainer diizinkan keluar depo dan dikirim langsung ke gudang logistik importir.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ACTION MENU TRANSITION STATUS (Untuk Staff AML) */}
                          {(userRole === 'STAFF_AML' || isSuperUser) && (
                            <div className="space-y-3">
                              <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-widest pl-1 font-sans">
                                Ubah Status Berdasarkan Respon DJBC / Bea Cukai
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {/* If current status is Draft PIB */}
                                {doc.status === 'Draft PIB' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'Billing DJBC' });
                                        setSelectedDoc({ ...doc, status: 'Billing DJBC' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                      Billing DJBC
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPPB' });
                                        setSelectedDoc({ ...doc, status: 'SPPB' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      SPPB
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPJM' });
                                        setSelectedDoc({ ...doc, status: 'SPJM' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      SPJM
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'NHI' });
                                        setSelectedDoc({ ...doc, status: 'NHI' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                      NHI
                                    </button>
                                  </>
                                )}

                                {/* If current status is Billing DJBC */}
                                {doc.status === 'Billing DJBC' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'Draft PIB' });
                                        setSelectedDoc({ ...doc, status: 'Draft PIB' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Ubah ke Draft
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPPB' });
                                        setSelectedDoc({ ...doc, status: 'SPPB' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      SPPB
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'SPJM' });
                                        setSelectedDoc({ ...doc, status: 'SPJM' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      SPJM
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'NHI' });
                                        setSelectedDoc({ ...doc, status: 'NHI' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                      NHI
                                    </button>
                                  </>
                                )}

                                {/* If current status is SPPB, SPJM, NHI, SPBL, or SPTNP */}
                                {['SPPB', 'SPJM', 'NHI', 'SPBL', 'SPTNP'].includes(doc.status) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'Billing DJBC' });
                                        setSelectedDoc({ ...doc, status: 'Billing DJBC' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                      Ubah ke Billing
                                    </button>
                                    <button
                                      onClick={() => {
                                        onUpdateDocument(doc.id, { status: 'Draft PIB' });
                                        setSelectedDoc({ ...doc, status: 'Draft PIB' });
                                      }}
                                      className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Ubah ke Draft
                                    </button>
                                    {doc.status !== 'SPPB' && (
                                      <button
                                        onClick={() => {
                                          onUpdateDocument(doc.id, { status: 'SPPB' });
                                          setSelectedDoc({ ...doc, status: 'SPPB' });
                                        }}
                                        className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        SPPB
                                      </button>
                                    )}
                                    {doc.status !== 'SPJM' && (
                                      <button
                                        onClick={() => {
                                          onUpdateDocument(doc.id, { status: 'SPJM' });
                                          setSelectedDoc({ ...doc, status: 'SPJM' });
                                        }}
                                        className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        SPJM
                                      </button>
                                    )}
                                    {doc.status !== 'NHI' && (
                                      <button
                                        onClick={() => {
                                          onUpdateDocument(doc.id, { status: 'NHI' });
                                          setSelectedDoc({ ...doc, status: 'NHI' });
                                        }}
                                        className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                                      >
                                        <Layers className="w-3.5 h-3.5" />
                                        NHI
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* DELIVERY PLANNING SECTION */}
                          {doc.status === 'SPPB' ? (
                            <div className="border-t border-slate-200 pt-4 space-y-4 font-sans">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-teal-600" />
                                  Rencana & Rute Pengiriman
                                </h5>
                                {(doc.containers.length > 1 ? !!doc.deliveryInfoMap?.[activeContainer] : doc.deliveryPlanned) && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.suratJalanDiterima : doc.deliveryInfo?.suratJalanDiterima) && (
                                      <span className="bg-teal-50 border border-teal-200 text-teal-600 text-[10px] px-2 py-0.5 rounded-lg uppercase font-bold flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                                        S.J Diterima Kantor
                                      </span>
                                    )}
                                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] px-2 py-0.5 rounded-lg uppercase font-extrabold text-center">
                                      {(doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.status : doc.deliveryInfo?.status) || 'Belum Dikirim'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Container selector if more than 1 container */}
                              {doc.containers.length > 1 && (
                                <div className="space-y-1.5 mb-2">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Pilih Nomor Container untuk Rencana Pengiriman:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {doc.containers.map((cont) => {
                                      const info = doc.deliveryInfoMap?.[cont];
                                      const status = info?.status || "Belum Dikirim";
                                      const isCurrent = activeContainer === cont;
                                      return (
                                        <button
                                          key={cont}
                                          type="button"
                                          onClick={() => {
                                            setActiveContainer(cont);
                                          }}
                                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isCurrent
                                              ? 'bg-teal-55 border-teal-500 text-teal-700 font-bold bg-teal-50'
                                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="font-mono text-[11px]">{getContainerDisplay(cont)}</span>
                                          <span className={`text-[9px] px-1 py-0.5 rounded-md font-mono ${
                                            status === 'Selesai'
                                              ? 'bg-emerald-50 text-emerald-700 font-bold'
                                              : status === 'Delivery'
                                                ? 'bg-sky-50 text-sky-700 font-bold'
                                                : status === 'Dibatalkan'
                                                  ? 'bg-rose-50 text-rose-700 font-bold'
                                                  : 'bg-slate-100 text-slate-600'
                                          }`}>
                                            {status}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                                <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  {(userRole === 'STAFF_AML' && !isSuperUser) && (
                                    <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs font-semibold mb-2 flex items-center gap-1.5 font-sans">
                                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                      <span>Akses Dibatasi: Hanya Staff Delivery / Super Power yang dapat mengisi Rencana & Rute Pengiriman.</span>
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">
                                      Nomor Surat Jalan PT AML {doc.containers.length > 1 && `(Container: ${getContainerDisplay(activeContainer)})`}
                                    </label>
                                    <input
                                      type="text"
                                      value={deliveryNoteNumber}
                                      onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                                      disabled={(userRole === 'STAFF_AML') && !isSuperUser}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Nama Supir Armada</label>
                                      <input
                                        type="text"
                                        placeholder="Contoh: Ahmad"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                        disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">No. HP Supir</label>
                                      <input
                                        type="text"
                                        placeholder="0812-xxxx"
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Plat Truk Container</label>
                                      <input
                                        type="text"
                                        placeholder="B 9801 UTX"
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Tanggal Pengiriman</label>
                                      <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Gudang / Pelabuhan Tujuan Importir</label>
                                    <input
                                      type="text"
                                      placeholder="Jalan Industri No 12, Cikarang"
                                      value={warehouseTarget}
                                      onChange={(e) => setWarehouseTarget(e.target.value)}
                                      disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Nama Vendor Armada</label>
                                    <select
                                      value={vendorArmada}
                                      onChange={(e) => setVendorArmada(e.target.value)}
                                      disabled={userRole === 'STAFF_AML' && !isSuperUser}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500"
                                    >
                                      <option value="">-- Pilih Vendor Armada --</option>
                                      {VENDOR_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Save plan trigger */}
                                  {(userRole === 'DELIVERY_AML' || isSuperUser) && (
                                  <button
                                    type="button"
                                    onClick={handleSaveDeliveryInfo}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Simpan Rencana & Plot Jalan
                                  </button>
                                )}

                                {/* Print and Status controls on active container scheduled state */}
                                {(doc.containers.length > 1 ? !!doc.deliveryInfoMap?.[activeContainer] : doc.deliveryPlanned) && (
                                  <div className="pt-2.5 border-t border-slate-200 space-y-3 font-sans">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintSuratJalan(doc, activeContainer)}
                                      className="w-full border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-750 text-teal-700 font-bold py-2 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <Printer className="w-4 h-4 text-teal-600" />
                                      Cetak Surat Jalan PT AML (Print PDF - Cont: {getContainerDisplay(activeContainer || doc.containers[0])})
                                    </button>

                                    {/* Delivery status update triggers */}
                                    <div className="space-y-1.5 font-sans">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">Kontrol Status Pengiriman Armada:</p>
                                      <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                          onClick={() => updateDeliveryStatus('Delivery')}
                                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            ((doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.status : doc.deliveryInfo?.status) === 'Delivery')
                                              ? 'bg-sky-500 text-white font-extrabold shadow-sm'
                                              : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                          }`}
                                        >
                                          Delivery
                                        </button>
                                        <button
                                          onClick={() => updateDeliveryStatus('Selesai')}
                                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            ((doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.status : doc.deliveryInfo?.status) === 'Selesai')
                                              ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                                              : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                          }`}
                                        >
                                          Selesai
                                        </button>
                                        <button
                                          onClick={() => updateDeliveryStatus('Dibatalkan')}
                                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                            ((doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.status : doc.deliveryInfo?.status) === 'Dibatalkan')
                                              ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                                              : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                          }`}
                                        >
                                          Batal
                                        </button>
                                      </div>
                                      
                                      {/* Surat Jalan Diterima Toggle Pin */}
                                      <div className="pt-2.5 border-t border-slate-200 mt-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleSuratJalanDiterima()}
                                          className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                                            (doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.suratJalanDiterima : doc.deliveryInfo?.suratJalanDiterima)
                                              ? 'bg-teal-50 border-teal-200 text-teal-700 font-extrabold shadow-sm'
                                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                          }`}
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          {(doc.containers.length > 1 ? doc.deliveryInfoMap?.[activeContainer]?.suratJalanDiterima : doc.deliveryInfo?.suratJalanDiterima)
                                            ? 'Sudah Terima Surat Jalan (Kantor)'
                                            : 'Tandai: Sudah Terima Surat Jalan'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-rose-50 p-4 border border-rose-100 rounded-xl flex items-center gap-3 text-xs text-rose-700">
                              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                              <div>
                                <p className="font-bold">Menunggu Release SPPB Bea Cukai</p>
                                <p className="text-[11px] text-slate-500 font-sans mt-0.5">Rencana pengiriman kontainer dan pencetakan Surat Jalan hanya dapat dilakukan setelah dokumen memperoleh respon final SPPB.</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactivity Panel (Status Controls & Surat Jalan Form) */}
        <div className="hidden xl:col-span-5">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key={selectedDoc.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6"
              >
                {/* Panel Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Detail Status PIB dan PEB
                    </h4>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-mono">ID: {selectedDoc.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Edit / Revisi Dokumen"
                      onClick={() => setEditingDoc(selectedDoc)}
                      className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl text-amber-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      Edit / Revisi
                    </button>
                    {isSuperUser && (
                      <button
                        title="Hapus Dokumen"
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus dokumen PIB ini secara permanen dari sistem?')) {
                            onDeleteDocument(selectedDoc.id);
                            setSelectedDoc(null);
                          }
                        }}
                        className="p-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-rose-700 text-xs transition-colors flex items-center gap-1 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                {/* Status progress overview */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-2">
                    <span className="text-slate-700">Status Saat Ini:</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusBadge(selectedDoc.status)}`}>
                      {selectedDoc.status === 'Draft PIB' ? 'Draft PIB & PEB' : selectedDoc.status}
                    </span>
                  </div>

                  {/* Flow guide message depending on current status */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed mb-4">
                    {selectedDoc.status === 'Draft PIB' && (
                      <p>
                        💡 <strong>Langkah Berikutnya:</strong> PIB ini baru saja direkap Gemini. Staff kantor perlu mengoordinasikan penerbitan billing kementerian Keuangan (DJBC). Silakan klik <span className="text-amber-700 font-bold">Terbitkan Billing</span> untuk merubah status.
                      </p>
                    )}
                    {selectedDoc.status === 'Billing DJBC' && (
                      <div className="space-y-2">
                        <p>
                          💡 <strong>Status Pembayaran Billing:</strong> {selectedDoc.billingPaid ? '✅ Selesai Dibayar' : '⚠️ Menunggu Pembayaran dari Importir'}
                        </p>
                        {!selectedDoc.billingPaid ? (
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { billingPaid: true });
                              setSelectedDoc({ ...selectedDoc, billingPaid: true });
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            Setujui Pelunasan Billing Importir
                          </button>
                        ) : (
                          <div className="p-2 border border-emerald-200 bg-emerald-50 rounded text-[10px] text-emerald-800 font-medium">
                            Pembayaran Bea Cukai telah divalidasi. Silakan tentukan Respon Resmi Beacukai di bawah untuk rilis kontainer.
                          </div>
                        )}
                      </div>
                    )}
                    {selectedDoc.status === 'SPJM' && (
                      <div className="space-y-2.5">
                        <p className="text-pink-700 font-bold">⚠️ Jalur pemeriksaan fisik barang</p>
                        <p className="text-[11px] text-slate-600">
                          Kontainer wajib diperiksa oleh aparat Bea Cukai. Selesai pemeriksaan fisik, Bea Cukai akan menerbitkan respon final: SPPB atau SPTNP (Surat Penetapan Tarif/Nilai Pabean).
                        </p>
                        {renderSPJMJourney(selectedDoc)}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            Release SPPB
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPTNP', sptnpPaid: false });
                              setSelectedDoc({ ...selectedDoc, status: 'SPTNP', sptnpPaid: false });
                            }}
                            className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-2 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            SPTNP
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedDoc.status === 'SPTNP' && (
                      <div className="space-y-2.5">
                        <p className="text-rose-700 font-bold">⚠️ Menunggu Pelunasan SPTNP</p>
                        <p className="text-[11px] text-slate-600">
                          Pembayaran tambahan Bea Masuk dari Importir wajib dilunasi terlebih dahulu.
                        </p>
                        {!selectedDoc.sptnpPaid ? (
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { sptnpPaid: true });
                              setSelectedDoc({ ...selectedDoc, sptnpPaid: true });
                            }}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            Konfirmasi Pajak SPTNP Telah Dibayar
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-1 px-2 border border-emerald-200 bg-emerald-50 rounded text-[10px] text-emerald-800 text-center font-bold">
                              SPTNP LULUS PELUNASAN
                            </div>
                            <button
                              onClick={() => {
                                onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                                setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                              }}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 rounded-lg text-[10px] cursor-pointer shadow-sm"
                            >
                              Selesaikan & Terbitkan SPPB Rilis
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedDoc.status === 'NHI' && (
                      <div className="space-y-2.5">
                        <p className="text-purple-700 font-bold">🕵️ Nota Hasil Intelijen (NHI)</p>
                        <p className="text-[11px] text-slate-600">
                          Pemeriksaan mendalam atas kecurigaan khusus kepabeanan. Evaluasi keputusan instansi penegak hukum:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            Lulus (Set SPPB)
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPBL' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPBL' });
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] cursor-pointer shadow-sm"
                          >
                            Re-Ekspor (SPBL)
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedDoc.status === 'SPBL' && (
                      <p className="text-rose-700 font-bold">
                        🛑 <strong>Status Surat Bukti Larangan (SPBL):</strong> Kontainer dilarang masuk Indonesia dan wajib dikembalikan (re-ekspor) ke pelabuhan asal negara importir. Pengiriman dibekukan.
                      </p>
                    )}
                    {selectedDoc.status === 'SPPB' && (
                      <p className="text-teal-700 font-medium">
                        🎉 Dokumen Resmi SPPB Rilis! Kontainer diizinkan keluar depo dan dikirim langsung ke gudang logistik importir.
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTION MENU TRANSITION STATUS (Untuk Staff / Super User) */}
                {(userRole === 'STAFF_AML' || isSuperUser) && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-widest pl-1">
                      Ubah Status Berdasarkan Respon DJBC / Bea Cukai
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {/* If current status is Draft PIB */}
                      {selectedDoc.status === 'Draft PIB' && (
                        <>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'Billing DJBC' });
                              setSelectedDoc({ ...selectedDoc, status: 'Billing DJBC' });
                            }}
                            className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Billing DJBC
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                            }}
                            className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            SPPB
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPJM' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPJM' });
                            }}
                            className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            SPJM
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'NHI' });
                              setSelectedDoc({ ...selectedDoc, status: 'NHI' });
                            }}
                            className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            NHI
                          </button>
                        </>
                      )}

                      {/* If current status is Billing DJBC */}
                      {selectedDoc.status === 'Billing DJBC' && (
                        <>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'Draft PIB' });
                              setSelectedDoc({ ...selectedDoc, status: 'Draft PIB' });
                            }}
                            className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Ubah ke Draft
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                            }}
                            className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            SPPB
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'SPJM' });
                              setSelectedDoc({ ...selectedDoc, status: 'SPJM' });
                            }}
                            className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            SPJM
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'NHI' });
                              setSelectedDoc({ ...selectedDoc, status: 'NHI' });
                            }}
                            className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            NHI
                          </button>
                        </>
                      )}

                      {/* If current status is SPPB, SPJM, NHI, SPBL, or SPTNP */}
                      {['SPPB', 'SPJM', 'NHI', 'SPBL', 'SPTNP'].includes(selectedDoc.status) && (
                        <>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'Billing DJBC' });
                              setSelectedDoc({ ...selectedDoc, status: 'Billing DJBC' });
                            }}
                            className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Ubah ke Billing
                          </button>
                          <button
                            onClick={() => {
                              onUpdateDocument(selectedDoc.id, { status: 'Draft PIB' });
                              setSelectedDoc({ ...selectedDoc, status: 'Draft PIB' });
                            }}
                            className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Ubah ke Draft
                          </button>
                          {selectedDoc.status !== 'SPPB' && (
                            <button
                              onClick={() => {
                                onUpdateDocument(selectedDoc.id, { status: 'SPPB' });
                                setSelectedDoc({ ...selectedDoc, status: 'SPPB' });
                              }}
                              className="flex items-center justify-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              SPPB
                            </button>
                          )}
                          {selectedDoc.status !== 'SPJM' && (
                            <button
                              onClick={() => {
                                onUpdateDocument(selectedDoc.id, { status: 'SPJM' });
                                setSelectedDoc({ ...selectedDoc, status: 'SPJM' });
                              }}
                              className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              SPJM
                            </button>
                          )}
                          {selectedDoc.status !== 'NHI' && (
                            <button
                              onClick={() => {
                                onUpdateDocument(selectedDoc.id, { status: 'NHI' });
                                setSelectedDoc({ ...selectedDoc, status: 'NHI' });
                              }}
                              className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors shadow-sm"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              NHI
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* DELIVERY PLANNING SECTION */}
                {selectedDoc.status === 'SPPB' ? (
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    {(userRole === 'STAFF_AML' && !isSuperUser) && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold mb-2 flex items-center gap-1.5 font-sans">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Akses Dibatasi: Hanya Staff Delivery / Super Power yang dapat mengisi Rencana & Rute Pengiriman.</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-teal-600" />
                        Rencana & Rute Pengiriman
                      </h5>
                      {selectedDoc.deliveryPlanned && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {selectedDoc.deliveryInfo?.suratJalanDiterima && (
                            <span className="bg-teal-50 border border-teal-200 text-teal-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              S.J Diterima Kantor
                            </span>
                          )}
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                            {selectedDoc.deliveryInfo?.status || 'Belum Dikirim'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Nomor Surat Jalan PT AML</label>
                        <input
                          type="text"
                          value={deliveryNoteNumber}
                          onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                          disabled={userRole === 'STAFF_AML' && !isSuperUser}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Nama Supir Armada</label>
                          <input
                            type="text"
                            placeholder="Contoh: Ahmad"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            disabled={userRole === 'STAFF_AML' && !isSuperUser}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">No. HP Supir</label>
                          <input
                            type="text"
                            placeholder="0812-xxxx"
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            disabled={userRole === 'STAFF_AML' && !isSuperUser}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Plat Truk Container</label>
                          <input
                            type="text"
                            placeholder="B 9801 UTX"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            disabled={userRole === 'STAFF_AML' && !isSuperUser}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Tanggal Pengiriman</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            disabled={userRole === 'STAFF_AML' && !isSuperUser}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Gudang / Pelabuhan Tujuan Importir</label>
                        <input
                          type="text"
                          placeholder="Jalan Industri No 12, Cikarang"
                          value={warehouseTarget}
                          onChange={(e) => setWarehouseTarget(e.target.value)}
                          disabled={userRole === 'STAFF_AML' && !isSuperUser}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 text-[10px] font-bold uppercase tracking-wide mb-1">Nama Vendor Armada</label>
                        <select
                          value={vendorArmada}
                          onChange={(e) => setVendorArmada(e.target.value)}
                          disabled={userRole === 'STAFF_AML' && !isSuperUser}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500 font-sans"
                        >
                          <option value="">-- Pilih Vendor Armada --</option>
                          {VENDOR_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Save plan trigger */}
                      {(userRole === 'DELIVERY_AML' || isSuperUser) && (
                        <button
                          type="button"
                          onClick={handleSaveDeliveryInfo}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-1 font-sans shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Simpan Rencana & Plot Jalan
                        </button>
                      )}

                      {/* Print and Status controls on scheduled state */}
                      {selectedDoc.deliveryPlanned && (
                        <div className="pt-2.5 border-t border-slate-200 space-y-3">
                          <button
                            type="button"
                            onClick={() => handlePrintSuratJalan(selectedDoc, selectedDoc.containers[0] || '')}
                            className="w-full border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold py-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Printer className="w-4 h-4" />
                            Cetak Surat Jalan PT AML (Print PDF - Cont: {getContainerDisplay(selectedDoc.containers[0] || '')})
                          </button>

                          {/* Delivery status update triggers (Used primarily by DELIVERY staff) */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pl-0.5">Kontrol Status Pengiriman Armada:</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => updateDeliveryStatus('Delivery')}
                                className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                                  selectedDoc.deliveryInfo?.status === 'Delivery'
                                    ? 'bg-sky-600 text-white font-extrabold'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                Delivery
                              </button>
                              <button
                                onClick={() => updateDeliveryStatus('Selesai')}
                                className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                                  selectedDoc.deliveryInfo?.status === 'Selesai'
                                    ? 'bg-emerald-600 text-white font-extrabold'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                Selesai
                              </button>
                              <button
                                onClick={() => updateDeliveryStatus('Dibatalkan')}
                                className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                                  selectedDoc.deliveryInfo?.status === 'Dibatalkan'
                                    ? 'bg-rose-600 text-white font-extrabold'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                Batal
                              </button>
                            </div>
                            
                            {/* Surat Jalan Diterima Toggle Button */}
                            <div className="pt-2.5 border-t border-slate-200 mt-2">
                              <button
                                type="button"
                                onClick={() => toggleSuratJalanDiterima()}
                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                                  selectedDoc.deliveryInfo?.suratJalanDiterima
                                    ? 'bg-teal-50 border-teal-200 text-teal-800 font-extrabold shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {selectedDoc.deliveryInfo?.suratJalanDiterima
                                  ? 'Sudah Terima Surat Jalan (Kantor)'
                                  : 'Tandai: Sudah Terima Surat Jalan'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 p-4 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Menunggu Release SPPB Bea Cukai</p>
                      <p className="text-[11px] text-slate-600">Rencana pengiriman kontainer dan pencetakan Surat Jalan hanya dapat dilakukan setelah dokumen memperoleh respon final SPPB.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 min-h-[350px] flex flex-col items-center justify-center space-y-4">
                <Shield className="w-12 h-12 text-slate-400" />
                <div>
                  <h4 className="text-slate-700 font-semibold text-sm">Menunggu Seleksi Dokumen</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 mx-auto leading-relaxed">
                    Silakan pilih salah satu dokumen di daftar sebelah kiri untuk memproses status Bea Cukai, merencanakan rute truk container, dan memvalidasi Surat Jalan PT AML.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit / Revisi Document Modal */}
      <EditDocumentModal
        doc={editingDoc}
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        onSave={async (docId, updates) => {
          await onUpdateDocument(docId, updates);
          if (selectedDoc && selectedDoc.id === docId) {
            _setSelectedDoc(prev => prev ? { ...prev, ...updates } : null);
          }
        }}
      />
    </div>
  );
}
