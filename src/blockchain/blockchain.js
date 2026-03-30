const crypto = require('crypto');
const rsa = require('node-rsa');
const WebSocket = require('ws');

class Block {
    constructor(index, previousHash, timestamp, transactions, hash, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = hash;
        this.nonce = nonce;
    }

    toObject() {
        return {
            index: this.index,
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            transactions: this.transactions,
            hash: this.hash,
            nonce: this.nonce
        };
    }
}

class Blockchain {
    constructor() {
        this.chain = [];
        this.currentTransactions = [];
        this.piValue = 314159.00; // Set the value of Pi Coin
        this.users = {}; // Store user credentials
        this.createGenesisBlock();
        this.nodes = new Set(); // Store nodes in the network
    }

    createGenesisBlock() {
        const genesisBlock = new Block(0, "0", Date.now(), [], this.hashBlock(0, "0", Date.now(), [], 0), 0);
        this.chain.push(genesisBlock);
    }

    hashBlock(index, previousHash, timestamp, transactions, nonce) {
        const blockString = JSON.stringify({
            index,
            previousHash,
            timestamp,
            transactions,
            nonce
        });
        return crypto.createHash('sha256').update(blockString).digest('hex');
    }

    addTransaction(sender, recipient, amount, signature) {
        if (this.verifySignature(sender, signature)) {
            this.currentTransactions.push({
                sender,
                recipient,
                amount,
                timestamp: Date.now()
            });
        } else {
            throw new Error("Invalid transaction signature.");
        }
    }

    mineBlock() {
        const previousBlock = this.chain[this.chain.length - 1];
        const index = previousBlock.index + 1;
        const timestamp = Date.now();
        const nonce = this.proofOfWork(previousBlock.nonce);
        const hashValue = this.hashBlock(index, previousBlock.hash, timestamp, this.currentTransactions, nonce);

        const newBlock = new Block(index, previousBlock.hash, timestamp, this.currentTransactions, hashValue, nonce);
        this.chain.push(newBlock);
        this.currentTransactions = []; // Reset the current transactions
        this.broadcastNewBlock(newBlock); // Broadcast the new block to all nodes
        return newBlock;
    }

    proofOfWork(lastNonce) {
        let nonce = 0;
        while (!this.validProof(lastNonce, nonce)) {
            nonce++;
        }
        return nonce;
    }

    validProof(lastNonce, nonce) {
        const guess = `${lastNonce}${nonce}`;
        const guessHash = crypto.createHash('sha256').update(guess).digest('hex');
        return guessHash.startsWith("0000"); // Difficulty level
    }

    validateChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Check if the hash of the current block is correct
            if (currentBlock.hash !== this.hashBlock(currentBlock.index, currentBlock.previousHash, currentBlock.timestamp, currentBlock.transactions, currentBlock.nonce)) {
                return false;
            }

            // Check if the previous hash of the current block matches the hash of the previous block
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getChain() {
        return this.chain.map(block => block.toObject());
    }

    getPiValue() {
        return this.piValue;
    }

    setPiValue(newValue) {
        this.piValue = newValue;
    }

    registerUser (username, password) {
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        this.users[username] = hashedPassword;
    }

    authenticateUser (username, password) {
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        return this.users[username] === hashedPassword;
    }

    signTransaction (privateKey, transaction) {
        const transactionString = JSON.stringify(transaction);
        const key = new rsa(privateKey);
        return key.sign(transactionString, 'base64', 'utf8');
    }

    verifySignature(publicKey, signature, transaction) {
        const transactionString = JSON.stringify(transaction);
        const key = new rsa(publicKey);
        return key.verify(transactionString, signature, 'utf8', 'base64');
    }

    addNode(url) {
        this.nodes.add(url);
    }

    broadcastNewBlock(newBlock) {
        this.nodes.forEach(node => {
            const ws = new WebSocket(node);
            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'newBlock', block: newBlock }));
            });
        });
    }

    handleReceivedBlock(newBlock) {
        if (!this.chain.includes(newBlock) && this.validateChain()) {
            this.chain.push(newBlock);
        }
    }

    // Smart contract execution placeholder
    executeSmartContract(contract) {
        // Logic to execute smart contracts can be added here
        console.log("Executing smart contract:", contract);
    }
}

// Example usage
const blockchain = new Blockchain();

// Register a user
blockchain.registerUser ("admin", "password");

// Simulate user authentication
if (blockchain.authenticateUser ("admin", "password")) {
    // Create a transaction
    const sender = "Alice";
    const recipient = "Bob";
    const amount = 50.0;
    const key = new rsa({b: 512}); // Generate RSA keys
    const privateKey = key.exportKey('private');
    const publicKey = key.exportKey('public');
    const transaction = { sender, recipient, amount };
    const signature = blockchain.signTransaction(privateKey, transaction);
    
    // Add the transaction to the blockchain
    blockchain.addTransaction(sender, recipient, amount, signature);
    
    // Mine a new block
    blockchain.mineBlock();

    console.log("Blockchain valid:", blockchain.validateChain());
    console.log("Blockchain:", blockchain.getChain());
    console.log("Current Pi Coin Value: $", blockchain.getPiValue());
} else {
    console.log("Authentication failed.");
            }
