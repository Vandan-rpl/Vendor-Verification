const bcrypt = require('bcrypt');

const generateHash = async () => {
    const hash = await bcrypt.hash('Rubamin@123',10);
    console.log(hash);
}

generateHash();