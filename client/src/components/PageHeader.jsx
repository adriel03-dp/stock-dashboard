import React from 'react';
export default function PageHeader({title, description, actions, breadcrumb}) {
  return <header className="editorial-page-header">{breadcrumb && <div className="page-breadcrumb">{breadcrumb}</div>}<div className="page-heading-row"><div><span className="small-overline">THE STOCKDASH PERSPECTIVE</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div></header>;
}
