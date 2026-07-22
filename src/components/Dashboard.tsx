import React from 'react';
import { PIBDocument, DocumentStatus, DeliveryInfo } from '../types';
import { Clipboard, DollarSign, CheckCircle2, ShieldCheck, Eye, Compass, Truck, Users, Activity, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { SpjmIcon } from './SpjmIcon';
import { SppbIcon } from './SppbIcon';
import { NhiIcon } from './NhiIcon';

interface DashboardProps {
  documents: PIBDocument[];
  onNavigateToTab: (index: number) => void;
  userFullName: string;
  userRole: 'STAFF_AML' | 'DELIVERY_AML';
  isSuperUser?: boolean;
  onSelectStatusFilter: (status: DocumentStatus) => void;
  onSelectDeliveryFilter: (delFilter: string) => void;
}

export default function Dashboard({ 
  documents, 
  onNavigateToTab, 
  userFullName, 
  userRole, 
  isSuperUser,
  onSelectStatusFilter, 
  onSelectDeliveryFilter 
}: DashboardProps) {
  // Compute Stats
  const totalDocs = documents.length;
  
  const countStats = (status: DocumentStatus) => documents.filter(doc => doc.status === status).length;
  
  const draftCount = countStats('Draft PIB');
  const billingCount = countStats('Billing DJBC');
  const sppbCount = countStats('SPPB');
  const spjmCount = countStats('SPJM');
  const nhiCount = countStats('NHI');
  
  // Custom states like paid billing
  const unpaidBilling = documents.filter(doc => doc.status === 'Billing DJBC' && !doc.billingPaid).length;
  const paidBilling = documents.filter(doc => doc.status === 'Billing DJBC' && doc.billingPaid).length;

  const totalDeliveries = documents.filter(doc => doc.status === 'SPPB').length;
  const deliveryPlanned = documents.filter(doc => doc.status === 'SPPB' && doc.deliveryPlanned).length;
  
  const activeDeliveries = documents.filter(doc => {
    if (doc.status !== 'SPPB') return false;
    if (doc.containers && doc.containers.length > 1) {
      return (Object.values(doc.deliveryInfoMap || {}) as (DeliveryInfo | undefined)[]).some(x => x?.status === 'Delivery');
    }
    return doc.deliveryInfo?.status === 'Delivery';
  }).length;

  const completedDeliveries = documents.filter(doc => {
    if (doc.status !== 'SPPB') return false;
    if (doc.containers && doc.containers.length > 1) {
      return (Object.values(doc.deliveryInfoMap || {}) as (DeliveryInfo | undefined)[]).some(x => x?.status === 'Selesai');
    }
    return doc.deliveryInfo?.status === 'Selesai';
  }).length;

  // Get all container numbers that are SPPB but not yet sent (neither Delivery nor Selesai)
  const unsentContainers: { containerNumber: string; importer: string; docId: string }[] = [];
  documents.forEach(doc => {
    if (doc.status === 'SPPB') {
      doc.containers.forEach(container => {
        let status: string | undefined;
        if (doc.containers.length > 1) {
          status = doc.deliveryInfoMap?.[container]?.status;
        } else {
          status = doc.deliveryInfo?.status;
        }
        
        if (status !== 'Delivery' && status !== 'Selesai') {
          unsentContainers.push({
            containerNumber: container,
            importer: doc.importer,
            docId: doc.id
          });
        }
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-200/40">
            {isSuperUser ? '👑 Akun Super Power PT AML & Delivery' : userRole === 'STAFF_AML' ? 'Staff Document' : 'Staff Armada / Delivery'}
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            Selamat Datang, {userFullName}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Gunakan portal ini untuk merekap dokumen PIB, monitoring respon BC, serta melakukan rencana/pemantauan armada pengiriman.
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab(isSuperUser ? 1 : userRole === 'STAFF_AML' ? 1 : 2)}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-white transition-all bg-teal-50 hover:bg-teal-600 px-4 py-2.5 border border-teal-200 rounded-xl cursor-pointer self-stretch md:self-auto text-center justify-center shadow-sm"
        >
          {isSuperUser ? 'Upload PIB & PEB Baru' : userRole === 'STAFF_AML' ? 'Unggah Dokumen PIB Baru' : 'Lihat Rencana Pengiriman'}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Statistics Cards */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1 mt-6">
        monitoring status document PIB and PEB
      </h3>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${(userRole === 'STAFF_AML' || isSuperUser) ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-4`}>
        {/* Draft PIB */}
        {(userRole === 'STAFF_AML' || isSuperUser) && (
          <div 
            onClick={() => onSelectStatusFilter('Draft PIB')}
            className="bg-slate-800/50 border border-slate-700/60 p-5 rounded-xl flex items-start justify-between hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">Draft PIB & PEB</p>
              <p className="text-3xl font-bold text-indigo-400 font-sans">{draftCount}</p>
              <p className="text-[11px] text-slate-500">Selesai rekap Gemini</p>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Clipboard className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        )}

        {/* Billing DJBC */}
        {(userRole === 'STAFF_AML' || isSuperUser) && (
          <div 
            onClick={() => onSelectStatusFilter('Billing DJBC')}
            className="bg-slate-800/50 border border-slate-700/60 p-5 rounded-xl flex items-start justify-between hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">Billing DJBC</p>
              <p className="text-3xl font-bold text-amber-400 font-sans">{billingCount}</p>
              <p className="text-[11px] text-amber-500 font-medium">
                {unpaidBilling} Belum Lunas
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Surat Persetujuan Pengeluaran barang (SPPB) */}
        <div 
          onClick={() => onSelectStatusFilter('SPPB')}
          className="bg-slate-800/50 border border-teal-500/30 p-5 rounded-xl shadow-lg shadow-teal-500/5 flex items-start justify-between hover:border-teal-500/55 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-teal-400 group-hover:text-teal-300 transition-colors leading-tight">Surat Persetujuan Pengeluaran barang (SPPB)</p>
            <p className="text-3xl font-bold text-teal-400 font-sans">{sppbCount}</p>
            <p className="text-[11px] text-teal-500/80">Release Documents</p>
          </div>
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
            <SppbIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Surat Pemeriksaan Jalur Merah (SPJM) */}
        <div 
          onClick={() => onSelectStatusFilter('SPJM')}
          className="bg-slate-800/50 border border-slate-700/60 p-5 rounded-xl flex items-start justify-between hover:border-teal-500/55 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rose-400 group-hover:text-rose-300 transition-colors leading-tight">Surat Pemeriksaan Jalur Merah (SPJM)</p>
            <p className="text-3xl font-bold text-rose-400 font-sans">{spjmCount}</p>
            <p className="text-[11px] text-slate-500">Pemeriksaan Fisik Barang</p>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <SpjmIcon className="w-5 h-5" />
          </div>
        </div>

        {/* NHI */}
        <div 
          onClick={() => onSelectStatusFilter('NHI')}
          className="bg-slate-800/50 border border-slate-700/60 p-5 rounded-xl flex items-start justify-between hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors">Nota Hasil Intelijen (NHI)</p>
            <p className="text-3xl font-bold text-fuchsia-400 font-sans">{nhiCount}</p>
            <p className="text-[11px] text-slate-500">Pemeriksaan Fisik Barang Menyeluruh</p>
          </div>
          <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 rounded-xl">
            <NhiIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Delivery Board (MOVED UP FOR DESIRED SWAPPED PLACEMENT) */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-1 mt-6">
        Monitoring Pengiriman Container
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onSelectDeliveryFilter('All')}
          className="bg-slate-800/50 border border-slate-700/40 p-4 rounded-xl space-y-1.5 text-center hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <p className="text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">Total SPPB</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white font-sans">
            <SppbIcon className="w-5 h-5 text-teal-400" />
            {totalDeliveries}
          </div>
          <p className="text-[11px] text-slate-500">Document Imports/Exports</p>
        </div>

        <div 
          onClick={() => onSelectDeliveryFilter('Belum Dijadwalkan')}
          className="bg-slate-800/50 border border-slate-700/40 p-4 rounded-xl space-y-1.5 text-center hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <p className="text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">Belum dikirim</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-amber-400 font-sans">
            <Clipboard className="w-5 h-5 text-amber-400" />
            {unsentContainers.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium font-sans">Kontainer siap kirim</p>
        </div>

        <div 
          onClick={() => onSelectDeliveryFilter('Delivery')}
          className="bg-slate-800/50 border border-slate-700/40 p-4 rounded-xl space-y-1.5 text-center hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <p className="text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">Sedang Dikirim</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-sky-400 font-sans">
            <Truck className="w-5 h-5" />
            {activeDeliveries}
          </div>
          <p className="text-[11px] text-slate-500 font-medium font-sans">Supir dalam perjalanan</p>
        </div>

        <div 
          onClick={() => onSelectDeliveryFilter('Selesai')}
          className="bg-slate-800/50 border border-slate-700/40 p-4 rounded-xl space-y-1.5 text-center hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
        >
          <p className="text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">Selesai Dikirim</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-400 font-sans">
            <CheckCircle2 className="w-5 h-5 animate-pulse" />
            {completedDeliveries}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Sampai di gudang importir</p>
        </div>
      </div>

      {/* Process & Flow Guidelines explanation (Sesuai Aturan Transisi Status - MOVED DOWN FOR DESIRED SWAPPED PLACEMENT) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Compass className="w-4 h-4 text-teal-600" />
          Alur & Aturan Status Dokumen Kepabeanan
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-650">
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-150">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold flex items-center justify-center">1</span>
              <p className="font-bold text-slate-800">Draft PIB & Billing DJBC</p>
            </div>
            <p className="leading-relaxed">
              Dokumen yang baru diupload otomatis dikategorikan sebagai <span className="text-indigo-650 font-semibold">Draft PIB</span>. Setelah billing diterbitkan oleh DJBC, status dipindahkan ke <span className="text-amber-650 font-semibold">Billing DJBC</span> untuk memonitor pelunasan pajak/bea dari Importir sebelum respon kontainer terbit.
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-150">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold flex items-center justify-center">2</span>
              <p className="font-bold text-slate-800">Evaluasi & Pemeriksaan Fisik</p>
            </div>
            <p className="leading-relaxed">
              Jika BC memberikan respon selain kelancaran langsung:
              <br />
              • <span className="text-rose-600 font-semibold">SPJM (Jalur Merah)</span>: Petugas harus mengajukan pemeriksaan fisik barang. Selesai diperiksa, status akan berubah menjadi SPPB atau diterbitkan beban pajak <span className="text-indigo-650 font-semibold">SPTNP</span> yang wajib dilunasi terlebih dahulu.
              <br />
              • <span className="text-fuchsia-600 font-semibold">NHI (Nota Hasil Intelijen)</span>: Kontainer dilarang keluar karena kecurigaan khusus. Selesai diaudit, status berujung SPPB atau wajib re-ekspor <span className="text-rose-600 font-semibold">(SPBL)</span>.
            </p>
          </div>

          <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-150">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 border border-teal-200 text-[10px] font-bold flex items-center justify-center">3</span>
              <p className="font-bold text-slate-800">SPPB & Delivery Plans</p>
            </div>
            <p className="leading-relaxed">
              Respon akhir <span className="text-teal-600 font-bold">SPPB</span> mengonfirmasi nomor container telah memperoleh release formal dari Bea Cukai. Staff kantor dapat segera merencanakan armada, mencantumkan supir, plat truk, pelabuhan/gudang tujuan, dan mencetak <span className="text-teal-600 font-semibold">Surat Jalan PT AML</span> untuk dibawa supir armada delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
