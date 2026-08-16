import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  LEGAL_TABS,
  LEGAL_CONTACT,
  legalSections,
  aboutCopy,
} from '../data/legalCopy';

const DASHBOARD_VERSION = 'v8.4';

const sectionHeading = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-2)',
  marginBottom: '8px',
  marginTop: '18px',
};

const bodyText = {
  fontSize: '13px',
  color: 'var(--ink-2)',
  lineHeight: 1.7,
  marginBottom: '10px',
};

const labelStyle = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  marginBottom: '4px',
};

const tabButtonStyle = (active) => ({
  minHeight: '44px',
  padding: '8px 14px',
  borderRadius: '0',
  border: `1px solid ${active ? 'var(--green)' : 'var(--line-2)'}`,
  color: active ? 'var(--green)' : 'var(--ink-2)',
  background: 'transparent',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

function AboutSection() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '9px', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', letterSpacing: '0.16em', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
          FUNDED BY
        </div>
        <img
          src={`${import.meta.env.BASE_URL}pmua-logo.webp`}
          alt="PMUA"
          style={{ height: '36px', objectFit: 'contain', background: '#fff', borderRadius: '5px', padding: '3px 8px' }}
        />
        <div style={{ fontSize: '10px', color: 'var(--ink-2)', marginTop: '4px' }}>{aboutCopy.fundedBy}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', padding: '10px', background: '#fff', borderRadius: '5px' }}>
        <img src={`${import.meta.env.BASE_URL}depa-logo.png`} alt="depa" style={{ height: '20px', objectFit: 'contain' }} />
        <img src={`${import.meta.env.BASE_URL}mdes.png`} alt="Ministry of Digital Economy" style={{ height: '20px', objectFit: 'contain' }} />
        <img src={`${import.meta.env.BASE_URL}smart-city-thailand-logo.svg`} alt="Smart City Thailand" style={{ height: '18px', objectFit: 'contain' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '18px' }}>
        <div style={{ fontSize: '9px', color: 'var(--ink-3)', letterSpacing: '0.16em', fontWeight: 700, textTransform: 'uppercase' }}>EXECUTED BY</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: '#fff', borderRadius: '5px', padding: '3px 8px' }}>
          <img src={`${import.meta.env.BASE_URL}axiom-logo.png`} alt="Axiom AI" style={{ height: '20px', objectFit: 'contain' }} />
          <img src={`${import.meta.env.BASE_URL}retl-logo.svg`} alt="ReTL" style={{ height: '18px', objectFit: 'contain' }} />
        </span>
      </div>

      <h2 id="legal-modal-title" style={{ fontSize: '19px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
        Global Political Dashboard
      </h2>
      <p style={{ fontSize: '9px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', marginBottom: '14px', textTransform: 'uppercase', fontWeight: 600 }}>
        GLOBEWATCH {DASHBOARD_VERSION}
      </p>

      <div style={bodyText}>
        <p style={{ marginBottom: '10px' }}>
          This project is supported by the <strong style={{ color: 'var(--ink)' }}>Program Management Unit for Area Based Development (PMU A)</strong> and the <strong style={{ color: 'var(--ink)' }}>Digital Economy Promotion Agency (depa)</strong>, with project execution by <strong style={{ color: 'var(--ink)' }}>Axiom</strong> and <strong style={{ color: 'var(--ink)' }}>ReTL (The Reason to Live Company)</strong>.
        </p>
        <p style={{ marginBottom: '10px' }}>
          Created by <strong style={{ color: 'var(--ink)' }}>Dr. Non Arkaraprasertkul</strong> — architect, urban designer, and smart city specialist; Harvard-affiliated doctoral researcher in anthropology and cities focused on human-centered smart cities and real-world implementation — and <strong style={{ color: 'var(--ink)' }}>Associate Professor Dr. Poon Thiengburanathum</strong>, as a public ranking model designed to explore alternative ways of understanding urban performance.
        </p>
        <p>
          Their work sits at the intersection of urban design, data, and human behavior, bringing a distinctly people-centered perspective to how cities are measured and experienced.
        </p>
      </div>
    </>
  );
}

function LegalSection() {
  const { intellectualProperty, osintDisclaimer } = legalSections;

  return (
    <>
      <h3 style={{ ...sectionHeading, marginTop: 0 }}>{intellectualProperty.title}</h3>
      {intellectualProperty.paragraphs.map((p, i) => (
        <p key={i} style={bodyText}>{p}</p>
      ))}

      <h3 style={sectionHeading}>{osintDisclaimer.title}</h3>
      {osintDisclaimer.paragraphs.map((p, i) => (
        <p key={i} style={bodyText}>{p}</p>
      ))}

      <p style={{ ...bodyText, fontSize: '11px', color: 'var(--ink-3)', marginTop: '16px' }}>
        Mock-up framing: panels, gauges, and classification banners are visual design elements for situational awareness — not live classified products.
      </p>
    </>
  );
}

function PrivacySection() {
  const p = legalSections.privacyNotice;

  return (
    <>
      <h3 style={{ ...sectionHeading, marginTop: 0 }}>{p.title}</h3>
      <p style={{ ...bodyText, fontSize: '11px', color: 'var(--ink-3)', marginBottom: '14px' }}>{p.subtitle}</p>
      {p.paragraphs.map((text, i) => (
        <p key={i} style={bodyText}>{text}</p>
      ))}

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.controller.label}</div>
        <p style={{ ...bodyText, marginBottom: 0 }}>{p.controller.value}</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.purpose.label}</div>
        <p style={{ ...bodyText, marginBottom: 0 }}>{p.purpose.value}</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.legalBasis.label}</div>
        <p style={{ ...bodyText, marginBottom: 0 }}>{p.legalBasis.value}</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.dataCollected.label}</div>
        <ul style={{ ...bodyText, margin: 0, paddingLeft: '18px' }}>
          {p.dataCollected.items.map((item) => (
            <li key={item} style={{ marginBottom: '4px' }}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.retention.label}</div>
        <p style={{ ...bodyText, marginBottom: 0 }}>{p.retention.value}</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.thirdParties.label}</div>
        <ul style={{ ...bodyText, margin: 0, paddingLeft: '18px' }}>
          {p.thirdParties.items.map((item) => (
            <li key={item} style={{ marginBottom: '4px' }}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.rights.label}</div>
        <ul style={{ ...bodyText, margin: 0, paddingLeft: '18px' }}>
          {p.rights.items.map((item) => (
            <li key={item} style={{ marginBottom: '4px' }}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={labelStyle}>{p.contact.label}</div>
        <p style={{ ...bodyText, marginBottom: 0 }}>{p.contact.value}</p>
      </div>

      <p style={bodyText}>{p.noSale}</p>
      <p style={bodyText}>{p.internationalTransfer}</p>

      <div style={{
        padding: '10px 12px',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        marginTop: '14px',
      }}>
        <div style={labelStyle}>สรุปภาษาไทย</div>
        <p style={{ ...bodyText, marginBottom: 0, fontSize: '12px' }}>{p.thaiSummary}</p>
      </div>
    </>
  );
}

function TermsSection({ onOpenDataProvenance }) {
  const { termsOfUse, thirdPartyData } = legalSections;

  return (
    <>
      <h3 style={{ ...sectionHeading, marginTop: 0 }}>{termsOfUse.title}</h3>
      {termsOfUse.paragraphs.map((text, i) => (
        <p key={i} style={bodyText}>{text}</p>
      ))}

      {termsOfUse.items.map(({ label, text }) => (
        <div key={label} style={{ marginBottom: '14px' }}>
          <div style={labelStyle}>{label}</div>
          <p style={{ ...bodyText, marginBottom: 0 }}>{text}</p>
        </div>
      ))}

      <h3 style={sectionHeading}>{thirdPartyData.title}</h3>
      {thirdPartyData.paragraphs.map((text, i) => (
        <p key={i} style={bodyText}>{text}</p>
      ))}

      {onOpenDataProvenance && (
        <button
          type="button"
          onClick={onOpenDataProvenance}
          style={{
            minHeight: '44px',
            padding: '10px 16px',
            marginTop: '8px',
            background: 'transparent',
            border: '1px solid var(--line-2)',
            borderRadius: '0',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Open Data Provenance
        </button>
      )}

      <p style={{ ...bodyText, fontSize: '11px', color: 'var(--ink-3)', marginTop: '16px' }}>
        Questions: {LEGAL_CONTACT}
      </p>
    </>
  );
}

const LegalModal = ({
  isOpen,
  onClose,
  initialTab = 'about',
  onOpenDataProvenance,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeTab) {
      case 'legal':
        return <LegalSection />;
      case 'privacy':
        return <PrivacySection />;
      case 'terms':
        return <TermsSection onOpenDataProvenance={onOpenDataProvenance} />;
      default:
        return <AboutSection />;
    }
  };

  return (
    <div
      className="modal-overlay legal-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(25, 23, 18, 0.55)',
        backdropFilter: 'none',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="legal-modal-panel"
        style={{
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          background: 'var(--panel)',
          backdropFilter: 'none',
          borderRadius: '0',
          border: '1px solid var(--line-2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--ink)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px 0',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <div
            role="tablist"
            aria-label="Legal and information sections"
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '12px',
              flex: 1,
            }}
          >
            {LEGAL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={tabButtonStyle(activeTab === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal panel"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          role="tabpanel"
          style={{
            overflow: 'auto',
            padding: '20px 24px 24px',
            flex: 1,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {renderSection()}
        </div>

        <div style={{
          borderTop: '1px solid var(--line)',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          gap: '12px',
        }}>
          <span style={{ fontSize: '9px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            {aboutCopy.footerMeta}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal panel"
            style={{
              background: 'var(--green)',
              border: '1px solid var(--green)',
              borderRadius: '0',
              padding: '10px 18px',
              minHeight: '44px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'inherit',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
