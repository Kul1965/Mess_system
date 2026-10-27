(() => {
"use strict";

const KEY = "crpfMessGreenV1";
const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const uid = () => "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const money = n => "Rs " + (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});

let data;
try { data = JSON.parse(localStorage.getItem(KEY)); } catch(e) {}
if (!data || !Array.isArray(data.members)) data = {members:[],meals:[],ledger:[]};
data.meals = data.meals || [];
data.ledger = data.ledger || [];

let profileId = null, photoData = "";

const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

function save() {
  try {
    localStorage.setItem(KEY,JSON.stringify(data));
    render();
  } catch(e) {
    alert("Storage full. Please use a smaller photo or download a backup.");
  }
}

function member(id) {
  return data.members.find(m=>m.id===id);
}

function memberName(id) {
  return member(id)?.name || "Deleted member";
}

function totals(id) {
  let charges=0, paid=0, advance=0;

  data.ledger.filter(x=>x.memberId===id).forEach(x=>{
    if(x.type==="Meal charge") charges+=Number(x.amount);
    if(x.type==="Payment") paid+=Number(x.amount);
    if(x.type==="Mess Advance") advance+=Number(x.amount);
  });

  return {
    charges, paid, advance,
    due:Math.max(0,charges-paid-advance),
    credit:Math.max(0,paid+advance-charges)
  };
}

function allTotals() {
  return data.members.reduce((a,m)=>{
    const t=totals(m.id);
    a.charges+=t.charges;
    a.paid+=t.paid;
    a.due+=t.due;
    return a;
  },{charges:0,paid:0,due:0});
}

function toast(message) {
  $("toast").textContent=message;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>$("toast").classList.remove("show"),2500);
}

function go(page) {
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  render();
  window.scrollTo(0,0);
}

function openForm(m=null) {
  $("memberForm").reset();
  $("formTitle").textContent=m?"Edit Member":"Add Member";
  $("editId").value=m?.id||"";
  $("serviceId").value=m?.serviceId||"";
  $("name").value=m?.name||"";
  $("rank").value=m?.rank||"Constable";
  $("phone").value=m?.phone||"";
  $("advance").value=0;
  $("status").value=m?.status||"Active";
  $("joining").value=m?.joining||today();
  $("notes").value=m?.notes||"";
  photoData=m?.photo||"";
  previewPhoto();
  $("memberDialog").showModal();
}

function previewPhoto() {
  $("photoPreview").innerHTML=photoData
    ? `<img src="${photoData}" alt="Member photo">`
    : "PHOTO";
}

function saveMember(e) {
  e.preventDefault();

  const id=$("editId").value||uid();
  const serviceId=$("serviceId").value.trim();
  const fullName=$("name").value.trim();

  if(data.members.some(m=>
    m.serviceId.toLowerCase()===serviceId.toLowerCase() && m.id!==id
  )) {
    toast("This Member ID already exists.");
    return;
  }

  const old=member(id);
  const m={
    id,serviceId,name:fullName,
    rank:$("rank").value,
    phone:$("phone").value.trim(),
    status:$("status").value,
    joining:$("joining").value,
    notes:$("notes").value.trim(),
    photo:photoData
  };

  if(old) {
    data.members=data.members.map(x=>x.id===id?m:x);
  } else {
    data.members.push(m);

    const advance=Number($("advance").value)||0;
    if(advance>0) {
      data.ledger.push({
        id:uid(),date:today(),memberId:id,
        type:"Mess Advance",
        description:"Opening mess advance",
        amount:advance
      });
    }
  }

  $("memberDialog").close();
  save();
  toast(old?"Member updated":"Member saved");
}

function renderMembers() {
  const q=$("search").value.toLowerCase().trim();

  const list=data.members.filter(m=>
    [m.name,m.serviceId,m.rank,m.phone]
    .some(v=>String(v||"").toLowerCase().includes(q))
  );

  $("memberList").innerHTML=list.map(m=>{
    const t=totals(m.id);

    return `
    <article class="member-card">
      <div class="member-top">
        <div class="avatar">
          ${m.photo
            ? `<img src="${m.photo}" alt="Member photo">`
            : esc((m.name||"?")[0].toUpperCase())}
        </div>
        <div style="flex:1;min-width:0">
          <h3>${esc(m.name)}</h3>
          <div class="sub">${esc(m.serviceId)} · ${esc(m.rank)}</div>
          <div class="sub">${esc(m.phone||"No phone added")}</div>
          <span class="pill ${m.status==="Active"?"":"off"}">${esc(m.status)}</span>
        </div>
      </div>

      <div class="balance">
        <span>Charges <b>${money(t.charges)}</b></span>
        <span>Advance <b>${money(t.advance)}</b></span>
        <span>Paid <b class="paid">${money(t.paid)}</b></span>
        <span>Unpaid <b class="${t.due?"due":"paid"}">${money(t.due)}</b></span>
      </div>

      <div class="actions">
        <button class="mini" data-act="view" data-id="${m.id}">View Profile</button>
        <button class="mini" data-act="edit" data-id="${m.id}">Edit</button>
        <button class="mini" data-act="wa" data-id="${m.id}">WhatsApp</button>
        <button class="mini" data-act="pay" data-id="${m.id}">Paid / Payment</button>
        <button class="mini" data-act="account" data-id="${m.id}">Account</button>
        <button class="mini danger" data-act="delete" data-id="${m.id}">Delete</button>
      </div>
    </article>`;
  }).join("");

  $("empty").style.display=list.length?"none":"block";
}

function showProfile(id) {
  const m=member(id);
  if(!m)return;

  profileId=id;
  $("profileName").textContent=m.name;

  const t=totals(id);
  const fields=[
    ["Member ID",m.serviceId],
    ["Full name",m.name],
    ["Rank",m.rank],
    ["Mobile",m.phone||"Not added"],
    ["Status",m.status],
    ["Joining date",m.joining||"Not added"],
    ["Mess advance",money(t.advance)],
    ["Meal charges",money(t.charges)],
    ["Paid",money(t.paid)],
    ["Unpaid",money(t.due)],
    ["Credit balance",money(t.credit)],
    ["Notes",m.notes||"None"]
  ];

  $("profileContent").innerHTML=`
    ${m.photo?`<img src="${m.photo}" alt="Member photo" style="width:110px;height:110px;object-fit:cover;border-radius:12px;margin-bottom:12px">`:""}
    <div class="profile-grid">
      ${fields.map(([k,v])=>`
        <div class="profile-item">
          <span>${esc(k)}</span><strong>${esc(v)}</strong>
        </div>`).join("")}
    </div>`;

  $("profileDialog").showModal();
}

function sendWhatsApp(id) {
  const m=member(id);
  if(!m?.phone) {
    toast("Add phone number with country code first.");
    return;
  }

  const t=totals(id);
  const phone=m.phone.replace(/\D/g,"");
  const msg=`Namaste ${m.name}, mess account summary
Member ID: ${m.serviceId}
Meal charges: ${money(t.charges)}
Mess advance: ${money(t.advance)}
Paid: ${money(t.paid)}
Unpaid: ${money(t.due)}`;

  window.open(
    "https://wa.me/"+phone+"?text="+encodeURIComponent(msg),
    "_blank"
  );
}

function openPayment(id) {
  const m=member(id);
  if(!m)return;

  $("payForm").reset();
  $("payId").value=id;
  $("payInfo").textContent=
    m.name+" — unpaid: "+money(totals(id).due);

  $("payDialog").showModal();
}

function savePayment(e) {
  e.preventDefault();

  const id=$("payId").value;
  const amount=Number($("payAmount").value);
  const t=totals(id);

  if(!member(id))return;

  if(amount<=0 || amount>t.due+0.00001) {
    toast("Enter an amount up to the unpaid balance.");
    return;
  }

  data.ledger.push({
    id:uid(),date:today(),memberId:id,
    type:"Payment",
    description:$("payNote").value.trim()||"Payment received",
    amount
  });

  $("payDialog").close();
  save();
  toast("Payment saved. Unpaid balance updated.");
}

function fillMealMembers() {
  $("mealMember").innerHTML=data.members
    .filter(m=>m.status==="Active")
    .map(m=>`<option value="${m.id}">${esc(m.name)} (${esc(m.serviceId)})</option>`)
    .join("") || '<option value="">No active members</option>';
}

function saveMeal(e) {
  e.preventDefault();

  const id=$("mealMember").value;
  const amount=Number($("mealCharge").value);

  if(!member(id)||amount<=0) {
    toast("Select a member and enter a valid charge.");
    return;
  }

  const meal={
    id:uid(),
    date:$("mealDate").value||today(),
    memberId:id,
    type:$("mealType").value,
    details:$("mealDetails").value.trim(),
    amount
  };

  data.meals.push(meal);
  data.ledger.push({
    id:uid(),date:meal.date,memberId:id,
    type:"Meal charge",
    description:meal.type+(meal.details?" — "+meal.details:""),
    amount,mealId:meal.id
  });

  $("mealCharge").value="";
  $("mealDetails").value="";
  save();
  toast("Meal confirmed. Charge added to account.");
}

function render() {
  const totalsAll=allTotals();

  $("activeCount").textContent=
    data.members.filter(m=>m.status==="Active").length;
  $("chargeTotal").textContent=money(totalsAll.charges);
  $("paidTotal").textContent=money(totalsAll.paid);
  $("dueTotal").textContent=money(totalsAll.due);

  $("dashRows").innerHTML=data.members
    .filter(m=>m.status==="Active")
    .map(m=>{
      const t=totals(m.id);
      return `<tr>
        <td>${esc(m.name)}<br><small>${esc(m.serviceId)}</small></td>
        <td>${money(t.charges)}</td>
        <td>${money(t.advance)}</td>
        <td>${money(t.paid)}</td>
        <td class="${t.due?"due":"paid"}">${money(t.due)}</td>
        <td><button class="mini" data-act="account" data-id="${m.id}">Open account</button></td>
      </tr>`;
    }).join("") || '<tr><td colspan="6">Add a member to begin.</td></tr>';

  renderMembers();
  fillMealMembers();

  $("mealRows").innerHTML=[...data.meals].reverse().map(m=>`
    <tr>
      <td>${esc(m.date)}</td>
      <td>${esc(memberName(m.memberId))}</td>
      <td>${esc(m.type)}</td>
      <td>${esc(m.details||"—")}</td>
      <td>${money(m.amount)}</td>
      <td><button class="mini danger" data-act="delmeal" data-id="${m.id}">Delete</button></td>
    </tr>`).join("") || '<tr><td colspan="6">No meals recorded.</td></tr>';

  $("accountRows").innerHTML=data.members.map(m=>{
    const t=totals(m.id);
    return `<tr>
      <td>${esc(m.name)}<br><small>${esc(m.serviceId)}</small></td>
      <td>${money(t.charges)}</td>
      <td>${money(t.advance)}</td>
      <td class="paid">${money(t.paid)}</td>
      <td class="${t.due?"due":"paid"}">${money(t.due)}</td>
      <td><button class="mini" data-act="pay" data-id="${m.id}">Record payment</button></td>
    </tr>`;
  }).join("") || '<tr><td colspan="6">No members.</td></tr>';

  $("ledgerRows").innerHTML=[...data.ledger].reverse().map(x=>`
    <tr>
      <td>${esc(x.date)}</td>
      <td>${esc(memberName(x.memberId))}</td>
      <td>${esc(x.type)}</td>
      <td>${esc(x.description||"—")}</td>
      <td>${money(x.amount)}</td>
    </tr>`).join("") || '<tr><td colspan="5">No transactions.</td></tr>';
}

function downloadBackup() {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="crpf-mess-backup-"+today()+".json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* Member form controls */
$("addMember").onclick=()=>openForm();
$("addTop").onclick=()=>{go("members");openForm();};
$("memberForm").addEventListener("submit",saveMember);
$("closeForm").onclick=$("cancelForm").onclick=()=>$("memberDialog").close();
$("search").addEventListener("input",renderMembers);

/* Meal and payment controls */
$("mealForm").addEventListener("submit",saveMeal);
$("closePay").onclick=$("cancelPay").onclick=()=>$("payDialog").close();
$("payForm").addEventListener("submit",savePayment);

/* Profile controls */
$("closeProfile").onclick=$("profileDone").onclick=()=>$("profileDialog").close();
$("profileEdit").onclick=()=>{
  const m=member(profileId);
  $("profileDialog").close();
  if(m)openForm(m);
};
$("profileWhats").onclick=()=>sendWhatsApp(profileId);

/* Photo upload: resize photo to reduce browser storage */
$("removePhoto").onclick=()=>{photoData="";previewPhoto();};
$("photo").addEventListener("change",e=>{
  const file=e.target.files[0];
  if(!file)return;

  if(file.size>4*1024*1024) {
    toast("Choose a photo smaller than 4 MB.");
    e.target.value="";
    return;
  }

  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement("canvas");
      const scale=Math.min(1,500/Math.max(img.width,img.height));
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      photoData=canvas.toDataURL("image/jpeg",0.78);
      previewPhoto();
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
});

/* Backup and restore */
$("backupBtn").onclick=downloadBackup;
$("restore").addEventListener("change",e=>{
  const file=e.target.files[0];
  if(!file)return;

  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const incoming=JSON.parse(reader.result);
      if(!Array.isArray(incoming.members)||
         !Array.isArray(incoming.meals)||
         !Array.isArray(incoming.ledger))throw new Error();

      if(confirm("Replace current browser data with this backup?")) {
        data=incoming;
        save();
        toast("Backup restored.");
      }
    } catch(err) {
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
  e.target.value="";
});

/* Navigation and member actions */
document.querySelectorAll(".tab").forEach(b=>{
  b.onclick=()=>go(b.dataset.page);
});

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");
  if(!b)return;

  const id=b.dataset.id;
  const action=b.dataset.act;

  if(action==="view")showProfile(id);
  if(action==="edit")openForm(member(id));
  if(action==="wa")sendWhatsApp(id);
  if(action==="pay")openPayment(id);
  if(action==="account")go("accounts");

  if(action==="delete") {
    const m=member(id);
    if(m&&confirm("Delete "+m.name+"? Existing account history will be retained.")) {
      data.members=data.members.filter(x=>x.id!==id);
      save();
      toast("Member deleted.");
    }
  }

  if(action==="delmeal") {
    const meal=data.meals.find(x=>x.id===id);
    if(meal&&confirm("Delete meal and reverse its charge? Check payments first.")) {
      data.meals=data.meals.filter(x=>x.id!==id);
      data.ledger=data.ledger.filter(x=>x.mealId!==id);
      save();
    }
  }
});

$("mealDate").value=today();
render();

})();
