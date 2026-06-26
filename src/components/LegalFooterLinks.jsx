import React from 'react';

/**
 * Discrete footer strip — Legal · Privacy · PDPA links
 * Sits above classification banner; does not block map interaction.
 */
const LegalFooterLinks = ({ onOpenSection }) => {
  const links = [
    { id: 'legal', label: 'Legal' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'privacy', label: 'PDPA' },
  ];

  return (
    <nav
      className="legal-footer-links"
      aria-label="Legal and privacy information"
    >
      {links.map((link, index) => (
        <React.Fragment key={`${link.id}-${link.label}`}>
          {index > 0 && (
            <span className="legal-footer-sep" aria-hidden="true">·</span>
          )}
          <button
            type="button"
            className="legal-footer-link"
            onClick={() => onOpenSection(link.id)}
            aria-label={`Open ${link.label} information`}
          >
            {link.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default LegalFooterLinks;
