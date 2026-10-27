```javascript
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const KEY = 'crpfMessProfessionalV1';

  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const money = n =>
    'Rs ' + (Number(n) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  let data;

  try {
    data = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    data = null;
  }

  if (!data || !Array.isArray(data.members)) {
    data = {
      members: [],
      items: [],
      recipes: [],
      meals: [],
      ledger: []
    };
  }

  ['members', 'items', 'recipes', 'meals', 'ledger'].forEach(k => {
    if (!Array.isArray(data[k])) data[k] = [];
  });

  let photo = '';
  let profileId = null;

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      $('toast').classList.remove('show');
    }, 2500);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      render();
    } catch (e) {
      alert(
        'Browser storage full. Download a backup and use smaller photos.'
      );
    }
  }

  function mem(id) {
    return data.members.find(x => x.id === id);
  }

  function itm(id) {
    return data.items.find(x => x.id === id);
  }

  function rec(id) {
    return data.recipes.find(x => x.id === id);
  }

  function mname(id) {
    return mem(id)?.name || 'Deleted member';
  }

  // ACCOUNT CALCULATIONS

  function totals(id) {
    let charges = 0;
    let paid = 0;
    let advance = 0;

    data.ledger
      .filter(x => x.memberId === id)
      .forEach(x => {
        if (x.type === 'Meal charge') charges += Number(x.amount) || 0;
        if (x.type === 'Payment') paid += Number(x.amount) || 0;
        if (x.type === 'Mess Advance') advance += Number(x.amount) || 0;
      });

    return {
      charges,
      paid,
      advance,
      due: Math.max(0, charges - paid - advance),
      credit: Math.max(0, paid + advance - charges)
    };
  }

  // RECIPE AND STOCK CALCULATIONS

  function cost(recipe) {
    return (recipe?.ingredients || []).reduce((sum, ingredient) => {
      return sum +
        ((itm(ingredient.itemId)?.rate || 0) * ingredient.qty);
    }, 0);
  }

  function stockValue() {
    return data.items.reduce((sum, item) => {
      return sum + item.qty * item.rate;
    }, 0);
  }

  // PAGE NAVIGATION

  function go(page) {
    document.querySelectorAll('.page').forEach(section => {
      section.classList.toggle('active', section.id === page);
    });

    document.querySelectorAll('.tab').forEach(button => {
      button.classList.toggle('active', button.dataset.page === page);
    });

    render();
    window.scrollTo(0, 0);
  }

  // MEMBERS

  function photoPreview() {
    const box = $('photoPreview');

    box.innerHTML = photo
      ? `<img src="${photo}" alt="Member photo"
           style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : 'PHOTO';
  }

  function openMember(member = null) {
    $('memberForm').reset();

    $('memberTitle').textContent =
      member ? 'Edit Member' : 'Add Member';

    $('memberId').value = member?.id || '';
    $('serviceId').value = member?.serviceId || '';
    $('fullName').value = member?.name || '';
    $('rank').value = member?.rank || 'Constable';
    $('phone').value = member?.phone || '';
    $('status').value = member?.status || 'Active';
    $('joining').value = member?.joining || today();
    $('notes').value = member?.notes || '';

    photo = member?.photo || '';

    const current = member ? totals(member.id) : null;

    $('advance').value = current ? current.advance : 0;
    $('advance').readOnly = !!member;

    $('advanceHelp').textContent = member
      ? 'Existing advance is shown here. To add more, use Add Advance in the member card or account page.'
      : 'Enter opening mess advance. It will be recorded as account credit.';

    $('advanceInfo').textContent = current
      ? `Current advance ${money(current.advance)} · Charges ${money(current.charges)} · Paid ${money(current.paid)} · Due ${money(current.due)}`
      : '';

    photoPreview();
    $('memberDialog').showModal();
  }

  function saveMember(event) {
    event.preventDefault();

    const id = $('memberId').value || uid();
    const serviceId = $('serviceId').value.trim();
    const name = $('fullName').value.trim();

    if (!serviceId || !name) {
      toast('Enter member ID and full name.');
      return;
    }

    const duplicate = data.members.some(member =>
      member.serviceId.toLowerCase() === serviceId.toLowerCase() &&
      member.id !== id
    );

    if (duplicate) {
      toast('This member ID already exists.');
      return;
    }

    const old = mem(id);

    const member = {
      id,
      serviceId,
      name,
      rank: $('rank').value,
      phone: $('phone').value.trim(),
      status: $('status').value,
      joining: $('joining').value,
      notes: $('notes').value.trim(),
      photo
    };

    if (old) {
      data.members = data.members.map(x => x.id === id ? member : x);
    } else {
      data.members.push(member);

      const openingAdvance = Number($('advance').value) || 0;

      if (openingAdvance > 0) {
        data.ledger.push({
          id: uid(),
          date: today(),
          memberId: id,
          type: 'Mess Advance',
          description: 'Opening mess advance',
          amount: openingAdvance
        });
      }
    }

    $('memberDialog').close();
    save();
    toast(old ? 'Member updated.' : 'Member saved.');
  }

  function memberCards() {
    const query = $('memberSearch').value.toLowerCase().trim();

    const list = data.members.filter(member => [
      member.name,
      member.serviceId,
      member.rank,
      member.phone
    ].some(value => String(value || '').toLowerCase().includes(query)));

    $('memberCards').innerHTML = list.map(member => {
      const t = totals(member.id);

      return `
        <article class="member-card">
          <div class="member-top">
            ${
              member.photo
                ? `<img class="photo" src="${member.photo}" alt="Member photo">`
                : `<div class="photo" style="display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:bold;color:#176b45">${esc((member.name || '?')[0].toUpperCase())}</div>`
            }

            <div>
              <div class="member-name">${esc(member.name)}</div>
              <div class="member-meta">${esc(member.serviceId)} · ${esc(member.rank)}</div>
              <div class="member-meta">${esc(member.phone || 'Phone not added')}</div>
              <span class="badge ${member.status === 'Active' ? '' : 'inactive'}">
                ${esc(member.status)}
              </span>
            </div>
          </div>

          <div class="member-details">
            <p><span>Meal charges</span><strong>${money(t.charges)}</strong></p>
            <p><span>Mess advance</span><strong>${money(t.advance)}</strong></p>
            <p><span>Payments</span><strong>${money(t.paid)}</strong></p>
            <p><span>Unpaid due</span><strong class="${t.due ? 'due' : 'credit'}">${money(t.due)}</strong></p>
          </div>

          <div class="card-actions">
            <button class="btn light" data-a="view" data-id="${member.id}">View Profile</button>
            <button class="btn light" data-a="edit" data-id="${member.id}">Edit</button>
            <button class="btn light" data-a="wa" data-id="${member.id}">WhatsApp</button>
            <button class="btn light" data-a="advance" data-id="${member.id}">Add Advance</button>
            <button class="btn light" data-a="pay" data-id="${member.id}">Payment</button>
            <button class="btn light" data-a="delete" data-id="${member.id}">Delete</button>
          </div>
        </article>
      `;
    }).join('');

    $('noMembers').style.display = list.length ? 'none' : 'block';
  }

  function showProfile(id) {
    const member = mem(id);
    if (!member) return;

    profileId = id;

    const t = totals(id);

    $('profileCard').innerHTML = `
      <div class="profile-header">
        ${
          member.photo
            ? `<img class="photo" src="${member.photo}" alt="Member photo">`
            : `<div class="photo" style="display:flex;align-items:center;justify-content:center;font-size:25px">${esc((member.name || '?')[0].toUpperCase())}</div>`
        }
        <div>
          <h2>${esc(member.name)}</h2>
          <p>${esc(member.serviceId)} · ${esc(member.rank)}</p>
          <span class="badge">${esc(member.status)}</span>
        </div>
      </div>

      <div class="profile-info">
        ${[
          ['Member ID', member.serviceId],
          ['Rank', member.rank],
          ['Phone', member.phone || 'Not added'],
          ['Joining date', member.joining || 'Not added'],
          ['Status', member.status],
          ['Notes', member.notes || 'None'],
          ['Meal charges', money(t.charges)],
          ['Mess advance', money(t.advance)],
          ['Payments received', money(t.paid)],
          ['Unpaid due', money(t.due)],
          ['Credit balance', money(t.credit)]
        ].map(([label, value]) => `
          <div>
            <small>${esc(label)}</small>
            <strong>${esc(value)}</strong>
          </div>
        `).join('')}
      </div>
    `;

    $('profileDialog').showModal();
  }

  function sendWhatsApp(id) {
    const member = mem(id);

    if (!member?.phone) {
      toast('Add phone number with country code first.');
      return;
    }

    const t = totals(id);

    const message =
      `Namaste ${member.name}\n` +
      `Member ID: ${member.serviceId}\n` +
      `Meal charges: ${money(t.charges)}\n` +
      `Mess advance: ${money(t.advance)}\n` +
      `Payments: ${money(t.paid)}\n` +
      `Unpaid due: ${money(t.due)}`;

    window.open(
      'https://wa.me/' +
      member.phone.replace(/\D/g, '') +
      '?text=' + encodeURIComponent(message),
      '_blank'
    );
  }

  // PAYMENTS AND MESS ADVANCE

  function openMoney(id, mode) {
    const member = mem(id);
    if (!member) return;

    $('payForm').reset();
    $('payMemberId').value = id;
    $('payForm').dataset.mode = mode;

    $('payTitle').textContent =
      mode === 'advance' ? 'Add Mess Advance' : 'Record Payment';

    const t = totals(id);

    $('payInfo').textContent =
      `${member.name} · Current due ${money(t.due)} · Current advance ${money(t.advance)}`;

    $('payDialog').showModal();
  }

  function saveMoney(event) {
    event.preventDefault();

    const id = $('payMemberId').value;
    const amount = Number($('payAmount').value);
    const mode = $('payForm').dataset.mode;

    if (!mem(id) || amount <= 0) {
      toast('Enter a valid amount.');
      return;
    }

    if (mode !== 'advance' && amount > totals(id).due + 0.00001) {
      toast('Payment cannot exceed unpaid due.');
      return;
    }

    data.ledger.push({
      id: uid(),
      date: today(),
      memberId: id,
      type: mode === 'advance' ? 'Mess Advance' : 'Payment',
      description:
        $('payNote').value.trim() ||
        (mode === 'advance' ? 'Additional mess advance' : 'Payment received'),
      amount
    });

    $('payDialog').close();
    save();

    toast(mode === 'advance' ? 'Advance added.' : 'Payment recorded.');
  }

  // RATION STORE AND PURCHASES

  function saveItem(event) {
    event.preventDefault();

    const id = $('itemId').value;
    const name = $('itemName').value.trim();
    const unit = $('itemUnit').value;
    const quantity = Number($('itemQty').value);
    const purchaseCost = Number($('itemCost').value);

    if (!name || quantity <= 0 || purchaseCost < 0) {
      toast('Enter a valid item, quantity and cost.');
      return;
    }

    const old = itm(id);

    if (old && old.unit !== unit) {
      toast('Base unit cannot change after stock exists.');
      return;
    }

    if (old) {
      const oldValue = old.qty * old.rate;
      const newQuantity = old.qty + quantity;

      old.rate = (oldValue + purchaseCost) / newQuantity;
      old.qty = newQuantity;
      old.name = name;
    } else {
      data.items.push({
        id: uid(),
        name,
        unit,
        qty: quantity,
        rate: purchaseCost / quantity
      });
    }

    $('itemForm').reset();
    $('itemId').value = '';

    save();
    toast(old ? 'Purchase added. Average rate updated.' : 'Store item added.');
  }

  function renderStore() {
    $('storeRows').innerHTML = data.items.map(item => `
      <tr>
        <td><b>${esc(item.name)}</b></td>
        <td>${item.qty.toLocaleString()} ${esc(item.unit)}</td>
        <td>${money(item.rate)} / ${esc(item.unit)}</td>
        <td>${money(item.qty * item.rate)}</td>
        <td>
          <button class="btn light" data-a="edititem" data-id="${item.id}">Add Purchase</button>
          <button class="btn light" data-a="delitem" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join('') ||
    '<tr><td colspan="5">Add your first store item above.</td></tr>';
  }

  // RECIPE INGREDIENTS

  function ingredientRow(ingredient = null) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';

    row.innerHTML = `
      <label>
        <small>Store item</small>
        <select class="ingitem">
          ${data.items.map(item => `
            <option value="${item.id}" ${ingredient?.itemId === item.id ? 'selected' : ''}>
              ${esc(item.name)} (${esc(item.unit)})
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        <small>Quantity/person</small>
        <input class="ingqty" type="number" min="0.001" step="0.001"
          placeholder="Quantity" value="${ingredient?.qty || ''}">
        <small class="ingunit">${esc(itm(ingredient?.itemId)?.unit || data.items[0]?.unit || '')}</small>
      </label>

      <button type="button" class="remove-btn">Remove</button>
    `;

    row.querySelector('.ingitem').onchange = () => {
      row.querySelector('.ingunit').textContent =
        itm(row.querySelector('.ingitem').value)?.unit || '';

      recipePreview();
    };

    row.querySelector('.ingqty').oninput = recipePreview;

    row.querySelector('.remove-btn').onclick = () => {
      row.remove();
      recipePreview();
    };

    $('ingredients').appendChild(row);
    recipePreview();
  }

  function getIngredients() {
    return [...$('ingredients').querySelectorAll('.ingredient-row')]
      .map(row => ({
        itemId: row.querySelector('.ingitem').value,
        qty: Number(row.querySelector('.ingqty').value) || 0
      }))
      .filter(x => x.itemId && x.qty > 0);
  }

  function recipePreview() {
    $('recipeCost').textContent =
      money(cost({ ingredients: getIngredients() }));
  }

  function clearRecipe() {
    $('recipeForm').reset();
    $('recipeId').value = '';
    $('ingredients').innerHTML = '';
    $('recipeCost').textContent = money(0);
  }

  function saveRecipe(event) {
    event.preventDefault();

    const name = $('recipeName').value.trim();
    const ingredients = getIngredients();

    if (!name || ingredients.length === 0) {
      toast('Enter recipe name and at least one ingredient.');
      return;
    }

    const id = $('recipeId').value || uid();

    const recipe = {
      id,
      name,
      notes: $('recipeNotes').value.trim(),
      ingredients
    };

    const old = rec(id);

    if (old) {
      data.recipes = data.recipes.map(x => x.id === id ? recipe : x);
    } else {
      data.recipes.push(recipe);
    }

    clearRecipe();
    save();
    toast('Recipe saved.');
  }

  function renderRecipes() {
    const currentRecipe = $('mealRecipe').value;

    $('recipeRows').innerHTML = data.recipes.map(recipe => `
      <tr>
        <td><b>${esc(recipe.name)}</b></td>
        <td>
          ${recipe.ingredients.map(ingredient =>
            `${esc(itm(ingredient.itemId)?.name || 'Missing item')} ${ingredient.qty} ${esc(itm(ingredient.itemId)?.unit || '')}`
          ).join('<br>')}
        </td>
        <td>${money(cost(recipe))}</td>
        <td>
          <button class="btn light" data-a="editrecipe" data-id="${recipe.id}">Edit</button>
          <button class="btn light" data-a="delrecipe" data-id="${recipe.id}">Delete</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4">No recipes saved yet.</td></tr>';

    $('mealRecipe').innerHTML = data.recipes.map(recipe => `
      <option value="${recipe.id}">
        ${esc(recipe.name)} — ${money(cost(recipe))}/person
      </option>
    `).join('') || '<option value="">Create a recipe first</option>';

    if (data.recipes.some(recipe => recipe.id === currentRecipe)) {
      $('mealRecipe').value = currentRecipe;
    }

    renderChecks();
    previewOrder();
  }

  // MEALS AND RATION REQUIREMENTS

  function renderChecks() {
    const previouslySelected = new Set(
      [...$('mealMembers').querySelectorAll('input:checked')]
        .map(input => input.value)
    );

    $('mealMembers').innerHTML = data.members
      .filter(member => member.status === 'Active')
      .map(member => `
        <label class="checkrow">
          <input type="checkbox" value="${member.id}"
            ${previouslySelected.has(member.id) ? 'checked' : ''}>
          <span>
            <b>${esc(member.name)}</b><br>
            <small>${esc(member.serviceId)} · ${esc(member.rank)}</small>
          </span>
        </label>
      `).join('') || '<p class="muted">Add active members first.</p>';

    $('mealMembers').querySelectorAll('input').forEach(input => {
      input.onchange = previewOrder;
    });
  }

  function selected() {
    return [...$('mealMembers').querySelectorAll('input:checked')]
      .map(input => input.value);
  }

  function previewOrder() {
    const recipe = rec($('mealRecipe').value);
    const ids = selected();
    const servings = Math.max(1, Number($('servings').value) || 1);
    const perPerson = cost(recipe) * servings;

    const requirements = recipe
      ? recipe.ingredients.map(ingredient => {
          const item = itm(ingredient.itemId);

          return `${esc(item?.name || 'Item')}: ${ingredient.qty * servings * ids.length} ${esc(item?.unit || '')}`;
        }).join(' · ')
      : 'Create or select a recipe first.';

    $('preview').innerHTML = `
      Selected members: <b>${ids.length}</b> ·
      Cost/person: <b>${money(perPerson)}</b> ·
      Order total: <b>${money(perPerson * ids.length)}</b>
      <br><small>${requirements}</small>
    `;
  }

  function confirmOrder(event) {
    event.preventDefault();

    const recipe = rec($('mealRecipe').value);
    const ids = selected();
    const servings = Math.max(1, Number($('servings').value) || 1);

    if (!recipe || ids.length === 0) {
      toast('Select a recipe and at least one member.');
      return;
    }

    const requirements = {};

    recipe.ingredients.forEach(ingredient => {
      requirements[ingredient.itemId] =
        (requirements[ingredient.itemId] || 0) +
        ingredient.qty * servings * ids.length;
    });

    for (const [itemId, quantity] of Object.entries(requirements)) {
      const item = itm(itemId);

      if (!item || item.qty + 1e-8 < quantity) {
        toast(
          `Insufficient ${item?.name || 'stock'}. Required ${quantity}; available ${item?.qty || 0}.`
        );
        return;
      }
    }

    const perPerson = cost(recipe) * servings;
    const total = perPerson * ids.length;

    if (!confirm(
      `Confirm ${$('mealType').value} for ${ids.length} members?\n` +
      `Total: ${money(total)}\n\n` +
      'Stock will be deducted and meal charges posted.'
    )) {
      return;
    }

    Object.entries(requirements).forEach(([itemId, quantity]) => {
      itm(itemId).qty -= quantity;
    });

    const order = {
      id: uid(),
      date: $('mealDate').value || today(),
      type: $('mealType').value,
      recipeId: recipe.id,
      recipeName: recipe.name,
      memberIds: ids,
      servings,
      perPerson,
      total,
      note: $('mealNote').value.trim(),
      ingredients: Object.entries(requirements).map(([itemId, qty]) => ({
        itemId,
        qty
      }))
    };

    data.meals.push(order);

    ids.forEach(memberId => {
      data.ledger.push({
        id: uid(),
        date: order.date,
        memberId,
        type: 'Meal charge',
        description:
          `${order.type}: ${recipe.name}` +
          (order.note ? ` — ${order.note}` : ''),
        amount: perPerson,
        orderId: order.id
      });
    });

    $('mealNote').value = '';

    $('mealMembers').querySelectorAll('input').forEach(input => {
      input.checked = false;
    });

    save();
    toast('Order confirmed. Stock deducted and accounts charged.');
  }

  function cancelOrder(id) {
    const order = data.meals.find(x => x.id === id);

    if (!order) return;

    if (!confirm(
      'Cancel this order, return stock and reverse its meal charges?'
    )) {
      return;
    }

    order.ingredients.forEach(ingredient => {
      const item = itm(ingredient.itemId);
      if (item) item.qty += ingredient.qty;
    });

    data.ledger = data.ledger.filter(x => x.orderId !== id);
    data.meals = data.meals.filter(x => x.id !== id);

    save();
    toast('Order cancelled and stock returned.');
  }

  function renderMeals() {
    $('mealRows').innerHTML = [...data.meals].reverse().map(order => `
      <tr>
        <td>${esc(order.date)}</td>
        <td>${esc(order.type)}</td>
        <td>${esc(order.recipeName)}</td>
        <td>${order.memberIds.length}</td>
        <td>${money(order.perPerson)}</td>
        <td>${money(order.total)}</td>
        <td>
          <button class="btn light" data-a="cancelorder" data-id="${order.id}">
            Cancel Order
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7">No confirmed orders.</td></tr>';
  }

  // ACCOUNTS AND LEDGER

  function renderAccounts() {
    const query = $('accountSearch').value.toLowerCase().trim();

    const members = data.members.filter(member =>
      [member.name, member.serviceId]
        .some(value => String(value || '').toLowerCase().includes(query))
    );

    $('accountRows').innerHTML = members.map(member => {
      const t = totals(member.id);

      return `
        <tr>
          <td><b>${esc(member.name)}</b><br><small>${esc(member.serviceId)}</small></td>
          <td>${money(t.charges)}</td>
          <td>${money(t.advance)}</td>
          <td>${money(t.paid)}</td>
          <td class="${t.due ? 'due' : 'credit'}">${money(t.due)}</td>
          <td>
            <button class="btn light" data-a="pay" data-id="${member.id}">Payment</button>
            <button class="btn light" data-a="advance" data-id="${member.id}">Add Advance</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">No members found.</td></tr>';

    $('ledgerRows').innerHTML = [...data.ledger]
      .filter(entry =>
        !query || mname(entry.memberId).toLowerCase().includes(query)
      )
      .reverse()
      .map(entry => `
        <tr>
          <td>${esc(entry.date)}</td>
          <td>${esc(mname(entry.memberId))}</td>
          <td>${esc(entry.type)}</td>
          <td>${esc(entry.description || '—')}</td>
          <td>${money(entry.amount)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">No transactions recorded.</td></tr>';
  }

  function renderDash() {
    const active = data.members.filter(member => member.status === 'Active');

    let charges = 0;
    let due = 0;

    data.members.forEach(member => {
      const t = totals(member.id);
      charges += t.charges;
      due += t.due;
    });

    $('dMembers').textContent = active.length;
    $('dStock').textContent = money(stockValue());
    $('dCharges').textContent = money(charges);
    $('dDue').textContent = money(due);

    $('dashRows').innerHTML = active.map(member => {
      const t = totals(member.id);

      return `
        <tr>
          <td>${esc(member.name)}<br><small>${esc(member.serviceId)}</small></td>
          <td>${money(t.charges)}</td>
          <td>${money(t.advance)}</td>
          <td>${money(t.paid)}</td>
          <td>${money(t.due)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5">Add members to begin.</td></tr>';
  }

  function render() {
    renderDash();
    memberCards();
    renderStore();
    renderRecipes();
    renderMeals();
    renderAccounts();
  }

  // BACKUP, RESTORE AND CSV EXPORT

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function backup() {
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      }),
      'crpf-mess-backup.json'
    );

    toast('Backup download started.');
  }

  function csv() {
    const rows = [
      ['Date', 'Member ID', 'Member', 'Type', 'Description', 'Amount'],
      ...data.ledger.map(entry => [
        entry.date,
        mem(entry.memberId)?.serviceId || '',
        mname(entry.memberId),
        entry.type,
        entry.description || '',
        entry.amount
      ])
    ];

    const text = rows.map(row =>
      row.map(value =>
        '"' + String(value ?? '').replace(/"/g, '""') + '"'
      ).join(',')
    ).join('\r\n');

    downloadBlob(
      new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' }),
      'mess-accounts.csv'
    );

    toast('CSV export started.');
  }

  // EVENT HANDLERS

  $('memberForm').onsubmit = saveMember;
  $('addMember').onclick = () => openMember();

  $('quickAdd').onclick = () => {
    go('members');
    openMember();
  };

  ['closeMember', 'cancelMember'].forEach(id => {
    $(id).onclick = () => $('memberDialog').close();
  });

  $('profileClose').onclick = () => $('profileDialog').close();

  $('profileEdit').onclick = () => {
    const member = mem(profileId);
    $('profileDialog').close();
    if (member) openMember(member);
  };

  $('profileWhats').onclick = () => sendWhatsApp(profileId);

  $('payForm').onsubmit = saveMoney;

  ['closePay', 'cancelPay'].forEach(id => {
    $(id).onclick = () => $('payDialog').close();
  });

  $('memberSearch').oninput = memberCards;
  $('accountSearch').oninput = renderAccounts;

  $('itemForm').onsubmit = saveItem;
  $('recipeForm').onsubmit = saveRecipe;

  $('addIng').onclick = () => {
    if (!data.items.length) {
      toast('Add store items before creating a recipe.');
      return;
    }

    ingredientRow();
  };

  $('clearRecipe').onclick = clearRecipe;
  $('mealForm').onsubmit = confirmOrder;
  $('mealRecipe').onchange = previewOrder;
  $('servings').oninput = previewOrder;

  $('selectAll').onclick = () => {
    $('mealMembers').querySelectorAll('input').forEach(input => {
      input.checked = true;
    });

    previewOrder();
  };

  $('clearAll').onclick = () => {
    $('mealMembers').querySelectorAll('input').forEach(input => {
      input.checked = false;
    });

    previewOrder();
  };

  $('backupBtn').onclick = backup;
  $('csvBtn').onclick = csv;

  // MEMBER PHOTO: RESIZE BEFORE SAVING

  $('photoInput').onchange = event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Choose a photo smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(
          1,
          500 / Math.max(image.width, image.height)
        );

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        canvas.getContext('2d').drawImage(
          image, 0, 0, canvas.width, canvas.height
        );

        photo = canvas.toDataURL('image/jpeg', 0.78);
        photoPreview();
      };

      image.onerror = () => toast('Could not load that photo.');
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  };

  $('removePhoto').onclick = () => {
    photo = '';
    $('photoInput').value = '';
    photoPreview();
  };

  // RESTORE JSON BACKUP

  $('restore').onchange = event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const restored = JSON.parse(reader.result);

        const valid = [
          'members',
          'items',
          'recipes',
          'meals',
          'ledger'
        ].every(key => Array.isArray(restored[key]));

        if (!valid) throw new Error('Invalid backup structure.');

        if (!confirm(
          'Restore this backup? Current data in this browser will be replaced.'
        )) {
          return;
        }

        data = restored;
        save();
        toast('Backup restored.');
      } catch (error) {
        alert('Invalid backup file. Current data was not restored.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // NAVIGATION

  document.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => go(button.dataset.page);
  });

  // ACTION BUTTONS INSIDE MEMBER, STORE, RECIPE AND MEAL LISTS

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-a]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.a;

    if (action === 'view') showProfile(id);

    if (action === 'edit') {
      const member = mem(id);
      if (member) openMember(member);
    }

    if (action === 'wa') sendWhatsApp(id);

    if (action === 'pay') openMoney(id, 'payment');

    if (action === 'advance') openMoney(id, 'advance');

    if (action === 'delete') {
      const member = mem(id);

      if (member && confirm(
        `Delete ${member.name}? Existing account history will remain.`
      )) {
        data.members = data.members.filter(x => x.id !== id);
        save();
        toast('Member deleted.');
      }
    }

    if (action === 'edititem') {
      const item = itm(id);
      if (!item) return;

      $('itemId').value = item.id;
      $('itemName').value = item.name;
      $('itemUnit').value = item.unit;
      $('itemQty').value = '';
      $('itemCost').value = '';

      $('itemQty').focus();

      toast('Enter additional quantity and total purchase cost, then save.');
      window.scrollTo(0, 0);
    }

    if (action === 'delitem') {
      const used = data.recipes.some(recipe =>
        recipe.ingredients.some(ingredient => ingredient.itemId === id)
      );

      if (used && !confirm(
        'This item is used in recipes. Deleting it may affect recipe calculations. Continue?'
      )) {
        return;
      }

      if (!used && !confirm('Delete this store item?')) return;

      data.items = data.items.filter(x => x.id !== id);
      save();
      toast('Store item deleted.');
    }

    if (action === 'editrecipe') {
      const recipe = rec(id);
      if (!recipe) return;

      $('recipeId').value = recipe.id;
      $('recipeName').value = recipe.name;
      $('recipeNotes').value = recipe.notes || '';
      $('ingredients').innerHTML = '';

      recipe.ingredients.forEach(ingredient => ingredientRow(ingredient));

      go('recipes');
      $('recipeName').focus();
    }

    if (action === 'delrecipe') {
      if (!confirm('Delete this recipe?')) return;

      data.recipes = data.recipes.filter(x => x.id !== id);
      save();
      toast('Recipe deleted.');
    }

    if (action === 'cancelorder') {
      cancelOrder(id);
    }
  });

  // INITIAL SETUP

  $('mealDate').value = today();
  render();

})();
```
