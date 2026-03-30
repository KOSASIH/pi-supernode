const { expect } = require('chai');
const { generateKeyPair, encrypt, decrypt } = require('../quantum/algorithms/encryption'); // Adjust the path as necessary

describe('Quantum Encryption Tests', function() {
    let keyPair;
    const message = "This is a secret message!";

    before(function() {
        // Generate a key pair before running the tests
        keyPair = generateKeyPair();
    });

    it('should encrypt and decrypt a message correctly', function() {
        const encryptedMessage = encrypt(message, keyPair.publicKey);
        const decryptedMessage = decrypt(encryptedMessage, keyPair.privateKey);
        
        expect(decryptedMessage).to.equal(message);
    });

    it('should throw an error when trying to decrypt with an invalid key', function() {
        const invalidKeyPair = generateKeyPair();
        const encryptedMessage = encrypt(message, keyPair.publicKey);
        
        expect(() => decrypt(encryptedMessage, invalidKeyPair.privateKey)).to.throw();
    });

    it('should throw an error when encrypting with an invalid public key', function() {
        const invalidPublicKey = "invalidPublicKey";
        
        expect(() => encrypt(message, invalidPublicKey)).to.throw();
    });
});

/**
 * Run the tests
 */
if (require.main === module) {
    require('mocha').run();
}
