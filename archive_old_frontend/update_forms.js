const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace standard forms with zoho-books-form header styling
html = html.replace(/<div class="card">\s*<div class="card-title">(.*?)<\/div>\s*<form id="(.*?)">/g, 
`<div class="card form-card zoho-books-form">
  <div class="form-header">
    <h2>$1</h2>
    <button type="submit" form="$2" class="btn btn-primary">Save</button>
  </div>
  <div class="form-body">
    <form id="$2">`);

// Replace form buttons to remove redundant save buttons at the bottom since they are now in the header
// We'll leave the form ending but remove `<button type="submit"` if they are at the bottom of the form
// Wait, removing buttons inside the form blindly might be tricky. Let's just hide them via CSS for .zoho-books-form form > button[type=submit]
// Actually, CSS is safer.

fs.writeFileSync('index.html', html);
