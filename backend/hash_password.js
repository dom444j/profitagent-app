const bcrypt = require('bcrypt');

async function hashPasswords() {
  const adminPassword = 'Admin123!';
  const sponsorPassword = 'Sponsor123!';
  
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const sponsorHash = await bcrypt.hash(sponsorPassword, 10);
  
  console.log('Admin password hash:', adminHash);
  console.log('Sponsor password hash:', sponsorHash);
}

hashPasswords().catch(console.error);