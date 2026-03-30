const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleIntegration", function () {
    let oracleIntegration;
    let priceFeedMock;
    let owner;
    let addr1;

    beforeEach(async function () {
        // Deploy a mock price feed contract
        const PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
        priceFeedMock = await PriceFeedMock.deploy();
        await priceFeedMock.deployed();

        // Deploy the OracleIntegration contract
        const OracleIntegration = await ethers.getContractFactory("OracleIntegration");
        oracleIntegration = await OracleIntegration.deploy(priceFeedMock.address);
        await oracleIntegration.deployed();

        [owner, addr1] = await ethers.getSigners();
    });

    describe("Price Retrieval", function () {
        it("should return the correct price when the price feed is available", async function () {
            await priceFeedMock.setPrice(2000); // Set a mock price
            const price = await oracleIntegration.getLatestPrice();
            expect(price).to.equal(2000);
        });
    });

    describe("Error Handling", function () {
        it("should emit an error when the price feed is unavailable", async function () {
            await priceFeedMock.setUnavailable(); // Simulate unavailability
            await expect(oracleIntegration.getLatestPrice()).to.emit(oracleIntegration, "Error").withArgs("Price feed not available");
        });
    });

    describe("Ownership Functionality", function () {
        it("should allow the owner to update the price feed address", async function () {
            const newPriceFeedMock = await priceFeedMock.deploy();
            await oracleIntegration.updatePriceFeed(newPriceFeedMock.address);
            expect(await oracleIntegration.priceFeed()).to.equal(newPriceFeedMock.address);
        });

        it("should not allow non-owners to update the price feed address", async function () {
            await expect(oracleIntegration.connect(addr1).updatePriceFeed(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
