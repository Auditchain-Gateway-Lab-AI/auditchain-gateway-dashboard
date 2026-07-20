import { useState, useEffect, useRef } from 'react';

// ============================================================
// TRANSLATIONS (Multi-Language: ID / EN)
// ============================================================
const translations = {
  id: {
    // Navbar
    navFeatures: 'Fitur',
    navDemo: 'Integrity Demo',
    navArchitecture: 'Arsitektur',
    navThreat: 'Ancaman Keamanan',
    navIntegration: 'Integrasi SDK',
    navLogin: 'Sistem Login',
    navContact: 'Hubungi Tim Kami',

    // Hero
    heroBadge: 'IMMUTABLE AUDIT TRAIL MIDDLEWARE',
    heroTitle1: 'Lindungi Integritas Data',
    heroTitleHighlight: 'Sistem Anda',
    heroTitle2: 'dari Manipulasi, Selamanya',
    heroSubtitle:
      'Auditchain Gateway mengunci setiap perubahan data di sistem Anda ke dalam blockchain — memastikan audit trail yang tidak bisa dimanipulasi, tanpa mengubah satu baris kode pun di sistem yang sudah berjalan.',
    heroBtn1: 'Lihat Demo Simulator',
    heroBtn2: 'Pelajari Fitur Utama',

    // Simulator
    simTitle: 'Live Cryptographic Integrity Simulator',
    simSubtitle:
      'Simulasikan bagaimana peretas mengubah database SIMRS lokal secara diam-diam dan bagaimana mesin verifikasi kriptografis Auditchain mendeteksinya.',
    simTableTitle: 'Database SIMRS Klien (Tabel Billing)',
    simConnected: 'Connected via CDC',
    simColId: 'Pasien ID',
    simColName: 'Nama',
    simColDiagnosis: 'Diagnosis',
    simColBilling: 'Tagihan (IDR)',
    simColHash: 'Row Hash',
    simDbLabel: 'Audit database lokal: PostgreSQL',
    simTamperBtn: 'Simulasikan Peretasan (Ubah Data)',
    simRestoreBtn: 'Pulihkan Data Klien (Restore)',
    simVerifyTitle: '3-Layer Verification Engine (Gateway Audit)',
    simVerifying: 'Memverifikasi Perubahan...',
    simIntact: '✓ SELURUH DATA TERVERIFIKASI',
    simBroken: '🚨 INTEGRITAS DATA RUSAK',
    simVerifyingDesc: 'Memindai ledger audit & menghitung ulang tanda tangan kriptografi...',
    simBrokenDesc: 'Peringatan: Hash transaksi saat ini berbeda dengan hash yang terkunci di Hyperledger Fabric.',
    simIntactDesc: 'Semua log audit lokal cocok dengan ledger immutable pada blockchain Hyperledger Fabric.',
    simScanLabel: 'Scanning...',
    simHashLabel: 'Hashing...',
    simSyncLabel: 'Syncing...',

    // Features
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

    // Architecture
    archTag: 'Aliran Data Otomatis',
    archTitle: 'Bagaimana Data Anda Diamankan',
    archSubtitle: 'Klik salah satu langkah di bawah untuk mempelajari siklus hidup log transaksi dari SIMRS hingga blockchain.',
    archStepLabel: 'LANGKAH 0',
    archStatusLabel: 'Status: Active & Listening',

    // Threat Model
    threatTag: 'Zero-Trust Security',
    threatTitle: 'Model Deteksi Ancaman',
    threatSubtitle: 'Bukti teknis mengapa manipulasi data mustahil dilakukan tanpa terdeteksi.',
    threat1Title: 'Hacker Mengubah Data DB',
    threat1Desc: 'Peretas memperbarui tagihan medis SIMRS secara paksa di PostgreSQL.',
    threat2Title: 'Hacker Memanipulasi Nilai Hash',
    threat2Desc: 'Peretas mengubah hash lokal di DB agar cocok dengan tagihan palsunya.',
    threat3Title: 'Hacker Menghapus Baris Log',
    threat3Desc: 'Peretas mencoba menghilangkan jejak dengan menghapus baris log audit.',

    // Integration
    integTag: 'Integrasi Cepat',
    integTitle: 'Setup Sederhana, Pengamanan Instan',
    integDesc: 'Auditchain dirancang agar ramah bagi para pengembang. Gunakan REST API murni, agen CDC Docker, atau pilih SDK untuk bahasa pemrograman favorit Anda guna mengaktifkan audit trail di sistem Anda dalam hitungan menit.',

    // Tech Stack
    techLabel: 'Didukung Oleh Teknologi Standar Industri',

    // CTA
    ctaTitle: 'Siap Mengamankan Integritas Data Sistem Anda?',
    ctaSubtitle: 'Bergabunglah dengan rumah sakit dan lembaga fintech terkemuka yang telah mempercayakan penguncian log auditnya pada Auditchain Gateway.',
    ctaBtn: 'Hubungi Tim Kami',

    // Footer
    footerPlatform: 'Platform',
    footerCompliance: 'Kepatuhan',
    footerDocs: 'Developer Docs',
    footerCopyright: '© 2026 Auditchain Gateway. Dilindungi Undang-Undang.',
    footerStatus: 'Seluruh sistem berjalan normal',
  },

  en: {
    // Navbar
    navFeatures: 'Features',
    navDemo: 'Integrity Demo',
    navArchitecture: 'Architecture',
    navThreat: 'Security Threats',
    navIntegration: 'SDK Integration',
    navLogin: 'Login System',
    navContact: 'Contact Our Team',

    // Hero
    heroBadge: 'IMMUTABLE AUDIT TRAIL MIDDLEWARE',
    heroTitle1: 'Protect Your',
    heroTitleHighlight: "System's Data Integrity",
    heroTitle2: 'from Manipulation, Forever',
    heroSubtitle:
      'Auditchain Gateway locks every data change in your system into the blockchain — ensuring a tamper-proof audit trail without changing a single line of code in your existing system.',
    heroBtn1: 'View Live Demo',
    heroBtn2: 'Explore Features',

    // Simulator
    simTitle: 'Live Cryptographic Integrity Simulator',
    simSubtitle:
      'Simulate how an attacker silently alters a local database and how Auditchain\'s cryptographic verification engine detects it in real-time.',
    simTableTitle: 'Client SIMRS Database (Billing Table)',
    simConnected: 'Connected via CDC',
    simColId: 'Patient ID',
    simColName: 'Name',
    simColDiagnosis: 'Diagnosis',
    simColBilling: 'Billing (IDR)',
    simColHash: 'Row Hash',
    simDbLabel: 'Local audit database: PostgreSQL',
    simTamperBtn: 'Simulate Breach (Alter Data)',
    simRestoreBtn: 'Restore Client Data',
    simVerifyTitle: '3-Layer Verification Engine (Gateway Audit)',
    simVerifying: 'Verifying Changes...',
    simIntact: '✓ ALL DATA VERIFIED',
    simBroken: '🚨 DATA INTEGRITY COMPROMISED',
    simVerifyingDesc: 'Scanning audit ledger & recalculating cryptographic signatures...',
    simBrokenDesc: 'Warning: Current transaction hash differs from the hash locked in Hyperledger Fabric.',
    simIntactDesc: 'All local audit logs match the immutable ledger on Hyperledger Fabric blockchain.',
    simScanLabel: 'Scanning...',
    simHashLabel: 'Hashing...',
    simSyncLabel: 'Syncing...',

    // Features
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

    // Architecture
    archTag: 'Automated Data Flow',
    archTitle: 'How Your Data is Secured',
    archSubtitle: 'Click any step below to learn about the lifecycle of a transaction log from your system to the blockchain.',
    archStepLabel: 'STEP 0',
    archStatusLabel: 'Status: Active & Listening',

    // Threat Model
    threatTag: 'Zero-Trust Security',
    threatTitle: 'Threat Detection Model',
    threatSubtitle: 'Technical proof of why data manipulation is impossible without detection.',
    threat1Title: 'Attacker Alters DB Data',
    threat1Desc: 'Attacker forcefully updates SIMRS medical billing records directly in PostgreSQL.',
    threat2Title: 'Attacker Manipulates Hash Values',
    threat2Desc: 'Attacker modifies local hash in DB to match their fraudulent billing record.',
    threat3Title: 'Attacker Deletes Log Rows',
    threat3Desc: 'Attacker attempts to erase their tracks by deleting audit log rows.',

    // Integration
    integTag: 'Quick Integration',
    integTitle: 'Simple Setup, Instant Security',
    integDesc: 'Auditchain is built developer-first. Use a pure REST API, Docker CDC agent, or pick an SDK in your preferred programming language to enable audit trails in your system within minutes.',

    // Tech Stack
    techLabel: 'Powered by Industry-Standard Technologies',

    // CTA
    ctaTitle: 'Ready to Secure Your System\'s Data Integrity?',
    ctaSubtitle: 'Join leading hospitals and fintech institutions that have trusted Auditchain Gateway to lock their audit logs immutably.',
    ctaBtn: 'Contact Our Team',

    // Footer
    footerPlatform: 'Platform',
    footerCompliance: 'Compliance',
    footerDocs: 'Developer Docs',
    footerCopyright: '© 2026 Auditchain Gateway. All Rights Reserved.',
    footerStatus: 'All systems operational',
  },
};

// ============================================================
// Mock Data untuk Simulator SIMRS
// ============================================================
const INITIAL_PATIENTS = [
  { id: 'P091', name: 'Budi Santoso', diagnosis: 'Stroke Iskemik', room: 'Melati 04', bill: 15450000, hash: 'a5c7f8...9e10' },
  { id: 'P092', name: 'Siti Rahma', diagnosis: 'Apendisitis Akut', room: 'Dahlia 12', bill: 8750000, hash: '3e4f1a...c6b2' },
  { id: 'P093', name: 'Rian Hidayat', diagnosis: 'Fraktur Femur', room: 'Flamboyan 02', bill: 22100000, hash: 'f2d3c4...7a8b' }
];

const INTEGRITY_LAYERS = {
  db: { title: 'Layer 1: Database Existence', desc: 'Memeriksa keberadaan log audit di PostgreSQL middleware.' },
  hash: { title: 'Layer 2: Cryptographic Re-Hashing', desc: 'Kalkulasi ulang hash SHA3-256 payload log secara real-time.' },
  blockchain: { title: 'Layer 3: Blockchain Consensus', desc: 'Mencocokkan Merkle Root lokal dengan ledger Hyperledger Fabric.' }
};

const INTEGRITY_LAYERS_EN = {
  db: { title: 'Layer 1: Database Existence', desc: 'Checks existence of audit logs in PostgreSQL middleware.' },
  hash: { title: 'Layer 2: Cryptographic Re-Hashing', desc: 'Real-time SHA3-256 hash recalculation of log payload.' },
  blockchain: { title: 'Layer 3: Blockchain Consensus', desc: 'Matches local Merkle Root against the Hyperledger Fabric ledger.' }
};

const DATA_FLOW_STEPS_ID = [
  { id: 1, name: 'CDC Capture', icon: 'database', title: 'Change Data Capture (CDC)', desc: 'Agen CDC berbasis Debezium memantau log transaksi PostgreSQL SIMRS secara real-time tanpa mengganggu database utama.' },
  { id: 2, name: 'API Ingestion', icon: 'api', title: 'API Ingestion Layer', desc: 'Event payload dikirim ke API Gateway menggunakan protokol HTTPS berenkripsi tinggi dan token otorisasi JWT.' },
  { id: 3, name: 'Redis Queue Buffer', icon: 'reorder', title: 'Asynchronous Ingestion (Redis)', desc: 'Event ditampung di Redis Queue agar database operasional terbebas dari overhead penulisan blockchain yang lambat.' },
  { id: 4, name: 'Local Chaining', icon: 'link', title: 'Cryptographic Local Chain', desc: 'Worker menghitung SHA3-256 log saat ini dan mengaitkannya dengan hash log sebelumnya untuk membentuk rantai lokal.' },
  { id: 5, name: 'Merkle Root Anchor', icon: 'account_tree', title: 'Merkle Tree Aggregation', desc: 'Ratusan log digabungkan menjadi satu Merkle Tree. Hanya nilai root tunggal yang dikirim ke jaringan Blockchain.' },
  { id: 6, name: 'Blockchain Consensus', icon: 'verified', title: 'Hyperledger Fabric Anchoring', desc: 'Merkle Root ditulis secara permanen ke dalam ledger blockchain terdistribusi yang tidak bisa dimanipulasi sama sekali.' }
];

const DATA_FLOW_STEPS_EN = [
  { id: 1, name: 'CDC Capture', icon: 'database', title: 'Change Data Capture (CDC)', desc: 'A Debezium-based CDC agent monitors PostgreSQL SIMRS transaction logs in real-time without disrupting the main database.' },
  { id: 2, name: 'API Ingestion', icon: 'api', title: 'API Ingestion Layer', desc: 'Event payloads are sent to the API Gateway using highly-encrypted HTTPS protocol with JWT authorization tokens.' },
  { id: 3, name: 'Redis Queue Buffer', icon: 'reorder', title: 'Asynchronous Ingestion (Redis)', desc: 'Events are buffered in a Redis Queue so the operational database is free from the overhead of slow blockchain writes.' },
  { id: 4, name: 'Local Chaining', icon: 'link', title: 'Cryptographic Local Chain', desc: 'A worker calculates the SHA3-256 of the current log and links it with the previous log\'s hash to form a local chain.' },
  { id: 5, name: 'Merkle Root Anchor', icon: 'account_tree', title: 'Merkle Tree Aggregation', desc: 'Hundreds of logs are aggregated into a single Merkle Tree. Only one root value is sent to the blockchain network.' },
  { id: 6, name: 'Blockchain Consensus', icon: 'verified', title: 'Hyperledger Fabric Anchoring', desc: 'The Merkle Root is permanently written to a distributed blockchain ledger that cannot be manipulated under any circumstance.' }
];

// ============================================================
// WhatsApp contact link (nomor diisi nanti)
// ============================================================
const WA_LINK = 'https://wa.me/';

// ============================================================
// App Component
// ============================================================
function App() {
  // Language state
  const [lang, setLang] = useState('id');
  const t = translations[lang];
  const INTEGRITY_LAYERS_CURRENT = lang === 'id' ? INTEGRITY_LAYERS : INTEGRITY_LAYERS_EN;
  const DATA_FLOW_STEPS = lang === 'id' ? DATA_FLOW_STEPS_ID : DATA_FLOW_STEPS_EN;

  // States untuk Simulator
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [isTampered, setIsTampered] = useState(false);
  const [verificationState, setVerificationState] = useState({
    scanning: false,
    db: 'secured',
    hash: 'secured',
    blockchain: 'secured'
  });

  // State untuk Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State untuk Data Flow
  const [activeStep, setActiveStep] = useState(1);

  // State untuk Tab Kode Integrasi
  const [activeTab, setActiveTab] = useState('go');

  // Active nav section (IntersectionObserver)
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef({});

  // IntersectionObserver untuk highlight nav aktif
  useEffect(() => {
    const sections = ['features', 'simulator', 'architecture', 'threat-model', 'integration'];
    const observers = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      sectionRefs.current[id] = el;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Trigger verifikasi otomatis saat data pasien berubah
  useEffect(() => {
    if (isTampered) {
      setVerificationState({ scanning: true, db: 'secured', hash: 'scanning', blockchain: 'scanning' });
      const timer = setTimeout(() => {
        setVerificationState({ scanning: false, db: 'secured', hash: 'failed', blockchain: 'failed' });
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setVerificationState({ scanning: true, db: 'scanning', hash: 'scanning', blockchain: 'scanning' });
      const timer = setTimeout(() => {
        setVerificationState({ scanning: false, db: 'secured', hash: 'secured', blockchain: 'secured' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [patients, isTampered]);

  const handleTamper = () => {
    setIsTampered(true);
    setPatients((prev) =>
      prev.map((p, idx) => {
        if (idx === 1) return { ...p, bill: 875000, hash: '9a2b1c...d8e3' };
        return p;
      })
    );
  };

  const handleRestore = () => {
    setIsTampered(false);
    setPatients(INITIAL_PATIENTS);
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
  }'`
    };
    return snippets[activeTab];
  };

  const navLinks = [
    { href: '#features', label: t.navFeatures, id: 'features' },
    { href: '#simulator', label: t.navDemo, id: 'simulator' },
    { href: '#architecture', label: t.navArchitecture, id: 'architecture' },
    { href: '#threat-model', label: t.navThreat, id: 'threat-model' },
    { href: '#integration', label: t.navIntegration, id: 'integration' },
  ];

  return (
    <div className="relative min-h-screen bg-background text-on-background cyber-grid font-geist">

      {/* ============================================================ */}
      {/* TopNavBar */}
      {/* ============================================================ */}
      <nav className="sticky top-0 z-50 glass-card border-b border-outline-variant py-4 px-5 md:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img
              alt="Auditchain Logo"
              className="h-9 w-auto hover:scale-105 transition-transform"
              src="/logo/Mask group.png"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Auditchain <span className="bg-primary/20 text-accent-blue text-[10px] px-2 py-0.5 rounded-full border border-accent-blue/30">GATEWAY</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={`transition-colors ${
                  activeSection === link.id
                    ? 'text-white border-b border-accent-blue pb-0.5'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right CTA Buttons + Lang Toggle */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="h-10 inline-flex items-center justify-center gap-2 border border-outline-variant hover:border-accent-blue/50 bg-surface-container/40 hover:bg-surface-container text-on-surface-variant hover:text-white px-3.5 rounded-xl text-sm font-semibold transition-all"
              title="Toggle Language"
            >
              <span className="material-symbols-outlined text-lg text-accent-blue">language</span>
              <span>{lang === 'id' ? 'EN' : 'ID'}</span>
            </button>

            {/* Sistem Login */}
            <a
              href="http://localhost:3000/login"
              className="h-10 inline-flex items-center justify-center border border-outline-variant hover:border-accent-blue/50 bg-surface-container/40 hover:bg-surface-container text-on-surface-variant hover:text-white px-4.5 rounded-xl text-sm font-semibold transition-all"
            >
              {t.navLogin}
            </a>

            {/* Hubungi Tim Kami */}
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-5 rounded-xl text-sm font-semibold transition-all border border-blue-500/30 pulse-glow-btn"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>{t.navContact}</span>
            </a>
          </div>

          {/* Mobile Right: Lang Toggle + Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg text-xs font-bold transition-all"
            >
              {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:text-white hover:border-accent-blue/50 transition-all"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 border-t border-outline-variant pt-4 pb-2 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === link.id
                    ? 'bg-accent-blue/10 text-white'
                    : 'text-on-surface-variant hover:text-white hover:bg-surface-container'
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-outline-variant mt-3 pt-3 flex flex-col gap-2 px-1">
              <a
                href="http://localhost:3000/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="border border-outline-variant text-center text-on-surface-variant hover:text-white px-4 py-3 rounded-lg text-sm font-semibold transition-all"
              >
                {t.navLogin}
              </a>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-primary text-white text-center px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                {t.navContact}
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================================ */}
      {/* Hero Section */}
      {/* ============================================================ */}
      <header className="relative py-16 md:py-24 px-5 md:px-12 max-w-7xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.1)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-accent-blue/20 rounded-full text-accent-cyan text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="material-symbols-outlined text-sm animate-pulse">security</span>
            {t.heroBadge}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight max-w-4xl mx-auto mb-6 text-white tracking-tight">
            {t.heroTitle1}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan">
              {t.heroTitleHighlight}
            </span>{' '}
            {t.heroTitle2}
          </h1>
          <p className="text-base md:text-xl text-on-surface-variant max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* Hero Badge Tech Row */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {['Hyperledger Fabric', 'Merkle Tree', 'SHA3-256', 'Zero-Trust'].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 rounded-full text-xs font-semibold border border-accent-blue/20 bg-surface text-accent-cyan uppercase tracking-wide"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#simulator"
              className="bg-white text-background hover:bg-white/90 px-8 py-3.5 rounded-lg text-sm font-bold transition-all shadow-xl shadow-blue-500/5"
            >
              {t.heroBtn1}
            </a>
            <a
              href="#features"
              className="border border-outline-variant hover:bg-surface-container/50 text-white px-8 py-3.5 rounded-lg text-sm font-bold transition-all"
            >
              {t.heroBtn2}
            </a>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* Live Simulator Section */}
      {/* ============================================================ */}
      <section id="simulator" className="py-16 px-5 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">{t.simTitle}</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-sm md:text-base">{t.simSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Sisi Kiri: Database SIMRS */}
          <div className="glass-card rounded-xl p-5 md:p-6 relative overflow-hidden flex flex-col justify-between">
            {verificationState.scanning && (
              <div className="absolute top-0 left-0 w-full h-full border-b-2 border-accent-cyan bg-gradient-to-t from-accent-cyan/15 to-transparent animate-scan z-20 pointer-events-none" />
            )}

            <div>
              <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-accent-blue">storage</span>
                  <h3 className="font-bold text-white text-sm md:text-base">{t.simTableTitle}</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-accent-emerald border border-accent-emerald/20 text-xs font-semibold uppercase">
                  {t.simConnected}
                </span>
              </div>

              {/* Responsive Table Wrapper */}
              <div className="overflow-x-auto border border-outline-variant rounded-lg bg-surface-container-low -mx-1">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-semibold">
                      <th className="p-3 text-xs font-bold uppercase whitespace-nowrap">{t.simColId}</th>
                      <th className="p-3 text-xs font-bold uppercase whitespace-nowrap">{t.simColName}</th>
                      <th className="p-3 text-xs font-bold uppercase whitespace-nowrap hidden sm:table-cell">{t.simColDiagnosis}</th>
                      <th className="p-3 text-xs font-bold uppercase whitespace-nowrap">{t.simColBilling}</th>
                      <th className="p-3 text-xs font-bold uppercase font-mono whitespace-nowrap">{t.simColHash}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-b border-outline-variant/50 transition-colors ${
                          idx === 1 && isTampered ? 'bg-red-500/10 hover:bg-red-500/15' : 'hover:bg-surface/50'
                        }`}
                      >
                        <td className="p-3 font-semibold text-white whitespace-nowrap">{p.id}</td>
                        <td className="p-3 font-medium text-white whitespace-nowrap">{p.name}</td>
                        <td className="p-3 text-on-surface-variant hidden sm:table-cell">{p.diagnosis}</td>
                        <td className={`p-3 font-bold whitespace-nowrap ${idx === 1 && isTampered ? 'text-accent-crimson' : 'text-white'}`}>
                          Rp{p.bill.toLocaleString('id-ID')}
                        </td>
                        <td className={`p-3 font-mono text-xs whitespace-nowrap ${idx === 1 && isTampered ? 'text-accent-crimson' : 'text-accent-blue'}`}>
                          {p.hash}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-outline-variant pt-5">
              <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-ping flex-shrink-0" />
                <span>{t.simDbLabel}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                {!isTampered ? (
                  <button
                    onClick={handleTamper}
                    className="w-full sm:w-auto bg-accent-crimson/15 hover:bg-accent-crimson/25 text-accent-crimson border border-accent-crimson/30 px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">edit_off</span>
                    {t.simTamperBtn}
                  </button>
                ) : (
                  <button
                    onClick={handleRestore}
                    className="w-full sm:w-auto bg-accent-emerald hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  >
                    <span className="material-symbols-outlined text-sm">restore</span>
                    {t.simRestoreBtn}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sisi Kanan: 3-Layer Integrity Verification */}
          <div className="glass-card rounded-xl p-5 md:p-6 flex flex-col justify-between border-blue-500/20">
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <span className="material-symbols-outlined text-accent-cyan">verified_user</span>
                <h3 className="font-bold text-white text-sm md:text-base">{t.simVerifyTitle}</h3>
              </div>

              <div className="space-y-4">
                {['db', 'hash', 'blockchain'].map((layer) => {
                  const state = verificationState[layer];
                  const layerInfo = INTEGRITY_LAYERS_CURRENT[layer];
                  const scanLabel = layer === 'db' ? t.simScanLabel : layer === 'hash' ? t.simHashLabel : t.simSyncLabel;
                  return (
                    <div
                      key={layer}
                      className={`p-4 rounded-lg border transition-all ${
                        state === 'scanning' ? 'border-accent-cyan/30 bg-accent-cyan/5 animate-pulse' :
                        state === 'secured' ? 'border-accent-emerald/20 bg-emerald-500/5' :
                        'border-accent-crimson/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-semibold text-white text-sm">{layerInfo.title}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                          state === 'scanning' ? 'bg-accent-cyan/10 text-accent-cyan animate-pulse' :
                          state === 'secured' ? 'bg-emerald-500/10 text-accent-emerald' :
                          'bg-red-500/10 text-accent-crimson'
                        }`}>
                          {state === 'scanning' ? scanLabel :
                           state === 'secured' ? (layer === 'db' ? 'PASSED' : layer === 'hash' ? 'VERIFIED' : 'ANCHORED') :
                           (layer === 'hash' ? 'TAMPER_DETECTED' : 'HASH_MISMATCH')}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{layerInfo.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 transition-colors ${
              verificationState.scanning ? 'border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan' :
              isTampered ? 'border-accent-crimson/20 bg-red-500/10 text-accent-crimson' :
              'border-accent-emerald/20 bg-emerald-500/10 text-accent-emerald'
            }`}>
              <span className="material-symbols-outlined text-2xl flex-shrink-0">
                {verificationState.scanning ? 'refresh' : isTampered ? 'dangerous' : 'gpp_good'}
              </span>
              <div>
                <p className="text-sm font-bold uppercase">
                  {verificationState.scanning ? t.simVerifying : isTampered ? t.simBroken : t.simIntact}
                </p>
                <p className="text-xs opacity-80 leading-relaxed mt-1">
                  {verificationState.scanning ? t.simVerifyingDesc :
                   isTampered ? t.simBrokenDesc : t.simIntactDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Features Bento Grid */}
      {/* ============================================================ */}
      <section id="features" className="py-16 md:py-20 px-5 md:px-12 bg-surface-container-low border-y border-outline-variant">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-accent-blue text-sm font-bold uppercase tracking-wider">{t.featuresTag}</span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mt-3">{t.featuresTitle}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {[
              { title: t.feat1Title, desc: t.feat1Desc, icon: 'integration_instructions', color: 'blue' },
              { title: t.feat2Title, desc: t.feat2Desc, icon: 'bolt', color: 'cyan' },
              { title: t.feat3Title, desc: t.feat3Desc, icon: 'account_tree', color: 'emerald' },
              { title: t.feat4Title, desc: t.feat4Desc, icon: 'link', color: 'blue' },
              { title: t.feat5Title, desc: t.feat5Desc, icon: 'verified_user', color: 'cyan' },
              { title: t.feat6Title, desc: t.feat6Desc, icon: 'dashboard', color: 'emerald' },
            ].map((card, i) => (
              <div
                key={i}
                className={`glass-card rounded-xl p-6 md:p-8 glow-card-${card.color} flex flex-col justify-between`}
              >
                <div>
                  <div className={`w-12 h-12 rounded-lg bg-accent-${card.color}/10 flex items-center justify-center mb-5 text-accent-${card.color} border border-accent-${card.color}/20`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3">{card.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Interactive Data Flow Section */}
      {/* ============================================================ */}
      <section id="architecture" className="py-16 md:py-20 px-5 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-accent-cyan text-sm font-bold uppercase tracking-wider">{t.archTag}</span>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mt-3">{t.archTitle}</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto mt-4 text-sm md:text-base">{t.archSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Step Buttons */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {DATA_FLOW_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-4 md:p-6 rounded-xl border text-left transition-all ${
                  activeStep === step.id
                    ? 'border-accent-cyan bg-accent-cyan/10 text-white shadow-lg shadow-cyan-500/5'
                    : 'border-outline-variant hover:border-accent-blue/30 text-on-surface-variant'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl mb-3 block ${
                  activeStep === step.id ? 'text-accent-cyan' : 'text-accent-blue'
                }`}>
                  {step.icon}
                </span>
                <p className="text-xs font-bold uppercase tracking-wide opacity-65 mb-1">{t.archStepLabel}{step.id}</p>
                <p className="font-bold text-sm text-white">{step.name}</p>
              </button>
            ))}
          </div>

          {/* Detail Card */}
          <div className="glass-card rounded-xl p-6 md:p-8 border-cyan-500/20 h-full flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 mb-6">
                <span className="material-symbols-outlined text-2xl">
                  {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.icon}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-4">
                {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.desc}
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant font-mono">
              <span>{t.archStatusLabel}</span>
              <span className="w-2 h-2 rounded-full bg-accent-emerald" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Threat Model Section */}
      {/* ============================================================ */}
      <section id="threat-model" className="py-16 md:py-20 px-5 md:px-12 bg-surface-container-low border-y border-outline-variant">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-accent-crimson text-sm font-bold uppercase tracking-wider">{t.threatTag}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3">{t.threatTitle}</h2>
            <p className="text-on-surface-variant mt-4 text-sm md:text-base">{t.threatSubtitle}</p>
          </div>

          <div className="space-y-4">
            {[
              { icon: 'edit_off', title: t.threat1Title, desc: t.threat1Desc },
              { icon: 'content_paste_off', title: t.threat2Title, desc: t.threat2Desc },
              { icon: 'delete_forever', title: t.threat3Title, desc: t.threat3Desc },
            ].map((threat, i) => (
              <div
                key={i}
                className="p-5 md:p-6 border border-outline-variant rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-surface-container-low/50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-crimson/10 flex items-center justify-center text-accent-crimson border border-accent-crimson/20 flex-shrink-0">
                    <span className="material-symbols-outlined text-md">{threat.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{threat.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{threat.desc}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-accent-emerald rounded-full border border-accent-emerald/20 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 self-start sm:self-center">
                  <span className="material-symbols-outlined text-xs">shield</span> SECURED
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Integration Code Switcher */}
      {/* ============================================================ */}
      <section id="integration" className="py-16 md:py-20 px-5 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12 items-center">
          <div className="lg:col-span-2">
            <span className="text-accent-blue text-sm font-bold uppercase tracking-wider">{t.integTag}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3">{t.integTitle}</h2>
            <p className="text-on-surface-variant text-sm mt-4 leading-relaxed">{t.integDesc}</p>
            <div className="mt-8 flex gap-3 flex-wrap">
              {[
                { key: 'go', label: 'Golang SDK' },
                { key: 'node', label: 'Node.js SDK' },
                { key: 'curl', label: 'Raw CURL API' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    activeTab === tab.key
                      ? 'border-accent-blue bg-accent-blue/10 text-white'
                      : 'border-outline-variant text-on-surface-variant hover:border-accent-blue/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="border border-outline-variant rounded-xl overflow-hidden shadow-2xl bg-[#080d1a]">
              <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-crimson/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-emerald/50" />
                </div>
                <span className="text-xs font-mono text-on-surface-variant">auditchain_integration_demo</span>
                <span
                  className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:text-white"
                  onClick={() => navigator.clipboard.writeText(renderCodeSnippet())}
                >
                  content_copy
                </span>
              </div>
              <div className="p-5 md:p-6 overflow-auto text-xs font-mono text-cyan-300 leading-relaxed max-h-[350px]">
                <pre>{renderCodeSnippet()}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Tech Stack Grid */}
      {/* ============================================================ */}
      <section className="py-14 md:py-16 px-5 md:px-12 bg-surface-container-low border-t border-outline-variant text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-8 md:mb-10">{t.techLabel}</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 items-center opacity-70">
            {[
              { icon: 'terminal', label: 'Go Backend' },
              { icon: 'database', label: 'PostgreSQL' },
              { icon: 'memory', label: 'Redis Queue' },
              { icon: 'lan', label: 'Kafka CDC' },
              { icon: 'account_tree', label: 'Merkle Tree' },
              { icon: 'verified', label: 'Fabric Ledger' },
            ].map((tech) => (
              <div
                key={tech.label}
                className="flex flex-col items-center gap-2 hover:opacity-100 hover:text-accent-blue transition-all cursor-default"
              >
                <span className="material-symbols-outlined text-3xl md:text-4xl">{tech.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA Section */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 px-5 md:px-12 text-center max-w-5xl mx-auto">
        <div className="relative p-8 md:p-14 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-[#0c1630] to-[#040914] overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.12)_0%,_transparent_70%)] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-5 md:mb-6">{t.ctaTitle}</h2>
            <p className="text-sm text-on-surface-variant max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
              {t.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-white text-background hover:bg-white/90 px-8 md:px-10 py-4 rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-500/5 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                {t.ctaBtn}
              </a>
              <a
                href="http://localhost:3000/login"
                className="w-full sm:w-auto border border-outline-variant hover:border-accent-blue/50 text-on-surface-variant hover:text-white px-8 md:px-10 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">login</span>
                {t.navLogin}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Footer */}
      {/* ============================================================ */}
      <footer className="bg-surface-container-low border-t border-outline-variant py-10 md:py-12 px-5 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-b border-outline-variant pb-8 mb-8">
          <div className="flex items-center gap-2.5">
            <img alt="Auditchain Logo" className="h-8 w-auto" src="/logo/Mask group.png" />
            <span className="font-bold text-white text-base tracking-tight">Auditchain Gateway</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-on-surface-variant">
            <a href="#features" className="hover:text-white transition-colors">{t.footerPlatform}</a>
            <a href="#threat-model" className="hover:text-white transition-colors">{t.footerCompliance}</a>
            <a href="#integration" className="hover:text-white transition-colors">{t.footerDocs}</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant">
          <span>{t.footerCopyright}</span>
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span>{t.footerStatus}</span>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* Floating WhatsApp Button (Mobile Only) */}
      {/* ============================================================ */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 lg:hidden w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5c] shadow-xl shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Chat WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.554 4.095 1.522 5.813L.057 23.854a.5.5 0 00.61.61l6.04-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.593-.502-5.096-1.381l-.366-.214-3.788.919.933-3.678-.232-.38A9.961 9.961 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>

    </div>
  );
}

export default App;
