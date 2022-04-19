import { Box, Typography, Button } from '@mui/material'
import { ModalProps } from 'store/validator'

import FailureIcon from '../../../../../../assets/vectors/failure.svg'
import { ModalContainer, CancelRoundedIcon } from './styles'

type SuccessProps = {
  modalProps: ModalProps
  handleModal: (modalProps: ModalProps) => void
}

const Success: React.FC<SuccessProps> = ({ modalProps, handleModal }) => {
  const handleClose = () => {
    handleModal({ open: false, validator: null, amount: null, status: null })
  }

  const handleTryAgain = () => {
    handleModal({ ...modalProps, status: null })
  }

  return (
    <ModalContainer sx={{ padding: '4rem' }}>
      <img src={FailureIcon} alt="failure-icon" />
      <CancelRoundedIcon onClick={handleClose} />
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        textAlign="center"
        gap={1}
      >
        <Typography variant="h4" fontWeight={900} letterSpacing={2}>
          Delegation failed!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Seems like something went wrong with executing the transaction . Try
          again or check your wallet balance.
        </Typography>
      </Box>
      <Button
        sx={(theme) => ({
          width: '50%',
          fontWeight: 700,
          '&:hover': {
            background: theme.palette.primary.main
          }
        })}
        onClick={handleTryAgain}
      >
        Try again
      </Button>
    </ModalContainer>
  )
}

export default Success
