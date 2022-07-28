/* eslint-disable import/prefer-default-export */
export const GET_CURRENCY_RATE_URL = (currency: string) =>
  `https://api.coingecko.com/api/v3/simple/price?ids=CUDOS&vs_currencies=${currency}`

export const GET_FAUCET_TOKENS = import.meta.env.VITE_FAUCET_URL
