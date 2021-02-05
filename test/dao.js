const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Dao = artifacts.require('DAO.sol');
const Dai = artifacts.require('mocks/Dai.sol');

const SIDE = {
    Yes: 0,
    No: 1
};

const STATUS = {
    Undecided: 0,
    Approved: 1,
    Rejected: 2
};

contract('DAO', (accounts) => {
    let dai, dao;
    const [admin, voter1, voter2, voter3, voter4] = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const amountVoter1 = web3.utils.toWei('105');
    const amountVoter2 = web3.utils.toWei('95');
    const amountVoter3 = web3.utils.toWei('100');
    const amountVoter4 = web3.utils.toWei('25');
    const proposalID = web3.utils.fromAscii('Test Proposal');
    const WEEK_IN_SECONDS = 604801;


    beforeEach(async () => {
        // contracts creation
        dai = await Dai.new({ from: admin });
        dao = await Dao.new(dai.address, { from: admin });

        // give tokens to users
        await dai.faucet(voter1, amountVoter1, { from: admin });
        await dai.faucet(voter2, amountVoter2, { from: admin });
        await dai.faucet(voter3, amountVoter3, { from: admin });
        await dai.faucet(voter4, amountVoter4, { from: admin });

        // aprove dai transfer to dao contract
        await dai.approve(dao.address, amountVoter1, { from: voter1 }); // 105
        await dai.approve(dao.address, amountVoter2, { from: voter2 }); // 95
        await dai.approve(dao.address, amountVoter3, { from: voter3 }); // 100

    });

    it('should deposit governance tokens', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        const voter1Balance = await dao.shares.call(voter1);

        assert(voter1Balance.toString() === amountVoter1);
    });

    it('should not withdraw governance tokens - not enough shares', async () => {
        await expectRevert(
            dao.withdraw(amountVoter1, { from: voter2 }),
            'not enough shares'
        );
    });

    it('should withdraw tokens', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        let balance = await dao.shares.call(voter1);
        assert(balance.toString() === amountVoter1);

        await dao.withdraw(amountVoter1, { from: voter1 });
        balance = await dao.shares.call(voter1);
        assert(balance.toNumber() === 0);
    });

    it(`shouldn't create a proposal - not enough shares`, async () => {
        await dao.deposit(amountVoter2, { from: voter2 });

        await expectRevert(
            dao.createProposal(proposalID, { from: voter2 }),
            'not enough shares to create proposal'
        );
    });

    it(`shouldn't create a proposal - already exists`, async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        await dao.createProposal(proposalID, { from: voter1 });

        await expectRevert(
            dao.createProposal(proposalID, { from: voter1 }),
            'proposal already exists'
        );
    });

    it('should create a proposal', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        const tx = await dao.createProposal(proposalID, { from: voter1 });
        const proposal = await dao.proposals.call(proposalID);
        //console.log(await web3.eth.getBlock(tx.blockNumber)); // see tx timestamp

        assert(proposal.author === voter1);
        // assert(web3.utils.toAscii(proposal.hash) === 'Test Proposal'); // FAILS?
        assert(proposal.votesYes.toNumber() === 0);
        assert(proposal.votesNo.toNumber() === 0);
        assert(proposal.status.toNumber() === 0);

    });

    it('should not vote twice', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        await dao.createProposal(proposalID, { from: voter1 });
        await dao.vote(proposalID, SIDE.Yes);

        await expectRevert(
            dao.vote(proposalID, SIDE.Yes),
            'already voted'
        )
    });

    it('should not vote - proposal does not exist', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });

        await expectRevert(
            dao.vote(web3.utils.fromAscii('non existing proposal'), SIDE.No),
            'proposal does not exist'
        )
    });

    it('should not vote - period is over', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        const tx = await dao.createProposal(proposalID, { from: voter1 });
        console.log(await web3.eth.getBlock(tx.blockNumber).timestamp); // see tx timestamp
        time.increase(WEEK_IN_SECONDS);

        await expectRevert(
            dao.vote(proposalID, SIDE.Yes),
            'voting period over'
        );
    });

    it.only('should close proposal with Yes', async () => {
        await dao.deposit(amountVoter1, { from: voter1 });
        await dao.deposit(amountVoter2, { from: voter2 });
        await dao.deposit(amountVoter3, { from: voter3 });
        await dao.createProposal(proposalID, { from: voter1 });
        await dao.vote(proposalID, SIDE.Yes, { from: voter1 });
        await dao.vote(proposalID, SIDE.Yes, { from: voter2 });
        const proposal = await dao.proposals.call(proposalID);

        assert(proposal.status.toNumber() === STATUS.Approved);
    });

});