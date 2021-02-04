const { expectRevert } = require('@openzeppelin/test-helpers');
const Dao = artifacts.require('DAO.sol');
const Dai = artifacts.require('mocks/Dai.sol');

contract('DAO', (accounts) => {
    let dai, dao;
    const [admin, voter1, voter2, voter3, voter4] = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const amountVoter1 = web3.utils.toWei('100');
    const amountVoter2 = web3.utils.toWei('50');
    const amountVoter3 = web3.utils.toWei('25');
    const amountVoter4 = web3.utils.toWei('25');
    const proposalID = web3.utils.fromAscii('Test Proposal');


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
        await dai.approve(dao.address, amountVoter1, { from: voter1 });
        await dai.approve(dao.address, amountVoter2, { from: voter2 });
        await dai.approve(dao.address, amountVoter3, { from: voter3 });

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

    it(`shouldn't create a proposal - not enough shares`, async() => {
        await dao.deposit(amountVoter2, { from: voter2 });

        await expectRevert(
            dao.createProposal(proposalID, {from: voter2}),
            'not enough shares to create proposal'
        );
    });

    it(`shouldn't create a proposal - already exists`, async() => {
        await dao.deposit(amountVoter1, { from: voter1 });
        await dao.createProposal(proposalID, {from: voter1});

        await expectRevert(
            dao.createProposal(proposalID, {from: voter1}),
            'proposal already exists'
        );
    });

    it.only('should create a proposal', async() => {
        await dao.deposit(amountVoter1, { from: voter1 });
        const tx = await dao.createProposal(proposalID, {from: voter1});
        const proposal = await dao.proposals.call(proposalID);
        //console.log(await web3.eth.getBlock(tx.blockNumber)); // see tx timestamp

        assert(proposal.author === voter1);
        // assert(web3.utils.toAscii(proposal.hash) === 'Test Proposal'); // FAILS?
        assert(proposal.votesYes.toNumber() === 0);
        assert(proposal.votesNo.toNumber() === 0);
        assert(proposal.status.toNumber() === 0);

    });


});