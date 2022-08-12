import BigNumber from 'bignumber.js'
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx'
import { TextProposal } from 'cosmjs-types/cosmos/gov/v1beta1/gov'
import { ParameterChangeProposal } from 'cosmjs-types/cosmos/params/v1beta1/params'
import { CommunityPoolSpendProposal } from 'cosmjs-types/cosmos/distribution/v1beta1/distribution'
import {
  SoftwareUpgradeProposal,
  CancelSoftwareUpgradeProposal
} from 'cosmjs-types/cosmos/upgrade/v1beta1/upgrade'
import {
  MsgVote,
  MsgDeposit,
  MsgSubmitProposal
} from 'cosmjs-types/cosmos/gov/v1beta1/tx'
import {
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate
} from 'cosmjs-types/cosmos/staking/v1beta1/tx'

import {
  DeliverTxResponse,
  GasPrice,
  SigningStargateClient,
  coins,
  coin,
  MsgDelegateEncodeObject,
  MsgVoteEncodeObject,
  MsgDepositEncodeObject,
  MsgSubmitProposalEncodeObject,
  MsgUndelegateEncodeObject
} from 'cudosjs'
import { encode } from 'uint8-to-base64'
import Long from 'long'
import { formatToken } from 'utils/format_token'
import { ClientUpdateProposal, UpgradeProposal } from './ibc-go/codec/client'
import CosmosNetworkConfig from './CosmosNetworkConfig'
import { signingClient } from './utils'

const PROPOSAL_TYPES = {
  PROPOSAL_TYPE_TEXT: 1,
  PROPOSAL_TYPE_SOFTWARE_UPDATE: 2,
  PROPOSAL_TYPE_CANCEL_SOFTWARE_UPDATE: 3,
  PROPOSAL_TYPE_PARAM_CHANGE: 4,
  PROPOSAL_TYPE_COMMUNITY_POOL_SPEND: 5,
  PROPOSAL_TYPE_UPDATE_CLIENT: 6,
  PROPOSAL_TYPE_IBC_UPGRADE: 7
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

export const getFee = async (address: string, message: any[], memo: string) => {
  if (signingClient === null) {
    return null
  }

  const gasUsed = await signingClient.simulate(address, message, memo)

  const gasLimit = Math.round(gasUsed * feeMultiplier)

  const fee = calculateFee(gasLimit, gasPrice)

  return fee
}

export const delegate = async (
  delegatorAddress: string,
  validatorAddress: string,
  amount: string,
  memo: string
): Promise<DeliverTxResponse | null> => {
  const delegationAmount = {
    amount: new BigNumber(amount)
      .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
      .toString(10),
    denom: CosmosNetworkConfig.CURRENCY_DENOM
  }

  const msg = MsgDelegate.fromPartial({
    delegatorAddress,
    validatorAddress,
    amount: coin(
      new BigNumber(amount || 0)
        .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
        .toString(10),
      CosmosNetworkConfig.CURRENCY_DENOM
    )
  })

  const msgAny: MsgDelegateEncodeObject = {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
    value: msg
  }

  const fee = await getFee(delegatorAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return null
  }

  const result = await signingClient.delegateTokens(
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
): Promise<DeliverTxResponse | null> => {
  const undelegationAmount = {
    amount: new BigNumber(amount || 0)
      .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
      .toString(10),
    denom: CosmosNetworkConfig.CURRENCY_DENOM
  }

  const msg = MsgUndelegate.fromPartial({
    delegatorAddress,
    validatorAddress,
    amount: coin(
      new BigNumber(amount || 0)
        .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
        .toString(10),
      CosmosNetworkConfig.CURRENCY_DENOM
    )
  })

  const msgAny: MsgUndelegateEncodeObject = {
    typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
    value: msg
  }

  const fee = await getFee(delegatorAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return null
  }

  const result = await signingClient.undelegateTokens(
    delegatorAddress,
    validatorAddress,
    undelegationAmount,
    fee,
    memo
  )

  return result
}

export const redelegate = async (
  delegatorAddress: string,
  validatorSrcAddress: string,
  validatorDstAddress: string,
  amount: string,
  memo: string
): Promise<DeliverTxResponse | null> => {
  const msg = MsgBeginRedelegate.fromPartial({
    delegatorAddress,
    validatorSrcAddress,
    validatorDstAddress,
    amount: coin(
      new BigNumber(amount || 0)
        .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
        .toString(10),
      CosmosNetworkConfig.CURRENCY_DENOM
    )
  })

  const msgAny = {
    typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
    value: msg
  }

  const fee = await getFee(delegatorAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return null
  }

  const result = await signingClient.signAndBroadcast(
    delegatorAddress,
    [msgAny],
    fee,
    memo
  )

  return result
}

export const claimRewards = async (
  stakedValidators: { address: string; amount: string }[],
  address: string,
  restake: boolean
) => {
  const msgMemo = ''

  const msgAny: any[] = []

  stakedValidators.forEach((validator) => {
    msgAny.push({
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: MsgWithdrawDelegatorReward.fromPartial({
        delegatorAddress: address,
        validatorAddress: validator.address
      })
    })

    if (restake && Number(validator.amount) > 0) {
      msgAny.push({
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: MsgUndelegate.fromPartial({
          delegatorAddress: address,
          validatorAddress: validator.address,
          amount: {
            amount: new BigNumber(formatToken(validator.amount, 'cudos').value)
              .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
              .toString(10),
            denom: CosmosNetworkConfig.CURRENCY_DENOM
          }
        })
      })
    }
  })

  const fee = await getFee(address, [...msgAny], msgMemo)

  if (signingClient === null || fee === null) {
    return {}
  }

  const result = await signingClient.signAndBroadcast(
    address,
    msgAny,
    fee,
    msgMemo
  )

  return { result, fee: fee.amount[0].amount }
}

export const voteProposal = async (
  voterAddress: string,
  proposalId: number | undefined,
  votingOption: number
) => {
  const msg = MsgVote.fromPartial({
    proposalId,
    voter: voterAddress,
    option: votingOption
  })

  const msgAny: MsgVoteEncodeObject = {
    typeUrl: '/cosmos.gov.v1beta1.MsgVote',
    value: msg
  }

  const memo = 'Sent via CUDOS Dashboard'

  const fee = await getFee(voterAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return {}
  }

  const result = await signingClient.signAndBroadcast(
    voterAddress,
    [msgAny],
    fee,
    memo
  )

  return {
    result,
    gasFee: fee.amount[0].amount
  }
}

export const depositProposal = async (
  depositorAddress: string,
  proposalId: number | undefined,
  amount: string
) => {
  const msg = MsgDeposit.fromPartial({
    proposalId,
    depositor: depositorAddress,
    amount: [
      {
        denom: CosmosNetworkConfig.CURRENCY_DENOM,
        amount: new BigNumber(amount || 0)
          .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
          .toString(10)
      }
    ]
  })

  const msgAny: MsgDepositEncodeObject = {
    typeUrl: '/cosmos.gov.v1beta1.MsgDeposit',
    value: msg
  }

  const memo = 'Sent via CUDOS Dashboard'

  const fee = await getFee(depositorAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return {}
  }

  const result = await signingClient.signAndBroadcast(
    depositorAddress,
    [msgAny],
    fee,
    memo
  )

  return {
    result,
    gasFee: fee.amount[0].amount
  }
}

export const getProposalContent = (proposalData: any) => {
  switch (proposalData.type) {
    case PROPOSAL_TYPES.PROPOSAL_TYPE_TEXT:
      return {
        typeUrl: '/cosmos.gov.v1beta1.TextProposal',
        value: TextProposal.encode({
          title: proposalData.title,
          description: proposalData.description
        }).finish()
      }
    case PROPOSAL_TYPES.PROPOSAL_TYPE_SOFTWARE_UPDATE:
      return {
        typeUrl: '/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal',
        value: SoftwareUpgradeProposal.encode({
          title: proposalData.title,
          description: proposalData.description,
          plan: {
            name: proposalData.plan,
            height: Long.fromString(proposalData.height),
            info: proposalData.info
          }
        }).finish()
      }
    case PROPOSAL_TYPES.PROPOSAL_TYPE_CANCEL_SOFTWARE_UPDATE:
      return {
        typeUrl: '/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal',
        value: CancelSoftwareUpgradeProposal.encode({
          title: proposalData.title,
          description: proposalData.description
        }).finish()
      }
    case PROPOSAL_TYPES.PROPOSAL_TYPE_PARAM_CHANGE:
      return {
        typeUrl: '/cosmos.params.v1beta1.ParameterChangeProposal',
        value: ParameterChangeProposal.encode({
          title: proposalData.title,
          description: proposalData.description,
          changes: [
            {
              subspace: proposalData.changeSubspace,
              key: proposalData.changeKey,
              value: proposalData.changeValue
            }
          ]
        }).finish()
      }
    case PROPOSAL_TYPES.PROPOSAL_TYPE_IBC_UPGRADE:
      return {
        typeUrl: '/ibc.core.client.v1.UpgradeProposal',
        value: UpgradeProposal.encode({
          title: proposalData.title,
          description: proposalData.description,
          plan: {
            name: proposalData.upgradeName,
            height: Long.fromString(proposalData.upgradeHeight),
            info: proposalData.upgradeInfo
          },
          upgradedClientState: {
            typeUrl: '/ibc.lightclients.tendermint.v1.ClientState',
            value: encode(proposalData.ibcUpgradeFile)
          }
        }).finish()
      }
    case PROPOSAL_TYPES.PROPOSAL_TYPE_UPDATE_CLIENT:
      return {
        typeUrl: '/ibc.core.client.v1.ClientUpdateProposal',
        value: ClientUpdateProposal.encode({
          title: proposalData.title,
          description: proposalData.description,
          subjectClientId: proposalData.subjectClientId,
          substituteClientId: proposalData.substituteClientId
        }).finish()
      }

    case PROPOSAL_TYPES.PROPOSAL_TYPE_COMMUNITY_POOL_SPEND:
      return {
        typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
        value: CommunityPoolSpendProposal.encode({
          title: proposalData.title,
          description: proposalData.description,
          recipient: proposalData.poolSpendRecipient,
          amount: [
            {
              amount: new BigNumber(proposalData.poolSpendAmount || 0)
                .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
                .toString(10),
              denom: CosmosNetworkConfig.CURRENCY_DENOM
            }
          ]
        }).finish()
      }
    default:
      return {}
  }
}

export const createProposal = async (
  proposalData: any,
  proposerAddress: string
) => {
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

  const content = getProposalContent(proposalData)

  const msg = MsgSubmitProposal.fromPartial({
    content,
    proposer: proposerAddress,
    initialDeposit: [
      {
        amount: new BigNumber(proposalData.depositAmount || 0)
          .multipliedBy(CosmosNetworkConfig.CURRENCY_1_CUDO)
          .toString(10),
        denom: CosmosNetworkConfig.CURRENCY_DENOM
      }
    ]
  })

  const msgAny: MsgSubmitProposalEncodeObject = {
    typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
    value: msg
  }

  const memo = 'Sent via CUDOS Dashboard'

  const fee = await getFee(proposerAddress, [msgAny], memo)

  if (signingClient === null || fee === null) {
    return {}
  }

  const result = await client.signAndBroadcast(
    proposerAddress,
    [msgAny],
    fee,
    memo
  )

  return {
    result,
    gasFee: fee.amount[0].amount
  }
}
