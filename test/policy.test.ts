import { expect } from 'chai';
import { Wallet, Contract } from 'ethers';

import type { GenerateOrder } from './exchange';
import { eth, OrderParameters } from './exchange';
import { Side, ZERO_ADDRESS } from './exchange/utils';

export function runMatchingPolicyTests(setupTest: any) {
  return async () => {
    const tokenId = 1;

    let admin: Wallet;
    let alice: Wallet;
    let bob: Wallet;

    let exchange: Contract;
    let matchCriterias: Record<string, Contract>;

    let generateOrder: GenerateOrder;

    let sell: OrderParameters;
    let buy: OrderParameters;

    before(async () => {
      ({ admin, alice, bob, exchange, matchCriterias, generateOrder } =
        await setupTest());
    });

    describe('CriteriaERC721', () => {
      beforeEach(async () => {
        sell = generateOrder(alice, { side: Side.Sell, tokenId }).parameters;
        buy = generateOrder(bob, { side: Side.Buy, tokenId }).parameters;
      });

      describe('sell is maker', () => {
        it('should match', async () => {
          const { price, tokenId, amount } = await exchange.matchOrders(
            sell,
            buy,
          );
          expect(price).to.equal(sell.price);
          expect(tokenId).to.equal(sell.tokenId);
          expect(amount).to.equal(1);
        });
        it('should not match if orders are the same side', async () => {
          sell.side = Side.Buy;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if paymentTokens don't match", async () => {
          sell.paymentToken = ZERO_ADDRESS;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if collections don't match", async () => {
          buy.collection = admin.address;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if tokenIds don't match", async () => {
          buy.tokenId = tokenId + 1;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if prices don't match", async () => {
          sell.price = eth('2');
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
      });

      describe('buy is maker', () => {
        beforeEach(() => {
          buy.listingTime = '1';
          sell.listingTime = '2';
        });
        it('should match', async () => {
          const { price, tokenId, amount } = await exchange.matchOrders(
            sell,
            buy,
          );
          expect(price).to.equal(sell.price);
          expect(tokenId).to.equal(sell.tokenId);
          expect(amount).to.equal(1);
        });
        it('should not match if orders are the same side', async () => {
          sell.side = Side.Buy;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if paymentTokens don't match", async () => {
          sell.paymentToken = ZERO_ADDRESS;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if collections don't match", async () => {
          buy.collection = admin.address;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if tokenIds don't match", async () => {
          buy.tokenId = tokenId + 1;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if prices don't match", async () => {
          sell.price = eth('2');
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
      });
    });

    describe('CriteriaERC1155', () => {
      beforeEach(async () => {
        sell = generateOrder(alice, {
          side: Side.Sell,
          tokenId,
          matchingCriteria: matchCriterias.matchCriteriaERC1155.address,
        }).parameters;
        buy = generateOrder(bob, {
          side: Side.Buy,
          tokenId,
          matchingCriteria: matchCriterias.matchCriteriaERC1155.address,
        }).parameters;
      });

      describe('sell is maker', () => {
        it('should match', async () => {
          const { price, tokenId, amount } = await exchange.matchOrders(
            sell,
            buy,
          );
          expect(price).to.equal(sell.price);
          expect(tokenId).to.equal(sell.tokenId);
          expect(amount).to.equal(1);
        });
        it('should not match if orders are the same side', async () => {
          sell.side = Side.Buy;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if paymentTokens don't match", async () => {
          sell.paymentToken = ZERO_ADDRESS;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if collections don't match", async () => {
          buy.collection = admin.address;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if tokenIds don't match", async () => {
          buy.tokenId = tokenId + 1;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if prices don't match", async () => {
          sell.price = eth('2');
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
      });

      describe('buy is maker', () => {
        beforeEach(() => {
          buy.listingTime = '1';
          sell.listingTime = '2';
        });
        it('should match', async () => {
          const { price, tokenId, amount } = await exchange.matchOrders(
            sell,
            buy,
          );
          expect(price).to.equal(sell.price);
          expect(tokenId).to.equal(sell.tokenId);
          expect(amount).to.equal(1);
        });
        it('should not match if orders are the same side', async () => {
          sell.side = Side.Buy;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if paymentTokens don't match", async () => {
          sell.paymentToken = ZERO_ADDRESS;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if collections don't match", async () => {
          buy.collection = admin.address;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if tokenIds don't match", async () => {
          buy.tokenId = tokenId + 1;
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
        it("should not match if prices don't match", async () => {
          sell.price = eth('2');
          await expect(exchange.matchOrders(sell, buy)).to.be.revertedWith(
            'MarkExchange: Orders cannot be matched',
          );
        });
      });
    });
  }
}
