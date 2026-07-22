import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc as firestoreDoc, 
  deleteDoc, 
  query 
} from "firebase/firestore";

// Load environment variables
dotenv.config();

// Fixes for ESModule path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON parser with larger limits for base64 file uploads
app.use(express.json({ limit: "50mb" }));

const dbPath = path.resolve(__dirname, "db.json");

// Helper to read database
function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      return { documents: [] };
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading db.json:", err);
    return { documents: [] };
  }
}

// Helper to write database
function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to db.json:", err);
  }
}

// Initialize database with backup if needed
if (!fs.existsSync(dbPath)) {
  writeDb({ documents: [] });
}

// Initialize Firebase Firestore conditionally
let firestoreDb: any = null;
try {
  const configPath = path.resolve(__dirname, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (firebaseConfig.projectId && firebaseConfig.projectId !== "placeholder-project") {
      const firebaseApp = initializeApp(firebaseConfig);
      firestoreDb = getFirestore(firebaseApp);
      console.log("Firebase Firestore successfully initialized on backend. Project ID:", firebaseConfig.projectId);
    } else {
      console.log("Using local JSON database fallback (firebase-applet-config.json contains placeholder values).");
    }
  } else {
    console.warn("firebase-applet-config.json not found. Falling back to local db.json.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase on backend, using db.json fallback:", err);
}

// Firestore / Local DB abstract interfaces
async function getAllDocuments() {
  if (firestoreDb) {
    try {
      const docsCol = collection(firestoreDb, "documents");
      const q = query(docsCol);
      const querySnapshot = await getDocs(q);
      const docsList: any[] = [];
      querySnapshot.forEach((doc) => {
        docsList.push({ ...doc.data() });
      });
      // Sort by createdAt descending (most recent first)
      docsList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      return docsList;
    } catch (err) {
      console.error("Error fetching from Firestore, falling back to local database:", err);
      return readDb().documents;
    }
  }
  return readDb().documents;
}

async function saveDocument(docData: any) {
  if (firestoreDb) {
    try {
      const docRef = firestoreDoc(firestoreDb, "documents", docData.id);
      await setDoc(docRef, docData);
      console.log(`Document ${docData.id} saved to Firestore.`);
      
      // Keep local db in sync as backup
      const localDb = readDb();
      localDb.documents = localDb.documents.filter((d: any) => d.id !== docData.id);
      localDb.documents.unshift(docData);
      writeDb(localDb);
      return;
    } catch (err) {
      console.error("Error saving to Firestore, writing to local database instead:", err);
    }
  }
  
  const localDb = readDb();
  localDb.documents = localDb.documents.filter((d: any) => d.id !== docData.id);
  localDb.documents.unshift(docData);
  writeDb(localDb);
}

async function deleteDocument(id: string) {
  if (firestoreDb) {
    try {
      const docRef = firestoreDoc(firestoreDb, "documents", id);
      await deleteDoc(docRef);
      console.log(`Document ${id} deleted from Firestore.`);
      
      // Sync local db
      const localDb = readDb();
      localDb.documents = localDb.documents.filter((d: any) => d.id !== id);
      writeDb(localDb);
      return true;
    } catch (err) {
      console.error("Error deleting from Firestore, applying to local database:", err);
    }
  }
  
  const localDb = readDb();
  const initialLength = localDb.documents.length;
  localDb.documents = localDb.documents.filter((d: any) => d.id !== id);
  writeDb(localDb);
  return localDb.documents.length !== initialLength;
}

// API Routes

// 1. Get all documents
app.get("/api/documents", async (req, res) => {
  try {
    const docs = await getAllDocuments();
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add or manual update of a document
app.post("/api/documents", async (req, res) => {
  try {
    const docData = req.body;
    if (!docData.id) {
      docData.id = "pib-" + Date.now();
    }
    if (!docData.createdAt) {
      docData.createdAt = new Date().toISOString();
    }
    
    // Clean dates or fields
    docData.deliveryPlanned = docData.deliveryPlanned || false;
    
    await saveDocument(docData);
    res.json({ success: true, document: docData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update document status or info
app.put("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Retrieve the document first
    const docs = await getAllDocuments();
    const existingDoc = docs.find((d: any) => d.id === id);
    if (!existingDoc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const updatedDoc = {
      ...existingDoc,
      ...updates
    };
    
    await saveDocument(updatedDoc);
    res.json({ success: true, document: updatedDoc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete document
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteDocument(id);
    if (!success) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, message: `Document ${id} successfully deleted` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Parse PIB PDF file with Gemini AI
app.post("/api/parse-pib", async (req, res) => {
  const { fileBytesBase64, filename, mockOption } = req.body;

  // Let's check if the API key is valid or missing, or if we want to mock
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyMissing = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "";

  // If user requests a mock option or API key is missing
  if (mockOption || isKeyMissing) {
    // Generate a beautiful, realistic PIB parsing response instantly
    console.log(`Using mock parsing (Missing API Key: ${isKeyMissing}, mockOption: ${mockOption})`);
    
    // Create random but realistic data based on Indonesian customs
    const mockCompanies = [
      "PT INDO GLOBAL DISTRIBUSI", 
      "PT JAYA MAJU MANDIRI", 
      "PT SUMBER TRADA INDONESIA", 
      "PT MULTI JAYA LOGISTIK",
      "PT INDOFOOD MAJU LOGISTIK"
    ];
    const itemCatalog = [
      [
        "POLYCARBONATE RESIN PELLETS GRADE B",
        "PLASTIC RAW MATERIAL GRANULES HS 3907.40",
        "CALCIUM CARBONATE FILLER POWDER",
        "OCTADECYL HYDROXYSTEARATE DISPERSION",
        "TITANIUM DIOXIDE MASTERBATCH WHITE"
      ],
      [
        "STAINLESS STEEL BOLTS AND NUTS ASSORTED",
        "CARBON STEEL SOCKET WRENCHES",
        "METAL SCREWS TYPE-M4",
        "STEEL HAND TOOLS PACK"
      ],
      [
        "CHILLER COMPRESSOR PARTS S-30",
        "COPPER REFRIGERANT PIPES 1/4 INCH",
        "EXPANSION VALVES FOR REFRIGERATION",
        "E-STAT DIGITAL THERMOSTAT CONTROLLER"
      ],
      [
        "FROZEN POTATO FRENCH FRIES CRINKLE CUT",
        "CANOLA COOKING OIL REFINED",
        "FROZEN MOZZARELLA CHEESE STICKS",
        "PARMESAN CHEESE POWDER 1KG"
      ]
    ];

    const randomCompany = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];
    const chosenItems = itemCatalog[Math.floor(Math.random() * itemCatalog.length)];
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const randomPengajuan = `20260520-${Math.floor(100000+Math.random()*900000)}-${Math.floor(100000+Math.random()*900000)}-${randomSuffix}`;
    const blNum = `BL/MAERSK/${Math.floor(10000000+Math.random()*90000000)}`;
    const randomContainers = [
      `MSKU${Math.floor(1000000 + Math.random() * 9000000)} (40ft)`,
      `OOLU${Math.floor(1000000 + Math.random() * 9000000)} (20ft)`
    ].slice(0, Math.floor(Math.random() * 2) + 1);

    const parsedResult = {
      noPengajuan: randomPengajuan,
      importer: randomCompany,
      blNumber: blNum,
      blDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      containers: randomContainers,
      uraianBarang: chosenItems
    };

    return res.json({
      success: true,
      parsedData: parsedResult,
      isMock: true,
      message: isKeyMissing 
        ? "Berhasil memproses dengan Gemini-Simulasi (Silakan tambahkan GEMINI_API_KEY di Secrets untuk parsing PDF asli)."
        : "Berhasil memproses simulasi PIB."
    });
  }

  try {
    // Correct Server-Side initialization using name parameters and standard import
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Extract base64 and mimeType dynamically
    let rawBase64 = fileBytesBase64 || "";
    let detectedMimeType = "application/pdf";

    if (rawBase64.startsWith("data:")) {
      const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMimeType = match[1];
        rawBase64 = match[2];
      }
    } else if (rawBase64.includes(";base64,")) {
      const parts = rawBase64.split(";base64,");
      if (parts[0].startsWith("data:")) {
        detectedMimeType = parts[0].replace("data:", "");
      }
      rawBase64 = parts[1];
    }

    // Fallback mimeType based on filename extension if needed
    if (filename) {
      const lower = filename.toLowerCase();
      if (lower.endsWith(".png")) detectedMimeType = "image/png";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) detectedMimeType = "image/jpeg";
      else if (lower.endsWith(".webp")) detectedMimeType = "image/webp";
      else if (lower.endsWith(".pdf")) detectedMimeType = "application/pdf";
    }

    const filePart = {
      inlineData: {
        mimeType: detectedMimeType,
        data: rawBase64
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        filePart,
        {
          text: "Silakan baca dokumen PIB (Pemberitahuan Impor Barang) ini dan ekstrak data-data penting berikut menjadi response JSON yang rapi." +
                "Kriteria ekstraksi:\n" +
                "1. noPengajuan: Nomor Pengajuan PIB (terdiri dari 24 digit angka, biasanya ditulis dalam format dipisah strip/spasi, contoh: 050100-002154-...)\n" +
                "2. importer: Nama importir lengkap dan jelas (contoh: PT INDO FOOD MANDIRI)\n" +
                "3. blNumber: Nomor Bill of Lading (B/L) lengkap\n" +
                "4. blDate: Tanggal Bill of Lading lengkap (Format: YYYY-MM-DD)\n" +
                "5. containers: List dari semua nomor container yang disebutkan dalam dokumen, lengkap dengan ukuran/size kontainer ditulis di dalam kurung di samping nomor kontainer tersebut, contoh: MSKU1849204 (40ft) atau OOLU1234567 (20ft). Cari informasi ukuran ini (biasanya 20ft, 40ft, dll) di dekat daftar kontainer pada dokumen.\n" +
                "6. uraianBarang: List detail deskripsi uraian barang (jenis barang). Jika ada lebih dari 5 jenis barang, ambil maksimal 5 jenis barang saja secara rinci."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            noPengajuan: { 
              type: Type.STRING, 
              description: "Nomor Pengajuan PIB (biasanya 24 rentetan angka dengan atau tanpa strip)" 
            },
            importer: { 
              type: Type.STRING, 
              description: "Nama perusahaan importir penerima barang" 
            },
            blNumber: { 
              type: Type.STRING, 
              description: "Nomor Bill of Lading (B/L)" 
            },
            blDate: { 
              type: Type.STRING, 
              description: "Tanggal Bill of Lading dalam format YYYY-MM-DD" 
            },
            containers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Seluruh nomor container beserta ukurannya dalam kurung (misalnya: OOLU1234567 (20ft), MSKU1849204 (40ft))"
            },
            uraianBarang: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Daftar deskripsi/nama barang utama impor (maksimal 5 item)"
            }
          },
          required: ["noPengajuan", "importer", "blNumber", "blDate", "containers", "uraianBarang"]
        }
      }
    });

    const parsedJsonText = response.text?.trim() || "{}";
    const dataObj = JSON.parse(parsedJsonText);

    res.json({
      success: true,
      parsedData: dataObj,
      isMock: false
    });

  } catch (error: any) {
    console.error("Gemini Parsing Error: ", error);
    res.status(500).json({
      error: "Gagal memproses dokumen dengan Gemini AI.",
      details: error.message || error
    });
  }
});

// Vite Middleware Setup

// Integrate Vite server in development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`PT AML Logistik Portal running on http://localhost:${PORT}`);
});
