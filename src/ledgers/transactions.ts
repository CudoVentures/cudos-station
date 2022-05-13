import BigNumber from 'bignumber.js'
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx'
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx'

import {
  DeliverTxResponse,
  GasPrice,
  SigningStargateClient,
  coins,
  coin,
  MsgDelegateEncodeObject
} from 'cudosjs'
import CosmosNetworkConfig from './CosmosNetworkConfig'

const TYPE_URLS = {
  msgDelegate: '/cosmos.staking.v1beta1.MsgDelegate',
  msgUndelegate: '/cosmos.staking.v1beta1.MsgUndelegate',
  msgRedelegate: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  msgSend: '/cosmos.bank.v1beta1.MsgSend',
  msgWithdraw: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  msgSubmitProposal: '/cosmos.gov.v1beta1.MsgSubmitProposal',
  ClientStateType: '/ibc.lightclients.tendermint.v1.ClientState',
  proposalTypeCancelSoftwareUpgradeProposal:
    '/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal',
  proposalTypeSoftwareUpgradeProposal:
    '/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal',
  proposalTypeTextProposal: '/cosmos.gov.v1beta1.TextProposal',
  proposalTypeParameterChangeProposal:
    '/cosmos.params.v1beta1.ParameterChangeProposal',
  proposalTypeCommunityPoolSpendProposal:
    '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
  proposalTypeClientUpdateProposal: '/ibc.core.client.v1.ClientUpdateProposal',
  proposalTypeIbcUpgradeProposal: '/ibc.core.client.v1.UpgradeProposal'
}

const feeMultiplier = import.meta.env.VITE_APP_FEE_MULTIPLIER
const gasPrice = GasPrice.fromString(
  `${import.meta.env.VITE_APP_GAS_PRICE}${CosmosNetworkConfig.CURRENCY_DENOM}`
)

export const calculateFee = (gasLimit: number, gasPrice: string | GasPrice) => {
  const processedGasPrice =
    typeof gasPrice === 'string' ? GasPrice.fromString(gasPrice) : gasPrice
  const { denom, amount: gasPriceAmount } = processedGasPrice
  const amount = new BigNumber(gasPriceAmount.toString())
    .multipliedBy(gasLimit)
    .toFixed(0)
  return {
    amount: coins(amount, denom),
    gas: new BigNumber(gasLimit).toFixed(0)
  }
}

export const delegate = async (
  delegatorAddress: string,
  validatorAddress: string,
  amount: string,
  memo: string
): Promise<DeliverTxResponse> => {
  window.keplr.defaultOptions = {
    sign: {
      preferNoSetFee: true
    }
  }
  const offlineSigner = window.getOfflineSigner(
    import.meta.env.VITE_APP_CHAIN_ID
  )

  const client = await SigningStargateClient.connectWithSigner(
    import.meta.env.VITE_APP_RPC,
    offlineSigner
  )

  const delegationAmount = {
    amount: new BigNumber(amount)
      .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
      .toString(10),
    denom: CosmosNetworkConfig.CURRENCY_DENOM
  }

  const msg = MsgDelegate.fromPartial({
    delegatorAddress,
    validatorAddress,
    amount: coin(Number(amount), CosmosNetworkConfig.CURRENCY_DENOM)
  })

  const msgAny: MsgDelegateEncodeObject = {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
    value: msg
  }

  const gasUsed = await client.simulate(delegatorAddress, [msgAny], memo)

  const gasLimit = Math.round(gasUsed * feeMultiplier)

  const fee = calculateFee(gasLimit, gasPrice)

  const result = await client.delegateTokens(
    delegatorAddress,
    validatorAddress,
    delegationAmount,
    fee,
    memo
  )

  return result
}

export const undelegate = async (
  delegatorAddress: string,
  validatorAddress: string,
  amount: string,
  memo: string
): Promise<DeliverTxResponse> => {
  const offlineSigner = window.getOfflineSigner(
    import.meta.env.VITE_APP_CHAIN_ID
  )

  const client = await SigningStargateClient.connectWithSigner(
    import.meta.env.VITE_APP_RPC,
    offlineSigner
  )

  const undelegationAmount = {
    amount: new BigNumber(amount || 0)
      .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
      .toString(10),
    denom: CosmosNetworkConfig.CURRENCY_DENOM
  }

  const result = await client.undelegateTokens(
    delegatorAddress,
    validatorAddress,
    undelegationAmount,
    'auto',
    memo
  )

  return result
}

export const claimRewards = async (
  stakedValidators: string[],
  address: string
) => {
  window.keplr.defaultOptions = {
    sign: {
      preferNoSetFee: true
    }
  }

  const offlineSigner = window.getOfflineSignerOnlyAmino(
    import.meta.env.VITE_APP_CHAIN_ID
  )

  const client = await SigningStargateClient.connectWithSigner(
    import.meta.env.VITE_APP_RPC,
    offlineSigner
  )

  const msgMemo = ''

  const msgAny: any[] = []

  stakedValidators.map((validator) =>
    msgAny.push({
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: address,
        validatorAddress: validator
      })
    })
  )

  const gasUsed = await client.simulate(address, [...msgAny], msgMemo)

  const gasLimit = Math.round(gasUsed * feeMultiplier)

  const fee = calculateFee(gasLimit, gasPrice)

  const result = await client.signAndBroadcast(address, msgAny, fee, msgMemo)

  return result
}
