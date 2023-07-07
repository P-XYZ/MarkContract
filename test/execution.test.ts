import { expect } from 'chai';
import { Wallet, Contract, BigNumber } from 'ethers';

import type { CheckBalances, GenerateOrder } from './exchange';
import { eth, Order } from './exchange';
import { Side, ZERO_ADDRESS } from './exchange/utils';
import { waitForTx } from '../scripts/web3-utils';

export function runExecuteTests(setupTest: any) {
  return async () => {
    const INVERSE_BASIS_POINT = 10000;
    const price: BigNumber = eth('1');
    const feeRate = 300;

    let exchange: Contract;

    let admin: Wallet;
    let alice: Wallet;
    let bob: Wallet;
    let thirdParty: Wallet;

    let weth: Contract;

    let matchCriterias: Record<string, Contract>;

    let mockERC721: Contract;
    let mockERC1155: Contract;

    let generateOrder: GenerateOrder;
    let checkBalances: CheckBalances;

    let sell: Order;
    let sellInput: any;
    let buy: Order;
    let buyInput: any;
    let otherOrders: Order[];
    let fee: BigNumber;
    let priceMinusFee: BigNumber;
    let tokenId: number;

    let aliceBalance: BigNumber;
    let aliceBalanceWeth: BigNumber;
    let bobBalance: BigNumber;
    let bobBalanceWeth: BigNumber;
    let feeRecipientBalance: BigNumber;
    let feeRecipientBalanceWeth: BigNumber;

    const updateBalances = async () => {
      aliceBalance = await alice.getBalance();
      aliceBalanceWeth = await weth.balanceOf(alice.address);
      bobBalance = await bob.getBalance();
      bobBalanceWeth = await weth.balanceOf(bob.address);
      feeRecipientBalance = await admin.provider.getBalance(thirdParty.address);
      feeRecipientBalanceWeth = await weth.balanceOf(thirdParty.address);
    };

    before(async () => {
      ({
        admin,
        alice,
        bob,
        thirdParty,
        exchange,
        matchCriterias,
        mockERC721,
        mockERC1155,
        tokenId,
        weth,
        checkBalances,
        generateOrder,
      } = await setupTest());
    });

    beforeEach(async () => {
      await updateBalances();
      tokenId += 1;
      await mockERC721.mint(alice.address, tokenId);

      fee = price.mul(feeRate).div(INVERSE_BASIS_POINT);
      priceMinusFee = price.sub(fee);

      sell = generateOrder(alice, {
        side: Side.Sell,
        tokenId,
      });

      buy = generateOrder(bob, { side: Side.Buy, tokenId });

      otherOrders = [
        generateOrder(alice, { salt: 1 }),
        generateOrder(alice, { salt: 2 }),
        generateOrder(alice, { salt: 3 }),
      ];

      sellInput = await sell.pack();
      buyInput = await buy.pack();
    });

    it('can trade ERC1155', async () => {
      await mockERC1155.mint(alice.address, tokenId, 1);
      sell = generateOrder(alice, {
        side: Side.Sell,
        tokenId,
        amount: 1,
        collection: mockERC1155.address,
        matchingCriteria: matchCriterias.matchCriteriaERC1155.address,
      });
      buy = generateOrder(bob, {
        side: Side.Buy,
        tokenId,
        amount: 1,
        collection: mockERC1155.address,
        matchingCriteria: matchCriterias.matchCriteriaERC1155.address,
      });
      sellInput = await sell.pack();
      buyInput = await buy.pack();

      await waitForTx(exchange.settleExchangeInputs(sellInput, buyInput));
      expect(await mockERC1155.balanceOf(bob.address, tokenId)).to.be.equal(1);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance,
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });

    it('should revert with ERC20 not WETH', async () => {
      sell.parameters.paymentToken = mockERC721.address;
      buy.parameters.paymentToken = mockERC721.address;
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();
      // console.log(`sellInput: ${JSON.stringify(sellInput, null, 2)}`);
      // console.log(`buyInput: ${JSON.stringify(buyInput, null, 2)}`);

      await expect(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      ).to.be.revertedWith('MarkExchange: Invalid payment token');
    });

    it('should revert if user revokes approval from Exchange', async () => {
      await weth
      .connect(bob)
      .approve(exchange.address, eth('0'));
      await expect(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      ).to.be.revertedWith('ERC20: insufficient allowance');
      await weth
      .connect(bob)
      .approve(exchange.address, eth('1000000000000'));
    });
    it('should succeed if user grants approval to Exchange', async () => {
      await updateBalances();
      const tx = await waitForTx(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance.sub(gasFee),
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });

    it('buyer sends tx with ETH', async () => {
      sell.parameters.paymentToken = ZERO_ADDRESS;
      buy.parameters.paymentToken = ZERO_ADDRESS;
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();

      const tx = await waitForTx(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput, { value: price.add(fee) }),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance.add(priceMinusFee),
        aliceBalanceWeth,
        bobBalance.sub(price).sub(gasFee).sub(fee),
        bobBalanceWeth,
        feeRecipientBalance.add(fee).add(fee),
        feeRecipientBalanceWeth,
      );
    });
    it('buyer sends tx with WETH', async () => {
      buyInput = await buy.packNoSigs();
      const tx = await waitForTx(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance.sub(gasFee),
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });
    it('seller tx fails with ETH', async () => {
      sell.parameters.paymentToken = ZERO_ADDRESS;
      buy.parameters.paymentToken = ZERO_ADDRESS;
      sellInput = await sell.packNoSigs();
      buyInput = await buy.pack();

      await expect(exchange.connect(alice).settleExchangeInputs(sellInput, buyInput)).to.be
        .reverted;
    });
    it('seller sends tx with WETH', async () => {
      sellInput = await sell.packNoSigs();

      const tx = await waitForTx(
        exchange.connect(alice).settleExchangeInputs(sellInput, buyInput),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance.sub(gasFee),
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance,
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });
    it('random tx fails with ETH', async () => {
      sell.parameters.paymentToken = ZERO_ADDRESS;
      buy.parameters.paymentToken = ZERO_ADDRESS;
      sellInput = await sell.pack();
      buyInput = await buy.pack();

      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.reverted;
    });
    it('random sends tx with WETH', async () => {
      await exchange.settleExchangeInputs(sellInput, buyInput);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance,
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });
    it("should revert if seller doesn't own token", async () => {
      await mockERC721
        .connect(alice)
        .transferFrom(alice.address, bob.address, tokenId);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.reverted;
    });
    it('can cancel order', async () => {
      await exchange.connect(bob).cancelExchangeOrder(buy.parameters);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('can cancel bulk listing', async () => {
      sellInput = await sell.packBulk(otherOrders);
      await exchange.connect(alice).cancelExchangeOrder(sell.parameters);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('can cancel multiple orders', async () => {
      await exchange
        .connect(bob)
        .cancelExchangeOrders([buy.parameters]);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('should not cancel if not user', async () => {
      await expect(exchange.connect(alice).cancelExchangeOrder(buy.parameters)).to.be
        .reverted;
    });
    it('should not match with invalid parameters sell', async () => {
      await exchange.connect(bob).cancelExchangeOrder(buy.parameters);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('should not match with invalid parameters buy', async () => {
      await exchange.connect(bob).cancelExchangeOrder(buy.parameters);
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('should not match with invalid signatures sell', async () => {
      sellInput = await sell.pack({ signer: bob });
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Failed authorization',
      );
    });
    it('should not match with invalid signatures buy', async () => {
      buyInput = await buy.pack({ signer: alice });
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Failed authorization',
      );
    });
    it('should revert if orders cannot be matched', async () => {
      sell.parameters.price = BigNumber.from('1');
      sellInput = await sell.pack();

      await expect(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      ).to.be.revertedWith('MarkExchange: Orders cannot be matched');
    });
    it('should revert policy is not whitelisted', async () => {
      sell.parameters.matchingCriteria = ZERO_ADDRESS;
      buy.parameters.matchingCriteria = ZERO_ADDRESS;
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();

      await expect(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      ).to.be.revertedWith('MarkExchange: Matching Criteria is not granted');
    });
    it('should revert if buyer has insufficient funds ETH', async () => {
      sell.parameters.paymentToken = ZERO_ADDRESS;
      buy.parameters.paymentToken = ZERO_ADDRESS;
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();

      await expect(exchange.connect(bob).settleExchangeInputs(sellInput, buyInput)).to.be
        .reverted;
    });
    it('should revert if buyer has insufficient funds WETH', async () => {
      sell.parameters.price = BigNumber.from('10000000000000000000000000000');
      buy.parameters.price = BigNumber.from('10000000000000000000000000000');
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();

      await expect(exchange.connect(bob).settleExchangeInputs(sellInput, buyInput)).to.be
        .reverted;
    });
    it('should revert if fee rates exceed 10000', async () => {
      sell.parameters.fees.push({ rate: 9701, recipient: thirdParty.address });
      sellInput = await sell.pack();

      await expect(exchange.connect(bob).settleExchangeInputs(sellInput, buyInput)).to.be
        .reverted;
    });
    it('cancel all previous orders and match with new nonce', async () => {
      await exchange.connect(alice).incrementNonce();
      await exchange.connect(bob).incrementNonce();
      sellInput = await sell.pack();
      buyInput = await buy.pack();

      await updateBalances();

      await exchange.settleExchangeInputs(sellInput, buyInput);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance,
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });
    it('should not match with wrong order nonce sell', async () => {
      await exchange.connect(alice).incrementNonce();
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Failed authorization',
      );
    });
    it('should not match with wrong order nonce buy', async () => {
      await exchange.connect(bob).incrementNonce();
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Failed authorization',
      );
    });
    it('should not match filled order sell', async () => {
      await waitForTx(exchange.settleExchangeInputs(sellInput, buyInput));
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('should not match filled order buy', async () => {
      await waitForTx(exchange.settleExchangeInputs(sellInput, buyInput));
      sell = generateOrder(alice, {
        side: Side.Sell,
        tokenId,
        salt: 1,
      });
      sellInput = await sell.pack();
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Invalid order parameters',
      );
    });
    it('should revert if closed', async () => {
      await exchange.closeExchange();
      await expect(exchange.settleExchangeInputs(sellInput, buyInput)).to.be.revertedWith(
        'MarkExchange: Exchange Is Closed',
      );
    });
    it('should succeed if reopened', async () => {
      await exchange.openExchange();

      buyInput = await buy.packNoSigs();
      const tx = await waitForTx(
        exchange.connect(bob).settleExchangeInputs(sellInput, buyInput),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance,
        aliceBalanceWeth.add(priceMinusFee),
        bobBalance.sub(gasFee),
        bobBalanceWeth.sub(price).sub(fee),
        feeRecipientBalance,
        feeRecipientBalanceWeth.add(fee).add(fee),
      );
    });

    it('bulksettleExchangeInputs should work', async () => {
      sell.parameters.paymentToken = ZERO_ADDRESS;
      buy.parameters.paymentToken = ZERO_ADDRESS;
      sellInput = await sell.pack();
      buyInput = await buy.packNoSigs();

      tokenId += 1;
      await mockERC721.mint(alice.address, tokenId);
      const sell2 = generateOrder(alice, { side: Side.Sell, tokenId });
      const buy2 = generateOrder(bob, { side: Side.Buy, tokenId });
      sell2.parameters.paymentToken = ZERO_ADDRESS;
      buy2.parameters.paymentToken = ZERO_ADDRESS;
      const sellInput2 = await sell2.pack();
      const buyInput2 = await buy2.pack();

      const tx = await waitForTx(
        exchange.connect(bob).bulksettleExchangeInputs(
          [
            [
              sellInput,
              buyInput
            ],
            [
              sellInput2,
              buyInput2
            ]
          ],
          { value: price.add(fee).mul(2) }),
      );
      const gasFee = tx.gasUsed.mul(tx.effectiveGasPrice);

      expect(await mockERC721.ownerOf(tokenId)).to.be.equal(bob.address);
      await checkBalances(
        aliceBalance.add(priceMinusFee.mul(2)),
        aliceBalanceWeth,
        bobBalance.sub(price.mul(2)).sub(gasFee).sub(fee.mul(2)),
        bobBalanceWeth,
        feeRecipientBalance.add(fee.mul(2)).add(fee.mul(2)),
        feeRecipientBalanceWeth,
      );
    });
  };
}