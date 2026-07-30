const DB_NAME="ExpenseTrackerV4",DB_VERSION=1,OLD_DB_NAME="ExpenseTrackerV3";
const STORES=["transactions","categories","budgets","recurring"];
let db,selectedDate=new Date(),allTransactions=[],allCategories=[],allBudgets=[],allRecurring=[];
selectedDate.setDate(1);
const currencies=["CAD","USD","EUR","GBP","IRR"];
const defaultCats=[
{id:"home",name:"Home",icon:"🏠",type:"expense"},{id:"groceries",name:"Groceries",icon:"🛒",type:"expense"},
{id:"car",name:"Car",icon:"🚗",type:"expense"},{id:"gas",name:"Gas",icon:"⛽️",type:"expense"},
{id:"restaurants",name:"Restaurants",icon:"🍽️",type:"expense"},{id:"subscriptions",name:"Subscriptions",icon:"🔁",type:"expense"},
{id:"internet",name:"Phone & Internet",icon:"📱",type:"expense"},{id:"gym",name:"Gym",icon:"🏋️",type:"expense"},
{id:"entertainment",name:"Entertainment",icon:"🎬",type:"expense"},{id:"loan",name:"Loan",icon:"🏦",type:"expense"},
{id:"other-expense",name:"Other",icon:"📦",type:"expense"},{id:"salary",name:"Salary",icon:"💼",type:"income"},
{id:"bonus",name:"Bonus",icon:"🎁",type:"income"},{id:"refund",name:"Refund",icon:"↩️",type:"income"},
{id:"other-income",name:"Other income",icon:"💵",type:"income"}];
const $=id=>document.getElementById(id);
const els={monthScroller:$("monthScroller"),summaryMonth:$("summaryMonth"),balance:$("balance"),incomeTotal:$("incomeTotal"),
expenseTotal:$("expenseTotal"),categoryList:$("categoryList"),transactionList:$("transactionList"),yearChart:$("yearChart"),
budgetList:$("budgetList"),searchInput:$("searchInput"),currencyFilter:$("currencyFilter"),transactionDialog:$("transactionDialog"),
transactionForm:$("transactionForm"),typeInput:$("typeInput"),amountInput:$("amountInput"),currencyInput:$("currencyInput"),
categoryInput:$("categoryInput"),descriptionInput:$("descriptionInput"),dateInput:$("dateInput"),receiptInput:$("receiptInput"),
recurringInput:$("recurringInput")};

function openNamedDB(name,version=1){return new Promise((res,rej)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>{for(const s of STORES)if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s,{keyPath:"id"});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function openDB(){return openNamedDB(DB_NAME,DB_VERSION);}
function getAll(store,database=db){return new Promise((res,rej)=>{const r=database.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function put(store,item,database=db){return new Promise((res,rej)=>{const r=database.transaction(store,"readwrite").objectStore(store).put(item);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function del(store,id){return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function clearStore(store){return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function settings(){try{return JSON.parse(localStorage.getItem("expenseTrackerV4Settings"))||{};}catch{return {};}}
function saveSettings(v){localStorage.setItem("expenseTrackerV4Settings",JSON.stringify(v));}
function money(v,c){return new Intl.NumberFormat("en-CA",{style:"currency",currency:c}).format(v);}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function currentCurrency(){return els.currencyFilter.value||settings().currency||"CAD";}
function monthTransactions(){const k=monthKey(selectedDate),c=currentCurrency();return allTransactions.filter(t=>t.date.startsWith(k)&&t.currency===c);}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function categoryById(id){return allCategories.find(c=>c.id===id)||{name:"Unknown",icon:"❓"};}

async function migrateFromV3(){
  const s=settings();
  if(s.migrationChecked)return;
  try{
    const old=await openNamedDB(OLD_DB_NAME,1);
    const oldCounts=await Promise.all(STORES.map(st=>getAll(st,old)));
    const hasOld=oldCounts.some(arr=>arr.length);
    const hasNew=(await getAll("transactions")).length>0;
    if(hasOld&&!hasNew){
      for(let i=0;i<STORES.length;i++)for(const item of oldCounts[i])await put(STORES[i],item);
      s.migratedFromV3At=new Date().toISOString();
    }
    old.close();
  }catch{}
  s.migrationChecked=true;
  saveSettings(s);
}
async function seed(){if((await getAll("categories")).length===0)for(const c of defaultCats)await put("categories",c);}
async function refresh(){[allTransactions,allCategories,allBudgets,allRecurring]=await Promise.all(STORES.map(getAll));await generateRecurring();[allTransactions,allCategories,allBudgets,allRecurring]=await Promise.all(STORES.map(getAll));render();updateStorageStatus();}
function fillCurrencies(){for(const id of ["currencyFilter","currencyInput","budgetCurrencyInput"]){$(id).innerHTML=currencies.map(c=>`<option>${c}</option>`).join("");}const s=settings();els.currencyFilter.value=s.currency||"CAD";els.currencyInput.value=s.currency||"CAD";$("budgetCurrencyInput").value=s.currency||"CAD";}
function updateCategoryOptions(){const type=els.typeInput.value;els.categoryInput.innerHTML=allCategories.filter(c=>c.type===type).map(c=>`<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("");}
function renderMonths(){els.monthScroller.innerHTML="";const y=selectedDate.getFullYear();for(let m=0;m<12;m++){const d=new Date(y,m,1),b=document.createElement("button");b.className="month-chip"+(m===selectedDate.getMonth()?" active":"");b.textContent=d.toLocaleDateString("en-CA",{month:"short"});b.onclick=()=>{selectedDate=d;render();};els.monthScroller.appendChild(b);}requestAnimationFrame(()=>els.monthScroller.querySelector(".active")?.scrollIntoView({behavior:"smooth",inline:"center"}));}
function renderSummary(){const tx=monthTransactions(),c=currentCurrency(),inc=tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),exp=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),bal=inc-exp;els.summaryMonth.textContent=selectedDate.toLocaleDateString("en-CA",{month:"long",year:"numeric"})+" · "+c;els.balance.textContent=money(bal,c);els.balance.classList.toggle("positive",bal>=0);els.incomeTotal.textContent=money(inc,c);els.expenseTotal.textContent=money(exp,c);}
function renderYear(){const y=selectedDate.getFullYear(),c=currentCurrency(),vals=[];for(let m=0;m<12;m++){const k=`${y}-${String(m+1).padStart(2,"0")}`;vals.push(allTransactions.filter(t=>t.type==="expense"&&t.currency===c&&t.date.startsWith(k)).reduce((s,t)=>s+t.amount,0));}const max=Math.max(...vals,1);els.yearChart.innerHTML=vals.map((v,m)=>`<div class="chart-item ${m===selectedDate.getMonth()?"active":""}" data-month="${m}"><div class="chart-track"><div class="chart-bar" style="height:${Math.max(7,v/max*100)}%"></div></div><div class="chart-label">${new Date(y,m,1).toLocaleDateString("en-CA",{month:"narrow"})}</div></div>`).join("");els.yearChart.querySelectorAll(".chart-item").forEach(i=>i.onclick=()=>{selectedDate=new Date(y,+i.dataset.month,1);render();});}
function renderCategories(){const tx=monthTransactions().filter(t=>t.type==="expense"),g={};tx.forEach(t=>g[t.categoryId]=(g[t.categoryId]||0)+t.amount);const rows=Object.entries(g).sort((a,b)=>b[1]-a[1]),c=currentCurrency();els.categoryList.innerHTML=rows.length?rows.map(([id,total])=>{const cat=categoryById(id);return `<div class="category-row"><div class="category-icon">${cat.icon}</div><div class="meta"><strong>${esc(cat.name)}</strong><span>${tx.filter(t=>t.categoryId===id).length} transaction(s)</span></div><div class="amount">${money(total,c)}</div></div>`;}).join(""):`<div class="empty">No expenses for this month.</div>`;}
function renderBudgets(){const c=currentCurrency(),tx=monthTransactions().filter(t=>t.type==="expense"),bud=allBudgets.filter(b=>b.currency===c);els.budgetList.innerHTML=bud.length?bud.map(b=>{const spent=tx.filter(t=>t.categoryId===b.categoryId).reduce((s,t)=>s+t.amount,0),pct=b.amount?Math.min(100,spent/b.amount*100):0,cat=categoryById(b.categoryId);return `<div class="budget-row"><div><strong>${cat.icon} ${esc(cat.name)}</strong><div class="meta"><span>${money(spent,c)} of ${money(b.amount,c)}</span></div><div class="progress"><div class="${spent>b.amount?"over-budget":""}" style="width:${pct}%"></div></div></div><button class="delete-btn" data-budget="${b.id}">×</button></div>`;}).join(""):`<div class="empty">No budgets set for ${c}.</div>`;els.budgetList.querySelectorAll("[data-budget]").forEach(b=>b.onclick=async()=>{await del("budgets",b.dataset.budget);refresh();});}
function renderTransactions(){const q=els.searchInput.value.trim().toLowerCase(),c=currentCurrency();const tx=monthTransactions().filter(t=>!q||t.note.toLowerCase().includes(q)||categoryById(t.categoryId).name.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));els.transactionList.innerHTML=tx.length?tx.map(t=>{const cat=categoryById(t.categoryId);return `<div class="transaction-row"><div class="meta"><strong>${cat.icon} ${esc(t.note)}</strong><span>${esc(cat.name)} · ${new Date(t.date+"T12:00:00").toLocaleDateString("en-CA",{month:"short",day:"numeric"})}${t.recurringId?" · recurring":""}</span>${t.receipt?`<img class="receipt-thumb" src="${t.receipt}" alt="Receipt">`:""}</div><div class="amount">${t.type==="income"?"+":"−"}${money(t.amount,c)}</div><button class="delete-btn" data-tx="${t.id}">×</button></div>`;}).join(""):`<div class="empty">No matching transactions.</div>`;els.transactionList.querySelectorAll("[data-tx]").forEach(b=>b.onclick=async()=>{await del("transactions",b.dataset.tx);refresh();});}
function renderCustom(){const custom=allCategories.filter(c=>!defaultCats.some(d=>d.id===c.id));$("customCategoryList").innerHTML=custom.length?custom.map(c=>`<span class="custom-chip">${c.icon} ${esc(c.name)} <button class="delete-btn" data-cat="${c.id}">×</button></span>`).join(""):`<p class="muted">No custom categories yet.</p>`;$("customCategoryList").querySelectorAll("[data-cat]").forEach(b=>b.onclick=async()=>{await del("categories",b.dataset.cat);refresh();});$("budgetCategoryInput").innerHTML=allCategories.filter(c=>c.type==="expense").map(c=>`<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("");}
function renderRecurring(){$("recurringList").innerHTML=allRecurring.length?allRecurring.map(r=>{const c=categoryById(r.categoryId);return `<div class="recurring-row"><div class="meta"><strong>${c.icon} ${esc(r.note)}</strong><span>${money(r.amount,r.currency)} monthly on day ${r.day}</span></div><button class="delete-btn" data-rec="${r.id}">×</button></div>`;}).join(""):`<p class="muted">No recurring items.</p>`;$("recurringList").querySelectorAll("[data-rec]").forEach(b=>b.onclick=async()=>{await del("recurring",b.dataset.rec);refresh();});}
function renderReports(){const c=currentCurrency(),now=new Date(),months=[];for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),k=monthKey(d);months.push({d,inc:allTransactions.filter(t=>t.currency===c&&t.type==="income"&&t.date.startsWith(k)).reduce((s,t)=>s+t.amount,0),exp:allTransactions.filter(t=>t.currency===c&&t.type==="expense"&&t.date.startsWith(k)).reduce((s,t)=>s+t.amount,0)});}const max=Math.max(...months.flatMap(x=>[x.inc,x.exp]),1);$("comparisonChart").innerHTML=months.map(x=>`<div class="compare-col"><div class="compare-bars"><div class="compare-income" style="height:${Math.max(3,x.inc/max*100)}%"></div><div class="compare-expense" style="height:${Math.max(3,x.exp/max*100)}%"></div></div><div class="chart-label">${x.d.toLocaleDateString("en-CA",{month:"narrow"})}</div></div>`).join("");const g={};allTransactions.filter(t=>t.type==="expense"&&t.currency===c).forEach(t=>g[t.categoryId]=(g[t.categoryId]||0)+t.amount);$("reportCategories").innerHTML=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,v])=>{const cat=categoryById(id);return `<div class="category-row"><div class="category-icon">${cat.icon}</div><strong>${esc(cat.name)}</strong><div class="amount">${money(v,c)}</div></div>`;}).join("")||`<div class="empty">No expense data.</div>`;}
function render(){renderMonths();renderSummary();renderYear();renderBudgets();renderCategories();renderTransactions();renderCustom();renderRecurring();renderReports();}

function updateStorageStatus(){
  const s=settings(),count=allTransactions.length;
  $("storageStatus").textContent=`${count} transaction${count===1?"":"s"} stored locally in this app copy`;
  if(s.lastBackupAt){
    const d=new Date(s.lastBackupAt);
    $("lastBackupStatus").textContent=`Last backup: ${d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}`;
  }else $("lastBackupStatus").textContent="No backup yet";
  const days=Number(s.backupReminderDays||7),due=!s.lastBackupAt||((Date.now()-new Date(s.lastBackupAt).getTime())/86400000)>=days;
  $("backupReminder").classList.toggle("hidden",!due||count===0);
  $("backupReminderDays").value=String(days);
}
async function fileToDataURL(file){if(!file)return null;return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file);});}
async function generateRecurring(){const today=new Date();for(const r of allRecurring){for(let offset=0;offset<3;offset++){const d=new Date(today.getFullYear(),today.getMonth()-offset,Math.min(r.day,28)),key=`${r.id}-${monthKey(d)}`;if(!allTransactions.some(t=>t.recurringKey===key)&&d<=today){await put("transactions",{id:crypto.randomUUID(),type:r.type,amount:r.amount,currency:r.currency,categoryId:r.categoryId,note:r.note,date:d.toISOString().slice(0,10),receipt:null,recurringId:r.id,recurringKey:key});}}}}
async function hashPin(pin){return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("expense-v4:"+pin)))));}
function lockApp(){const s=settings();if(s.pinHash||s.credentialId){$("lockScreen").classList.remove("hidden");$("biometricUnlockBtn").classList.toggle("hidden",!s.credentialId);}}
async function biometricCreate(){if(!window.PublicKeyCredential)throw new Error("Passkeys are not supported.");const userId=crypto.getRandomValues(new Uint8Array(16));const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:"My Expenses"},user:{id:userId,name:"local-user",displayName:"My Expenses User"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:60000,attestation:"none"}});const s=settings();s.credentialId=btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));saveSettings(s);}
async function biometricGet(){const s=settings(),id=Uint8Array.from(atob(s.credentialId),c=>c.charCodeAt(0));await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{id,type:"public-key"}],userVerification:"required",timeout:60000}});}
async function deriveKey(password,salt,usage){const mat=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},mat,{name:"AES-GCM",length:256},false,usage);}
const b64=x=>btoa(String.fromCharCode(...new Uint8Array(x))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function exportBackup(){
  const p=$("backupPassword").value;
  if(p.length<8){$("backupMessage").textContent="Use at least 8 characters.";return;}
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await deriveKey(p,salt,["encrypt"]);
  const payload={version:4,createdAt:new Date().toISOString(),transactions:allTransactions,categories:allCategories,budgets:allBudgets,recurring:allRecurring,settings:{currency:currentCurrency(),theme:settings().theme}};
  const enc=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)));
  const blob=new Blob([JSON.stringify({format:"expense-v4",salt:b64(salt),iv:b64(iv),data:b64(enc)})],{type:"application/json"});
  const fileName=`my-expenses-${new Date().toISOString().slice(0,10)}.expensebackup`;
  const file=new File([blob],fileName,{type:"application/json"});
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:"Encrypted expense backup",text:"Save this encrypted backup to iCloud Drive."});
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fileName;a.click();URL.revokeObjectURL(a.href);
    }
    const s=settings();s.lastBackupAt=new Date().toISOString();saveSettings(s);$("backupMessage").textContent="Backup created. Save it to iCloud Drive in the share/save dialog.";updateStorageStatus();
  }catch(e){if(e.name!=="AbortError")$("backupMessage").textContent="Backup could not be created.";}
}
async function importBackup(file,passwordOverride){
  const p=passwordOverride||$("backupPassword").value;
  if(!p){$("backupMessage").textContent="Enter the backup password first.";return false;}
  try{
    const o=JSON.parse(await file.text()),key=await deriveKey(p,unb64(o.salt),["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(o.iv)},key,unb64(o.data)),data=JSON.parse(new TextDecoder().decode(plain));
    for(const s of STORES)await clearStore(s);
    for(const t of data.transactions||[])await put("transactions",t);
    for(const c of data.categories||[])await put("categories",c);
    for(const b of data.budgets||[])await put("budgets",b);
    for(const r of data.recurring||[])await put("recurring",r);
    await seed();await refresh();
    const st=settings();st.lastRestoreAt=new Date().toISOString();saveSettings(st);
    $("backupMessage").textContent="Backup restored.";
    return true;
  }catch{$("backupMessage").textContent="Restore failed. Check the password and file.";return false;}
}
function exportCSV(){const rows=[["Date","Type","Amount","Currency","Category","Description"]];for(const t of allTransactions)rows.push([t.date,t.type,t.amount,t.currency,categoryById(t.categoryId).name,t.note]);const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="expenses.csv";a.click();URL.revokeObjectURL(a.href);}

$("addBtn").onclick=()=>{els.transactionForm.reset();els.typeInput.value="expense";updateCategoryOptions();els.currencyInput.value=currentCurrency();els.dateInput.value=new Date().toISOString().slice(0,10);els.transactionDialog.showModal();};
$("closeTransactionDialog").onclick=()=>els.transactionDialog.close();els.typeInput.onchange=updateCategoryOptions;
els.transactionForm.onsubmit=async e=>{e.preventDefault();const amount=Number(els.amountInput.value);if(!(amount>0))return;const id=crypto.randomUUID(),receipt=await fileToDataURL(els.receiptInput.files[0]);const tx={id,type:els.typeInput.value,amount,currency:els.currencyInput.value,categoryId:els.categoryInput.value,note:els.descriptionInput.value.trim(),date:els.dateInput.value,receipt};await put("transactions",tx);if(els.recurringInput.checked)await put("recurring",{id:crypto.randomUUID(),type:tx.type,amount:tx.amount,currency:tx.currency,categoryId:tx.categoryId,note:tx.note,day:new Date(tx.date+"T12:00:00").getDate()});selectedDate=new Date(tx.date+"T12:00:00");selectedDate.setDate(1);els.transactionDialog.close();refresh();};
$("prevMonth").onclick=()=>{selectedDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth()-1,1);render();};$("nextMonth").onclick=()=>{selectedDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth()+1,1);render();};
els.searchInput.oninput=renderTransactions;els.currencyFilter.onchange=()=>{const s=settings();s.currency=currentCurrency();saveSettings(s);render();};
$("manageBtn").onclick=()=>$("manageDialog").showModal();$("closeManageDialog").onclick=()=>$("manageDialog").close();
$("addCategoryBtn").onclick=async()=>{const name=$("categoryNameInput").value.trim();if(!name)return;await put("categories",{id:crypto.randomUUID(),name,icon:$("categoryIconInput").value.trim()||"📌",type:$("categoryTypeInput").value});$("categoryNameInput").value="";refresh();};
$("saveBudgetBtn").onclick=async()=>{const amount=Number($("budgetAmountInput").value);if(!(amount>=0))return;const cat=$("budgetCategoryInput").value,c=$("budgetCurrencyInput").value,id=`${cat}-${c}`;await put("budgets",{id,categoryId:cat,currency:c,amount});refresh();};
$("settingsBtn").onclick=()=>$("settingsDialog").showModal();$("closeSettingsDialog").onclick=()=>$("settingsDialog").close();
$("reportBtn").onclick=()=>{$("reportDialog").showModal();renderReports();};$("closeReportDialog").onclick=()=>$("reportDialog").close();
$("backupNowBtn").onclick=()=>{$("settingsDialog").showModal();$("backupPassword").focus();};
$("lockBtn").onclick=lockApp;
$("savePinBtn").onclick=async()=>{const a=$("newPinInput").value,b=$("confirmPinInput").value;if(!/^\d{4,8}$/.test(a))return $("pinMessage").textContent="PIN must be 4–8 digits.";if(a!==b)return $("pinMessage").textContent="PINs do not match.";const s=settings();s.pinHash=await hashPin(a);saveSettings(s);$("pinMessage").textContent="PIN saved.";};
$("removePinBtn").onclick=()=>{const s=settings();delete s.pinHash;saveSettings(s);$("pinMessage").textContent="PIN removed.";};
$("unlockBtn").onclick=async()=>{if(await hashPin($("unlockPin").value)===settings().pinHash){$("lockScreen").classList.add("hidden");$("unlockError").textContent="";}else $("unlockError").textContent="Incorrect PIN.";};
$("enableBiometricBtn").onclick=async()=>{try{await biometricCreate();$("pinMessage").textContent="Face ID / Touch ID enabled.";}catch(e){$("pinMessage").textContent=e.message||"Could not enable biometric unlock.";}};$("disableBiometricBtn").onclick=()=>{const s=settings();delete s.credentialId;saveSettings(s);$("pinMessage").textContent="Biometric unlock disabled.";};$("biometricUnlockBtn").onclick=async()=>{try{await biometricGet();$("lockScreen").classList.add("hidden");}catch{$("unlockError").textContent="Biometric unlock failed.";}}
$("themeSelect").onchange=()=>{const s=settings();s.theme=$("themeSelect").value;saveSettings(s);applyTheme();};function applyTheme(){const t=settings().theme||"system";document.documentElement.removeAttribute("data-theme");if(t!=="system")document.documentElement.setAttribute("data-theme",t);$("themeSelect").value=t;}
$("backupReminderDays").onchange=()=>{const s=settings();s.backupReminderDays=Number($("backupReminderDays").value);saveSettings(s);updateStorageStatus();};
$("exportBackupBtn").onclick=exportBackup;$("importBackupInput").onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);};$("exportCsvBtn").onclick=exportCSV;$("printReportBtn").onclick=()=>window.print();
$("clearDataBtn").onclick=async()=>{if(confirm("Delete all transactions, categories, budgets, and recurring items?")){for(const s of STORES)await clearStore(s);await seed();refresh();}};
$("dismissRestorePrompt").onclick=()=>{const s=settings();s.dismissedEmptyRestore=true;saveSettings(s);$("restorePrompt").classList.add("hidden");};
$("restorePromptFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const ok=await importBackup(f,$("restorePromptPassword").value);if(ok)$("restorePrompt").classList.add("hidden");};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
(async()=>{db=await openDB();await migrateFromV3();await seed();fillCurrencies();applyTheme();await refresh();updateCategoryOptions();lockApp();if(allTransactions.length===0&&!settings().dismissedEmptyRestore)$("restorePrompt").classList.remove("hidden");})();