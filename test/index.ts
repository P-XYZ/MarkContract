import hre from 'hardhat';

import { runExchangeTests } from './exchange.test';
import { SetupExchangeOpts, SetupExchangeResult } from './exchange';
import { deployFull } from '../scripts/test_deploy';

const order =
  '(address,uint8,address,address,uint256,uint256,address,uint256,uint256,uint256,(uint16,address)[],uint256,bytes)';

export async function setupExchange({
  admin,
  weth,
}: SetupExchangeOpts): Promise<SetupExchangeResult> {
  return deployFull(hre, 1, weth.address, admin.address);
}

runExchangeTests(setupExchange);
