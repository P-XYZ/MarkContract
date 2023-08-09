import { expect } from 'chai';
import { Wallet, Contract } from 'ethers';

import { assertPublicMutableMethods } from './exchange';
import { ZERO_ADDRESS } from './exchange/utils';

export function runPermissionsTests(
  setupTest: any,
) {
  return async () => {
    let admin: Wallet;
    let alice: Wallet;

    let exchange: Contract;
    let criteriaRouter: any;

    before(async () => {
      ({ admin, alice, exchange} = await setupTest());
      const MatchCriteriaRouter = await ethers.getContractFactory('MatchCriteriaRouter');
      const criteriaRouterAddr = await exchange.matchCriteriaRouter();
      // console.log(`criteriaRouterAddr: ${criteriaRouterAddr}`);
      criteriaRouter = MatchCriteriaRouter.attach(criteriaRouterAddr);
    });

    /*
    it('has correct public interface', async () => {
      await assertPublicMutableMethods(exchange, publicMutableMethods);
    });
    */

    const setAddress = async (fnName: string) => {
      it('can be called by owner', async () => {
        await exchange[fnName](admin.address);
      });
      it('reverts when not called by owner', async () => {
        await expect(
          exchange.connect(alice)[fnName](admin.address),
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
      it('reverts when address is 0', async () => {
        // solidity has no direct `if(addressToValidate == address(0)) revert ZeroAddress();`
        // "The given contract doesn't have a custom error named 'ZeroAddress'"
        await expect(exchange[fnName](ZERO_ADDRESS)).to.be.reverted;
      });
    };

    describe('setOracle', async () => setAddress('setOracle'));
    /*
    describe('setExecutionDelegate', async () =>
      setAddress('setExecutionDelegate'));
    */
    describe('setMatchCriteriaRouter', async () => setAddress('setMatchCriteriaRouter'));

    describe('setPlatformFeeRecipient', async () => setAddress('setPlatformFeeRecipient'));

    describe('setBlockRange', async () => {
      it('can be called by owner', async () => {
        await exchange.setBlockRange(5);
      });
      it('reverts when not called by owner', async () => {
        await expect(
          exchange.connect(alice).setBlockRange(5),
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });

    describe('closeExchange', async () => {
      it('can be called by owner', async () => {
        await exchange.closeExchange();
      });
      it('reverts when not called by owner', async () => {
        await expect(exchange.connect(alice).closeExchange()).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });
    });
    describe('openExchange', async () => {
      it('can be called by owner', async () => {
        await exchange.openExchange();
      });
      it('reverts when not called by owner', async () => {
        await expect(exchange.connect(alice).openExchange()).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });
    });

    describe('grantCriteria', async () => {
      it('can be called by owner', async () => {
        await criteriaRouter.grantCriteria(alice.address);
      });
      it('reverts when ZERO_ADDRESS', async () => {
        await expect(criteriaRouter.grantCriteria(ZERO_ADDRESS)).to.be.reverted;
      });
      it('reverts when not called by owner', async () => {
        await expect(criteriaRouter.connect(alice).grantCriteria(alice.address)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });
    });
  };
}
