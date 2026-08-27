import React from 'react';
import { Link } from 'react-router-dom';
import { hasSectionCapability } from '../config/serviceSections';

export default function ServiceSectionLauncherV2({
  caps,
  groups = [],
  onNavigate,
  onGoTop,
  allExpanded = true,
  onExpandAll,
  onCollapseAll,
}) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      sections: (group.sections || []).filter((section) => hasSectionCapability(caps, section.cap)),
    }))
    .filter((group) => group.sections.length);

  if (!visibleGroups.length) return null;

  return (
    <>
      <div style={wrapperStyle}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h3 style={{ margin: 0 }}>Acceso rápido por bloques</h3>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              Selecciona el bloque que necesitas sin recorrer toda la pantalla.
            </div>
          </div>

          <div style={topActionBarStyle}>
            <button type="button" onClick={() => onGoTop?.()} style={actionButtonStyle}>Inicio</button>
            <Link to="/v2/intakes" style={linkButtonStyle}>Regresar a servicios</Link>
            <button type="button" onClick={() => onExpandAll?.()} style={secondaryButtonStyle}>Expandir grupos</button>
            <button type="button" onClick={() => onCollapseAll?.()} style={secondaryButtonStyle}>Compactar grupos</button>
          </div>

          <div style={helperRowStyle}>
            Estado actual: <strong>{allExpanded ? 'grupos abiertos' : 'grupos compactados'}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {visibleGroups.map((group) => (
            <div key={group.key} style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={groupTitleStyle}>{group.title}</div>
                {!!group.description && <div style={groupDescStyle}>{group.description}</div>}
              </div>

              <div style={cardsGridStyle}>
                {group.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onNavigate?.(section.id)}
                    style={cardButtonStyle}
                  >
                    <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
                      <div style={cardTitleStyle}>{section.label}</div>
                      <div style={cardDescStyle}>{section.description}</div>
                    </div>
                    <span style={ctaStyle}>Abrir bloque</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={floatingDockStyle}>
        <button type="button" onClick={() => onGoTop?.()} style={floatingPrimaryButtonStyle}>Inicio</button>
        <button type="button" onClick={() => (allExpanded ? onCollapseAll?.() : onExpandAll?.())} style={floatingSecondaryButtonStyle}>
          {allExpanded ? 'Compactar' : 'Expandir'}
        </button>
        <Link to="/v2/intakes" style={floatingLinkButtonStyle}>Servicios</Link>
      </div>
    </>
  );
}

const wrapperStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 18,
  display: 'grid',
  gap: 18,
};

const groupTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: '#111827',
};

const groupDescStyle = {
  marginTop: 4,
  fontSize: 13,
  color: '#6b7280',
};

const helperRowStyle = {
  fontSize: 12,
  color: '#4b5563',
};

const cardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const cardButtonStyle = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 14,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  minHeight: 112,
};

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: '#111827',
};

const cardDescStyle = {
  fontSize: 13,
  lineHeight: 1.45,
  color: '#4b5563',
};

const ctaStyle = {
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 700,
  color: '#1d4ed8',
};

const topActionBarStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const actionButtonStyle = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const linkButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
};

const floatingDockStyle = {
  position: 'fixed',
  right: 18,
  bottom: 18,
  zIndex: 30,
  display: 'grid',
  gap: 8,
  maxWidth: 'calc(100vw - 36px)',
};

const floatingPrimaryButtonStyle = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #111827',
  borderRadius: 999,
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 25px rgba(17, 24, 39, 0.16)',
};

const floatingSecondaryButtonStyle = {
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: 999,
  padding: '11px 16px',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 25px rgba(17, 24, 39, 0.12)',
};

const floatingLinkButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: 999,
  padding: '11px 16px',
  fontSize: 13,
  fontWeight: 800,
  boxShadow: '0 10px 25px rgba(17, 24, 39, 0.12)',
};
