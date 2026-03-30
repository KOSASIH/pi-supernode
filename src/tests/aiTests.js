const { expect } = require('chai');
const tf = require('@tensorflow/tfjs');
const { createModel: createAnomalyModel, trainModel: trainAnomalyModel, predictAnomalies } = require('../ai/models/anomalyDetectionModel');
const { createModel: createTransactionModel, trainModel: trainTransactionModel, predictTransactions } = require('../ai/models/transactionPredictionModel');

describe('AI Model Tests', function() {
    let anomalyModel;
    let transactionModel;

    before(function() {
        // Create models before running the tests
        anomalyModel = createAnomalyModel();
        transactionModel = createTransactionModel();
    });

    it('should create an anomaly detection model', function() {
        expect(anomalyModel).to.be.an('object');
        expect(anomalyModel.layers).to.have.lengthOf(3); // Check for input, hidden, and output layers
    });

    it('should create a transaction prediction model', function() {
        expect(transactionModel).to.be.an('object');
        expect(transactionModel.layers).to.have.lengthOf(3); // Check for input, hidden, and output layers
    });

    it('should train the anomaly detection model', async function() {
        const xTrain = tf.randomNormal([1000, 10]); // 1000 samples, 10 features
        const yTrain = tf.randomUniform([1000, 1]).greater(0.8).toFloat(); // 20% anomalies

        const history = await trainAnomalyModel(anomalyModel, xTrain, yTrain);
        expect(history).to.have.property('history');
        expect(history.history.loss).to.be.an('array').that.is.not.empty; // Check if loss history is recorded
    });

    it('should train the transaction prediction model', async function() {
        const xTrain = tf.randomNormal([1000, 5]); // 1000 samples, 5 features
        const yTrain = tf.randomNormal([1000, 1]).add(100); // Transaction amounts centered around 100

        const history = await trainTransactionModel(transactionModel, xTrain, yTrain);
        expect(history).to.have.property('history');
        expect(history.history.loss).to.be.an('array').that.is.not.empty; // Check if loss history is recorded
    });

    it('should predict anomalies', function() {
        const testData = tf.randomNormal([10, 10]); // 10 samples, 10 features
        const predictions = predictAnomalies(anomalyModel, testData);
        expect(predictions).to.be.an('object');
        expect(predictions.shape).to.deep.equal([10, 1]); // Check shape of predictions
    });

    it('should predict transaction amounts', function() {
        const testData = tf.randomNormal([10, 5]); // 10 samples, 5 features
        const predictions = predictTransactions(transactionModel, testData);
        expect(predictions).to.be.an('object');
        expect(predictions.shape).to.deep.equal([10, 1]); // Check shape of predictions
    });
});

/**
 * Run the tests
 */
if (require.main === module) {
    require('mocha').run();
}
