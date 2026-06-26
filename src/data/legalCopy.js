/**
 * Legal, PDPA, and disclaimer copy — Global Political Dashboard
 * Property: Dr Non Arkaraprasertkul & Associate Professor Dr Poon Thiengburanathum
 */

export const LEGAL_CONTACT = 'non@nonarkara.org';

export const LEGAL_TABS = [
  { id: 'about', label: 'About' },
  { id: 'legal', label: 'Legal' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'terms', label: 'Terms' },
];

export const legalSections = {
  intellectualProperty: {
    title: 'Intellectual Property',
    paragraphs: [
      'The Global Political Dashboard — including its design, source code, data architecture, analytical methodologies, custom visualizations, and visual identity — is the proprietary work of Dr Non Arkaraprasertkul and Associate Professor Dr Poon Thiengburanathum. All rights reserved.',
      'Contact for permissions and licensing enquiries: non@nonarkara.org.',
      'You may not reproduce, redistribute, reverse engineer, scrape for commercial reuse, or use this work in bad faith — including misrepresentation of authorship, unauthorized derivative works, or commercial exploitation without written consent. Violations may be subject to legal action under applicable intellectual property laws in Thailand and internationally.',
    ],
  },

  osintDisclaimer: {
    title: 'Open-Source Intelligence & Situational Awareness',
    paragraphs: [
      'This dashboard aggregates publicly available open-source intelligence (OSINT) and third-party data feeds. It is a situational awareness and research tool — not official government intelligence, military guidance, or policy direction.',
      'Do not use this dashboard for operational military planning, humanitarian evacuation decisions, investment trades, or any action requiring verified official information without independent confirmation from authoritative sources.',
      'Data may be delayed, incomplete, miscoded, or wrong. Feeds can fail silently; caches may serve stale values; automated pipelines can misclassify events. Treat every figure as provisional and cross-check against primary sources before acting.',
    ],
  },

  privacyNotice: {
    title: 'Privacy Notice (PDPA)',
    subtitle: 'Personal Data Protection Act B.E. 2562 (2019)',
    paragraphs: [
      'This notice explains how the Global Political Dashboard collects and uses personal data when you visit the site.',
    ],
    controller: {
      label: 'Data controller',
      value: 'Dr Non Arkaraprasertkul — non@nonarkara.org',
    },
    purpose: {
      label: 'Purpose of processing',
      value: 'Usage analytics, service improvement, security monitoring, and understanding how the dashboard is accessed across regions and devices.',
    },
    legalBasis: {
      label: 'Legal basis',
      value: 'Legitimate interest in operating and improving a public research dashboard, and consent where applicable under the Personal Data Protection Act B.E. 2562.',
    },
    dataCollected: {
      label: 'Data collected on each visit',
      items: [
        'Dashboard identifier (GPD)',
        'Page URL and hostname',
        'Referring page (if any)',
        'Approximate location: country, region, city',
        'IP address',
        'Browser user agent',
        'Language preference',
        'Screen dimensions',
        'Timezone',
      ],
    },
    retention: {
      label: 'Retention',
      value: 'Analytics records are retained for up to 24 months, then deleted or anonymized unless a longer period is required for legal or security purposes.',
    },
    thirdParties: {
      label: 'Third-party processors',
      items: [
        'Google (Google Sheets via Apps Script) — stores visit log entries',
        'Cloudflare — hosting, CDN, and edge security',
        'IP geolocation providers (ipapi.co, ip-api.com, ipwho.is) — resolves approximate location from IP',
        'External data source providers — see Data Provenance for the full list of intelligence feeds',
      ],
    },
    rights: {
      label: 'Your rights under PDPA',
      items: [
        'Access your personal data',
        'Rectify inaccurate data',
        'Erasure (where applicable)',
        'Restriction of processing',
        'Object to processing based on legitimate interest',
        'Lodge a complaint with the Personal Data Protection Committee (PDPC), Thailand',
      ],
    },
    contact: {
      label: 'PDPA requests',
      value: 'Email non@nonarkara.org with subject line "PDPA Request — GPD". We respond within statutory timeframes.',
    },
    noSale: 'We do not sell personal data.',
    internationalTransfer:
      'Some processors (Google, Cloudflare) may store or process data outside Thailand. Where international transfer occurs, appropriate safeguards under PDPA are applied through standard contractual arrangements with those providers.',
    thaiSummary:
      'สรุป: แดชบอร์ดนี้บันทึกข้อมูลการเข้าใช้งาน (เช่น URL หน้าเว็บ IP ที่อยู่โดยประมาณ ประเทศ เมือง ภาษา ขนาดหน้าจอ) เพื่อวิเคราะห์การใช้งานและปรับปรุงบริการ ไม่มีการขายข้อมูลส่วนบุคคล ติดต่อ non@nonarkara.org สำหรับสิทธิตาม PDPA',
  },

  termsOfUse: {
    title: 'Terms of Use',
    paragraphs: [
      'By accessing the Global Political Dashboard, you agree to these terms. If you do not agree, please discontinue use.',
    ],
    items: [
      {
        label: 'Acceptable use',
        text: 'Use the dashboard for lawful research, education, and situational awareness. Do not misrepresent dashboard output as official intelligence or government endorsement.',
      },
      {
        label: 'Automated access',
        text: 'Do not scrape, bulk-download, or systematically harvest dashboard data or APIs at scale without prior written permission.',
      },
      {
        label: 'No warranty',
        text: 'The service is provided "as is" without warranty of any kind, express or implied, including accuracy, completeness, fitness for a particular purpose, or uninterrupted availability.',
      },
      {
        label: 'Limitation of liability',
        text: 'Dr Non Arkaraprasertkul, Associate Professor Dr Poon Thiengburanathum, funders, and execution partners assume no liability for decisions, losses, or damages arising from reliance on dashboard information.',
      },
      {
        label: 'Changes',
        text: 'We may modify, suspend, or discontinue any part of the dashboard or these terms at any time. Continued use after changes constitutes acceptance.',
      },
    ],
  },

  thirdPartyData: {
    title: 'Third-Party Data',
    paragraphs: [
      'Conflict events, satellite detections, market prices, flight tracks, and other live indicators are sourced from independent third parties. Each source has its own methodology, latency, and limitations.',
      'Open the Data Provenance & Source Health panel (Tools → Data health) for reliability ratings, cache intervals, methodology notes, and live connection status for every feed.',
    ],
  },
};

export const aboutCopy = {
  fundedBy: 'Program Management Unit for Area Based Development',
  credits: [
    'This project is supported by the Program Management Unit for Area Based Development (PMU A) and the Digital Economy Promotion Agency (depa), with project execution by Axiom and ReTL (The Reason to Live Company).',
    'Created by Dr. Non Arkaraprasertkul — architect, urban designer, and smart city specialist; Harvard-affiliated doctoral researcher in anthropology and cities focused on human-centered smart cities and real-world implementation — and Associate Professor Dr. Poon Thiengburanathum, as a public ranking model designed to explore alternative ways of understanding urban performance.',
    'Their work sits at the intersection of urban design, data, and human behavior, bringing a distinctly people-centered perspective to how cities are measured and experienced.',
  ],
  footerMeta: '12 data sources · PMUA · depa · Axiom · ReTL',
};
