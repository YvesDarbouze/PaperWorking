// Render a data table from rows and columns array
// Usage: renderDataTable("data-table", rows, ["Col A", "Col B"])
function renderDataTable(containerId, rows, columns) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const table = document.createElement("table");
  table.setAttribute("role", "table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach(function (col) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    const tr = document.createElement("tr");
    row.forEach(function (cell) {
      const td = document.createElement("td");
      td.textContent = cell != null ? String(cell) : "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}
