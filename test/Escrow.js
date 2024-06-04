const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {

  let buyer, seller, inspector, lender;
  let realEstate, escrow;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners()

    //Deploying the contracts
    const RealEstate = await ethers.getContractFactory('RealEstate');
    realEstate = await RealEstate.deploy();
    await realEstate.deployed();

    // Mint
    let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
    await transaction.wait();

    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      lender.address,
      inspector.address
    );

    await escrow.deployed();

    // Approve
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();

    // List
    transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe('Deployment', async () => {

    it('Returns NFT address', async () => {
      const result = await escrow.nftAddress();
      expect(result).to.equal(realEstate.address);
    });

    it('Returns seller', async () => {
      const result = await escrow.seller();
      expect(result).to.equal(seller.address);
    });

    it('Returns inspector', async () => {
      const result = await escrow.inspector();
      expect(result).to.equal(inspector.address);
    });

    it('Returns lender', async () => {
      const result = await escrow.lender();
      expect(result).to.equal(lender.address);
    });
  });

  describe('listing', async () => {

    it('Updates as listed', async () => {
      const result = await escrow.isListed(1);
      expect(result).to.equal(true);
    });

    it('Updates ownership', async () => {
      expect(await realEstate.ownerOf(1)).to.equal(escrow.address);
    });

    it('Returns buyer', async () => {
      const result = await escrow.buyer(1);
      expect(result).to.equal(buyer.address);
    });

    it('Returns purchase price', async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.equal(tokens(10));
    });

    it('Returns escrow amount', async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.equal(tokens(5));
    });
  });

  describe('Deposits', async () => {
    it('Updates contract balance', async () => {
      const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.equal(tokens(5));
    });
  });

  describe('Inspection', async () => {
    it('Updates inspection status', async () => {
      const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
      await transaction.wait();
      const result = await escrow.inspectionPassed(1);
      expect(result).to.equal(true);
    });
  });

  describe('Approval', async () => {
    it('Updates approval status', async () => {
      let transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.equal(true);
      expect(await escrow.approval(1, seller.address)).to.equal(true);
      expect(await escrow.approval(1, lender.address)).to.equal(true);
    });
  });

  describe('Sale', async () => {
    beforeEach(async () => {
      let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
      await transaction.wait()

      transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
      await transaction.wait()

      transaction = await escrow.connect(buyer).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(seller).approveSale(1)
      await transaction.wait()

      transaction = await escrow.connect(lender).approveSale(1)
      await transaction.wait()

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) })

      transaction = await escrow.connect(seller).finalizeSale(1)
      await transaction.wait()
    })

    it('Works', async () => {
    });
  });
});

// https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS