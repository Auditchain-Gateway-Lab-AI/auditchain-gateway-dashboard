// src/LandingPage.js
// Ported from auditchain-gateway-landing/src/App.jsx
// Converted from Tailwind v4 to vanilla CSS (LandingPage.css)
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

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
    archStepLabel: 'LANGKAH 0',
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
    archStepLabel: 'STEP 0',
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

// ============================================================
// Mock Data untuk Simulator SIMRS
// ============================================================
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

// ============================================================
// LandingPage Component
// ============================================================
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

      {/* ============================================================ */}
      {/* TopNavBar */}
      {/* ============================================================ */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          {/* Logo */}
          <div className="lp-nav-logo">
            <img alt="Auditchain Logo" className="lp-nav-logo-img" src="/logo/Group 1000009984.png" />
            <div className="lp-nav-brand-text">
              <span className="lp-nav-brand-name">
                Auditchain <span className="lp-nav-gateway-badge">GATEWAY</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="lp-nav-links">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.id)}
                className={`lp-nav-link ${activeSection === link.id ? 'lp-nav-link--active' : ''}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right CTA Buttons + Lang Toggle */}
          <div className="lp-nav-right">
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="lp-nav-lang-btn"
              title="Toggle Language"
            >
              <span className="material-symbols-outlined lp-icon-lg lp-icon-blue">language</span>
              <span>{lang === 'id' ? 'EN' : 'ID'}</span>
            </button>

            <Link to="/login" className="lp-nav-login-btn">
              {t.navLogin}
            </Link>

            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="lp-nav-contact-btn">
              <span className="material-symbols-outlined lp-icon-lg">chat</span>
              <span>{t.navContact}</span>
            </a>
          </div>

          {/* Mobile Right: Lang Toggle + Hamburger */}
          <div className="lp-nav-mobile-right">
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="lp-nav-mobile-lang"
            >
              {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lp-nav-hamburger"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined lp-icon-xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lp-nav-mobile-menu">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleNavClick(e, link.id);
                }}
                className={`lp-nav-mobile-link ${activeSection === link.id ? 'lp-nav-mobile-link--active' : ''}`}
              >
                {link.label}
              </a>
            ))}
            <div className="lp-nav-mobile-actions">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="lp-nav-mobile-login-btn"
              >
                {t.navLogin}
              </Link>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="lp-nav-mobile-contact-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chat</span>
                {t.navContact}
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================================ */}
      {/* Hero Section */}
      {/* ============================================================ */}
      <header className="lp-hero">
        <div className="lp-hero-glow1" />
        <div className="lp-hero-glow2" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="material-symbols-outlined lp-icon-sm" style={{ animation: 'lp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>security</span>
            {t.heroBadge}
          </div>
          <h1 className="lp-hero-title">
            {t.heroTitle1}{' '}
            <span className="lp-hero-highlight">{t.heroTitleHighlight}</span>{' '}
            {t.heroTitle2}
          </h1>
          <p className="lp-hero-subtitle">{t.heroSubtitle}</p>

          <div className="lp-hero-tech-row">
            {['Hyperledger Fabric', 'Merkle Tree', 'SHA3-256', 'Zero-Trust'].map((badge) => (
              <span key={badge} className="lp-hero-tech-badge">{badge}</span>
            ))}
          </div>

          <div className="lp-hero-btns">
            <a href="#simulator" onClick={(e) => handleNavClick(e, 'simulator')} className="lp-hero-btn-primary">{t.heroBtn1}</a>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="lp-hero-btn-secondary">{t.heroBtn2}</a>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* Live Simulator Section */}
      {/* ============================================================ */}
      <section id="simulator" className="lp-sim">
        <div className="lp-section-header">
          <h2 className="lp-section-title">{t.simTitle}</h2>
          <p className="lp-section-subtitle">{t.simSubtitle}</p>
        </div>

        <div className="lp-sim-grid">
          {/* Left: Audit Log Table */}
          <div className="lp-glass-card lp-sim-db-card">
            {verificationState.scanning && <div className="lp-scan-overlay" />}

            <div>
              <div className="lp-sim-header">
                <div className="lp-sim-header-left">
                  <span className="material-symbols-outlined lp-icon-blue">storage</span>
                  <h3 className="lp-sim-header-title">{t.simTableTitle}</h3>
                </div>
                <span className="lp-sim-cdc-badge">{t.simConnected}</span>
              </div>

              <div className="lp-sim-table-wrap">
                <table className="lp-sim-table">
                  <thead>
                    <tr>
                      <th>{t.simColTimestamp}</th>
                      <th>{t.simColActor}</th>
                      <th>{t.simColAction}</th>
                      <th className="lp-th-hidden-sm">{t.simColResource}</th>
                      <th className="lp-th-hidden-sm">{t.simColMetadata}</th>
                      <th className="lp-th-hidden-md">{t.simColSourceSystem}</th>
                      <th>{t.simColVerification}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id} className={log.tampered ? 'lp-row-tampered' : ''}>
                        <td className="lp-td-timestamp">{log.timestamp}</td>
                        <td className="lp-td-actor">{log.actor}</td>
                        <td>
                          <span className={`lp-action-badge lp-action-badge--${log.action.toLowerCase()}`}>{log.action}</span>
                        </td>
                        <td className="lp-td-resource lp-td-hidden-sm">{log.resource}</td>
                        <td className="lp-td-metadata lp-td-hidden-sm">{log.metadata}</td>
                        <td className="lp-td-source lp-td-hidden-md">{log.sourceSystem}</td>
                        <td>
                          <span className={`lp-verify-badge ${log.tampered ? 'lp-verify-badge--invalid' : 'lp-verify-badge--valid'}`}>
                            {log.tampered ? '✗ INVALID' : '✓ VALID'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lp-sim-footer">
              <div className="lp-sim-db-label">
                <span className="lp-sim-db-dot" />
                <span>{t.simDbLabel}</span>
              </div>
              <div className="lp-sim-btn-group">
                {!isTampered ? (
                  <button onClick={handleTamper} className="lp-btn-tamper">
                    <span className="material-symbols-outlined lp-icon-sm">edit_off</span>
                    {t.simTamperBtn}
                  </button>
                ) : (
                  <button onClick={handleRestore} className="lp-btn-restore">
                    <span className="material-symbols-outlined lp-icon-sm">restore</span>
                    {t.simRestoreBtn}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: 2-Layer Integrity Verification */}
          <div className="lp-glass-card lp-verify-card">
            <div>
              <div className="lp-verify-header">
                <span className="material-symbols-outlined lp-icon-cyan">verified_user</span>
                <h3 className="lp-sim-header-title">{t.simVerifyTitle}</h3>
              </div>

              <div className="lp-verify-layers">
                {['clientdb', 'localdb', 'blockchain'].map((layer) => {
                  const state = verificationState[layer];
                  const layerInfo = INTEGRITY_LAYERS_CURRENT[layer];
                  const scanLabel = layer === 'clientdb' ? t.simScanLabel : layer === 'localdb' ? t.simHashLabel : t.simSyncLabel;
                  const isAnchor = layer === 'blockchain';
                  return (
                    <div
                      key={layer}
                      className={`lp-layer ${
                        isAnchor ? 'lp-layer--anchor' : ''
                      } ${
                        state === 'scanning' ? 'lp-layer--scanning' :
                        state === 'secured' ? 'lp-layer--secured' :
                        'lp-layer--failed'
                      }`}
                    >
                      <div className="lp-layer-head">
                        <h4 className="lp-layer-title">
                          {isAnchor && <span className="lp-anchor-icon material-symbols-outlined">anchor</span>}
                          {layerInfo.title}
                        </h4>
                        <span className={`lp-layer-badge ${
                          state === 'scanning' ? 'lp-layer-badge--scanning' :
                          state === 'secured' ? 'lp-layer-badge--secured' :
                          'lp-layer-badge--failed'
                        }`}>
                          {state === 'scanning' ? scanLabel :
                           state === 'secured' ? (layer === 'clientdb' ? 'PASSED' : layer === 'localdb' ? 'VERIFIED' : 'ANCHORED') :
                           (layer === 'localdb' ? 'TAMPER_DETECTED' : 'HASH_MISMATCH')}
                        </span>
                      </div>
                      <p className="lp-layer-desc">{layerInfo.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`lp-verify-status ${
              verificationState.scanning ? 'lp-verify-status--scanning' :
              isTampered ? 'lp-verify-status--broken' :
              'lp-verify-status--intact'
            }`}>
              <span className="material-symbols-outlined lp-verify-status-icon">
                {verificationState.scanning ? 'refresh' : isTampered ? 'dangerous' : 'gpp_good'}
              </span>
              <div>
                <p className="lp-verify-status-title">
                  {verificationState.scanning ? t.simVerifying : isTampered ? t.simBroken : t.simIntact}
                </p>
                <p className="lp-verify-status-desc">
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
      <section id="features" className="lp-features">
        <div className="lp-features-inner">
          <div className="lp-features-header">
            <span className="lp-features-tag">{t.featuresTag}</span>
            <h2 className="lp-features-title">{t.featuresTitle}</h2>
          </div>

          <div className="lp-features-grid">
            {[
              { title: t.feat1Title, desc: t.feat1Desc, icon: 'integration_instructions', color: 'blue' },
              { title: t.feat2Title, desc: t.feat2Desc, icon: 'bolt', color: 'cyan' },
              { title: t.feat3Title, desc: t.feat3Desc, icon: 'account_tree', color: 'emerald' },
              { title: t.feat4Title, desc: t.feat4Desc, icon: 'link', color: 'blue' },
              { title: t.feat5Title, desc: t.feat5Desc, icon: 'verified_user', color: 'cyan' },
              { title: t.feat6Title, desc: t.feat6Desc, icon: 'dashboard', color: 'emerald' },
            ].map((card, i) => (
              <div key={i} className={`lp-feature-card lp-feature-card--${card.color}`}>
                <div>
                  <div className={`lp-feature-icon lp-feature-icon--${card.color}`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h3 className="lp-feature-name">{card.title}</h3>
                  <p className="lp-feature-desc">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Interactive Data Flow Section */}
      {/* ============================================================ */}
      <section id="architecture" className="lp-arch">
        <div className="lp-arch-header">
          <span className="lp-arch-tag">{t.archTag}</span>
          <h2 className="lp-arch-title">{t.archTitle}</h2>
          <p className="lp-arch-subtitle">{t.archSubtitle}</p>
        </div>

        <div className="lp-arch-grid">
          <div className="lp-arch-steps">
            {DATA_FLOW_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`lp-arch-step-btn ${activeStep === step.id ? 'lp-arch-step-btn--active' : ''}`}
              >
                <span className={`material-symbols-outlined lp-arch-step-icon`}>{step.icon}</span>
                <p className="lp-arch-step-label">{t.archStepLabel}{step.id}</p>
                <p className="lp-arch-step-name">{step.name}</p>
              </button>
            ))}
          </div>

          <div className="lp-arch-detail">
            <div>
              <div className="lp-arch-detail-icon">
                <span className="material-symbols-outlined lp-icon-2xl">
                  {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.icon}
                </span>
              </div>
              <h3 className="lp-arch-detail-title">
                {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.title}
              </h3>
              <p className="lp-arch-detail-desc">
                {DATA_FLOW_STEPS.find((s) => s.id === activeStep)?.desc}
              </p>
            </div>
            <div className="lp-arch-detail-footer">
              <span>{t.archStatusLabel}</span>
              <span className="lp-arch-status-dot" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Threat Model Section */}
      {/* ============================================================ */}
      <section id="threat-model" className="lp-threat">
        <div className="lp-threat-inner">
          <div className="lp-threat-header">
            <span className="lp-threat-tag">{t.threatTag}</span>
            <h2 className="lp-threat-title">{t.threatTitle}</h2>
            <p className="lp-threat-subtitle">{t.threatSubtitle}</p>
          </div>

          <div className="lp-threat-list">
            {[
              { icon: 'edit_off', title: t.threat1Title, desc: t.threat1Desc },
              { icon: 'content_paste_off', title: t.threat2Title, desc: t.threat2Desc },
              { icon: 'delete_forever', title: t.threat3Title, desc: t.threat3Desc },
            ].map((threat, i) => (
              <div key={i} className="lp-threat-item">
                <div className="lp-threat-item-left">
                  <div className="lp-threat-icon-wrap">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{threat.icon}</span>
                  </div>
                  <div>
                    <h3 className="lp-threat-item-title">{threat.title}</h3>
                    <p className="lp-threat-item-desc">{threat.desc}</p>
                  </div>
                </div>
                <span className="lp-secured-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>shield</span> SECURED
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Integration Code Switcher */}
      {/* ============================================================ */}
      <section id="integration" className="lp-integ">
        <div className="lp-integ-grid">
          <div>
            <span className="lp-integ-tag">{t.integTag}</span>
            <h2 className="lp-integ-title">{t.integTitle}</h2>
            <p className="lp-integ-desc">{t.integDesc}</p>
            <div className="lp-integ-tabs">
              {[
                { key: 'go', label: 'Golang SDK' },
                { key: 'node', label: 'Node.js SDK' },
                { key: 'curl', label: 'Raw CURL API' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`lp-integ-tab ${activeTab === tab.key ? 'lp-integ-tab--active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="lp-code-block">
              <div className="lp-code-header">
                <div className="lp-code-dots">
                  <div className="lp-code-dot lp-code-dot--red" />
                  <div className="lp-code-dot lp-code-dot--cyan" />
                  <div className="lp-code-dot lp-code-dot--green" />
                </div>
                <span className="lp-code-filename">auditchain_integration_demo</span>
                <button
                  className="lp-code-copy material-symbols-outlined"
                  onClick={() => navigator.clipboard.writeText(renderCodeSnippet())}
                >
                  content_copy
                </button>
              </div>
              <div className="lp-code-body">
                <pre>{renderCodeSnippet()}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Tech Stack Grid */}
      {/* ============================================================ */}
      <section className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-tech-label">{t.techLabel}</p>
          <div className="lp-tech-grid">
            {[
              { icon: 'terminal', label: 'Go Backend' },
              { icon: 'database', label: 'PostgreSQL' },
              { icon: 'memory', label: 'Redis Queue' },
              { icon: 'lan', label: 'Kafka CDC' },
              { icon: 'account_tree', label: 'Merkle Tree' },
              { icon: 'verified', label: 'Fabric Ledger' },
            ].map((tech) => (
              <div key={tech.label} className="lp-tech-item">
                <span className="material-symbols-outlined lp-tech-item-icon">{tech.icon}</span>
                <span className="lp-tech-item-label">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA Section */}
      {/* ============================================================ */}
      <section className="lp-cta">
        <div className="lp-cta-card">
          <div className="lp-cta-glow1" />
          <div className="lp-cta-glow2" />

          <div className="lp-cta-content">
            <h2 className="lp-cta-title">{t.ctaTitle}</h2>
            <p className="lp-cta-subtitle">{t.ctaSubtitle}</p>
            <div className="lp-cta-btns">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="lp-cta-btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chat</span>
                {t.ctaBtn}
              </a>
              <Link to="/login" className="lp-cta-btn-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>login</span>
                {t.navLogin}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Footer */}
      {/* ============================================================ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-logo">
              <img alt="Auditchain Logo" src="/logo/Group 1000009984.png" />
              <span>Auditchain Gateway</span>
            </div>
            <div className="lp-footer-links">
              <a href="#features">{t.footerPlatform}</a>
              <a href="#threat-model">{t.footerCompliance}</a>
              <a href="#integration">{t.footerDocs}</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>{t.footerCopyright}</span>
            <div className="lp-footer-status">
              <span className="lp-footer-status-dot" />
              <span>{t.footerStatus}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* Floating WhatsApp Button (Mobile Only) */}
      {/* ============================================================ */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="lp-wa-float" aria-label="Chat WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.554 4.095 1.522 5.813L.057 23.854a.5.5 0 00.61.61l6.04-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.593-.502-5.096-1.381l-.366-.214-3.788.919.933-3.678-.232-.38A9.961 9.961 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>

    </div>
  );
}

export default LandingPage;
