

/* ==========================================
   CRPF SMART MESS MANAGER
   Browser storage prototype
   ========================================== */

const STORAGE_KEY = "crpfMessProfessionalV1";

const $ = id => document.getElementById(id);

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = n =>
  "Rs " + (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const num = n => Number(n) || 0;

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);

const blankData = () => ({
  members: [],
  items: [],
  recipes: [],
  meals: [],
  ledger: []
});

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return blankData();

    return {
      members: Array.isArray(saved.members) ? saved.members : [],
      items: Array.isArray(saved.items) ? saved.items : [],
      recipes: Array.isArray(saved.recipes) ? saved.recipes : [],
      meals: Array.isArray(saved.meals) ? saved.meals : [],
      ledger: Array.isArray(saved.ledger) ? saved.ledger : []
    };
  } catch (error) {
    console.error("Could not read saved data:", error);
    return blankData();
  }
}

let db = loadData();
let currentProfileId = null;
let currentMoneyType = "payment";
let photoData = "";
let editingPurchaseId = null;
let toastTimer = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    console.error(error);
    showToast("Storage full. Export a backup and reduce photo sizes.");
    return false;
  }
}

function showToast(message) {
  const box = $("toast");
  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("show"), 3000);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function getMember(id) {
  return db.members.find(m => m.id === id);
}

function getItem(id) {
  return db.items.find(item => item.id === id);
}

function getRecipe(id) {
  return db.recipes.find(recipe => recipe.id === id);
}

function activeMembers() {
  return db.members.filter(m => (m.status || "Active") === "Active");
}

function memberName(id) {
  const member = getMember(id);
  return member ? member.name : "Deleted member";
}

function formatDate(date) {
  if (!date) return "—";
  return esc(date);
}

/* ==========================================
   ACCOUNT CALCULATIONS
   ========================================== */

function memberTotals(memberId) {
  let charges = 0;
  let advance = 0;
  let payments = 0;

  db.ledger.filter(t => t.memberId === memberId).forEach(t => {
    if (t.type === "charge") charges += num(t.amount);
    if (t.type === "advance") advance += num(t.amount);
    if (t.type === "payment") payments += num(t.amount);
    if (t.type === "refund") payments -= num(t.amount);
  });

  const due = Math.max(0, charges - advance - payments);

  return { charges, advance, payments, due };
}

function addLedger(memberId, type, amount, description, date = today()) {
  db.ledger.push({
    id: makeId(),
    memberId,
    type,
    amount: num(amount),
    description,
    date
  });
}

/* ==========================================
   STORE AND PURCHASE CALCULATIONS
   ========================================== */

function unitInfo(unit) {
  switch (unit) {
    case "kg":
      return { base: "g", factor: 1000 };
    case "g":
      return { base: "g", factor: 1 };
    case "ltr":
    case "l":
    case "litre":
      return { base: "ml", factor: 1000 };
    case "ml":
      return { base: "ml", factor: 1 };
    default:
      return { base: "pcs", factor: 1 };
  }
}

function unitLabel(unit) {
  return unit === "g" ? "g" : unit === "ml" ? "ml" : "pcs";
}

function purchaseQuantityInBase(quantity, unit) {
  return num(quantity) * unitInfo(unit).factor;
}

function itemPurchases(item) {
  return Array.isArray(item.purchases) ? item.purchases : [];
}

function itemConsumed(itemId) {
  return db.meals
    .filter(meal => !meal.cancelled)
    .reduce((total, meal) => {
      return total + (meal.ration || [])
        .filter(line => line.itemId === itemId)
        .reduce((sum, line) => sum + num(line.quantityBase), 0);
    }, 0);
}

function itemStats(item) {
  const purchases = itemPurchases(item);

  const purchased = purchases.reduce(
    (sum, p) => sum + num(p.quantityBase), 0
  );

  const purchaseValue = purchases.reduce(
    (sum, p) => sum + num(p.total), 0
  );

  const consumed = itemConsumed(item.id);
  const stock = purchased - consumed;
  const averageRate = purchased > 0 ? purchaseValue / purchased : 0;

  return {
    purchased,
    purchaseValue,
    consumed,
    stock: Math.abs(stock) < 0.000001 ? 0 : stock,
    averageRate,
    stockValue: Math.max(0, stock) * averageRate
  };
}

function displayQuantity(quantity, unit) {
  const value = num(quantity);

  if (unit === "g" && value >= 1000) {
    return `${(value / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 })} kg`;
  }

  if (unit === "ml" && value >= 1000) {
    return `${(value / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 })} litre`;
  }

  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${unit}`;
}

function renderStore() {
  const rows = db.items.map(item => {
    const stats = itemStats(item);

    return `<tr>
      <td>
        <strong>${esc(item.name)}</strong>
        <br><small>${esc(item.baseUnit)}</small>
      </td>
      <td>${esc(displayQuantity(stats.stock, item.baseUnit))}</td>
      <td>${money(stats.averageRate)} / ${esc(item.baseUnit)}</td>
      <td>${money(stats.stockValue)}</td>
      <td>
        <div class="actions">
          <button type="button" class="btn secondary"
            data-action="edit-purchase" data-id="${esc(item.id)}">Edit</button>
          <button type="button" class="btn secondary"
            data-action="purchase-more" data-id="${esc(item.id)}">+ Purchase</button>
        </div>
      </td>
    </tr>`;
  });

  setHTML("storeRows", rows.join("") ||
    `<tr><td colspan="5">No ration items added yet.</td></tr>`);
}

function clearItemForm() {
  $("itemForm")?.reset();
  if ($("itemId")) $("itemId").value = "";
  if ($("itemUnit")) $("itemUnit").value = "kg";
  editingPurchaseId = null;
  updatePurchaseTotal();
  const submit = $("itemForm")?.querySelector('[type="submit"]');
  if (submit) submit.textContent = "Save Purchase";
}

function updatePurchaseTotal() {
  const qty = num($("itemQty")?.value);
  const rate = num($("itemCost")?.value);
  setText("purchaseTotal", money(qty * rate));
}

function editItemPurchase(itemId) {
  const item = getItem(itemId);
  if (!item) return;

  const purchases = itemPurchases(item);
  const last = purchases[purchases.length - 1];

  if (!last) {
    showToast("No purchase record to edit. Add a purchase first.");
    return;
  }

  $("itemId").value = item.id;
  $("itemName").value = item.name;
  $("itemUnit").value = last.unit || item.baseUnit;
  $("itemQty").value = last.quantity;
  $("itemCost").value = last.rate;
  editingPurchaseId = last.id;

  const submit = $("itemForm")?.querySelector('[type="submit"]');
  if (submit) submit.textContent = "Update Purchase";

  $("itemForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function prepareMorePurchase(itemId) {
  const item = getItem(itemId);
  if (!item) return;

  clearItemForm();
  $("itemId").value = item.id;
  $("itemName").value = item.name;
  $("itemUnit").value = item.baseUnit;
  $("itemName").focus();
  $("itemQty")?.focus();
  $("itemForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handlePurchaseSubmit(event) {
  event.preventDefault();

  const name = $("itemName").value.trim();
  const unit = $("itemUnit").value;
  const quantity = num($("itemQty").value);
  const rate = num($("itemCost").value);
  const itemId = $("itemId").value;

  if (!name || quantity <= 0 || rate < 0) {
    showToast("Enter a valid item name, quantity and rate.");
    return;
  }

  const info = unitInfo(unit);
  const quantityBase = quantity * info.factor;
  const total = quantity * rate;

  let item = itemId ? getItem(itemId) : null;

  if (item && item.baseUnit !== info.base) {
    showToast("This item's unit type cannot be changed.");
    return;
  }

  if (!item) {
    item = db.items.find(i => i.name.toLowerCase() === name.toLowerCase());

    if (item && item.baseUnit !== info.base) {
      showToast("Same item name already exists with a different unit type.");
      return;
    }
  }

  if (!item) {
    item = {
      id: makeId(),
      name,
      baseUnit: info.base,
      purchases: []
    };
    db.items.push(item);
  }

  item.name = name;

  const purchase = {
    id: editingPurchaseId || makeId(),
    date: today(),
    unit,
    quantity,
    rate,
    quantityBase,
    rateBase: rate / info.factor,
    total
  };

  if (editingPurchaseId) {
    const index = itemPurchases(item).findIndex(p => p.id === editingPurchaseId);
    if (index >= 0) {
      purchase.date = item.purchases[index].date || today();
      item.purchases[index] = purchase;
    } else {
      item.purchases.push(purchase);
    }
  } else {
    item.purchases.push(purchase);
  }

  if (!saveData()) return;

  clearItemForm();
  renderAll();
  showToast("Purchase saved successfully.");
}

/* ==========================================
   MEMBER MANAGEMENT
   ========================================== */

function openMemberDialog(memberId = "") {
  const form = $("memberForm");
  if (!form || !$("memberDialog")) return;

  form.reset();
  photoData = "";
  if ($("memberId")) $("memberId").value = "";
  if ($("advance")) $("advance").value = "0";
  if ($("status")) $("status").value = "Active";
  if ($("rank")) $("rank").value = "Constable";
  if ($("joining")) $("joining").value = today();
  if ($("photoPreview")) {
    $("photoPreview").textContent = "PHOTO";
    $("photoPreview").style.backgroundImage = "";
    $("photoPreview").style.backgroundSize = "";
    $("photoPreview").style.backgroundPosition = "";
  }

  const existing = memberId ? getMember(memberId) : null;

  if (existing) {
    $("memberDialogTitle").textContent = "Edit Member";
    $("memberId").value = existing.id;
    $("serviceId").value = existing.serviceId || "";
    $("fullName").value = existing.name || "";
    $("rank").value = existing.rank || "Constable";
    $("phone").value = existing.phone || "";
    $("status").value = existing.status || "Active";
    $("joining").value = existing.joining || "";
    $("notes").value = existing.notes || "";
    photoData = existing.photo || "";
    setPhotoPreview(photoData);

    $("advance").value = "0";
    $("advance").disabled = true;
    setText("advanceHelp",
      "Editing a member will not change previous advance entries. Use Accounts to add a new advance.");
  } else {
    $("memberDialogTitle").textContent = "Add Member";
    $("advance").disabled = false;
    setText("advanceHelp", "Opening advance is recorded once when this member is first saved.");
  }

  $("memberDialog").showModal();
}

function setPhotoPreview(data) {
  const preview = $("photoPreview");
  if (!preview) return;

  if (data) {
    preview.textContent = "";
    preview.style.backgroundImage = `url("${data}")`;
    preview.style.backgroundSize = "cover";
    preview.style.backgroundPosition = "center";
  } else {
    preview.textContent = "PHOTO";
    preview.style.backgroundImage = "";
  }
}

async function compressPhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Photo must be smaller than 15 MB.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });

  const img = new Image();

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Invalid image."));
    img.src = dataUrl;
  });

  const maxSize = 600;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.75);
}

function handleMemberSubmit(event) {
  event.preventDefault();

  const id = $("memberId").value;
  const serviceId = $("serviceId").value.trim();
  const name = $("fullName").value.trim();

  if (!serviceId || !name) {
    showToast("Enter the service ID and member name.");
    return;
  }

  const duplicate = db.members.find(m =>
    m.serviceId.toLowerCase() === serviceId.toLowerCase() && m.id !== id
  );

  if (duplicate) {
    showToast("This service/member ID already exists.");
    return;
  }

  let member = id ? getMember(id) : null;
  const isNew = !member;

  if (!member) {
    member = {
      id: makeId(),
      createdAt: new Date().toISOString()
    };
    db.members.push(member);
  }

  member.serviceId = serviceId;
  member.name = name;
  member.rank = $("rank").value;
  member.phone = $("phone").value.trim();
  member.status = $("status").value;
  member.joining = $("joining").value;
  member.notes = $("notes").value.trim();
  member.photo = photoData || "";

  if (isNew) {
    const openingAdvance = num($("advance").value);
    if (openingAdvance > 0) {
      addLedger(member.id, "advance", openingAdvance, "Opening mess advance");
    }
  }

  if (!saveData()) return;

  $("memberDialog").close();
  renderAll();
  showToast(isNew ? "Member added successfully." : "Member updated successfully.");
}

function renderMembers() {
  const search = ($("memberSearch")?.value || "").trim().toLowerCase();

  const members = db.members.filter(m => [
    m.name, m.serviceId, m.rank, m.phone
  ].some(v => String(v || "").toLowerCase().includes(search)));

  const cards = members.map(m => {
    const totals = memberTotals(m.id);
    const photo = m.photo
      ? `<img class="photo" src="${m.photo}" alt="Member photo">`
      : `<div class="photo placeholder">👤</div>`;

    return `<article class="membercard">
      <div class="membertop">
        ${photo}
        <div class="memberidentity">
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.serviceId)} · ${esc(m.rank || "Other")}</p>
          <span class="badge ${m.status === "Active" ? "good" : "muted"}">
            ${esc(m.status || "Active")}
          </span>
        </div>
      </div>

      <div class="memberdetails">
        <p><span>Phone</span><strong>${esc(m.phone || "—")}</strong></p>
        <p><span>Joining date</span><strong>${esc(m.joining || "—")}</strong></p>
        <p><span>Meal charges</span><strong>${money(totals.charges)}</strong></p>
        <p><span>Current due</span><strong>${money(totals.due)}</strong></p>
      </div>

      <div class="memberactions">
        <button type="button" class="btn secondary" data-action="view-member" data-id="${esc(m.id)}">View</button>
        <button type="button" class="btn secondary" data-action="edit-member" data-id="${esc(m.id)}">Edit</button>
        <button type="button" class="btn secondary" data-action="payment" data-id="${esc(m.id)}">Payment</button>
        <button type="button" class="btn secondary" data-action="advance" data-id="${esc(m.id)}">Advance</button>
        <button type="button" class="btn secondary" data-action="whatsapp" data-id="${esc(m.id)}">WhatsApp</button>
        <button type="button" class="btn danger" data-action="delete-member" data-id="${esc(m.id)}">Delete</button>
      </div>
    </article>`;
  });

  setHTML("memberCards", cards.join(""));
  if ($("membersEmpty")) {
    $("membersEmpty").style.display = members.length ? "none" : "block";
    $("membersEmpty").textContent = search
      ? "No members match your search."
      : "No members added yet.";
  }
}

function showMemberProfile(id) {
  const m = getMember(id);
  if (!m) return;

  currentProfileId = id;
  const totals = memberTotals(id);
  const photo = m.photo
    ? `<img class="profilephoto" src="${m.photo}" alt="Member photo">`
    : `<div class="profilephoto placeholder">👤</div>`;

  setHTML("profileContent", `
    <div class="profileheader">
      ${photo}
      <div>
        <h2>${esc(m.name)}</h2>
        <p>${esc(m.serviceId)} · ${esc(m.rank || "Other")}</p>
      </div>
    </div>
    <div class="profiledetails">
      <p><span>Phone</span><strong>${esc(m.phone || "—")}</strong></p>
      <p><span>Status</span><strong>${esc(m.status || "Active")}</strong></p>
      <p><span>Joining date</span><strong>${esc(m.joining || "—")}</strong></p>
      <p><span>Notes</span><strong>${esc(m.notes || "—")}</strong></p>
      <p><span>Meal charges</span><strong>${money(totals.charges)}</strong></p>
      <p><span>Mess advance</span><strong>${money(totals.advance)}</strong></p>
      <p><span>Payments</span><strong>${money(totals.payments)}</strong></p>
      <p><span>Current due</span><strong>${money(totals.due)}</strong></p>
    </div>
  `);

  $("profileDialog").showModal();
}

function deleteMember(id) {
  const member = getMember(id);
  if (!member) return;

  const hasHistory = db.ledger.some(t => t.memberId === id) ||
    db.meals.some(meal => (meal.memberIds || []).includes(id));

  const message = hasHistory
    ? `Delete ${member.name} and their linked account/meal history? This cannot be undone unless you have a backup.`
    : `Delete member ${member.name}?`;

  if (!confirm(message)) return;

  db.members = db.members.filter(m => m.id !== id);

  if (!saveData()) return;

  renderAll();
  showToast("Member deleted.");
}

/* ==========================================
   RECIPE BUILDER
   ========================================== */

function ingredientRow(ingredient = {}) {
  const row = document.createElement("div");
  row.className = "ingredientrow";
  row.dataset.rowId = makeId();

  row.innerHTML = `
    <label>Ingredient
      <select class="ingredient-item" required>
        <option value="">Select store item</option>
        ${db.items.map(item => `<option value="${esc(item.id)}">${esc(item.name)} (${esc(item.baseUnit)})</option>`).join("")}
      </select>
    </label>
    <label>Quantity/person
      <input class="ingredient-qty" type="number" min="0.001" step="0.001" required value="${esc(ingredient.quantity ?? 100)}">
    </label>
    <div class="ingredientrate">
      <span>Rate/base unit</span>
      <strong class="ingredient-rate">Rs 0.00</strong>
    </div>
    <div class="ingredientcost">
      <span>Cost/person</span>
      <strong class="ingredient-cost">Rs 0.00</strong>
    </div>
    <button class="btn danger remove-ingredient" type="button">Remove</button>
  `;

  if (ingredient.itemId) {
    row.querySelector(".ingredient-item").value = ingredient.itemId;
  }

  row.querySelector(".ingredient-item").addEventListener("change", updateRecipeTotal);
  row.querySelector(".ingredient-qty").addEventListener("input", updateRecipeTotal);
  row.querySelector(".remove-ingredient").addEventListener("click", () => {
    row.remove();
    updateRecipeTotal();
  });

  $("ingredientRows").appendChild(row);
  updateRecipeTotal();
}

function getRecipeFormIngredients() {
  return [...($("ingredientRows")?.querySelectorAll(".ingredientrow") || [])]
    .map(row => ({
      itemId: row.querySelector(".ingredient-item").value,
      quantity: num(row.querySelector(".ingredient-qty").value)
    }))
    .filter(ing => ing.itemId && ing.quantity > 0);
}

function updateRecipeTotal() {
  let total = 0;

  [...($("ingredientRows")?.querySelectorAll(".ingredientrow") || [])].forEach(row => {
    const item = getItem(row.querySelector(".ingredient-item").value);
    const quantity = num(row.querySelector(".ingredient-qty").value);
    const rate = item ? itemStats(item).averageRate : 0;
    const cost = quantity * rate;
    total += cost;

    row.querySelector(".ingredient-rate").textContent =
      `${money(rate)} / ${item ? item.baseUnit : "unit"}`;

    row.querySelector(".ingredient-cost").textContent = money(cost);
  });

  setText("recipeTotal", money(total));
}

function clearRecipeForm() {
  $("recipeForm")?.reset();
  if ($("recipeId")) $("recipeId").value = "";
  setHTML("ingredientRows", "");
  ingredientRow();
}

function editRecipe(id) {
  const recipe = getRecipe(id);
  if (!recipe) return;

  $("recipeId").value = recipe.id;
  $("recipeName").value = recipe.name;
  $("recipeNotes").value = recipe.notes || "";
  setHTML("ingredientRows", "");

  (recipe.ingredients || []).forEach(ingredient => ingredientRow(ingredient));
  if (!(recipe.ingredients || []).length) ingredientRow();

  updateRecipeTotal();
  $("recipeForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleRecipeSubmit(event) {
  event.preventDefault();

  const name = $("recipeName").value.trim();
  const ingredients = getRecipeFormIngredients();

  if (!name || ingredients.length === 0) {
    showToast("Enter a recipe name and at least one ingredient.");
    return;
  }

  if (ingredients.some(ing => !getItem(ing.itemId))) {
    showToast("One selected store item no longer exists.");
    return;
  }

  let recipe = getRecipe($("recipeId").value);
  const isNew = !recipe;

  if (!recipe) {
    recipe = { id: makeId() };
    db.recipes.push(recipe);
  }

  recipe.name = name;
  recipe.notes = $("recipeNotes").value.trim();
  recipe.ingredients = ingredients;

  if (!saveData()) return;

  clearRecipeForm();
  renderAll();
  showToast(isNew ? "Recipe saved." : "Recipe updated.");
}

function recipeCost(recipe) {
  return (recipe.ingredients || []).reduce((sum, ing) => {
    const item = getItem(ing.itemId);
    return sum + (item ? num(ing.quantity) * itemStats(item).averageRate : 0);
  }, 0);
}

function renderRecipes() {
  const rows = [];

  db.recipes.forEach(recipe => {
    const total = recipeCost(recipe);
    const ingredients = recipe.ingredients || [];

    if (!ingredients.length) {
      rows.push(`<tr>
        <td>${esc(recipe.name)}</td><td>—</td><td>—</td><td>—</td>
        <td>${money(0)}</td><td>${money(total)}</td>
        <td><button class="btn secondary" data-action="edit-recipe" data-id="${esc(recipe.id)}">Edit</button></td>
      </tr>`);
      return;
    }

    ingredients.forEach((ing, index) => {
      const item = getItem(ing.itemId);
      const rate = item ? itemStats(item).averageRate : 0;

      rows.push(`<tr>
        <td>${index === 0 ? `<strong>${esc(recipe.name)}</strong>` : ""}</td>
        <td>${esc(item?.name || "Deleted item")}</td>
        <td>${esc(displayQuantity(ing.quantity, item?.baseUnit || "g"))}</td>
        <td>${money(rate)} / ${esc(item?.baseUnit || "unit")}</td>
        <td>${money(num(ing.quantity) * rate)}</td>
        <td>${index === 0 ? money(total) : ""}</td>
        <td>${index === 0 ? `<div class="actions">
          <button class="btn secondary" data-action="edit-recipe" data-id="${esc(recipe.id)}">Edit</button>
          <button class="btn danger" data-action="delete-recipe" data-id="${esc(recipe.id)}">Delete</button>
        </div>` : ""}</td>
      </tr>`);
    });
  });

  setHTML("recipeRows", rows.join("") ||
    `<tr><td colspan="7">No recipes created yet.</td></tr>`);

  const select = $("mealRecipe");
  if (select) {
    const oldValue = select.value;
    select.innerHTML = `<option value="">Select recipe</option>` +
      db.recipes.map(r =>
        `<option value="${esc(r.id)}">${esc(r.name)} — ${money(recipeCost(r))}/person</option>`
      ).join("");

    if (getRecipe(oldValue)) select.value = oldValue;
  }
}

function deleteRecipe(id) {
  const recipe = getRecipe(id);
  if (!recipe || !confirm(`Delete recipe "${recipe.name}"? Existing confirmed meals remain recorded.`)) return;

  db.recipes = db.recipes.filter(r => r.id !== id);
  if (!saveData()) return;
  renderAll();
  showToast("Recipe deleted.");
}

/* ==========================================
   MEALS AND RATION CONSUMPTION
   ========================================== */

function renderMealMembers() {
  const container = $("mealMembers");
  if (!container) return;

  const checked = new Set(
    [...container.querySelectorAll('input[type="checkbox"]:checked')].map(el => el.value)
  );

  container.innerHTML = activeMembers().map(m => `
    <label class="membercheck">
      <input type="checkbox" value="${esc(m.id)}" ${checked.has(m.id) ? "checked" : ""}>
      <span>${esc(m.name)} <small>${esc(m.serviceId)}</small></span>
    </label>
  `).join("") || `<p>No active members. Add a member first.</p>`;

  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", updateMealPreview);
  });
}

function selectedMemberIds() {
  return [...($("mealMembers")?.querySelectorAll('input[type="checkbox"]:checked') || [])]
    .map(input => input.value);
}

function getMealPreview() {
  const recipe = getRecipe($("mealRecipe")?.value);
  const memberIds = selectedMemberIds();
  const servingsEach = Math.max(1, Math.floor(num($("servings")?.value) || 1));
  const servings = memberIds.length * servingsEach;

  if (!recipe || servings < 1) {
    return { recipe, memberIds, servingsEach, servings, lines: [], total: 0, costPerPerson: 0 };
  }

  const lines = (recipe.ingredients || []).map(ing => {
    const item = getItem(ing.itemId);
    const quantityBase = num(ing.quantity) * servings;
    const rate = item ? itemStats(item).averageRate : 0;

    return {
      itemId: ing.itemId,
      itemName: item?.name || "Deleted item",
      unit: item?.baseUnit || "g",
      quantityBase,
      rate,
      cost: quantityBase * rate,
      stock: item ? itemStats(item).stock : 0
    };
  });

  const total = lines.reduce((sum, line) => sum + line.cost, 0);
  const costPerPerson = recipeCost(recipe) * servingsEach;

  return { recipe, memberIds, servingsEach, servings, lines, total, costPerPerson };
}

function updateMealPreview() {
  const preview = getMealPreview();

  if (!preview.recipe || preview.servings < 1) {
    setHTML("mealPreview", "Select a recipe and at least one member to calculate the ration.");
    return;
  }

  const lines = preview.lines.map(line => {
    const insufficient = line.quantityBase > line.stock + 0.000001;
    return `<div class="previewline">
      <span>${esc(line.itemName)}: ${esc(displayQuantity(line.quantityBase, line.unit))}</span>
      <strong class="${insufficient ? "textred" : ""}">${money(line.cost)}${insufficient ? " · LOW STOCK" : ""}</strong>
    </div>`;
  }).join("");

  setHTML("mealPreview", `
    <h3>Ration requirement preview</h3>
    <p>Members: <strong>${preview.memberIds.length}</strong> · Total servings: <strong>${preview.servings}</strong></p>
    ${lines || "<p>No ingredients in this recipe.</p>"}
    <hr>
    <p>Cost per person: <strong>${money(preview.costPerPerson)}</strong></p>
    <p>Total ration cost: <strong>${money(preview.total)}</strong></p>
  `);
}

function handleMealSubmit(event) {
  event.preventDefault();

  const preview = getMealPreview();
  const date = $("mealDate").value;
  const mealType = $("mealType").value;
  const note = $("mealNote").value.trim();

  if (!date || !preview.recipe || preview.memberIds.length === 0) {
    showToast("Select the date, recipe and at least one member.");
    return;
  }

  if (!preview.lines.length) {
    showToast("This recipe has no ingredients.");
    return;
  }

  const shortage = preview.lines.find(line => line.quantityBase > line.stock + 0.000001);
  if (shortage) {
    showToast(`Insufficient stock: ${shortage.itemName}. Purchase more first.`);
    return;
  }

  if (!confirm(
    `Confirm ${mealType} for ${preview.memberIds.length} members?\n` +
    `Total servings: ${preview.servings}\n` +
    `Total ration cost: ${money(preview.total)}`
  )) return;

  const ration = preview.lines.map(line => ({
    itemId: line.itemId,
    itemName: line.itemName,
    unit: line.unit,
    quantityBase: line.quantityBase,
    rate: line.rate,
    cost: line.cost
  }));

  const meal = {
    id: makeId(),
    date,
    type: mealType,
    recipeId: preview.recipe.id,
    recipeName: preview.recipe.name,
    memberIds: [...preview.memberIds],
    servingsEach: preview.servingsEach,
    servings: preview.servings,
    costPerPerson: preview.costPerPerson,
    totalCost: preview.total,
    ration,
    note,
    cancelled: false,
    createdAt: new Date().toISOString()
  };

  db.meals.push(meal);

  const perMemberCharge = preview.costPerPerson;
  preview.memberIds.forEach(memberId => {
    addLedger(
      memberId,
      "charge",
      perMemberCharge,
      `${mealType}: ${preview.recipe.name} (${preview.servingsEach} serving(s))`,
      date
    );
  });

  if (!saveData()) return;

  $("mealNote").value = "";
  $("servings").value = "1";
  renderAll();
  showToast("Meal confirmed. Stock and member accounts updated.");
}

function cancelMeal(id) {
  const meal = db.meals.find(m => m.id === id);
  if (!meal || meal.cancelled) return;

  if (!confirm(
    `Cancel ${meal.type} on ${meal.date}?\nThis will reverse stock consumption and meal charges.`
  )) return;

  meal.cancelled = true;

  db.ledger = db.ledger.filter(t => {
    if (t.type !== "charge") return true;
    return !((meal.memberIds || []).includes(t.memberId) &&
      t.date === meal.date &&
      t.description === `${meal.type}: ${meal.recipeName} (${meal.servingsEach} serving(s))`);
  });

  if (!saveData()) return;
  renderAll();
  showToast("Meal cancelled and stock restored.");
}

function renderMeals() {
  const rows = db.meals.slice().sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  ).map(meal => `
    <tr>
      <td>${esc(meal.date)}</td>
      <td>${esc(meal.type)} ${meal.cancelled ? '<span class="badge badge-red">Cancelled</span>' : ""}</td>
      <td>${esc(meal.recipeName)}</td>
      <td>${(meal.memberIds || []).length}</td>
      <td>${money(meal.costPerPerson)}</td>
      <td>${money(meal.totalCost)}</td>
      <td>
        ${meal.cancelled ? "—" : `<button class="btn danger" data-action="cancel-meal" data-id="${esc(meal.id)}">Cancel</button>`}
      </td>
    </tr>
  `);

  setHTML("mealRows", rows.join("") ||
    `<tr><td colspan="7">No confirmed meals yet.</td></tr>`);
}

/* ==========================================
   PAYMENT / ADVANCE
   ========================================== */

function openMoneyDialog(memberId, type) {
  const member = getMember(memberId);
  if (!member) return;

  currentMoneyType = type;
  $("moneyMemberId").value = memberId;
  $("moneyAmount").value = "";
  $("moneyNote").value = "";

  const totals = memberTotals(memberId);

  if (type === "payment") {
    $("moneyTitle").textContent = "Record Payment";
    setText("moneyInfo", `${member.name} · Current due: ${money(totals.due)}`);
  } else {
    $("moneyTitle").textContent = "Add Mess Advance";
    setText("moneyInfo", `${member.name} · Current advance: ${money(totals.advance)}`);
  }

  $("moneyDialog").showModal();
}

function handleMoneySubmit(event) {
  event.preventDefault();

  const memberId = $("moneyMemberId").value;
  const member = getMember(memberId);
  const amount = num($("moneyAmount").value);
  const note = $("moneyNote").value.trim();

  if (!member || amount <= 0) {
    showToast("Enter a valid amount.");
    return;
  }

  if (currentMoneyType === "payment") {
    const totals = memberTotals(memberId);

    if (amount > totals.due + 0.000001) {
      showToast(`Payment cannot exceed current due (${money(totals.due)}).`);
      return;
    }

    addLedger(memberId, "payment", amount, note || "Member payment");
  } else {
    addLedger(memberId, "advance", amount, note || "Mess advance deposit");
  }

  if (!saveData()) return;

  $("moneyDialog").close();
  renderAll();
  showToast(currentMoneyType === "payment" ? "Payment recorded." : "Mess advance recorded.");
}

/* ==========================================
   ACCOUNTS
   ========================================== */

function renderAccounts() {
  const search = ($("accountSearch")?.value || "").toLowerCase().trim();

  const members = db.members.filter(m =>
    [m.name, m.serviceId, m.rank].some(v =>
      String(v || "").toLowerCase().includes(search)
    )
  );

  setHTML("accountRows", members.map(m => {
    const t = memberTotals(m.id);

    return `<tr>
      <td><strong>${esc(m.name)}</strong><br><small>${esc(m.serviceId)}</small></td>
      <td>${money(t.charges)}</td>
      <td>${money(t.advance)}</td>
      <td>${money(t.payments)}</td>
      <td class="${t.due > 0 ? "textred" : ""}">${money(t.due)}</td>
      <td>
        <div class="actions">
          <button class="btn secondary" data-action="payment" data-id="${esc(m.id)}">Payment</button>
          <button class="btn secondary" data-action="advance" data-id="${esc(m.id)}">Advance</button>
          <button class="btn secondary" data-action="view-member" data-id="${esc(m.id)}">View</button>
        </div>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="6">No member accounts found.</td></tr>`);

  const ledger = db.ledger.slice().sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );

  setHTML("ledgerRows", ledger.map(t => `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(memberName(t.memberId))}</td>
      <td>${esc(t.type)}</td>
      <td>${esc(t.description || "")}</td>
      <td>${money(t.amount)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">No transactions recorded yet.</td></tr>`);
}

/* ==========================================
   DASHBOARD
   ========================================== */

function renderDashboard() {
  const members = activeMembers();
  const totals = db.members.map(m => memberTotals(m.id));

  const collected = totals.reduce((s, t) => s + t.payments, 0);
  const advance = totals.reduce((s, t) => s + t.advance, 0);
  const charges = totals.reduce((s, t) => s + t.charges, 0);
  const due = totals.reduce((s, t) => s + t.due, 0);

  const consumedCost = db.meals
    .filter(m => !m.cancelled)
    .reduce((sum, meal) => sum + num(meal.totalCost), 0);

  const stockValue = db.items.reduce((sum, item) =>
    sum + itemStats(item).stockValue, 0
  );

  setText("dMembers", members.length);
  setText("dCollected", money(collected));
  setText("dAdvance", money(advance));
  setText("dCharges", money(charges));
  setText("dConsumed", money(consumedCost));
  setText("dStock", money(stockValue));
  setText("dDue", money(due));
  setText("dMeals", db.meals.filter(m => !m.cancelled).length);

  setHTML("dashboardRows", db.members.map(m => {
    const t = memberTotals(m.id);

    return `<tr>
      <td>${esc(m.name)}<br><small>${esc(m.serviceId)}</small></td>
      <td>${money(t.charges)}</td>
      <td>${money(t.advance)}</td>
      <td>${money(t.payments)}</td>
      <td>${money(t.due)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">No members added yet.</td></tr>`);

  const recent = db.meals.filter(m => !m.cancelled)
    .slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);

  setHTML("dashboardMeals", recent.map(m => `
    <tr>
      <td>${esc(m.date)}</td>
      <td>${esc(m.type)}</td>
      <td>${esc(m.recipeName)}</td>
      <td>${(m.memberIds || []).length}</td>
      <td>${money(m.totalCost)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">No meals recorded yet.</td></tr>`);
}

/* ==========================================
   REPORTS
   ========================================== */

function reportMeals() {
  const from = $("reportFrom")?.value || "";
  const to = $("reportTo")?.value || "";

  return db.meals.filter(m => !m.cancelled)
    .filter(m => (!from || m.date >= from) && (!to || m.date <= to))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function runReport() {
  const meals = reportMeals();
  const totalServings = meals.reduce((s, m) => s + num(m.servings), 0);
  const totalCost = meals.reduce((s, m) => s + num(m.totalCost), 0);

  const from = $("reportFrom")?.value || "";
  const to = $("reportTo")?.value || "";

  const paid = db.ledger.filter(t =>
    t.type === "payment" &&
    (!from || t.date >= from) &&
    (!to || t.date <= to)
  ).reduce((s, t) => s + num(t.amount), 0);

  setText("rMeals", meals.length);
  setText("rServings", totalServings);
  setText("rCost", money(totalCost));
  setText("rPaid", money(paid));

  setHTML("reportMealRows", meals.map(m => `
    <tr>
      <td>${esc(m.date)}</td>
      <td>${esc(m.type)}</td>
      <td>${esc(m.recipeName)}</td>
      <td>${(m.memberIds || []).length}</td>
      <td>${num(m.servings)}</td>
      <td>${money(m.totalCost)}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">No meals found for this period.</td></tr>`);

  const rationRows = [];
  meals.forEach(meal => {
    (meal.ration || []).forEach(line => {
      rationRows.push(`<tr>
        <td>${esc(meal.date)}</td>
        <td>${esc(meal.type)}</td>
        <td>${esc(line.itemName)}</td>
        <td>${esc(displayQuantity(line.quantityBase, line.unit))}</td>
        <td>${money(line.rate)} / ${esc(line.unit)}</td>
        <td>${money(line.cost)}</td>
      </tr>`);
    });
  });

  setHTML("reportRationRows", rationRows.join("") ||
    `<tr><td colspan="6">No ration consumption in this period.</td></tr>`);

  setHTML("reportMemberRows", db.members.map(m => {
    const attendance = meals.filter(meal => (meal.memberIds || []).includes(m.id));
    const charges = attendance.reduce((s, meal) => s + num(meal.costPerPerson), 0);

    return `<tr>
      <td>${esc(m.name)}</td>
      <td>${esc(m.serviceId)}</td>
      <td>${attendance.length}</td>
      <td>${money(charges)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4">No members found.</td></tr>`);
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function downloadCSV(filename, rows) {
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportReportCSV() {
  const meals = reportMeals();
  const rows = [
    ["Date", "Meal type", "Recipe", "Member count", "Servings", "Ration cost"]
  ];

  meals.forEach(m => rows.push([
    m.date, m.type, m.recipeName,
    (m.memberIds || []).length, m.servings, m.totalCost
  ]));

  rows.push([]);
  rows.push(["Ration consumption"]);
  rows.push(["Date", "Meal", "Item", "Quantity", "Base unit", "Rate/base unit", "Cost"]);

  meals.forEach(m => (m.ration || []).forEach(line => {
    rows.push([
      m.date, m.type, line.itemName, line.quantityBase,
      line.unit, line.rate, line.cost
    ]);
  }));

  downloadCSV("CRPF_Mess_Report.csv", rows);
}

function exportAccountsCSV() {
  const rows = [[
    "Service ID", "Member", "Meal charges", "Mess advance", "Payments", "Due"
  ]];

  db.members.forEach(m => {
    const t = memberTotals(m.id);
    rows.push([m.serviceId, m.name, t.charges, t.advance, t.payments, t.due]);
  });

  rows.push([]);
  rows.push(["Date", "Service ID", "Member", "Type", "Description", "Amount"]);

  db.ledger.forEach(t => {
    const m = getMember(t.memberId);
    rows.push([
      t.date, m?.serviceId || "", m?.name || "Deleted member",
      t.type, t.description, t.amount
    ]);
  });

  downloadCSV("CRPF_Mess_Accounts.csv", rows);
}

/* ==========================================
   BACKUP / RESTORE
   ========================================== */

function downloadBackup() {
  const blob = new Blob(
    [JSON.stringify(db, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CRPF_Mess_Backup_${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());

    if (!parsed || !Array.isArray(parsed.members) ||
        !Array.isArray(parsed.items) ||
        !Array.isArray(parsed.recipes) ||
        !Array.isArray(parsed.meals) ||
        !Array.isArray(parsed.ledger)) {
      throw new Error("This file does not look like a valid mess backup.");
    }

    if (!confirm("Restore this backup? Current browser data will be replaced.")) return;

    db = {
      members: parsed.members,
      items: parsed.items,
      recipes: parsed.recipes,
      meals: parsed.meals,
      ledger: parsed.ledger
    };

    if (!saveData()) return;

    renderAll();
    showToast("Backup restored successfully.");
  } catch (error) {
    alert("Restore failed: " + error.message);
  } finally {
    if ($("restoreFile")) $("restoreFile").value = "";
  }
}

/* ==========================================
   NAVIGATION AND BUTTON EVENTS
   ========================================== */

function goToPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  if (pageId === "reports") runReport();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleActionClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  switch (action) {
    case "edit-member":
      openMemberDialog(id);
      break;
    case "view-member":
      showMemberProfile(id);
      break;
    case "delete-member":
      deleteMember(id);
      break;
    case "payment":
      openMoneyDialog(id, "payment");
      break;
    case "advance":
      openMoneyDialog(id, "advance");
      break;
    case "whatsapp":
      openWhatsApp(id);
      break;
    case "edit-purchase":
      editItemPurchase(id);
      break;
    case "purchase-more":
      prepareMorePurchase(id);
      break;
    case "edit-recipe":
      editRecipe(id);
      break;
    case "delete-recipe":
      deleteRecipe(id);
      break;
    case "cancel-meal":
      cancelMeal(id);
      break;
  }
}

function openWhatsApp(id) {
  const member = getMember(id);
  if (!member || !member.phone) {
    showToast("This member has no phone number saved.");
    return;
  }

  const phone = member.phone.replace(/[^\d]/g, "");
  const totals = memberTotals(id);
  const message =
    `Namaste ${member.name},\n` +
    `CRPF Smart Mess account summary:\n` +
    `Meal charges: ${money(totals.charges)}\n` +
    `Mess advance: ${money(totals.advance)}\n` +
    `Payments: ${money(totals.payments)}\n` +
    `Current due: ${money(totals.due)}`;

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener"
  );
}

function renderAll() {
  renderDashboard();
  renderMembers();
  renderStore();
  renderRecipes();
  renderMealMembers();
  renderMeals();
  renderAccounts();
  runReport();
  updateMealPreview();
}

/* ==========================================
   INITIALIZATION
   ========================================== */

function init() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => goToPage(button.dataset.page));
  });

  $("quickAdd")?.addEventListener("click", () => openMemberDialog());
  $("addMember")?.addEventListener("click", () => openMemberDialog());

  $("memberForm")?.addEventListener("submit", handleMemberSubmit);
  $("closeMember")?.addEventListener("click", () => $("memberDialog").close());
  $("cancelMember")?.addEventListener("click", () => $("memberDialog").close());

  $("photoInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      photoData = await compressPhoto(file);
      setPhotoPreview(photoData);
    } catch (error) {
      showToast(error.message || "Could not use this photo.");
    }

    event.target.value = "";
  });

  $("removePhoto")?.addEventListener("click", () => {
    photoData = "";
    setPhotoPreview("");
  });

  $("profileClose")?.addEventListener("click", () => $("profileDialog").close());

  $("profileEdit")?.addEventListener("click", () => {
    const id = currentProfileId;
    $("profileDialog").close();
    if (id) openMemberDialog(id);
  });

  $("profileWhats")?.addEventListener("click", () => {
    if (currentProfileId) openWhatsApp(currentProfileId);
  });

  $("itemForm")?.addEventListener("submit", handlePurchaseSubmit);
  $("itemQty")?.addEventListener("input", updatePurchaseTotal);
  $("itemCost")?.addEventListener("input", updatePurchaseTotal);
  $("itemUnit")?.addEventListener("change", updatePurchaseTotal);
  $("clearItem")?.addEventListener("click", clearItemForm);

  $("recipeForm")?.addEventListener("submit", handleRecipeSubmit);
  $("addIngredient")?.addEventListener("click", () => ingredientRow());
  $("clearRecipe")?.addEventListener("click", clearRecipeForm);

  $("mealForm")?.addEventListener("submit", handleMealSubmit);
  $("mealRecipe")?.addEventListener("change", updateMealPreview);
  $("servings")?.addEventListener("input", updateMealPreview);

  $("selectAll")?.addEventListener("click", () => {
    $("mealMembers")?.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = true;
    });
    updateMealPreview();
  });

  $("clearSelection")?.addEventListener("click", () => {
    $("mealMembers")?.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    updateMealPreview();
  });

  $("moneyForm")?.addEventListener("submit", handleMoneySubmit);
  $("closeMoney")?.addEventListener("click", () => $("moneyDialog").close());
  $("cancelMoney")?.addEventListener("click", () => $("moneyDialog").close());

  $("memberSearch")?.addEventListener("input", renderMembers);
  $("accountSearch")?.addEventListener("input", renderAccounts);

  $("runReport")?.addEventListener("click", runReport);
  $("exportReport")?.addEventListener("click", exportReportCSV);
  $("exportAccounts")?.addEventListener("click", exportAccountsCSV);

  $("backupBtn")?.addEventListener("click", downloadBackup);
  $("restoreFile")?.addEventListener("change", event => {
    restoreBackup(event.target.files?.[0]);
  });

  document.addEventListener("click", handleActionClick);

  if ($("mealDate")) $("mealDate").value = today();
  if ($("reportFrom")) {
    const d = new Date();
    d.setDate(1);
    $("reportFrom").value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if ($("reportTo")) $("reportTo").value = today();

  clearRecipeForm();
  clearItemForm();
  renderAll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
