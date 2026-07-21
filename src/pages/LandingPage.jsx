import React, { useState, useEffect, useRef } from 'react';
import '../LandingPage.css';

import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Simulator from '../components/landing/Simulator';
import Features from '../components/landing/Features';
import Architecture from '../components/landing/Architecture';
import ThreatModel from '../components/landing/ThreatModel';
import IntegrationCode from '../components/landing/IntegrationCode';
import Footer from '../components/landing/Footer';

// ============================================================
// TRANSLATIONS (Multi-Language: ID / EN)
// ============================================================
const translations = {
  id: {
    navFeatures: 'Fitur',
    navDemo: 'Integrity Demo',
    navArchitecture: 'Arsitektur',
    navThreat: 'Ancaman Keamanan',
    navIntegration: 'Integrasi SDK',
    navLogin: 'Sistem Login',
    navContact: 'Hubungi Tim Kami',
    heroBadge: 'IMMUTABLE AUDIT TRAIL MIDDLEWARE',
    heroTitle1: 'Lindungi Integritas Data',
    heroTitleHighlight: 'Sistem Anda',
    heroTitle2: 'dari Manipulasi, Selamanya',
    heroSubtitle:
      'Auditchain Gateway mengunci setiap perubahan data di sistem Anda ke dalam blockchain — memastikan audit trail yang tidak bisa dimanipulasi, tanpa mengubah satu baris kode pun di sistem yang sudah berjalan.',
    heroBtn1: 'Lihat Demo Simulator',
    heroBtn2: 'Pelajari Fitur Utama',
    simTitle: 'Live Cryptographic Integrity Simulator',
    simSubtitle:
      'Simulasikan bagaimana peretas mengubah database SIMRS lokal secara diam-diam dan bagaimana mesin verifikasi kriptografis Auditchain mendeteksinya.',
    simTableTitle: 'Database SIMRS Klien (Tabel Audit Log)',
    simConnected: 'Connected via CDC',
    simColTimestamp: 'Timestamp',
    simColActor: 'Actor',
    simColAction: 'Action',
    simColResource: 'Resource',
    simColMetadata: 'Metadata',
    simColSourceSystem: 'Source System',
    simColVerification: 'Verification',
    simDbLabel: 'Audit database lokal: PostgreSQL',
    simTamperBtn: 'Simulasikan Peretasan (Ubah Data)',
    simRestoreBtn: 'Reset Demo Simulasi',
    simVerifyTitle: '2-Layer Verification Engine (Gateway Audit)',
    simVerifying: 'Memverifikasi Perubahan...',
    simIntact: '✓ SELURUH DATA TERVERIFIKASI',
    simBroken: '🚨 INTEGRITAS DATA RUSAK',
    simVerifyingDesc: 'Memindai ledger audit & menghitung ulang tanda tangan kriptografi...',
    simBrokenDesc: 'Peringatan: Hash transaksi saat ini berbeda dengan hash yang terkunci di Hyperledger Fabric.',
    simIntactDesc: 'Semua log audit lokal cocok dengan ledger immutable pada blockchain Hyperledger Fabric.',
    simScanLabel: 'Scanning...',
    simHashLabel: 'Hashing...',
    simSyncLabel: 'Syncing...',
    featuresTag: 'Pilar Keamanan Utama',
    featuresTitle: 'Arsitektur Audit Tingkat Perusahaan',
    feat1Title: 'Zero Code Intrusion',
    feat1Desc: 'Integrasikan pipeline CDC langsung dari database tanpa perlu memodifikasi kode program backend SIMRS atau sistem utama Anda.',
    feat2Title: 'High-Throughput Ingestion',
    feat2Desc: 'Didukung antrean asinkron Redis Queue yang mampu memproses ribuan log data per detik dengan latensi di bawah 1 milidetik.',
    feat3Title: 'Merkle Tree Aggregation',
    feat3Desc: 'Pengelompokan log transaksi kriptografi menggunakan Merkle Root untuk efisiensi transaksi database & write blockchain.',
    feat4Title: 'Cryptographic Local Chain',
    feat4Desc: 'Setiap baris log audit dikunci menggunakan PreviousHash berantai di database PostgreSQL lokal untuk mencegah penghapusan data sepihak.',
    feat5Title: '3-Layer Verification',
    feat5Desc: 'Mesin verifikasi real-time yang membandingkan integritas data operasional lokal dengan konsensus blockchain secara otomatis.',
    feat6Title: 'Interactive Auditor Dashboard',
    feat6Desc: 'Visualisasikan perubahan data dalam Diff Viewer, monitoring status kesehatan global, dan telusuri inventaris tabel data log.',
    archTag: 'Aliran Data Otomatis',
    archTitle: 'Bagaimana Data Anda Diamankan',
    archSubtitle: 'Klik salah satu langkah di bawah untuk mempelajari siklus hidup log transaksi dari SIMRS hingga blockchain.',
    archStepLabel: 'LANGKAH ',
    archStatusLabel: 'Status: Active & Listening',
    threatTag: 'Zero-Trust Security',
    threatTitle: 'Model Deteksi Ancaman',
    threatSubtitle: 'Bukti teknis mengapa manipulasi data mustahil dilakukan tanpa terdeteksi.',
    threat1Title: 'Hacker Mengubah Data DB',
    threat1Desc: 'Peretas memperbarui tagihan medis SIMRS secara paksa di PostgreSQL.',
    threat2Title: 'Hacker Memanipulasi Nilai Hash',
    threat2Desc: 'Peretas mengubah hash lokal di DB agar cocok dengan tagihan palsunya.',
    threat3Title: 'Hacker Menghapus Baris Log',
    threat3Desc: 'Peretas mencoba menghilangkan jejak dengan menghapus baris log audit.',
    integTag: 'Integrasi Cepat',
    integTitle: 'Setup Sederhana, Pengamanan Instan',
    integDesc: 'Auditchain dirancang agar ramah bagi para pengembang. Gunakan REST API murni, agen CDC Docker, atau pilih SDK untuk bahasa pemrograman favorit Anda guna mengaktifkan audit trail di sistem Anda dalam hitungan menit.',
    techLabel: 'Didukung Oleh Teknologi Standar Industri',
    ctaTitle: 'Siap Mengamankan Integritas Data Sistem Anda?',
    ctaSubtitle: 'Bergabunglah dengan rumah sakit dan lembaga fintech terkemuka yang telah mempercayakan penguncian log auditnya pada Auditchain Gateway.',
    ctaBtn: 'Hubungi Tim Kami',
    footerPlatform: 'Platform',
    footerCompliance: 'Kepatuhan',
    footerDocs: 'Developer Docs',
    footerCopyright: '© 2026 Auditchain Gateway. Dilindungi Undang-Undang.',
    footerStatus: 'Seluruh sistem berjalan normal',
  },
  en: {
    navFeatures: 'Features',
    navDemo: 'Integrity Demo',
    navArchitecture: 'Architecture',
    navThreat: 'Security Threats',
    navIntegration: 'SDK Integration',
    navLogin: 'Login System',
    navContact: 'Contact Our Team',
    heroBadge: 'IMMUTABLE AUDIT TRAIL MIDDLEWARE',
    heroTitle1: 'Protect Your',
    heroTitleHighlight: "System's Data Integrity",
    heroTitle2: 'from Manipulation, Forever',
    heroSubtitle:
      'Auditchain Gateway locks every data change in your system into the blockchain — ensuring a tamper-proof audit trail without changing a single line of code in your existing system.',
    heroBtn1: 'View Live Demo',
    heroBtn2: 'Explore Features',
    simTitle: 'Live Cryptographic Integrity Simulator',
    simSubtitle:
      "Simulate how an attacker silently alters a local database and how Auditchain's cryptographic verification engine detects it in real-time.",
    simTableTitle: 'Client SIMRS Database (Audit Log Table)',
    simConnected: 'Connected via CDC',
    simColTimestamp: 'Timestamp',
    simColActor: 'Actor',
    simColAction: 'Action',
    simColResource: 'Resource',
    simColMetadata: 'Metadata',
    simColSourceSystem: 'Source System',
    simColVerification: 'Verification',
    simDbLabel: 'Local audit database: PostgreSQL',
    simTamperBtn: 'Simulate Breach (Alter Data)',
    simRestoreBtn: 'Reset Demo Simulation',
    simVerifyTitle: '2-Layer Verification Engine (Gateway Audit)',
    simVerifying: 'Verifying Changes...',
    simIntact: '✓ ALL DATA VERIFIED',
    simBroken: '🚨 DATA INTEGRITY COMPROMISED',
    simVerifyingDesc: 'Scanning audit ledger & recalculating cryptographic signatures...',
    simBrokenDesc: 'Warning: Current transaction hash differs from the hash locked in Hyperledger Fabric.',
    simIntactDesc: 'All local audit logs match the immutable ledger on Hyperledger Fabric blockchain.',
    simScanLabel: 'Scanning...',
    simHashLabel: 'Hashing...',
    simSyncLabel: 'Syncing...',
    featuresTag: 'Core Security Pillars',
    featuresTitle: 'Enterprise-Grade Audit Architecture',
    feat1Title: 'Zero Code Intrusion',
    feat1Desc: 'Integrate a CDC pipeline directly from your database without modifying any backend code in your SIMRS or core system.',
    feat2Title: 'High-Throughput Ingestion',
    feat2Desc: 'Powered by an async Redis Queue capable of processing thousands of log events per second with sub-millisecond latency.',
    feat3Title: 'Merkle Tree Aggregation',
    feat3Desc: 'Aggregate cryptographic transaction logs using Merkle Root for efficient database transactions and blockchain writes.',
    feat4Title: 'Cryptographic Local Chain',
    feat4Desc: 'Every audit log row is locked using a chained PreviousHash in local PostgreSQL to prevent unilateral data deletion.',
    feat5Title: '3-Layer Verification',
    feat5Desc: 'A real-time verification engine that automatically compares local operational data integrity against blockchain consensus.',
    feat6Title: 'Interactive Auditor Dashboard',
    feat6Desc: 'Visualize data changes in a Diff Viewer, monitor global health status, and browse your audit log table inventory.',
    archTag: 'Automated Data Flow',
    archTitle: 'How Your Data is Secured',
    archSubtitle: 'Click any step below to learn about the lifecycle of a transaction log from your system to the blockchain.',
    archStepLabel: 'STEP ',
    archStatusLabel: 'Status: Active & Listening',
    threatTag: 'Zero-Trust Security',
    threatTitle: 'Threat Detection Model',
    threatSubtitle: 'Technical proof of why data manipulation is impossible without detection.',
    threat1Title: 'Attacker Alters DB Data',
    threat1Desc: 'Attacker forcefully updates SIMRS medical billing records directly in PostgreSQL.',
    threat2Title: 'Attacker Manipulates Hash Values',
    threat2Desc: 'Attacker modifies local hash in DB to match their fraudulent billing record.',
    threat3Title: 'Attacker Deletes Log Rows',
    threat3Desc: 'Attacker attempts to erase their tracks by deleting audit log rows.',
    integTag: 'Quick Integration',
    integTitle: 'Simple Setup, Instant Security',
    integDesc: 'Auditchain is built developer-first. Use a pure REST API, Docker CDC agent, or pick an SDK in your preferred programming language to enable audit trails in your system within minutes.',
    techLabel: 'Powered by Industry-Standard Technologies',
    ctaTitle: "Ready to Secure Your System's Data Integrity?",
    ctaSubtitle: 'Join leading hospitals and fintech institutions that have trusted Auditchain Gateway to lock their audit logs immutably.',
    ctaBtn: 'Contact Our Team',
    footerPlatform: 'Platform',
    footerCompliance: 'Compliance',
    footerDocs: 'Developer Docs',
    footerCopyright: '© 2026 Auditchain Gateway. All Rights Reserved.',
    footerStatus: 'All systems operational',
  },
};

const INITIAL_AUDIT_LOGS = [
  { id: 'LOG001', timestamp: '21/7/2026, 08.12.04.311', actor: 'RSIA_BUNDA', action: 'INSERT', resource: 'BILLING_RECORD:7821', metadata: '{"TOTAL": "Rp5.200.000", "STATUS": "LUNAS"}', sourceSystem: 'SIMRS Morbis 2', verification: 'VALID', tampered: false },
  { id: 'LOG002', timestamp: '21/7/2026, 08.15.22.887', actor: 'POLINEMA', action: 'UPDATE', resource: 'PASIEN_DATA:4491', metadata: '{"NAMA": "Dewi Kartika", "KELAS": "I"}', sourceSystem: 'SIMRS Morbis 2', verification: 'VALID', tampered: false },
  { id: 'LOG003', timestamp: '21/7/2026, 08.27.45.132', actor: 'RSU_SAKIT_HATI', action: 'UPDATE', resource: 'TINDAKAN:9034', metadata: '{"KODE": "86.22", "BIAYA": "Rp750.000"}', sourceSystem: 'SIM-RS Vmedis', verification: 'VALID', tampered: false },
  { id: 'LOG004', timestamp: '21/7/2026, 08.34.11.554', actor: 'RSIA_BUNDA', action: 'DELETE', resource: 'JADWAL_DOKTER:2201', metadata: '{"DOKTER_ID": "D042", "SLOT": "09:00"}', sourceSystem: 'SIMRS Morbis 2', verification: 'VALID', tampered: false },
  { id: 'LOG005', timestamp: '21/7/2026, 08.41.59.003', actor: 'RS_PRIMA', action: 'INSERT', resource: 'RESEP:6612', metadata: '{"OBAT": "Amoxicillin", "DOSIS": "500mg"}', sourceSystem: 'SIM-RS Intrahealth', verification: 'VALID', tampered: false },
  { id: 'LOG006', timestamp: '21/7/2026, 08.53.17.441', actor: 'RSUD_MALANG', action: 'INSERT', resource: 'DIAGNOSA:1104', metadata: '{"ICD10": "J18.9", "KETERANGAN": "Pneumonia"}', sourceSystem: 'SIMRS Morbis 2', verification: 'VALID', tampered: false },
  { id: 'LOG007', timestamp: '21/7/2026, 09.02.38.799', actor: 'RS_PRIMA', action: 'UPDATE', resource: 'LAB_RESULT:8831', metadata: '{"HB": "12.4", "LEUKOSIT": "8200"}', sourceSystem: 'SIM-RS Intrahealth', verification: 'VALID', tampered: false },
  { id: 'LOG008', timestamp: '21/7/2026, 09.11.05.224', actor: 'POLINEMA', action: 'INSERT', resource: 'RAWAT_JALAN:3375', metadata: '{"POLI": "Penyakit Dalam", "ANTRIAN": "A-017"}', sourceSystem: 'SIMRS Morbis 2', verification: 'VALID', tampered: false },
];

const INTEGRITY_LAYERS = {
  clientdb: {
    title: 'Layer 1: Database Client (Gateway Middleware)',
    desc: 'Memeriksa keberadaan & konsistensi log audit pada database PostgreSQL middleware Auditchain Gateway. Setiap event dari sistem klien divalidasi keberadaannya sebelum diproses lebih lanjut.',
  },
  localdb: {
    title: 'Layer 2: Local Cryptographic Chain',
    desc: 'Memverifikasi integritas rantai kriptografi lokal menggunakan SHA3-256 dan PreviousHash berantai. Setiap baris log dikunci satu sama lain — penghapusan atau perubahan satu baris akan langsung terdeteksi.',
  },
  blockchain: {
    title: 'Anchor: Blockchain Consensus (Hyperledger Fabric)',
    desc: 'Mencocokkan Merkle Root dari rantai lokal dengan ledger Hyperledger Fabric yang terdistribusi. Ini adalah jangkar final yang menjamin tidak ada manipulasi tersembunyi.',
  },
};

const INTEGRITY_LAYERS_EN = {
  clientdb: {
    title: 'Layer 1: Client Database (Gateway Middleware)',
    desc: 'Checks the existence and consistency of audit logs in the Auditchain Gateway PostgreSQL middleware database. Every event from client systems is validated before further processing.',
  },
  localdb: {
    title: 'Layer 2: Local Cryptographic Chain',
    desc: 'Verifies the integrity of the local cryptographic chain using SHA3-256 and chained PreviousHash. Each log row is locked to the next — deletion or alteration of any single row is immediately detected.',
  },
  blockchain: {
    title: 'Anchor: Blockchain Consensus (Hyperledger Fabric)',
    desc: 'Matches the Merkle Root from the local chain against the distributed Hyperledger Fabric ledger. This is the final anchor guaranteeing no hidden manipulation.',
  },
};

const DATA_FLOW_STEPS_ID = [
  { id: 1, name: 'CDC Capture', icon: 'database', title: 'Change Data Capture (CDC)', desc: 'Agen CDC berbasis Debezium memantau log transaksi PostgreSQL SIMRS secara real-time tanpa mengganggu database utama.' },
  { id: 2, name: 'API Ingestion', icon: 'api', title: 'API Ingestion Layer', desc: 'Event payload dikirim ke API Gateway menggunakan protokol HTTPS berenkripsi tinggi dan token otorisasi JWT.' },
  { id: 3, name: 'Redis Queue Buffer', icon: 'reorder', title: 'Asynchronous Ingestion (Redis)', desc: 'Event ditampung di Redis Queue agar database operasional terbebas dari overhead penulisan blockchain yang lambat.' },
  { id: 4, name: 'Local Chaining', icon: 'link', title: 'Cryptographic Local Chain', desc: 'Worker menghitung SHA3-256 log saat ini dan mengaitkannya dengan hash log sebelumnya untuk membentuk rantai lokal.' },
  { id: 5, name: 'Merkle Root Anchor', icon: 'account_tree', title: 'Merkle Tree Aggregation', desc: 'Ratusan log digabungkan menjadi satu Merkle Tree. Hanya nilai root tunggal yang dikirim ke jaringan Blockchain.' },
  { id: 6, name: 'Blockchain Consensus', icon: 'verified', title: 'Hyperledger Fabric Anchoring', desc: 'Merkle Root ditulis secara permanen ke dalam ledger blockchain terdistribusi yang tidak bisa dimanipulasi sama sekali.' },
];

const DATA_FLOW_STEPS_EN = [
  { id: 1, name: 'CDC Capture', icon: 'database', title: 'Change Data Capture (CDC)', desc: 'A Debezium-based CDC agent monitors PostgreSQL SIMRS transaction logs in real-time without disrupting the main database.' },
  { id: 2, name: 'API Ingestion', icon: 'api', title: 'API Ingestion Layer', desc: 'Event payloads are sent to the API Gateway using highly-encrypted HTTPS protocol with JWT authorization tokens.' },
  { id: 3, name: 'Redis Queue Buffer', icon: 'reorder', title: 'Asynchronous Ingestion (Redis)', desc: 'Events are buffered in a Redis Queue so the operational database is free from the overhead of slow blockchain writes.' },
  { id: 4, name: 'Local Chaining', icon: 'link', title: 'Cryptographic Local Chain', desc: "A worker calculates the SHA3-256 of the current log and links it with the previous log's hash to form a local chain." },
  { id: 5, name: 'Merkle Root Anchor', icon: 'account_tree', title: 'Merkle Tree Aggregation', desc: 'Hundreds of logs are aggregated into a single Merkle Tree. Only one root value is sent to the blockchain network.' },
  { id: 6, name: 'Blockchain Consensus', icon: 'verified', title: 'Hyperledger Fabric Anchoring', desc: 'The Merkle Root is permanently written to a distributed blockchain ledger that cannot be manipulated under any circumstance.' },
];

const WA_LINK = 'https://wa.me/';

function LandingPage() {
  const [lang, setLang] = useState('id');
  const t = translations[lang];
  const INTEGRITY_LAYERS_CURRENT = lang === 'id' ? INTEGRITY_LAYERS : INTEGRITY_LAYERS_EN;
  const DATA_FLOW_STEPS = lang === 'id' ? DATA_FLOW_STEPS_ID : DATA_FLOW_STEPS_EN;

  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [isTampered, setIsTampered] = useState(false);
  const [verificationState, setVerificationState] = useState({
    scanning: false, clientdb: 'secured', localdb: 'secured', blockchain: 'secured',
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState('go');
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef({});

  // IntersectionObserver for active nav highlighting
  useEffect(() => {
    const sections = ['features', 'simulator', 'architecture', 'threat-model', 'integration'];
    const observers = [];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      sectionRefs.current[id] = el;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Auto-verify on audit log data change
  useEffect(() => {
    if (isTampered) {
      setVerificationState({ scanning: true, clientdb: 'secured', localdb: 'scanning', blockchain: 'scanning' });
      const timer = setTimeout(() => {
        setVerificationState({ scanning: false, clientdb: 'secured', localdb: 'failed', blockchain: 'failed' });
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setVerificationState({ scanning: true, clientdb: 'scanning', localdb: 'scanning', blockchain: 'scanning' });
      const timer = setTimeout(() => {
        setVerificationState({ scanning: false, clientdb: 'secured', localdb: 'secured', blockchain: 'secured' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [auditLogs, isTampered]);

  const handleTamper = () => {
    setIsTampered(true);
    setAuditLogs((prev) =>
      prev.map((log, idx) => {
        if (idx === 1) return { ...log, action: 'DELETE', metadata: '{"NAMA": "** DIHAPUS **", "KELAS": "??"}', verification: 'INVALID', tampered: true };
        if (idx === 3) return { ...log, resource: 'JADWAL_DOKTER:0000', metadata: '{"DOKTER_ID": "D000", "SLOT": "??"}', verification: 'INVALID', tampered: true };
        return log;
      })
    );
  };

  const handleRestore = () => {
    setIsTampered(false);
    setAuditLogs(INITIAL_AUDIT_LOGS);
  };

  const renderCodeSnippet = () => {
    const snippets = {
      go: `// Inisialisasi Auditchain Publisher Agent di Go
package main

import (
    "context"
    "github.com/auditchain/gateway/agent"
)

func main() {
    config := agent.Config{
        GatewayURL: "https://gateway.auditchain.io",
        AppID:      "simrs-production-01",
        APIKey:     "sec_key_live_x8F9a7B...",
        CDCEnabled: true,
    }

    publisher, err := agent.NewPublisher(config)
    if err != nil {
        panic(err)
    }

    // Mendengarkan perubahan data secara otomatis
    publisher.Start(context.Background())
}`,
      node: `// Node.js Express Middleware Integration
const { AuditchainClient } = require('@auditchain/gateway-sdk');

const audit = new AuditchainClient({
  apiKey: 'sec_key_live_x8F9a7B...',
  endpoint: 'https://gateway.auditchain.io'
});

// Middleware to validate audit activity logs in real-time
app.use(async (req, res, next) => {
  if (req.method !== 'GET') {
    await audit.anchorLog({
      action: \`\${req.method} \${req.path}\`,
      actor: req.user?.id || 'anonymous',
      payload: req.body,
      timestamp: new Date()
    });
  }
  next();
});`,
      curl: `# Jalankan Ingestion log langsung via CURL
curl -X POST https://gateway.auditchain.io/v1/logs \\
  -H "Authorization: Bearer sec_key_live_x8F9a7B..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "patient_billing",
    "operation": "UPDATE",
    "previous_hash": "a5c7f802194a...",
    "payload": {
      "patient_id": "P092",
      "bill_amount": 8750000
    }
  }'`,
    };
    return snippets[activeTab];
  };

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 85;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const navLinks = [
    { href: '#features', label: t.navFeatures, id: 'features' },
    { href: '#simulator', label: t.navDemo, id: 'simulator' },
    { href: '#architecture', label: t.navArchitecture, id: 'architecture' },
    { href: '#threat-model', label: t.navThreat, id: 'threat-model' },
    { href: '#integration', label: t.navIntegration, id: 'integration' },
  ];

  return (
    <div className="lp-root">
      <Navbar
        t={t}
        lang={lang}
        setLang={setLang}
        navLinks={navLinks}
        handleNavClick={handleNavClick}
        activeSection={activeSection}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        waLink={WA_LINK}
      />
      <Hero t={t} handleNavClick={handleNavClick} />
      <Simulator
        t={t}
        auditLogs={auditLogs}
        isTampered={isTampered}
        handleTamper={handleTamper}
        handleRestore={handleRestore}
        verificationState={verificationState}
        integrityLayers={INTEGRITY_LAYERS_CURRENT}
      />
      <Features t={t} />
      <Architecture
        t={t}
        dataFlowSteps={DATA_FLOW_STEPS}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
      />
      <ThreatModel t={t} />
      <IntegrationCode
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        renderCodeSnippet={renderCodeSnippet}
      />
      <Footer t={t} waLink={WA_LINK} />
    </div>
  );
}

export { LandingPage };
export default LandingPage;
