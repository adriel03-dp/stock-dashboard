import React from 'react';
import { Link } from 'react-router-dom';
export default function Brand({ to = '/' }) {
  return <Link to={to} className="brand" aria-label="StockDash home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>stockdash<span className="brand-period">.</span></span></Link>;
}
