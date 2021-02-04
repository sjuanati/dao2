const Dao = artifacts.require('DAO.sol');
const Dai = artifacts.require('mocks/Dai.sol');

contract('DAO', (accounts) => {
    let dai, dao;
    const [admin, voter1, voter2, voter3, voter4] = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];

    beforeEach(async () => {
        // contracts creation
        dai = await Dai.new({ from: admin });
        dao = await Dao.new(dai.address, { from: admin });

        // give tokens to users
        await dai.faucet(voter1, web3.utils.toWei('100'), { from: admin });
        await dai.faucet(voter2, web3.utils.toWei('50'), { from: admin });
        await dai.faucet(voter3, web3.utils.toWei('25'), { from: admin });
        await dai.faucet(voter4, web3.utils.toWei('25'), { from: admin });
    });

    it('should deposit governance tokens', async () => {
        const amount = web3.utils.toWei('100');
        await dai.approve(dao.address, amount, { from: voter1 });
        await dao.deposit(amount, { from: voter1 });

        const voter1Balance = await dao.shares.call(voter1);
        //console.log(voter1Balance.toString());
        assert(voter1Balance.toString() === amount)

    });


});