/* Universal PDF tools for every CRPF Mess page.
   Creates a clean print-to-PDF view; the browser's Print dialog can save/share a PDF.
   Does not read, modify, or clear mess data. */
(function(){

  async function showLocalPdf(file){
    const sources=[
      ["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"],
      ["https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js","https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"]
    ];
    let lib=window.pdfjsLib;
    if(!lib){
      for(const pair of sources){
        try{await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=pair[0];s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error("PDF viewer load nahi hua"))};document.head.appendChild(s)});if(window.pdfjsLib){lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=pair[1];break}}catch(e){}
      }
    }
    if(!lib)throw new Error("Internet chalu karke dobara try karein; PDF viewer load nahi hua.");
    if(lib.GlobalWorkerOptions&&!lib.GlobalWorkerOptions.workerSrc)lib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buffer=await file.arrayBuffer();
    const pdf=await lib.getDocument({data:new Uint8Array(buffer),disableRange:true,disableStream:true}).promise;
    const old=document.getElementById("crpfLocalPdfViewer");if(old)old.remove();
    const wrap=document.createElement("div");wrap.id="crpfLocalPdfViewer";
    wrap.style.cssText="position:fixed;inset:0;z-index:15000;background:#101714;display:flex;flex-direction:column;width:100%;height:100%;height:100dvh;overflow:hidden";
    const header=document.createElement("div");header.style.cssText="min-height:52px;display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#176747;color:#fff;gap:8px;flex:0 0 auto";
    const title=document.createElement("strong");title.textContent=file.name;title.style.cssText="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px";
    const close=document.createElement("button");close.type="button";close.textContent="✕ Band";close.style.cssText="background:#fff;color:#176747;border:0;border-radius:8px;padding:9px 12px;font-weight:700;flex:0 0 auto";close.onclick=()=>wrap.remove();
    header.append(title,close);wrap.appendChild(header);
    const controls=document.createElement("div");controls.style.cssText="display:flex;align-items:center;justify-content:center;gap:9px;padding:8px;background:#092d20;color:#fff;flex:0 0 auto";
    const prev=document.createElement("button"),next=document.createElement("button"),minus=document.createElement("button"),plus=document.createElement("button"),label=document.createElement("span");
    [prev,next,minus,plus].forEach(b=>{b.type="button";b.style.cssText="border:1px solid #438568;background:#075039;color:#fff;border-radius:7px;padding:7px 10px;font-weight:700"});
    prev.textContent="‹";next.textContent="›";minus.textContent="−";plus.textContent="+";label.style.cssText="font-size:12px;min-width:65px;text-align:center";
    controls.append(prev,label,next,minus,plus);wrap.appendChild(controls);
    const area=document.createElement("div");area.style.cssText="flex:1;min-height:0;overflow:auto;background:#303834;text-align:center;padding:8px 4px;overscroll-behavior:contain";
    const canvas=document.createElement("canvas");canvas.style.cssText="display:block;margin:0 auto 12px;background:#fff;max-width:100%;height:auto;box-shadow:0 2px 12px #0008";area.appendChild(canvas);wrap.appendChild(area);document.body.appendChild(wrap);
    let page=1,scale=1,task=null;
    async function renderPage(){
      const p=await pdf.getPage(page),base=p.getViewport({scale:1}),fit=Math.max(.35,(area.clientWidth-12)/base.width),viewport=p.getViewport({scale:fit*scale});
      const ratio=window.devicePixelRatio||1;canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=Math.floor(viewport.width)+"px";canvas.style.height=Math.floor(viewport.height)+"px";
      const ctx=canvas.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);if(task&&task.cancel)try{task.cancel()}catch(e){}
      task=p.render({canvasContext:ctx,viewport});try{await task.promise}catch(e){if(e.name!=="RenderingCancelledException")throw e}
      label.textContent=page+" / "+pdf.numPages;prev.disabled=page<=1;next.disabled=page>=pdf.numPages;
      area.scrollTop=0;
    }
    prev.onclick=()=>{if(page>1){page--;renderPage().catch(e=>alert(e.message))}};next.onclick=()=>{if(page<pdf.numPages){page++;renderPage().catch(e=>alert(e.message))}};
    minus.onclick=()=>{scale=Math.max(.6,scale-.2);renderPage().catch(e=>alert(e.message))};plus.onclick=()=>{scale=Math.min(2.5,scale+.2);renderPage().catch(e=>alert(e.message))};
    await renderPage();
  }
  window.openLocalPdfFile=showLocalPdf;
  function init(){
    if(document.getElementById("crpfPdfMakeButton")) return;
    const style=document.createElement("style");
    style.id="crpfPdfToolsStyle";
    style.textContent=`
      .crpf-pdf-title-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;flex-wrap:wrap!important;width:100%}
      .crpf-pdf-title-row>h2{margin:0!important;flex:1 1 170px;min-width:0}
      .crpf-pdf-title-actions{position:relative;z-index:2;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:7px;margin:0 0 0 auto;padding:0;flex:0 1 auto}
      .crpf-pdf-title-actions .crpf-pdf-make{position:relative!important;right:auto!important;bottom:auto!important;padding:8px 12px!important;min-height:36px!important;font-size:12px!important;box-shadow:0 3px 10px #0003!important}
      .crpf-pdf-make{position:relative;right:auto;bottom:auto;z-index:auto;border:1px solid #e5bb19!important;border-radius:999px!important;background:#176747!important;color:#fff!important;padding:12px 17px!important;min-height:46px;font:700 14px Arial,sans-serif!important;box-shadow:0 5px 18px #0005!important;cursor:pointer}
      .crpf-pdf-make:active{transform:scale(.97)}
      @media(max-width:600px){.crpf-pdf-title-row{align-items:center!important;gap:8px!important}.crpf-pdf-title-row>h2{flex-basis:100%}.crpf-pdf-title-actions{width:100%;justify-content:flex-start;margin:0}.crpf-pdf-title-actions .crpf-pdf-make{padding:8px 11px!important;min-height:34px!important;font-size:12px!important}}
      @media print{@page{size:auto;margin:10mm}html,body,*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.sidebar,.topbar,.mobile-tabbar,.mobile-menu-toggle,.mobile-menu-backdrop,.footer,#crpfPdfActions,.crpf-pdf-make,.no-print,.app-toast,#documentPreviewModal,#crpfLocalPdfViewer{display:none!important}.app,.main,.content,.page-content,.panel-wrap{width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;overflow:visible!important;box-shadow:none!important}button:not(.print-keep),input[type=button],input[type=submit]{display:none!important}img{max-width:100%!important}a{text-decoration:none!important}table{max-width:100%!important;border-collapse:collapse!important}tr,.panel,.card,.stat,.summary-box,.menu-panel,.guide-card,.table-wrap,.table-panel{break-inside:avoid}}
    `;
    document.head.appendChild(style);
    const actions=document.createElement("div");
    actions.id="crpfPdfActions";actions.style.cssText="position:static;z-index:1;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;margin:18px 0 12px;padding:0";
    const button=document.createElement("button");
    button.type="button";button.id="crpfPdfMakeButton";button.className="crpf-pdf-make";
    button.textContent="📄 PDF Banayein";
    button.setAttribute("aria-label","Create PDF of this page");
    button.addEventListener("click",function(){
      if(typeof window.print==="function") window.print();
      else alert("Is browser mein PDF/Print support nahi hai. Chrome mein kholkar dobara try karein.");
    });
    const openButton=document.createElement("button");
    openButton.type="button";openButton.className="crpf-pdf-make";openButton.textContent="📂 PDF Dekhein";
    openButton.style.cssText="background:#fff!important;color:#176747!important;border-color:#176747!important";
    const picker=document.createElement("input");picker.type="file";picker.accept="application/pdf,.pdf";picker.hidden=true;
    openButton.addEventListener("click",()=>picker.click());
    picker.addEventListener("change",async()=>{
      const file=picker.files&&picker.files[0];if(!file)return;
      if(file.type!=="application/pdf"&&!/\\.pdf$/i.test(file.name)){alert("Sirf PDF file select karein.");picker.value="";return;}
      try{await showLocalPdf(file);}catch(error){alert("PDF nahi khul payi: "+(error&&error.message||"Unknown error"));}
      picker.value="";
    });
    actions.append(openButton,button,picker);
    actions.className="crpf-pdf-title-actions";
    const title=document.querySelector(".page-title,.pagehead,.pagehead-row");
    if(title){
      const heading=title.querySelector("h2");
      if(heading){
        const row=document.createElement("div");row.className="crpf-pdf-title-row";
        heading.parentNode.insertBefore(row,heading);row.appendChild(heading);row.appendChild(actions);
      }else{title.appendChild(actions);}
    }else{
      const host=document.querySelector(".content")||document.querySelector(".main")||document.body;
      host.insertBefore(actions,host.firstChild);
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();