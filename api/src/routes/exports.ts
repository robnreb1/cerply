/* CSV exports (DB-aware, pure CJS) */
/* eslint-disable @typescript-eslint/no-explicit-any */
function asCsv(rows:any[], cols:string[]) {
  const esc = (v:any) => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  return [cols.join(','), ...rows.map(r=> cols.map(c=> esc(r[c])).join(','))].join('\n') + '\n';
}

module.exports.registerExportRoutes = async function registerExportRoutes(app: any) {
  // (ledger export moved to routes/ledger.ts)
};


