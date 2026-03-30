const crypto = require('crypto');

/**
 * Class representing a Transaction
 */
class Transaction {
    constructor(sender, receiver, amount) {
        this.sender = sender; // Sender's address
        this.receiver = receiver; // Receiver's address
        this.amount = amount; // Transaction amount
        this.timestamp = Date.now(); // Timestamp of the transaction
        this.id = this.calculateId(); // Unique transaction ID
    }

    /**
     * Calculates a unique ID for the transaction
     * @returns {string} - The calculated transaction ID
     */
    calculateId() {
        return crypto.createHash('sha256').update(this.sender + this.receiver + this.amount + this.timestamp).digest('hex');
    }

    /**
     * Validates the transaction
     * @returns {boolean} - True if the transaction is valid, false otherwise
     */
    isValid() {
        if (!this.sender || !this.receiver || !this.amount) {
            return false; // Invalid if any field is missing
        }
        if (this.amount <= 0) {
            return false; // Invalid if amount is zero or negative
        }
        return true; // Transaction is valid
    }

    /**
     * Returns a string representation of the transaction
     * @returns {string} - The string representation of the transaction
     */
    toString() {
        return JSON.stringify({
            id: this.id,
            sender: this.sender,
            receiver: this.receiver,
            amount: this.amount,
            timestamp: this.timestamp
        });
    }
}

/**
 * Example usage of the Transaction class
 */
function main() {
    const transaction = new Transaction("Alice", "Bob", 10);

    // Validate the transaction
    if (transaction.isValid()) {
        console.log("Transaction is valid:");
        console.log(transaction.toString());
    } else {
        console.log("Transaction is invalid.");
    }

    // Create an invalid transaction
    const invalidTransaction = new Transaction("", "Bob", -5);
    if (invalidTransaction.isValid()) {
        console.log("Transaction is valid:");
        console.log(invalidTransaction.toString());
    } else {
        console.log("Transaction is invalid.");
    }
}

// Run the example
main();

module.exports = Transaction;
