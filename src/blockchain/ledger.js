const Transaction = require('./transaction');

/**
 * Class representing a Ledger
 */
class Ledger {
    constructor() {
        this.transactions = []; // Array to hold all transactions
        this.balances = {}; // Object to hold account balances
    }

    /**
     * Adds a transaction to the ledger
     * @param {Transaction} transaction - The transaction to add
     */
    addTransaction(transaction) {
        if (transaction.isValid()) {
            this.transactions.push(transaction);
            this.updateBalances(transaction);
        } else {
            throw new Error("Invalid transaction");
        }
    }

    /**
     * Updates the balances based on the transaction
     * @param {Transaction} transaction - The transaction to process
     */
    updateBalances(transaction) {
        // Deduct from sender's balance
        if (!this.balances[transaction.sender]) {
            this.balances[transaction.sender] = 0;
        }
        this.balances[transaction.sender] -= transaction.amount;

        // Add to receiver's balance
        if (!this.balances[transaction.receiver]) {
            this.balances[transaction.receiver] = 0;
        }
        this.balances[transaction.receiver] += transaction.amount;
    }

    /**
     * Gets the current balance of an account
     * @param {string} account - The account to check
     * @returns {number} - The current balance of the account
     */
    getBalance(account) {
        return this.balances[account] || 0; // Return 0 if account has no transactions
    }

    /**
     * Displays the entire ledger
     */
    displayLedger() {
        console.log("Ledger Transactions:");
        this.transactions.forEach(transaction => {
            console.log(transaction.toString());
        });
        console.log("Account Balances:");
        console.log(this.balances);
    }
}

/**
 * Example usage of the Ledger class
 */
function main() {
    const ledger = new Ledger();

    // Create and add valid transactions
    const transaction1 = new Transaction("Alice", "Bob", 50);
    ledger.addTransaction(transaction1);

    const transaction2 = new Transaction("Bob", "Charlie", 30);
    ledger.addTransaction(transaction2);

    const transaction3 = new Transaction("Alice", "Charlie", 20);
    ledger.addTransaction(transaction3);

    // Display the ledger
    ledger.displayLedger();

    // Get balances
    console.log("Alice's Balance:", ledger.getBalance("Alice"));
    console.log("Bob's Balance:", ledger.getBalance("Bob"));
    console.log("Charlie's Balance:", ledger.getBalance("Charlie"));
}

// Run the example
main();

module.exports = Ledger;
