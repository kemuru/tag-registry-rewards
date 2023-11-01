import { BigNumber, Contract, ethers } from "ethers"
import ERC20Abi from "../abi/ERC20.json"
import conf from "./config"
import { Transaction } from "./types"

const randomBetween = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min))

export const sleep = (seconds = 0): Promise<void> => {
  if (seconds === 0) seconds = randomBetween(2, 5)
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

export const humanizeAmount = (bn: BigNumber): number => {
  return bn.div(BigNumber.from("1000000000000000")).toNumber() / 1000
}

const sendReward = async (r: Transaction, nonce: number, pnk: Contract) => {
  await pnk.transfer(r.recipient, r.amount, { nonce })
}

export const sendAllRewards = async (
  rewards: Transaction[],
  stipend: BigNumber,
  node: string
): Promise<void> => {
  console.info("=== Node mode:", node, "===")
  const networkId =
    node === "production"
      ? Number(conf.TX_NETWORK_ID)
      : Number(conf.TX_TEST_NETWORK_ID)
  const providerUrl =
    node === "production" ? conf.GNOSIS_RPC : conf.TX_TEST_PROVIDER
  const pnkAddress = node === "production" ? conf.PNK : conf.TEST_PNK

  const provider = new ethers.providers.JsonRpcProvider(providerUrl, networkId)
  const wallet = new ethers.Wallet(conf.WALLET_PRIVATE_KEY, provider)

  const pnkContract = new ethers.Contract(pnkAddress, ERC20Abi)
  const pnk = pnkContract.connect(wallet)
  console.info("=== About to send rewards ===")
  console.info("You are", wallet.address)
  const balance: BigNumber = await pnk.balanceOf(wallet.address)
  console.info("Current balance", humanizeAmount(balance), "PNK")
  if (!balance || balance.lt(stipend.mul(BigNumber.from(12)))) {
    throw new Error("Balance is lower than stipend")
  }
  let nonce = await wallet.getTransactionCount()
  console.info("Nonce", nonce)
  for (const reward of rewards) {
    console.info(
      "Sending",
      humanizeAmount(reward.amount),
      "PNK to",
      reward.recipient
    )
    await sendReward(reward, nonce, pnk)
    await sleep(20) //somethings wrong with the nonce
    nonce = nonce + 1
  }
}
