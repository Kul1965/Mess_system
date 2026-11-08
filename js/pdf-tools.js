/* Universal PDF tools for every CRPF Mess page.
   Creates a clean print-to-PDF view; the browser's Print dialog can save/share a PDF.
   Does not read, modify, or clear mess data. */
(function(){
  function init(){
    if(document.getElementById("crpfPdfMakeButton")) return;
    const style=document.createElement("style");
    style.id="crpfPdfToolsStyle";
    style.textContent=`
      .crpf-pdf-make{position:fixed;right:14px;bottom:18px;z-index:9000;border:1px solid #e5bb19!important;border-radius:999px!important;background:#176747!important;color:#fff!important;padding:12px 17px!important;min-height:46px;font:700 14px Arial,sans-serif!important;box-shadow:0 5px 18px #0005!important;cursor:pointer}
      .crpf-pdf-make:active{transform:scale(.97)}
      @media print{
        @page{size:auto;margin:12mm}
        html,body{background:#fff!important;color:#111!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .sidebar,.topbar,.mobile-tabbar,.mobile-menu-toggle,.mobile-menu-backdrop,.footer,.crpf-pdf-make,.no-print,.app-toast,#documentPreviewModal{display:none!important}
        .app,.main,.content,.page-content,.panel-wrap{display:block!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;color:#111!important;box-shadow:none!important}
        .panel,.card,.stat,.summary-box,.menu-panel,.guide-card,.table-wrap,.table-panel{background:#fff!important;color:#111!important;border-color:#999!important;box-shadow:none!important;break-inside:avoid}
        h1,h2,h3,h4,p,small,label,th,td,span,strong,b,li{color:#111!important}
        table{width:100%!important;border-collapse:collapse!important}
        th,td{border:1px solid #888!important;padding:6px!important;color:#111!important}
        button:not(.print-keep),input[type=button],input[type=submit]{display:none!important}
        img{max-width:100%!important}
        a{color:#111!important;text-decoration:none!important}
        .stats,.cards,.formgrid{break-inside:avoid}
      }
      @media(max-width:600px){.crpf-pdf-make{right:10px;bottom:14px;padding:11px 14px!important;font-size:13px!important}}
    `;
    document.head.appendChild(style);
    const button=document.createElement("button");
    button.type="button";button.id="crpfPdfMakeButton";button.className="crpf-pdf-make";
    button.textContent="📄 PDF Banayein";
    button.setAttribute("aria-label","Create PDF of this page");
    button.addEventListener("click",function(){
      if(typeof window.print==="function") window.print();
      else alert("Is browser mein PDF/Print support nahi hai. Chrome mein kholkar dobara try karein.");
    });
    document.body.appendChild(button);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();