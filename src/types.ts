export type DocumentStatus = 
  | 'Draft PIB' 
  | 'Billing DJBC' 
  | 'SPPB' 
  | 'SPJM' 
  | 'NHI' 
  | 'SPTNP' 
  | 'SPBL';

export interface DeliveryInfo {
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  warehouseTarget: string;
  scheduledDate: string;
  status: 'Belum Dikirim' | 'Delivery' | 'Selesai' | 'Dibatalkan';
  deliveryNoteNumber: string; // Surat Jalan number e.g., SJ/AML/2026/0001
  suratJalanDiterima?: boolean;
  pengirimanSementara?: string;
  tglMasukDepo?: string;
  vendorDepo?: string;
  pengirimanFinal?: string;
  tglPengirimanFinal?: string;
  vendorPengirimanFinal?: string;
  remark?: string;
  tglPengiriman?: string;
  lokasiBongkar?: string;
  pengiriman?: string;
  vendorPengiriman?: string;
  vendorArmada?: string;
  suratJalan?: string;
  tglKeluarMasuk?: string;
  driverPlat?: string;
  tempatPenimbunan?: string;
}

export interface PIBDocument {
  id: string;
  noPengajuan: string;
  importer: string;
  blNumber: string;
  blDate: string;
  containers: string[];
  uraianBarang: string[];
  status: DocumentStatus;
  billingPaid: boolean;
  sptnpPaid?: boolean;
  createdAt: string;
  deliveryPlanned: boolean;
  spjmStatus?: string;
  deliveryInfo?: DeliveryInfo;
  deliveryInfoMap?: Record<string, DeliveryInfo>;
  billingDate?: string;
  sppbDate?: string;
  invPlNo?: string;
  shipperName?: string;
  poNo?: string;
  product?: string;
  brand?: string;
  vesselName?: string;
  etaPort?: string;
  cargoLocation?: string;
  pol?: string;
  pod?: string;
  currency?: string;
}

export type UserRole = 'STAFF_AML' | 'DELIVERY_AML';

export interface UserSession {
  username: string;
  role: UserRole;
  fullName: string;
  isSuperUser?: boolean;
}
