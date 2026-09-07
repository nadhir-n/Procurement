const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The replacement was done blindly, so every </form> that was previously directly inside a card now needs an extra </div> after it.
// Let's look for `<div class="card form-card zoho-books-form">` to see where they are.
let count = 0;
let newHtml = "";
let lines = html.split('\n');
let insideZohoForm = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('class="card form-card zoho-books-form"')) {
        insideZohoForm = true;
    }
    
    newHtml += line + '\n';
    
    if (insideZohoForm && line.includes('</form>')) {
        // Add the missing </div> for .form-body
        newHtml += '                  </div>\n';
        insideZohoForm = false;
    }
}

fs.writeFileSync('index.html', newHtml);
console.log('Fixed unclosed divs');
