const { expect } = require('chai');
const Transaction = require('../blockchain/transaction');
const Block = require('../blockchain/blockchain').Block; // Adjust the path as necessary
const Blockchain = require('../blockchain/blockchain');

describe('Blockchain Components Tests', function() {
    let blockchain;

    before(function() {
        // Create a new blockchain instance before running the tests
        blockchain = new Blockchain();
    });

    it('should create a genesis block', function() {
        const genesisBlock = blockchain.getChain()[0];
        expect(genesisBlock).to.be.an('object');
        expect(genesisBlock.index).to.equal(0);
        expect(genesisBlock.previousHash).to.equal('0');
        expect(genesisBlock.data).to.equal('Genesis Block');
    });

    it('should add a new block to the blockchain', function() {
        const transaction = new Transaction("Alice", "Bob", 50);
        blockchain.addTransaction(transaction);
        const newBlock = blockchain.mineBlock();

        expect(newBlock).to.be.an('object');
        expect(newBlock.index).to.equal(1);
        expect(newBlock.transactions).to.include(transaction);
        expect(newBlock.previousHash).to.equal(blockchain.getChain()[0].hash);
    });

    it('should calculate the hash of a block correctly', function() {
        const block = new Block(1, '0', Date.now(), [], 'dummyHash', 0);
        const hash = blockchain.calculateHash(block.index, block.previousHash, block.timestamp, block.transactions, block.nonce);
        expect(hash).to.equal('dummyHash'); // Replace with actual hash calculation if needed
    });

    it('should validate a transaction', function() {
        const validTransaction = new Transaction("Alice", "Bob", 50);
        const invalidTransaction = new Transaction("", "Bob", -10);

        expect(validTransaction.isValid()).to.be.true;
        expect(invalidTransaction.isValid()).to.be.false;
    });

    it('should throw an error when adding an invalid transaction', function() {
        const invalidTransaction = new Transaction("", "Bob", -10);
        expect(() => blockchain.addTransaction(invalidTransaction)).to.throw("Invalid transaction");
    });
});

/**
 * Run the tests
 */
if (require.main === module) {
    require('mocha').run();
}
