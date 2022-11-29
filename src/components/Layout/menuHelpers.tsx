import DashboardIcon from 'assets/vectors/dashboard.svg?component'
import ProposalsIcon from 'assets/vectors/proposals.svg?component'
import StakingIcon from 'assets/vectors/staking.svg?component'
import FaucetIcon from 'assets/vectors/faucet.svg?component'
import { CHAIN_DETAILS } from 'utils/constants'

export interface MenuItems {
    icon: JSX.Element;
    link: string;
    text: string;
}

export const getMenuItems = (chosenNetwork: string, loadingState: boolean): MenuItems[] => {

    const MenuItems = [
        { icon: <DashboardIcon />, link: '/dashboard', text: 'Dashboard' },
        { icon: <StakingIcon />, link: '/staking', text: 'Staking' },
        { icon: <ProposalsIcon />, link: '/proposals', text: 'Proposals' },
    ]

    if (CHAIN_DETAILS.CHAIN_ID[chosenNetwork! as keyof typeof CHAIN_DETAILS.CHAIN_ID]
        !== CHAIN_DETAILS.CHAIN_ID.MAINNET && !loadingState) {
        MenuItems.push({ icon: <FaucetIcon />, link: '/faucet', text: 'Faucet' })
    }

    return MenuItems
}
