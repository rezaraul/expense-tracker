const STORAGE_KEY = "reza-expense-tracker-v1";

const expenseCategories = [
  "Home", "Groceries", "Car", "Gas", "Restaurants",
  "Subscriptions", "Phone & Internet", "Gym", "Entertainment", "Other"
];
const incomeCategories = ["Salary", "Bonus", "Refund", "Other income"];

let state = loadState();
let selectedDate = new Date();
selectedDate.setDate(1);

const els = {
  monthScroller: document.getElementById("monthScroller"),
  summaryMonth: document.getElementById("summaryMonth"),
  balance: document.getElementById("balance"),
  incomeTotal: document.getElementById("incomeTotal"),
  expenseTotal: document.getElementById("expenseTotal"),
  categoryList: document.getElementById("categoryList"),
  transactionList: document.getElementById("transactionList"),
  yearChart: document.getElementById("yearChart"),
  dialog: document.getElementById("transactionDialog"),
  form: document.getElementById("transactionForm"),
  typeInput: document.getElementById("typeInput"),
  amountInput: document.getElementById("amountInput"),
  categoryInput: document.getElementById("categoryInput"),
  descriptionInput: document.getElementById("descriptionInput"),
  dateInput: document.getElementById("dateInput")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.transactions) ? saved : { transactions: [] };
  } catch {
    return { transactions: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(value);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthTransactions() {
  const key = monthKey(selectedDate);
  return state.transactions.filter(t => t.date.startsWith(key));
}

function updateCategoryOptions() {
  const categories = els.typeInput.value === "income" ? incomeCategories : expenseCategories;
  els.categoryInput.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderMonths() {
  els.monthScroller.innerHTML = "";
  const year = selectedDate.getFullYear();

  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const btn = document.createElement("button");
    btn.className = "month-chip" + (m === selectedDate.getMonth() ? " active" : "");
    btn.textContent = d.toLocaleDateString("en-CA", { month: "short" });
    btn.addEventListener("click", () => {
      selectedDate = d;
      render();
    });
    els.monthScroller.appendChild(btn);
  }

  requestAnimationFrame(() => {
    els.monthScroller.querySelector(".active")?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  });
}

function renderSummary() {
  const tx = currentMonthTransactions();
  const income = tx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = tx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  els.summaryMonth.textContent = selectedDate.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric"
  });
  els.balance.textContent = formatMoney(balance);
  els.balance.classList.toggle("positive", balance >= 0);
  els.incomeTotal.textContent = formatMoney(income);
  els.expenseTotal.textContent = formatMoney(expenses);
}

function renderCategories() {
  const tx = currentMonthTransactions().filter(t => t.type === "expense");
  const grouped = {};

  tx.forEach(t => grouped[t.category] = (grouped[t.category] || 0) + t.amount);

  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  if (!rows.length) {
    els.categoryList.innerHTML = `<div class="empty">No expenses for this month.</div>`;
    return;
  }

  els.categoryList.innerHTML = rows.map(([name, total], i) => `
    <div class="category-row">
      <div class="category-dot" style="opacity:${Math.max(.35, 1 - i * .08)}"></div>
      <div class="category-meta">
        <strong>${escapeHtml(name)}</strong>
        <span>${tx.filter(t => t.category === name).length} transaction(s)</span>
      </div>
      <div class="amount">${formatMoney(total)}</div>
    </div>
  `).join("");
}

function renderTransactions() {
  const tx = currentMonthTransactions().slice().sort((a, b) => b.date.localeCompare(a.date));

  if (!tx.length) {
    els.transactionList.innerHTML = `<div class="empty">Tap + to add your first transaction.</div>`;
    return;
  }

  els.transactionList.innerHTML = tx.map(t => `
    <div class="transaction-row">
      <div class="transaction-meta">
        <strong>${escapeHtml(t.description)}</strong>
        <span>${escapeHtml(t.category)} · ${new Date(t.date + "T12:00:00").toLocaleDateString("en-CA", {
          month: "short", day: "numeric"
        })}</span>
      </div>
      <div class="amount">${t.type === "income" ? "+" : "−"}${formatMoney(t.amount)}</div>
      <button class="delete-btn" data-id="${t.id}" aria-label="Delete transaction">×</button>
    </div>
  `).join("");

  els.transactionList.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.transactions = state.transactions.filter(t => t.id !== btn.dataset.id);
      saveState();
      render();
    });
  });
}

function renderYearChart() {
  const year = selectedDate.getFullYear();
  const values = [];

  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    const total = state.transactions
      .filter(t => t.type === "expense" && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    values.push(total);
  }

  const max = Math.max(...values, 1);

  els.yearChart.innerHTML = values.map((value, m) => {
    const height = Math.max(7, (value / max) * 100);
    const d = new Date(year, m, 1);
    return `
      <div class="chart-item ${m === selectedDate.getMonth() ? "active" : ""}" data-month="${m}" title="${formatMoney(value)}">
        <div class="chart-track">
          <div class="chart-bar" style="height:${height}%"></div>
        </div>
        <div class="chart-label">${d.toLocaleDateString("en-CA", { month: "narrow" })}</div>
      </div>
    `;
  }).join("");

  els.yearChart.querySelectorAll(".chart-item").forEach(item => {
    item.addEventListener("click", () => {
      selectedDate = new Date(year, Number(item.dataset.month), 1);
      render();
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderMonths();
  renderSummary();
  renderCategories();
  renderTransactions();
  renderYearChart();
}

document.getElementById("addBtn").addEventListener("click", () => {
  els.form.reset();
  els.typeInput.value = "expense";
  updateCategoryOptions();

  const today = new Date();
  const sameMonth = today.getFullYear() === selectedDate.getFullYear()
    && today.getMonth() === selectedDate.getMonth();

  const defaultDate = sameMonth
    ? today
    : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  els.dateInput.value = defaultDate.toISOString().slice(0, 10);
  els.dialog.showModal();
  setTimeout(() => els.amountInput.focus(), 80);
});

document.getElementById("closeDialog").addEventListener("click", () => els.dialog.close());
els.typeInput.addEventListener("change", updateCategoryOptions);

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(els.amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  state.transactions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type: els.typeInput.value,
    amount,
    category: els.categoryInput.value,
    description: els.descriptionInput.value.trim(),
    date: els.dateInput.value
  });

  saveState();
  selectedDate = new Date(`${els.dateInput.value}T12:00:00`);
  selectedDate.setDate(1);
  els.dialog.close();
  render();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Delete all saved transactions from this device?")) {
    state = { transactions: [] };
    saveState();
    render();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

updateCategoryOptions();
render();
