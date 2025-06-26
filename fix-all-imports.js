const fs = require('fs');
const path = require('path');

const contractsDir = './contracts';
const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));

console.log('🔧 Fixing all OpenZeppelin v5 import paths...');

files.forEach(file => {
    const filePath = path.join(contractsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix both import paths
    const originalContent = content;
    content = content.replace(
        /@openzeppelin\/contracts\/security\/ReentrancyGuard\.sol/g,
        '@openzeppelin/contracts/utils/ReentrancyGuard.sol'
    );
    content = content.replace(
        /@openzeppelin\/contracts\/security\/Pausable\.sol/g,
        '@openzeppelin/contracts/utils/Pausable.sol'
    );
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${file}`);
    } else {
        console.log(`⏭️ No changes needed in ${file}`);
    }
});

console.log('🎉 All imports fixed!');