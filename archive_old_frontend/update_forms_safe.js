const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const formsToUpdate = [
    { title: "Add Supplier / Item", id: "catalog-form" },
    { title: "Create Purchase Requisition", id: "pr-form" },
    { title: "Create Purchase Order", id: "po-form" },
    { title: "Issue Goods Receipt (GRN)", id: "grn-form" },
    { title: "Run Invoice Match", id: "match-form" }
];

for (const form of formsToUpdate) {
    const regexStr = `<div class="card" id="${form.id}-container">\\s*<div class="card-title">${form.title}</div>\\s*<form id="${form.id}">([\\s\\S]*?)</form>\\s*</div>`;
    const regex = new RegExp(regexStr);
    
    const match = html.match(regex);
    if (match) {
        const formInner = match[1];
        const replacement = `<div class="card form-card zoho-books-form" id="${form.id}-container">
  <div class="form-header">
    <h2>${form.title}</h2>
    <button type="submit" form="${form.id}" class="btn btn-primary">Save</button>
  </div>
  <div class="form-body">
    <form id="${form.id}">
      ${formInner}
    </form>
  </div>
</div>`;
        html = html.replace(regex, replacement);
    }
}

fs.writeFileSync('index.html', html);
console.log('Forms updated securely');
