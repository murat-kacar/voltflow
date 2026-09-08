import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import {
  cashboxTransactions,
  customers,
  materials,
  projectPhases,
  projects,
  suppliers,
  workOrders,
} from "./schema";

async function seed() {
  console.log("⚡ Voltflow ERP Sıfır-NULL Veritabanı Tohumlanıyor...");

  // 1. Sentinel & Müşteriler
  const customerData = [
    {
      id: "CUST-WALKIN",
      name: "Tezgâh Perakende Müşterisi",
      phone: "0500 000 00 00",
      address: "Dükkan Tezgâhı",
      taxOffice: "",
      taxNumber: "",
      customerType: "RETAIL",
      currentBalance: 0,
    },
    {
      id: "cust_demir",
      name: "Demir İnşaat Taahhüt Ltd.",
      phone: "0533 999 88 77",
      address: "Yıldız Sanayi Sit. No: 42",
      taxOffice: "Marmara",
      taxNumber: "1234567890",
      customerType: "CONTRACTOR",
      currentBalance: 85000,
    },
    {
      id: "cust_kemal",
      name: "Kemal Özkan (Villa Sahibi)",
      phone: "0532 555 44 33",
      address: "Park Evleri No: 8",
      taxOffice: "",
      taxNumber: "",
      customerType: "INDIVIDUAL",
      currentBalance: 32500,
    },
    {
      id: "cust_trend",
      name: "Trend Butik (Çarşı)",
      phone: "0544 222 33 44",
      address: "Çarşı Cad. No: 45 / A",
      taxOffice: "Beyoğlu",
      taxNumber: "9876543210",
      customerType: "RETAIL",
      currentBalance: 0,
    },
  ];

  for (const c of customerData) {
    await db
      .insert(customers)
      .values(c)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          name: c.name,
          phone: c.phone,
          address: c.address,
          currentBalance: c.currentBalance,
          updatedAt: new Date(),
        },
      });
  }
  console.log("✓ Müşteriler hazır.");

  // 2. Tedarikçiler (Toptancılar)
  const supplierData = [
    {
      id: "supp_oznur",
      companyName: "Öznur Kablo San. ve Tic. A.Ş.",
      phone: "0212 555 01 01",
      contactName: "Murat Bey (Toptan Satış)",
      address: "Güngören Sanayi Sit.",
      currentBalance: 42000,
    },
    {
      id: "supp_schneider",
      companyName: "Schneider Electric Türkiye Bölge Bayii",
      phone: "0216 444 02 02",
      contactName: "Selin Hanım",
      address: "Ataşehir Finans Merkezi Yanı",
      currentBalance: 18500,
    },
    {
      id: "supp_viko",
      companyName: "Viko Panasonic Toptan Dağıtım Ltd.",
      phone: "0216 333 03 03",
      contactName: "Gökhan Bey",
      address: "Samandıra Toptancılar Sitesi",
      currentBalance: 0,
    },
  ];

  for (const s of supplierData) {
    await db
      .insert(suppliers)
      .values(s)
      .onConflictDoUpdate({
        target: suppliers.id,
        set: {
          companyName: s.companyName,
          phone: s.phone,
          contactName: s.contactName,
          address: s.address,
          currentBalance: s.currentBalance,
          updatedAt: new Date(),
        },
      });
  }
  console.log("✓ Toptancılar hazır.");

  // 3. Stok Malzemeleri
  const materialData = [
    {
      id: "m_1",
      code: "KBL-3X2.5",
      barcode: "86900010001",
      name: "Hes Kablo 3x2.5mm² Antigron",
      category: "KABLO",
      unit: "metre",
      quantity: 450,
      minStockAlert: 100,
      purchasePriceWithoutVat: 22.0,
      salePriceWithVat: 34.5,
      vatRate: 20,
      shelfLocation: "A-01",
    },
    {
      id: "m_2",
      code: "SGT-16A",
      barcode: "86900010002",
      name: "Schneider 16A B Tipi Otomat Sigorta",
      category: "SALT_SIGORTA",
      unit: "adet",
      quantity: 85,
      minStockAlert: 20,
      purchasePriceWithoutVat: 95.0,
      salePriceWithVat: 145.0,
      vatRate: 20,
      shelfLocation: "B-03",
    },
    {
      id: "m_3",
      code: "KAR-40A",
      barcode: "86900010003",
      name: "Siemens 40A 30mA Kaçak Akım Rölesi",
      category: "SALT_SIGORTA",
      unit: "adet",
      quantity: 18,
      minStockAlert: 5,
      purchasePriceWithoutVat: 620.0,
      salePriceWithVat: 890.0,
      vatRate: 20,
      shelfLocation: "B-04",
    },
    {
      id: "m_4",
      code: "PRZ-VIKO",
      barcode: "86900010004",
      name: "Viko Karre Topraklı Priz (Beyaz)",
      category: "PRIZ_ANAHTAR",
      unit: "adet",
      quantity: 120,
      minStockAlert: 30,
      purchasePriceWithoutVat: 42.0,
      salePriceWithVat: 68.0,
      vatRate: 20,
      shelfLocation: "C-01",
    },
    {
      id: "m_5",
      code: "ANH-VIKO",
      barcode: "86900010005",
      name: "Viko Karre Tekli Anahtar",
      category: "PRIZ_ANAHTAR",
      unit: "adet",
      quantity: 90,
      minStockAlert: 25,
      purchasePriceWithoutVat: 38.0,
      salePriceWithVat: 62.0,
      vatRate: 20,
      shelfLocation: "C-02",
    },
    {
      id: "m_6",
      code: "LED-SPOT",
      barcode: "86900010006",
      name: "Philips 7W Sıva Altı LED Spot",
      category: "AYDINLATMA",
      unit: "adet",
      quantity: 60,
      minStockAlert: 15,
      purchasePriceWithoutVat: 68.0,
      salePriceWithVat: 110.0,
      vatRate: 20,
      shelfLocation: "D-02",
    },
    {
      id: "m_7",
      code: "KLM-WAGO",
      barcode: "86900010007",
      name: "Wago 221-413 3'lü Buat Klemensi",
      category: "SARF",
      unit: "adet",
      quantity: 500,
      minStockAlert: 100,
      purchasePriceWithoutVat: 8.5,
      salePriceWithVat: 14.0,
      vatRate: 20,
      shelfLocation: "E-01",
    },
    {
      id: "m_8",
      code: "BND-IZOLE",
      barcode: "86900010008",
      name: "Globe PVC Elektrik İzolasyon Bandı",
      category: "SARF",
      unit: "adet",
      quantity: 150,
      minStockAlert: 30,
      purchasePriceWithoutVat: 9.0,
      salePriceWithVat: 18.0,
      vatRate: 20,
      shelfLocation: "E-05",
    },
  ];

  for (const m of materialData) {
    await db
      .insert(materials)
      .values(m)
      .onConflictDoUpdate({
        target: materials.id,
        set: {
          code: m.code,
          name: m.name,
          category: m.category,
          quantity: m.quantity,
          salePriceWithVat: m.salePriceWithVat,
          purchasePriceWithoutVat: m.purchasePriceWithoutVat,
          updatedAt: new Date(),
        },
      });
  }
  console.log("✓ Malzemeler hazır.");

  // 4. Şantiyeler ve Aşamaları
  await db
    .insert(projects)
    .values({
      id: "proj_gunes",
      name: "Güneş Sitesi 12 Daireli Bina Tesisatı",
      customerId: "cust_demir",
      siteAddress: "Yıldız Mah. 402 Sok. No: 12",
      contractAmount: 450000,
      status: "IN_PROGRESS",
      notes: "Demir İnşaat ana taahhüt sözleşmesi",
      createdById: "PATRON",
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const gunesPhases = [
    {
      id: "phase_g1",
      projectId: "proj_gunes",
      name: "1. Kaba İnşaat & Borulama",
      orderIndex: 1,
      status: "COMPLETED",
      progressPercentage: 100,
    },
    {
      id: "phase_g2",
      projectId: "proj_gunes",
      name: "2. Linye & Kablo Çekimi",
      orderIndex: 2,
      status: "IN_PROGRESS",
      progressPercentage: 75,
    },
    {
      id: "phase_g3",
      projectId: "proj_gunes",
      name: "3. Kat Panoları & Sigortalar",
      orderIndex: 3,
      status: "IN_PROGRESS",
      progressPercentage: 20,
    },
    {
      id: "phase_g4",
      projectId: "proj_gunes",
      name: "4. Armatür, Anahtar & Priz Montajı",
      orderIndex: 4,
      status: "PENDING",
      progressPercentage: 0,
    },
  ];

  for (const p of gunesPhases) {
    await db
      .insert(projectPhases)
      .values({
        ...p,
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  await db
    .insert(projects)
    .values({
      id: "proj_villa",
      name: "Park Evleri Villa Akıllı Ev Altyapısı",
      customerId: "cust_kemal",
      siteAddress: "Park Evleri No: 8",
      contractAmount: 180000,
      status: "IN_PROGRESS",
      notes: "KNX akıllı ev altyapısı",
      createdById: "PATRON",
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const villaPhases = [
    {
      id: "phase_v1",
      projectId: "proj_villa",
      name: "1. Altyapı Borulama",
      orderIndex: 1,
      status: "COMPLETED",
      progressPercentage: 100,
    },
    {
      id: "phase_v2",
      projectId: "proj_villa",
      name: "2. Cat6 & KNX Kablolama",
      orderIndex: 2,
      status: "IN_PROGRESS",
      progressPercentage: 20,
    },
    {
      id: "phase_v3",
      projectId: "proj_villa",
      name: "3. Ana Pano & Otomasyon",
      orderIndex: 3,
      status: "PENDING",
      progressPercentage: 0,
    },
  ];

  for (const p of villaPhases) {
    await db
      .insert(projectPhases)
      .values({
        ...p,
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
  console.log("✓ Şantiyeler ve aşamalar hazır.");

  // 5. İş Emirleri
  const workOrderData = [
    {
      id: "wo_101",
      orderNumber: "IS-2026-001",
      orderType: "SERVICE_CALL",
      customerId: "cust_kemal",
      title: "Daire İçi Kaçak Akım Arızası ve Linye Onarımı",
      description: "Ana pano sigortası sürekli atıyor kontrol edilecek",
      address: "Atatürk Mah. Karanfil Sok. No: 14 D: 6",
      priority: "HIGH",
      status: "ASSIGNED",
      assignedUserId: "Ahmet Usta",
      laborCost: 750,
      totalMaterialCost: 890,
      grandTotal: 1640,
      createdById: "SEKRETER",
    },
    {
      id: "wo_102",
      orderNumber: "IS-2026-002",
      orderType: "SERVICE_CALL",
      customerId: "cust_trend",
      title: "Mağaza Ray Spot ve Pano Montajı",
      description: "Yeni vitrin spotları ve monofaze ray montajı",
      address: "Çarşı Cad. No: 45 / A",
      priority: "NORMAL",
      status: "COMPLETED",
      assignedUserId: "Mustafa Usta",
      laborCost: 1500,
      totalMaterialCost: 880,
      grandTotal: 2380,
      createdById: "SEKRETER",
    },
  ];

  for (const wo of workOrderData) {
    await db
      .insert(workOrders)
      .values({
        ...wo,
        projectId: "",
        projectPhaseId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
  console.log("✓ İş emirleri hazır.");

  // 6. Kasa Açılış Hareketi (18.450 ₺ Nakit)
  const [existingCashbox] = await db
    .select()
    .from(cashboxTransactions)
    .limit(1);
  if (!existingCashbox) {
    await db.insert(cashboxTransactions).values({
      id: randomUUID(),
      direction: "INFLOW",
      amount: 18450,
      paymentMethod: "CASH",
      category: "COLLECTION",
      description: "Dönem Başı Kasa Nakit Devri",
      referenceId: "DEVIR-2026",
      createdById: "PATRON",
      createdAt: new Date(),
    });
    console.log("✓ Kasa devir hareketi işlendi: 18.450 ₺.");
  }

  console.log("🎉 Voltflow ERP veritabanı tohumlama başarıyla tamamlandı!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Tohumlama hatası:", err);
  process.exit(1);
});
