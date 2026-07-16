const fs = require('fs');
const path = require('path');

const pagesDir = path.join(process.cwd(), 'client/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

let count = 0;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // We look for patterns like:
  // useEffect(() => {
  //   void fetchLeaves();
  // }, []);
  
  const regex1 = /useEffect\(\(\)\s*=>\s*\{\s*(?:void\s+)?(fetch[A-Za-z0-9_]+)\(\);\s*\}\s*,\s*\[(.*?)\]\);/g;
  
  let modified = false;
  
  content = content.replace(regex1, (match, funcName, deps) => {
    modified = true;
    return `useEffect(() => {
    void ${funcName}();
    window.addEventListener('app:refresh', ${funcName});
    return () => window.removeEventListener('app:refresh', ${funcName});
  }, [${deps}]);`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file} (Single fetch)`);
    count++;
  }
}

console.log(`Total files updated: ${count}`);
