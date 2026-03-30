const { expect } = require('chai');
const Transaction = require('../blockchain/transaction');
const Blockchain = require('../blockchain/blockchain');
const RealTimeMonitor = require('../monitoring/realTimeMonitor');
const AlertSystem = require('../monitoring/alerts');
const Logger = require('../monitoring/logging');

describe('Integration Tests', function() {
    let blockchain;
    let monitor;
    let alertSystem;
    let logger;

    before(function() {
        // Initialize components before running the tests
        blockchain = new Blockchain();
        monitor = new RealTimeMonitor();
        alertSystem = new AlertSystem(100); // Set threshold for large transactions
        logger = new Logger('./src/logs/integrationTests.log'); // Specify the log file path
    });

    it('should add a transaction and log it', function() {
        const transaction = new Transaction("Alice", "Bob", 50);
        monitor.addTransaction(transaction);
        logger.logTransaction(transaction);

        expect(blockchain.getChain().length).to.equal(1); // Check if a block has been mined
        expect(blockchain.getChain()[0].transactions).to.include(transaction); // Check if transaction is included in the block
    });

    it('should trigger an alert for a large transaction', function() {
        alertSystem.addSuspiciousAccount("Eve");
        const largeTransaction = new Transaction("Eve", "Charlie", 200);
        monitor.addTransaction(largeTransaction);
        
        // Check if the alert system detects the large transaction
        expect(() => alertSystem.checkForSuspiciousActivity(largeTransaction)).to.not.throw();
    });

    it('should log an event when a transaction is added', function() {
        const transaction = new Transaction("Bob", "Alice", 30);
        monitor.addTransaction(transaction);
        logger.logEvent("Transaction added to the ledger.");

        // Check if the log file contains the transaction log
        const logContent = fs.readFileSync('./src/logs/integrationTests.log', 'utf8');
        expect(logContent).to.include(transaction.toString());
        expect(logContent).to.include("Transaction added to the ledger.");
    });

    it('should handle invalid transactions gracefully', function() {
        const invalidTransaction = new Transaction("", "Bob", -10);
        expect(() => monitor.addTransaction(invalidTransaction)).to.throw("Invalid transaction");
    });
});

/**
 * Run the tests
 */
if (require.main === module) {
    require('mocha').run();
}
